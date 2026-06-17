use jiff::{
  Timestamp,
  tz::{TimeZone, TimeZoneDatabase},
};
use napi::bindgen_prelude::{Either, Result};
use napi_derive::napi;
use std::sync::OnceLock;

static BUNDLED_TIMEZONE_DATABASE: OnceLock<TimeZoneDatabase> = OnceLock::new();

fn bundled_timezone_database() -> &'static TimeZoneDatabase {
  BUNDLED_TIMEZONE_DATABASE.get_or_init(TimeZoneDatabase::bundled)
}

pub(crate) enum TimezoneOffset {
  TimeZone(TimeZone),
  Fixed(i64),
}

impl TimezoneOffset {
  pub(crate) fn offset_minutes(&self, timestamp: i64) -> Result<i64> {
    match self {
      Self::TimeZone(timezone) => {
        let ts = Timestamp::from_millisecond(timestamp)
          .map_err(|e| napi::Error::from_reason(format!("Invalid timestamp: {}", e)))?;
        Ok(i64::from(timezone.to_offset(ts).seconds() / 60))
      }
      Self::Fixed(offset_minutes) => Ok(*offset_minutes),
    }
  }
}

/// Timezone input used when converting CSV review timestamps to FSRS items.
///
/// Pass an IANA timezone name, such as `Asia/Shanghai`, when daylight saving
/// rules should be resolved for each review timestamp. Pass a number when the
/// source data should use one fixed UTC offset in minutes, such as `480` for
/// UTC+08:00 or `-300` for UTC-05:00.
#[napi]
pub type TimezoneOrOffset = Either<String, i64>;

pub(crate) fn resolve_timezone_offset(
  timezone_or_offset: TimezoneOrOffset,
) -> Result<TimezoneOffset> {
  match timezone_or_offset {
    Either::A(timezone) => bundled_timezone_database()
      .get(&timezone)
      .map(TimezoneOffset::TimeZone)
      .map_err(|e| napi::Error::from_reason(format!("Unsupported timezone '{}': {}", timezone, e))),
    Either::B(offset_minutes) => Ok(TimezoneOffset::Fixed(offset_minutes)),
  }
}
