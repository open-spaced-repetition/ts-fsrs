use csv::ReaderBuilder;
use napi_derive::napi;

use napi::bindgen_prelude::{FnArgs, Function, Result};
use serde::{Deserialize, Serialize};
use time::{Date, Duration, OffsetDateTime};

use crate::FSRSItem as FSRSBindingItem;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevlogEntry {
  // card_id,review_time,review_rating,review_state,review_duration
  pub card_id: String,
  pub review_time: i64,
  pub review_rating: u32,
  pub review_state: u32,
  pub review_duration: u32,
  #[serde(skip)]
  pub last_interval: i32,
}

fn convert_to_date(
  timestamp: i64,
  next_day_starts_at: i64,
  timezone: &str,
  offset_provider: Option<&Function<FnArgs<(i64, String)>, i32>>,
) -> Result<Date> {
  let timestamp_secs = timestamp / 1000;
  let dt = OffsetDateTime::from_unix_timestamp(timestamp_secs)
    .map_err(|e| napi::Error::from_reason(format!("Invalid timestamp: {}", e)))?;

  // Compute offset minutes via JS callback if provided; fall back to fixed +8h.
  let offset_minutes: i64 = if let Some(cb) = offset_provider {
    let minutes: i32 = cb.call(FnArgs {
      data: (timestamp, timezone.to_string()),
    })?;
    minutes as i64
  } else {
    // Asia/Shanghai UTC+8
    8 * 60
  };
  let adjusted_dt = dt + Duration::minutes(offset_minutes) - Duration::hours(next_day_starts_at);
  Ok(adjusted_dt.date())
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
  timezone: &str,
  offset_provider: Option<&Function<FnArgs<(i64, String)>, i32>>,
) -> Result<Vec<(String, FSRSBindingItem)>> {
  entries = remove_revlog_before_last_first_learn(entries);

  if !entries.is_empty() {
    let mut prev_date = convert_to_date(
      entries[0].review_time,
      next_day_starts_at,
      timezone,
      offset_provider,
    )?;
    for item in entries.iter_mut().skip(1) {
      let date_current = convert_to_date(
        item.review_time,
        next_day_starts_at,
        timezone,
        offset_provider,
      )?;
      item.last_interval = (date_current - prev_date).whole_days() as i32;
      prev_date = date_current;
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
            delta_t: r.last_interval.max(0) as u32,
          })
          .collect();
        (
          entry.card_id.clone(),
          FSRSBindingItem {
            inner: fsrs::FSRSItem { reviews },
          },
        )
      })
      .filter(|(_, item)| item.include_long_term_reviews())
      .collect(),
  )
}

#[napi]
pub fn convert_csv_to_fsrs_items(
  data: &[u8],
  next_day_starts_at: i64,
  timezone: String,
  #[napi(ts_arg_type = "(ms: number, timezone: string) => number")] offset_provider: Option<
    Function<FnArgs<(i64, String)>, i32>,
  >,
) -> Result<Vec<FSRSBindingItem>> {
  let mut rdr = ReaderBuilder::new().has_headers(true).from_reader(data);

  let revlogs: Vec<RevlogEntry> = rdr
    .deserialize::<RevlogEntry>()
    .collect::<std::result::Result<Vec<RevlogEntry>, _>>()
    .map_err(|e| napi::Error::from_reason(format!("CSV deserialization error: {}", e)))?;

  let mut grouped = std::collections::HashMap::<String, Vec<RevlogEntry>>::new();
  for entry in revlogs.into_iter() {
    grouped
      .entry(entry.card_id.clone())
      .or_default()
      .push(entry);
  }

  for vec in grouped.values_mut() {
    if vec.len() > 1 {
      vec.sort_unstable_by_key(|r| r.review_time);
    }
  }

  let mut result: Vec<(String, FSRSBindingItem)> = Vec::new();
  for (_cid, entries) in grouped {
    match convert_to_fsrs_items_internal(
      entries,
      next_day_starts_at,
      &timezone,
      offset_provider.as_ref(),
    ) {
      Ok(items) => result.extend(items),
      Err(e) => return Err(e),
    }
  }

  Ok(result.into_iter().map(|(_, item)| item).collect())
}
