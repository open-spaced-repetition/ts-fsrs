use napi::bindgen_prelude::{AsyncTask, Env, Result, Task};
use napi_derive::napi;
use std::sync::{Arc, Mutex};

use crate::{
  ComputeParametersOptions, FSRSItem, ModelEvaluation, prepare_items,
  progress::{self, ProgressState},
};

pub struct EvaluateParametersTask {
  pub(crate) train: Vec<fsrs::FSRSItem>,
  pub(crate) state: Arc<Mutex<progress::ProgressState>>,
  pub(crate) enable_short_term: bool,
  pub(crate) num_relearning_steps: Option<usize>,
  #[cfg(not(target_arch = "wasm32"))]
  pub(crate) timeout_ms: u32,
  #[cfg(not(target_arch = "wasm32"))]
  pub(crate) progress_cb: Option<progress::ProgressCallback>,
  #[cfg(target_arch = "wasm32")]
  pub(crate) progress_thread: Option<std::thread::JoinHandle<()>>,
}

impl Task for EvaluateParametersTask {
  type Output = fsrs::ModelEvaluation;
  type JsValue = ModelEvaluation;

  fn compute(&mut self) -> Result<Self::Output> {
    #[cfg(not(target_arch = "wasm32"))]
    let _progress_thread = {
      use crate::progress::spawn_progress_poller;
      spawn_progress_poller(
        Arc::clone(&self.state),
        self.timeout_ms,
        self.progress_cb.take(),
      )
    };

    let state = Arc::clone(&self.state);
    let input = fsrs::ComputeParametersInput {
      train_set: std::mem::take(&mut self.train),
      progress: None,
      enable_short_term: self.enable_short_term,
      num_relearning_steps: self.num_relearning_steps,
    };
    let result = fsrs::evaluate_with_time_series_splits(input, move |item_progress| {
      if let Ok(mut guard) = state.lock() {
        guard.current = item_progress.current;
        guard.total = item_progress.total;
        return !guard.want_abort;
      }
      true
    })
    .map_err(|e| napi::Error::from_reason(format!("evaluate_parameters failed: {e}")));

    if let Ok(mut guard) = self.state.lock() {
      guard.finished = true;
    }

    #[cfg(not(target_arch = "wasm32"))]
    let _ = _progress_thread.join().ok();

    // WASM: join the progress thread
    #[cfg(target_arch = "wasm32")]
    if let Some(handle) = self.progress_thread.take() {
      let _ = handle.join().ok();
    }

    result
  }

  fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
    Ok(ModelEvaluation {
      log_loss: output.log_loss as f64,
      rmse_bins: output.rmse_bins as f64,
    })
  }
}

/// Evaluate parameters using time-series splits.
#[napi(ts_return_type = "Promise<ModelEvaluation>", catch_unwind)]
pub fn evaluate_with_time_series_splits(
  train_set: Vec<&FSRSItem>,
  #[napi(ts_arg_type = "ComputeParametersOptions")] options: Option<ComputeParametersOptions>,
) -> AsyncTask<EvaluateParametersTask> {
  let items = prepare_items(train_set);

  let enable_short_term = options
    .as_ref()
    .map(|x| x.enable_short_term)
    .unwrap_or(true);

  let num_relearning_steps = options
    .as_ref()
    .and_then(|x| x.num_relearning_steps)
    .map(|x| x as usize);
  let timeout = options.as_ref().and_then(|x| x.timeout).unwrap_or(500);

  let state = Arc::new(Mutex::new(ProgressState::default()));

  let progress_tsfn = options
    .as_ref()
    .and_then(|x| x.progress.as_ref())
    .and_then(|cb| cb.build_threadsafe_function().weak::<true>().build().ok());

  // wasm: start polling here and do not pass callback into task
  #[cfg(target_arch = "wasm32")]
  let progress_thread_handle =
    { progress::spawn_progress_poller(Arc::clone(&state), timeout, progress_tsfn) };
  // non-wasm reuses TSFN in task; wasm sets it to None (unused).
  #[cfg(not(target_arch = "wasm32"))]
  let progress_tsfn_for_task = progress_tsfn;

  AsyncTask::new(EvaluateParametersTask {
    train: items,
    state,
    #[cfg(not(target_arch = "wasm32"))]
    timeout_ms: timeout,
    #[cfg(not(target_arch = "wasm32"))]
    progress_cb: progress_tsfn_for_task,
    enable_short_term,
    num_relearning_steps,
    #[cfg(target_arch = "wasm32")]
    progress_thread: Some(progress_thread_handle),
  })
}
