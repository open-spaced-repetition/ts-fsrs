use napi::bindgen_prelude::{AsyncTask, Env, Result, Task};
use napi_derive::napi;
use std::sync::{Arc, Mutex};

#[cfg(not(threadless_wasm))]
use crate::progress;
use crate::{ComputeParametersOptions, FSRSItem};

pub struct ComputeParametersTask {
  pub(crate) train: Vec<fsrs::FSRSItem>,
  pub(crate) state: Arc<Mutex<fsrs::CombinedProgressState>>,
  pub(crate) enable_short_term: bool,
  pub(crate) num_relearning_steps: Option<usize>,
  pub(crate) training_config: Option<fsrs::TrainingConfig>,
  #[cfg(not(target_arch = "wasm32"))]
  pub(crate) timeout_ms: u32,
  #[cfg(not(target_arch = "wasm32"))]
  pub(crate) progress_cb: Option<progress::ProgressCallback>,
  #[cfg(threaded_wasm)]
  pub(crate) progress_thread: Option<std::thread::JoinHandle<()>>,
  /// Set when the caller passed a progress callback this target cannot honour.
  #[cfg(threadless_wasm)]
  pub(crate) progress_error: Option<&'static str>,
}

impl ComputeParametersTask {
  fn new(train_set: Vec<&FSRSItem>, options: Option<&ComputeParametersOptions>) -> Self {
    let resolved = ComputeParametersOptions::resolve(options);
    let state = fsrs::CombinedProgressState::new_shared();

    // wasm: start polling here, because the task itself cannot spawn threads
    #[cfg(threaded_wasm)]
    let progress_thread = Some(progress::spawn_progress_poller(
      Arc::clone(&state),
      resolved.timeout_ms,
      progress::build_callback(options),
    ));

    Self {
      train: train_set
        .into_iter()
        .map(|item| item.inner.clone())
        .collect(),
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
      #[cfg(threadless_wasm)]
      progress_error: resolved
        .progress_requested
        .then_some(crate::threadless::PROGRESS_ERROR),
    }
  }
}

impl Task for ComputeParametersTask {
  type Output = Vec<f32>;
  type JsValue = Vec<f64>;

  fn compute(&mut self) -> Result<Self::Output> {
    #[cfg(threadless_wasm)]
    if let Some(reason) = self.progress_error {
      return Err(napi::Error::from_reason(reason));
    }

    #[cfg(not(target_arch = "wasm32"))]
    let progress_thread = progress::spawn_progress_poller(
      Arc::clone(&self.state),
      self.timeout_ms,
      self.progress_cb.take(),
    );

    let out = fsrs::compute_parameters(fsrs::ComputeParametersInput {
      card_ids: None,
      train_set: std::mem::take(&mut self.train),
      progress: Some(Arc::clone(&self.state)),
      enable_short_term: self.enable_short_term,
      num_relearning_steps: self.num_relearning_steps,
      training_config: self.training_config,
    })
    .map_err(|e| napi::Error::from_reason(format!("compute_parameters failed: {e}")))?;

    #[cfg(not(target_arch = "wasm32"))]
    let _ = progress_thread.join().ok();

    // WASM: join the progress thread
    #[cfg(threaded_wasm)]
    if let Some(handle) = self.progress_thread.take() {
      let _ = handle.join().ok();
    }

    Ok(out)
  }

  fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
    Ok(output.iter().map(|&x| x as f64).collect())
  }
}

/// Calculate appropriate parameters for the provided review history.
#[napi(ts_return_type = "Promise<number[]>", catch_unwind)]
pub fn compute_parameters(
  train_set: Vec<&FSRSItem>,
  #[napi(ts_arg_type = "ComputeParametersOptions")] options: Option<ComputeParametersOptions>,
) -> AsyncTask<ComputeParametersTask> {
  AsyncTask::new(ComputeParametersTask::new(train_set, options.as_ref()))
}
