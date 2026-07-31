#[cfg(threadless_wasm)]
use napi::bindgen_prelude::PromiseRaw;
#[cfg(not(threadless_wasm))]
use napi::bindgen_prelude::{AsyncTask, Task};
use napi::bindgen_prelude::{Env, Result};
use napi_derive::napi;
#[cfg(not(threadless_wasm))]
use std::sync::{Arc, Mutex};

#[cfg(not(threadless_wasm))]
use crate::progress;
use crate::{ComputeParametersOptions, FSRSItem, ModelEvaluation, prepare_items};

/// Evaluate parameters using time-series splits.
#[cfg(not(threadless_wasm))]
#[napi(ts_return_type = "Promise<ModelEvaluation>", catch_unwind)]
pub fn evaluate_with_time_series_splits(
  train_set: Vec<&FSRSItem>,
  #[napi(ts_arg_type = "ComputeParametersOptions")] options: Option<ComputeParametersOptions>,
) -> AsyncTask<EvaluateParametersTask> {
  AsyncTask::new(EvaluateParametersTask::new(train_set, options.as_ref()))
}

/// Evaluate parameters on the current thread inside a threadless WASM worker.
#[cfg(threadless_wasm)]
#[napi(ts_return_type = "Promise<ModelEvaluation>", catch_unwind)]
pub fn evaluate_with_time_series_splits<'env>(
  env: &'env Env,
  train_set: Vec<&FSRSItem>,
  #[napi(ts_arg_type = "ComputeParametersOptions")] options: Option<ComputeParametersOptions>,
) -> Result<PromiseRaw<'env, ModelEvaluation>> {
  let resolved = ComputeParametersOptions::resolve(options.as_ref());
  let callback = options
    .as_ref()
    .and_then(|options| options.progress.as_ref());
  let mut callback_error = None;
  let result = fsrs::evaluate_with_time_series_splits(
    fsrs::ComputeParametersInput {
      card_ids: None,
      train_set: prepare_items(train_set),
      progress: None,
      enable_short_term: resolved.enable_short_term,
      num_relearning_steps: resolved.num_relearning_steps,
      training_config: resolved.training_config,
    },
    |progress| match callback {
      Some(callback) => {
        match callback.call((progress.current as u32, progress.total as u32).into()) {
          Ok(Some(false)) => false,
          Ok(_) => true,
          Err(error) => {
            callback_error = Some(error);
            false
          }
        }
      }
      None => true,
    },
  )
  .map(ModelEvaluation::from)
  .map_err(|error| {
    napi::Error::from_reason(format!("evaluate_with_time_series_splits failed: {error}"))
  });

  if let Some(error) = callback_error {
    return PromiseRaw::reject(env, error);
  }
  match result {
    Ok(metrics) => PromiseRaw::resolve(env, metrics),
    Err(error) => PromiseRaw::reject(env, error),
  }
}

#[cfg(not(threadless_wasm))]
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
