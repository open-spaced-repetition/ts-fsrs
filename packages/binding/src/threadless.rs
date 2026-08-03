//! Error messages for the threadless `wasm32-wasip1` target.
//!
//! This target has no threads, so the progress poller (`crate::progress`) is not
//! compiled in and the APIs relying on it reject the call instead.

pub const PROGRESS_ERROR: &str =
  "Progress callbacks are not supported by the threadless wasm32-wasip1 target";
