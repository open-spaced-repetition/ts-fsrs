use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use napi::Status;
use napi::bindgen_prelude::FnArgs;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};

type ProgressArgs = FnArgs<(u32, u32)>;
pub type ProgressCallback = ThreadsafeFunction<ProgressArgs, (), ProgressArgs, Status, false, true>;

pub struct ProgressReporter {
  callback: Option<ProgressCallback>,
}

impl ProgressReporter {
  pub fn new(callback: Option<ProgressCallback>) -> Self {
    Self { callback }
  }

  /// Report progress to JS callback
  /// Returns Err if callback fails, allowing caller to abort
  pub fn report(&self, cur: usize, tot: usize) -> Result<(), ()> {
    if let Some(callback) = &self.callback {
      let status = callback.call(
        FnArgs {
          data: (cur as u32, tot as u32),
        },
        ThreadsafeFunctionCallMode::NonBlocking,
      );
      // Check if callback failed
      if status != Status::Ok {
        return Err(());
      }
    }
    #[cfg(debug_assertions)]
    eprintln!(
      "[progress] {cur}/{tot} ({:.1}%)",
      cur as f32 * 100.0 / tot as f32
    );
    Ok(())
  }
}

/// Spawns a lightweight progress polling thread that:
/// - Periodically reads progress from `fsrs::CombinedProgressState`
/// - Logs progress changes
/// - Sends (current, total) to JS if callback is provided
/// - Handles abort requests from JS callback failures
pub fn spawn_progress_poller(
  state: Arc<Mutex<fsrs::CombinedProgressState>>,
  timeout_ms: u32,
  callback: Option<ProgressCallback>,
) -> thread::JoinHandle<()> {
  let reporter = ProgressReporter::new(callback);
  let state_for_poll = Arc::clone(&state);

  thread::spawn(move || {
    let mut finished = false;
    let sleep_dur = Duration::from_millis(timeout_ms as u64);

    while !finished {
      thread::sleep(sleep_dur);

      // Read progress under lock
      let mut guard = state_for_poll.lock().unwrap();
      let cur = guard.current();
      let tot = guard.total().max(1);
      finished = guard.finished();

      // Report progress, handle callback errors by requesting abort
      if reporter.report(cur, tot).is_err() {
        guard.want_abort = true;
        return;
      }
    }
  })
}
