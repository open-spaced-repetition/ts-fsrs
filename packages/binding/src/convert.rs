use std::collections::HashMap;

use csv::ReaderBuilder;
use fsrs::filter_outlier;
use itertools::Itertools;
use napi_derive::napi;

use jiff::{SignedDuration, Timestamp, civil::Date};
use napi::bindgen_prelude::{Either, Env, Object, PromiseRaw, ReadableStream, Result, Uint8Array};
use serde::{Deserialize, Serialize};

use crate::{
  FSRSItem as FSRSBindingItem, ModelVersion,
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
  let boundary = |date: Date| {
    timezone
      .to_zoned(date.at(0, 0, 0, 0).checked_add(rollover)?)
      .map(|zoned| zoned.timestamp().as_millisecond())
  };
  loop {
    let (start, end) = match boundaries.get(&date) {
      Some(&value) => value,
      None => {
        let value = (boundary(date)?, boundary(date.tomorrow()?)?);
        boundaries.insert(date, value);
        value
      }
    };
    if start <= timestamp && timestamp < end {
      return Ok((date, (timestamp - start) as f64 / (end - start) as f64));
    }
    // Correct dates whose rollover lies in a skipped or repeated local-time range.
    date = date.checked_add(jiff::Span::new().days(if timestamp < start { -1 } else { 1 }))?;
  }
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
    entries[start..].to_vec()
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
) -> Result<Vec<(String, FSRSBindingItem, i64)>> {
  entries = remove_revlog_before_last_first_learn(entries);

  let mut position = |timestamp| {
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
    let mut previous = position(first.review_time)?;
    for item in entries.iter_mut().skip(1) {
      let current = position(item.review_time)?;
      item.last_interval =
        ((current.0 - previous.0).get_days() as f64 + current.1 - previous.1) as f32;
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
          entry.card_id.clone(),
          FSRSBindingItem {
            inner: fsrs::FSRSItem { reviews },
          },
          entry.review_time,
        )
      })
      .filter(|(_, item, _)| item.current().is_some_and(|r| r.inner.delta_t > 0.0))
      .collect(),
  )
}

pub(crate) fn convert_csv_bytes(
  data: &[u8],
  next_day_starts_at: i64,
  timezone_offset: &TimezoneOffset,
  use_fractional_days: bool,
) -> Result<Vec<FSRSBindingItem>> {
  let mut rdr = ReaderBuilder::new().has_headers(true).from_reader(data);

  let mut revlogs = rdr
    .deserialize::<RevlogEntry>()
    .collect::<std::result::Result<Vec<RevlogEntry>, _>>()
    .map_err(|e| napi::Error::from_reason(format!("CSV deserialization error: {}", e)))?;
  // Sort by review_time first to ensure ordering
  revlogs.sort_by_cached_key(|r| (r.card_id.clone(), r.review_time));

  // A conversion shares one timezone and rollover, so each date has one pair of boundaries.
  let mut boundaries = HashMap::new();

  // Group by card_id while maintaining time order
  let mut revlogs = revlogs
    .into_iter()
    .chunk_by(|r| r.card_id.clone())
    .into_iter()
    .map(|(_card_id, entries)| {
      convert_to_fsrs_items_internal(
        entries.collect(),
        next_day_starts_at,
        timezone_offset,
        use_fractional_days,
        &mut boundaries,
      )
    })
    .collect::<Result<Vec<_>>>()?
    .into_iter()
    .flatten()
    .collect_vec();

  // Sort by review_time to maintain correct order across groups
  revlogs.sort_by_cached_key(|(_, _, review_time)| *review_time);

  Ok(revlogs.into_iter().map(|(_, item, _)| item).collect())
}

/// Convert CSV review logs to FSRS training items.
///
/// FSRS-7 (the default) normalizes elapsed time by each local study day’s actual
/// duration between rollover boundaries, including fractional and same-day
/// intervals. FSRS-6 uses whole study days. Pass the same modelVersion to training.
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
  let timezone_offset = resolve_timezone_offset(timezone_or_offset);
  let use_fractional_days = !matches!(model_version, Some(ModelVersion::Fsrs6));

  match data {
    Either::A(data) => {
      let timezone_offset = timezone_offset?;
      Ok(Either::A(convert_csv_bytes(
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
      )?,
      Err(error) => PromiseRaw::reject(env, error)?,
    })),
  }
}

pub(crate) fn prepare_items(train_set: Vec<&FSRSBindingItem>) -> Vec<fsrs::FSRSItem> {
  let train_data: Vec<fsrs::FSRSItem> = train_set
    .into_iter()
    .map(|item| item.inner.clone())
    .collect();
  let (mut dataset_for_initialization, mut trainset): (Vec<fsrs::FSRSItem>, Vec<fsrs::FSRSItem>) =
    train_data
      .into_iter()
      .partition(|item| item.long_term_review_cnt() == 1);
  (dataset_for_initialization, trainset) = filter_outlier(dataset_for_initialization, trainset);
  [dataset_for_initialization, trainset].concat()
}
