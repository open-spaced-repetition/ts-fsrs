use napi::bindgen_prelude::{AsyncTask, Env, Result, Task};
use napi_derive::napi;
#[cfg(not(threadless_wasm))]
use std::sync::{Arc, Mutex};

use crate::{ComputeParametersOptions, FSRSItem, ModelEvaluation};
#[cfg(not(threadless_wasm))]
use crate::{prepare_items, progress};

/// Evaluate parameters using time-series splits.
#[napi(ts_return_type = "Promise<ModelEvaluation>", catch_unwind)]
pub fn evaluate_with_time_series_splits(
  train_set: Vec<&FSRSItem>,
  #[napi(ts_arg_type = "ComputeParametersOptions")] options: Option<ComputeParametersOptions>,
) -> AsyncTask<EvaluateParametersTask> {
  AsyncTask::new(EvaluateParametersTask::new(train_set, options.as_ref()))
}

impl Task for EvaluateParametersTask {
  type Output = fsrs::ModelEvaluation;
  type JsValue = ModelEvaluation;

  fn compute(&mut self) -> Result<Self::Output> {
    self.evaluate()
  }

  fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
    Ok(output.into())
  }
}

// ============================================================================
// Native and threaded wasm: evaluation runs with a progress poller
// ============================================================================

#[cfg(not(threadless_wasm))]
pub struct EvaluateParametersTask {
  pub(crate) train: Vec<fsrs::FSRSItem>,
  pub(crate) state: Arc<Mutex<progress::ProgressState>>,
  pub(crate) enable_short_term: bool,
  pub(crate) num_relearning_steps: Option<usize>,
  pub(crate) training_config: Option<fsrs::TrainingConfig>,
  #[cfg(not(target_arch = "wasm32"))]
  pub(crate) timeout_ms: u32,
  #[cfg(not(target_arch = "wasm32"))]
  pub(crate) progress_cb: Option<progress::ProgressCallback>,
  #[cfg(threaded_wasm)]
  pub(crate) progress_thread: Option<std::thread::JoinHandle<()>>,
}

#[cfg(not(threadless_wasm))]
impl EvaluateParametersTask {
  fn new(train_set: Vec<&FSRSItem>, options: Option<&ComputeParametersOptions>) -> Self {
    let resolved = ComputeParametersOptions::resolve(options);
    let state = Arc::new(Mutex::new(progress::ProgressState::default()));

    // wasm: start polling here, because the task itself cannot spawn threads
    #[cfg(threaded_wasm)]
    let progress_thread = Some(progress::spawn_progress_poller(
      Arc::clone(&state),
      resolved.timeout_ms,
      progress::build_callback(options),
    ));

    Self {
      train: prepare_items(train_set),
      state,
      enable_short_term: resolved.enable_short_term,
      num_relearning_steps: resolved.num_relearning_steps,
      training_config: resolved.training_config,
      // non-wasm reuses the TSFN in the task; wasm already consumed it above
      #[cfg(not(target_arch = "wasm32"))]
      timeout_ms: resolved.timeout_ms,
      #[cfg(not(target_arch = "wasm32"))]
      progress_cb: progress::build_callback(options),
      #[cfg(threaded_wasm)]
      progress_thread,
    }
  }

  fn evaluate(&mut self) -> Result<fsrs::ModelEvaluation> {
    #[cfg(not(target_arch = "wasm32"))]
    let progress_thread = progress::spawn_progress_poller(
      Arc::clone(&self.state),
      self.timeout_ms,
      self.progress_cb.take(),
    );

    let state = Arc::clone(&self.state);
    let input = fsrs::ComputeParametersInput {
      card_ids: None,
      train_set: std::mem::take(&mut self.train),
      progress: None,
      enable_short_term: self.enable_short_term,
      num_relearning_steps: self.num_relearning_steps,
      training_config: self.training_config,
    };
    let result = fsrs::evaluate_with_time_series_splits(input, move |item_progress| {
      if let Ok(mut guard) = state.lock() {
        guard.current = item_progress.current;
        guard.total = item_progress.total;
        return !guard.want_abort;
      }
      true
    })
    .map_err(|e| napi::Error::from_reason(format!("evaluate_with_time_series_splits failed: {e}")));

    if let Ok(mut guard) = self.state.lock() {
      guard.finished = true;
    }

    #[cfg(not(target_arch = "wasm32"))]
    let _ = progress_thread.join().ok();

    // WASM: join the progress thread
    #[cfg(threaded_wasm)]
    if let Some(handle) = self.progress_thread.take() {
      let _ = handle.join().ok();
    }

    result
  }
}

// ============================================================================
// Threadless wasm: the API needs threads, so it always rejects
// ============================================================================

#[cfg(threadless_wasm)]
pub struct EvaluateParametersTask {
  pub(crate) error: &'static str,
}

#[cfg(threadless_wasm)]
impl EvaluateParametersTask {
  fn new(_train_set: Vec<&FSRSItem>, options: Option<&ComputeParametersOptions>) -> Self {
    // Report the progress callback first: it is the more actionable of the two.
    let error = if ComputeParametersOptions::resolve(options).progress_requested {
      crate::threadless::PROGRESS_ERROR
    } else {
      crate::threadless::EVALUATE_ERROR
    };
    Self { error }
  }

  fn evaluate(&mut self) -> Result<fsrs::ModelEvaluation> {
    Err(napi::Error::from_reason(self.error))
  }
}
