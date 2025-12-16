use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use napi::Status;
use napi::bindgen_prelude::FnArgs;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};

type ProgressArgs = FnArgs<(u32, u32)>;
pub type ProgressCallback =
  ThreadsafeFunction<ProgressArgs, Option<bool>, ProgressArgs, Status, false, true>;

// ============================================================================
// Unified progress state trait
// ============================================================================

/// Trait for progress state types that can be polled and aborted
pub trait ProgressStateTrait: Send + 'static {
  fn current(&self) -> usize;
  fn total(&self) -> usize;
  fn finished(&self) -> bool;
  fn want_abort(&self) -> bool;
  fn set_want_abort(&mut self, value: bool);
}

// Implement for fsrs::CombinedProgressState
impl ProgressStateTrait for fsrs::CombinedProgressState {
  fn current(&self) -> usize {
    self.current()
  }
  fn total(&self) -> usize {
    self.total()
  }
  fn finished(&self) -> bool {
    self.finished()
  }
  fn want_abort(&self) -> bool {
    self.want_abort
  }
  fn set_want_abort(&mut self, value: bool) {
    self.want_abort = value;
  }
}

// TODO: evaluate_with_time_series_splits support progress callback
// Local progress state for evaluate and other operations
#[derive(Debug, Default)]
pub struct ProgressState {
  pub current: usize,
  pub total: usize,
  pub want_abort: bool,
  pub finished: bool,
}

impl ProgressStateTrait for ProgressState {
  fn current(&self) -> usize {
    self.current
  }
  fn total(&self) -> usize {
    self.total
  }
  fn finished(&self) -> bool {
    self.finished
  }
  fn want_abort(&self) -> bool {
    self.want_abort
  }
  fn set_want_abort(&mut self, value: bool) {
    self.want_abort = value;
  }
}

/// Spawns a lightweight progress polling thread that:
/// - Periodically reads progress from `fsrs::CombinedProgressState`
/// - Logs progress changes
/// - Sends (current, total) to JS if callback is provided
/// - Handles abort requests from JS callback failures
pub fn spawn_progress_poller<S: ProgressStateTrait>(
  state: Arc<Mutex<S>>,
  timeout_ms: u32,
  tsfn: Option<ProgressCallback>,
) -> thread::JoinHandle<()> {
  thread::spawn(move || {
    let mut last = (0usize, 1usize);
    let sleep_dur = Duration::from_millis(timeout_ms as u64);

    loop {
      // Read progress under lock, then drop lock before reporting or sleeping
      let (cur, tot, finished, already_aborted) = {
        let Ok(g) = state.lock() else {
          break; // Lock poisoned, exit polling thread
        };
        (g.current(), g.total().max(1), g.finished(), g.want_abort())
      };

      if finished || already_aborted {
        break;
      }

      if (cur, tot) != last {
        last = (cur, tot);

        #[cfg(debug_assertions)]
        eprintln!(
          "[progress] {cur}/{tot} ({:.1}%)",
          cur as f32 * 100.0 / tot as f32
        );

        // Call JS callback and check return value for abort signal
        if let Some(callback) = &tsfn {
          let state_for_callback = Arc::clone(&state);
          let status = callback.call_with_return_value(
            FnArgs {
              data: (cur as u32, tot as u32),
            },
            ThreadsafeFunctionCallMode::NonBlocking,
            move |result: napi::Result<Option<bool>>, _env| {
              // Abort if callback returns false OR throws an error
              let should_abort = match result {
                Ok(Some(false)) => true, // Explicitly returned false
                Err(_) => true,          // Callback threw an error
                _ => false,              // true or undefined
              };
              if should_abort && let Ok(mut guard) = state_for_callback.lock() {
                guard.set_want_abort(true);
              }
              Ok(()) // must return Ok from this closure
            },
          );

          // If the callback failed (including JS exceptions), signal abort
          if status != Status::Ok {
            #[cfg(debug_assertions)]
            eprintln!(
              "[progress] Callback failed with status: {:?}, aborting",
              status
            );
            if let Ok(mut guard) = state.lock() {
              guard.set_want_abort(true);
              return;
            }
          }
        }
      }

      std::thread::sleep(sleep_dur);
    }
  })
}
