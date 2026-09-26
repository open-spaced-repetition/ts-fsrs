use std::collections::{HashMap, VecDeque};

use csv::ReaderBuilder;
use fsrs::filter_outlier;
use itertools::Itertools;
use napi_derive::napi;

use jiff::{SignedDuration, Timestamp, civil::Date};
use napi::bindgen_prelude::{
  Either, Env, Object, PromiseRaw, ReadableStream, Result, ToNapiValue, Uint8Array,
};
use serde::{Deserialize, Serialize};

use crate::{
  FSRSItem as FSRSBindingItem, ModelVersion,
  card_id_generator::card_id_generator,
  convert_stream::convert_csv_stream,
  timezone::{TimezoneOffset, TimezoneOrOffset, resolve_timezone_offset},
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct RevlogEntry {
  // card_id,review_time,review_rating,review_state,review_duration
  pub card_id: String,
  pub review_time: i64,
  pub review_rating: u32,
  pub review_state: u32,
  pub review_duration: u32,
  #[serde(skip)]
  pub last_interval: f32,
}

fn study_day_position(
  timestamp: i64,
  next_day_starts_at: i64,
  timezone: &TimezoneOffset,
  use_fractional_days: bool,
  boundaries: &mut HashMap<Date, (i64, i64)>,
) -> std::result::Result<(Date, f64), jiff::Error> {
  let rollover = SignedDuration::from_hours(next_day_starts_at);
  let instant = Timestamp::from_millisecond(timestamp)?;
  let mut date = timezone.to_datetime(instant).checked_sub(rollover)?.date();
  if !use_fractional_days {
    return Ok((date, 0.0));
  }
  loop {
    let (start, end) = study_day_boundaries(date, next_day_starts_at, timezone, boundaries)?;
    if start <= timestamp && timestamp < end {
      return Ok((date, (timestamp - start) as f64 / (end - start) as f64));
    }
    // Correct dates whose rollover lies in a skipped or repeated local-time range.
    date = date.checked_add(jiff::Span::new().days(if timestamp < start { -1 } else { 1 }))?;
  }
}

fn study_day_boundaries(
  date: Date,
  next_day_starts_at: i64,
  timezone: &TimezoneOffset,
  boundaries: &mut HashMap<Date, (i64, i64)>,
) -> std::result::Result<(i64, i64), jiff::Error> {
  if let Some(&value) = boundaries.get(&date) {
    return Ok(value);
  }
  let boundary = |date: Date| {
    timezone
      .to_zoned(
        date
          .at(0, 0, 0, 0)
          .checked_add(SignedDuration::from_hours(next_day_starts_at))?,
      )
      .map(|zoned| zoned.timestamp().as_millisecond())
  };
  let value = (boundary(date)?, boundary(date.tomorrow()?)?);
  boundaries.insert(date, value);
  Ok(value)
}

fn skipped_study_dates(
  first: i64,
  last: i64,
  next_day_starts_at: i64,
  timezone: &TimezoneOffset,
  boundaries: &mut HashMap<Date, (i64, i64)>,
) -> std::result::Result<Vec<Date>, jiff::Error> {
  let first = Timestamp::from_millisecond(first)?;
  let last = Timestamp::from_millisecond(last)?;
  let rollover = SignedDuration::from_hours(next_day_starts_at);
  let mut dates = Vec::new();
  // Include the transition at the last review, and the latest one before the
  // first review: a skipped rollover can resolve to an instant after its jump.
  for transition in timezone.preceding(last.saturating_add(SignedDuration::from_nanos(1))?) {
    let at = transition.timestamp();
    let before = timezone.to_offset(at.saturating_sub(SignedDuration::from_nanos(1))?);
    if transition.offset().seconds() - before.seconds() >= 86_400 {
      let start = before.to_datetime(at).checked_sub(rollover)?.date();
      let end = transition
        .offset()
        .to_datetime(at)
        .checked_sub(rollover)?
        .date();
      // Only inspect dates touched by a whole-day jump, never the review interval.
      for day in 0..=(end - start).get_days() {
        let date = start.checked_add(jiff::Span::new().days(day))?;
        let (start, end) = study_day_boundaries(date, next_day_starts_at, timezone, boundaries)?;
        if start == end {
          dates.push(date);
        }
      }
    }
    if at < first {
      break;
    }
  }
  dates.sort_unstable();
  dates.dedup();
  Ok(dates)
}

fn remove_revlog_before_last_first_learn(entries: Vec<RevlogEntry>) -> Vec<RevlogEntry> {
  // 0 new, 1 learning, 2 review, 3 relearning
  // Keep only entries from the last contiguous block of learning states (0 or 1)
  let is_learning_state = |entry: &RevlogEntry| matches!(entry.review_state, 0 | 1);

  let mut last_learning_block_start = None;
  for i in (0..entries.len()).rev() {
    if is_learning_state(&entries[i]) {
      last_learning_block_start = Some(i);
    } else if last_learning_block_start.is_some() {
      break;
    }
  }

  if let Some(start) = last_learning_block_start {
    // Match fsrs-rs's internal training default: omit longer prefixes, not their initial reviews.
    entries.into_iter().skip(start).take(1024).collect()
  } else {
    vec![]
  }
}

fn convert_to_fsrs_items_internal(
  mut entries: Vec<RevlogEntry>,
  next_day_starts_at: i64,
  timezone_offset: &TimezoneOffset,
  use_fractional_days: bool,
  boundaries: &mut HashMap<Date, (i64, i64)>,
  skipped_dates: &[Date],
) -> Result<Vec<(FSRSBindingItem, i64)>> {
  entries = remove_revlog_before_last_first_learn(entries);

  let position = |timestamp, boundaries: &mut HashMap<Date, (i64, i64)>| {
    study_day_position(
      timestamp,
      next_day_starts_at,
      timezone_offset,
      use_fractional_days,
      boundaries,
    )
    .map_err(|e| napi::Error::from_reason(format!("Invalid study-day timestamp: {}", e)))
  };
  if let Some(first) = entries.first() {
    let mut previous = position(first.review_time, boundaries)?;
    for item in entries.iter_mut().skip(1) {
      let current = position(item.review_time, boundaries)?;
      let skipped = skipped_dates.partition_point(|&date| date < current.0)
        - skipped_dates.partition_point(|&date| date < previous.0);
      let days = (current.0 - previous.0).get_days() as f64 - skipped as f64;
      item.last_interval = (days + current.1 - previous.1) as f32;
      previous = current;
    }
  }

  Ok(
    entries
      .iter()
      .enumerate()
      .skip(1)
      .map(|(idx, entry)| {
        let reviews = entries
          .iter()
          .take(idx + 1)
          .map(|r| fsrs::FSRSReview {
            rating: r.review_rating,
            delta_t: r.last_interval.max(0.0),
          })
          .collect();
        (
          FSRSBindingItem {
            inner: fsrs::FSRSItem { reviews },
          },
          entry.review_time,
        )
      })
      .filter(|(item, _)| item.current().is_some_and(|r| r.inner.delta_t > 0.0))
      .collect(),
  )
}

fn convert_csv_bytes_impl<Id: Copy>(
  data: &[u8],
  next_day_starts_at: i64,
  timezone_offset: &TimezoneOffset,
  use_fractional_days: bool,
  mut next_card_id: impl FnMut() -> Result<Id>,
) -> Result<(Vec<FSRSBindingItem>, Vec<Id>)> {
  let mut rdr = ReaderBuilder::new().has_headers(true).from_reader(data);

  let mut revlogs = rdr
    .deserialize::<RevlogEntry>()
    .collect::<std::result::Result<Vec<RevlogEntry>, _>>()
    .map_err(|e| napi::Error::from_reason(format!("CSV deserialization error: {}", e)))?;
  revlogs.retain(|entry| (1..=4).contains(&entry.review_rating));
  // Sort by review_time first to ensure ordering
  revlogs.sort_by_cached_key(|r| (r.card_id.clone(), r.review_time));

  // A conversion shares one timezone and rollover, so each date has one pair of boundaries.
  let mut boundaries = HashMap::new();

  let skipped_dates = if use_fractional_days {
    match revlogs
      .iter()
      .map(|entry| entry.review_time)
      .minmax()
      .into_option()
    {
      Some((first, last)) => skipped_study_dates(
        first,
        last,
        next_day_starts_at,
        timezone_offset,
        &mut boundaries,
      )
      .map_err(|e| napi::Error::from_reason(format!("Invalid study-day timestamp: {}", e)))?,
      None => Vec::new(),
    }
  } else {
    Vec::new()
  };

  // Group by card_id while maintaining time order
  let mut revlogs = revlogs
    .into_iter()
    .chunk_by(|r| r.card_id.clone())
    .into_iter()
    .map(|(_card_id, entries)| {
      let items = convert_to_fsrs_items_internal(
        entries.collect(),
        next_day_starts_at,
        timezone_offset,
        use_fractional_days,
        &mut boundaries,
        &skipped_dates,
      )?;
      if items.is_empty() {
        return Ok(Vec::new());
      }
      let card_id = next_card_id()?;
      Ok(
        items
          .into_iter()
          .map(|(item, time)| (item, time, card_id))
          .collect_vec(),
      )
    })
    .collect::<Result<Vec<_>>>()?
    .into_iter()
    .flatten()
    .collect_vec();

  // Sort by review_time to maintain correct order across groups
  revlogs.sort_by_cached_key(|(_, review_time, _)| *review_time);

  Ok(
    revlogs
      .into_iter()
      .map(|(item, _, card_id)| (item, card_id))
      .unzip(),
  )
}

pub(crate) type CsvConverter<T> = fn(&[u8], i64, &TimezoneOffset, bool) -> Result<T>;

fn convert_csv_bytes(
  data: &[u8],
  next_day_starts_at: i64,
  timezone_offset: &TimezoneOffset,
  use_fractional_days: bool,
) -> Result<Vec<FSRSBindingItem>> {
  // Unit IDs are zero-sized: the legacy array path does not allocate an ID vector.
  convert_csv_bytes_impl(
    data,
    next_day_starts_at,
    timezone_offset,
    use_fractional_days,
    || Ok(()),
  )
  .map(|(items, _)| items)
}

/// Items and batch-local numeric group IDs, aligned by index.
#[napi(object, object_from_js = false, js_name = "FSRSItemsWithCardIds")]
pub struct FSRSItemsWithCardIds {
  pub items: Vec<FSRSBindingItem>,
  /// Opaque IDs assigned once per retained CSV card; not the original CSV identifiers.
  pub card_ids: Vec<i64>,
}

fn convert_csv_bytes_with_card_ids(
  data: &[u8],
  next_day_starts_at: i64,
  timezone_offset: &TimezoneOffset,
  use_fractional_days: bool,
) -> Result<FSRSItemsWithCardIds> {
  let (items, card_ids) = convert_csv_bytes_impl(
    data,
    next_day_starts_at,
    timezone_offset,
    use_fractional_days,
    card_id_generator(),
  )?;
  Ok(FSRSItemsWithCardIds { items, card_ids })
}

/// Convert CSV review logs to FSRS training items.
///
/// FSRS-7 (the default) normalizes elapsed time by each local study day’s actual
/// duration between rollover boundaries, including fractional and same-day
/// intervals. FSRS-6 uses whole study days. Pass the same modelVersion to training.
/// Only prefixes of up to 1024 reviews after the last learning block are emitted,
/// matching fsrs-rs's internal training default sequence limit.
///
/// @param timezoneOrOffset Pass an IANA timezone name, such as `Asia/Shanghai`,
/// when daylight saving rules should be resolved for each review timestamp.
/// Pass a number when the source data should use one fixed UTC offset in
/// minutes, such as `480` for UTC+08:00 or `-300` for UTC-05:00.
#[napi(
  ts_generic_types = "T extends Uint8Array | ReadableStream<Uint8Array>",
  ts_args_type = "data: T, nextDayStartsAt: number, timezoneOrOffset: TimezoneOrOffset, modelVersion?: `${ModelVersion}`",
  ts_return_type = "T extends ReadableStream<Uint8Array> ? Promise<Array<FSRSBindingItem>> : Array<FSRSBindingItem>"
)]
pub fn convert_csv_to_fsrs_items<'env>(
  env: &'env Env,
  data: Either<&[u8], ReadableStream<'env, Uint8Array>>,
  next_day_starts_at: i64,
  // Accepts an IANA timezone name or a fixed UTC offset in minutes.
  // IANA names resolve DST per review timestamp; numeric offsets stay fixed.
  timezone_or_offset: TimezoneOrOffset,
  model_version: Option<ModelVersion>,
) -> Result<Either<Vec<FSRSBindingItem>, PromiseRaw<'env, Object<'env>>>> {
  convert_csv(
    env,
    data,
    next_day_starts_at,
    timezone_or_offset,
    model_version,
    convert_csv_bytes,
  )
}

/// Convert CSV logs and assign batch-local numeric card IDs for windowed training/evaluation.
/// Original string or numeric CSV identifiers are grouped as exact strings, never parsed as i64.
/// IDs stay aligned with items after filtering and chronological sorting. Do not combine IDs
/// from separate conversions without reassigning groups across the combined dataset.
#[napi(
  ts_generic_types = "T extends Uint8Array | ReadableStream<Uint8Array>",
  ts_args_type = "data: T, nextDayStartsAt: number, timezoneOrOffset: TimezoneOrOffset, modelVersion?: `${ModelVersion}`",
  ts_return_type = "T extends ReadableStream<Uint8Array> ? Promise<FSRSItemsWithCardIds> : FSRSItemsWithCardIds"
)]
pub fn convert_csv_to_fsrs_items_with_card_ids<'env>(
  env: &'env Env,
  data: Either<&[u8], ReadableStream<'env, Uint8Array>>,
  next_day_starts_at: i64,
  timezone_or_offset: TimezoneOrOffset,
  model_version: Option<ModelVersion>,
) -> Result<Either<FSRSItemsWithCardIds, PromiseRaw<'env, Object<'env>>>> {
  convert_csv(
    env,
    data,
    next_day_starts_at,
    timezone_or_offset,
    model_version,
    convert_csv_bytes_with_card_ids,
  )
}

#[inline]
fn convert_csv<'env, T: ToNapiValue + 'static>(
  env: &'env Env,
  data: Either<&[u8], ReadableStream<'env, Uint8Array>>,
  next_day_starts_at: i64,
  timezone_or_offset: TimezoneOrOffset,
  model_version: Option<ModelVersion>,
  converter: CsvConverter<T>,
) -> Result<Either<T, PromiseRaw<'env, Object<'env>>>> {
  if !(0..=23).contains(&next_day_starts_at) {
    let error = napi::Error::from_reason("nextDayStartsAt must be between 0 and 23");
    return match data {
      Either::A(_) => Err(error),
      Either::B(_) => Ok(Either::B(PromiseRaw::reject(env, error)?)),
    };
  }
  let timezone_offset = resolve_timezone_offset(timezone_or_offset);
  let use_fractional_days = !matches!(model_version, Some(ModelVersion::Fsrs6));

  match data {
    Either::A(data) => {
      let timezone_offset = timezone_offset?;
      Ok(Either::A(converter(
        data,
        next_day_starts_at,
        &timezone_offset,
        use_fractional_days,
      )?))
    }
    Either::B(stream) => Ok(Either::B(match timezone_offset {
      Ok(timezone_offset) => convert_csv_stream(
        env,
        stream,
        next_day_starts_at,
        timezone_offset,
        use_fractional_days,
        converter,
      )?,
      Err(error) => PromiseRaw::reject(env, error)?,
    })),
  }
}

pub(crate) fn validate_card_ids(
  item_count: usize,
  card_ids: Option<Vec<i64>>,
) -> Result<Option<Vec<i64>>> {
  if card_ids.as_ref().is_some_and(|ids| ids.len() != item_count) {
    return Err(napi::Error::from_reason(
      "cardIds length must match items length",
    ));
  }
  Ok(card_ids)
}

pub(crate) fn prepare_items(
  train_set: Vec<&FSRSBindingItem>,
  card_ids: Option<Vec<i64>>,
) -> Result<(Vec<fsrs::FSRSItem>, Option<Vec<i64>>)> {
  let card_ids = validate_card_ids(train_set.len(), card_ids)?;
  let train_data: Vec<fsrs::FSRSItem> = train_set
    .into_iter()
    .map(|item| item.inner.clone())
    .collect();
  let id_lookup = card_ids.map(|ids| {
    let mut ids_by_reviews = HashMap::new();
    let mut empty_ids = VecDeque::new();
    for (item, id) in train_data.iter().zip(ids) {
      if item.reviews.is_empty() {
        empty_ids.push_back(id);
      } else {
        ids_by_reviews.insert(item.reviews.as_ptr(), id);
      }
    }
    (ids_by_reviews, empty_ids)
  });
  let (mut dataset_for_initialization, mut trainset): (Vec<fsrs::FSRSItem>, Vec<fsrs::FSRSItem>) =
    train_data
      .into_iter()
      .partition(|item| item.long_term_review_cnt() == 1);
  // The locked fsrs filter moves records without rebuilding review Vecs. Track their
  // allocations through its reordering; empty histories remain in trainset order.
  // The regression test also guards this contract when upgrading fsrs.
  (dataset_for_initialization, trainset) = filter_outlier(dataset_for_initialization, trainset);
  let items: Vec<_> = dataset_for_initialization
    .into_iter()
    .chain(trainset)
    .collect();
  let card_ids = id_lookup
    .map(|(mut ids_by_reviews, mut empty_ids)| {
      items
        .iter()
        .map(|item| {
          let id = if item.reviews.is_empty() {
            empty_ids.pop_front()
          } else {
            ids_by_reviews.remove(&item.reviews.as_ptr())
          };
          id.ok_or_else(|| napi::Error::from_reason("Outlier filtering lost card ID alignment"))
        })
        .collect::<Result<Vec<_>>>()
    })
    .transpose()?;
  Ok((items, card_ids))
}
