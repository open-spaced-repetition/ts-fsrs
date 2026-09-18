use jiff::tz::{Offset, TimeZone, TimeZoneDatabase};
use napi::bindgen_prelude::{Either, Result};
use napi_derive::napi;
use std::sync::OnceLock;

static BUNDLED_TIMEZONE_DATABASE: OnceLock<TimeZoneDatabase> = OnceLock::new();

fn bundled_timezone_database() -> &'static TimeZoneDatabase {
  BUNDLED_TIMEZONE_DATABASE.get_or_init(TimeZoneDatabase::bundled)
}

pub(crate) type TimezoneOffset = TimeZone;

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
      .map_err(|e| napi::Error::from_reason(format!("Unsupported timezone '{}': {}", timezone, e))),
    Either::B(minutes) => {
      let seconds = minutes
        .checked_mul(60)
        .and_then(|n| i32::try_from(n).ok())
        .ok_or_else(|| napi::Error::from_reason("Invalid timezone offset"))?;
      Offset::from_seconds(seconds)
        .map(TimeZone::fixed)
        .map_err(|e| napi::Error::from_reason(format!("Invalid timezone offset: {}", e)))
    }
  }
}
