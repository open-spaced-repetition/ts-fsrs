use napi::bindgen_prelude::{AsyncTask, Env, Result, Task};
use napi_derive::napi;
use std::sync::{Arc, Mutex};

use crate::{ComputeParametersOptions, FSRSItem, progress};

pub struct ComputeParametersTask {
  pub(crate) train: Vec<fsrs::FSRSItem>,
  pub(crate) state: Arc<Mutex<fsrs::CombinedProgressState>>,
  pub(crate) enable_short_term: bool,
  pub(crate) num_relearning_steps: Option<usize>,
  pub(crate) timeout_ms: u32,
  pub(crate) progress_cb: Option<progress::ProgressCallback>,
}

impl Task for ComputeParametersTask {
  type Output = Vec<f32>;
  type JsValue = Vec<f64>;

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

    let out = fsrs::compute_parameters(fsrs::ComputeParametersInput {
      train_set: std::mem::take(&mut self.train),
      progress: Some(Arc::clone(&self.state)),
      enable_short_term: self.enable_short_term,
      num_relearning_steps: self.num_relearning_steps,
    })
    .map_err(|e| napi::Error::from_reason(format!("compute_parameters failed: {e}")))?;

    #[cfg(not(target_arch = "wasm32"))]
    let _ = _progress_thread.join().ok();

    Ok(out)
  }

  fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
    Ok(output.iter().map(|&x| x as f64).collect())
  }
}

/// Calculate appropriate parameters for the provided review history.
#[napi(ts_return_type = "Promise<number[]>")]
pub fn compute_parameters(
  train_set: Vec<&FSRSItem>,
  #[napi(ts_arg_type = "ComputeParametersOptions")] options: Option<ComputeParametersOptions>,
) -> AsyncTask<ComputeParametersTask> {
  let train_data: Vec<fsrs::FSRSItem> = train_set
    .into_iter()
    .map(|item| item.inner.clone())
    .collect();

  let state = fsrs::CombinedProgressState::new_shared();
  let timeout = options.as_ref().and_then(|x| x.timeout).unwrap_or(500);

  let progress_tsfn = options
    .as_ref()
    .and_then(|x| x.progress.as_ref())
    .and_then(|cb| cb.build_threadsafe_function().weak::<true>().build().ok());

  // wasm: start polling here and do not pass callback into task
  #[cfg(target_arch = "wasm32")]
  let _progress_thread = {
    use crate::progress::spawn_progress_poller;
    spawn_progress_poller(Arc::clone(&state), timeout, progress_tsfn)
  };

  // non-wasm reuses TSFN in task; wasm sets it to None (unused).
  #[cfg(not(target_arch = "wasm32"))]
  let progress_tsfn_for_task = progress_tsfn;
  #[cfg(target_arch = "wasm32")]
  let progress_tsfn_for_task: Option<crate::progress::ProgressCallback> = None;

  let enable_short_term = options
    .as_ref()
    .map(|x| x.enable_short_term)
    .unwrap_or(true);

  let num_relearning_steps = options
    .as_ref()
    .and_then(|x| x.num_relearning_steps)
    .map(|x| x as usize);

  AsyncTask::new(ComputeParametersTask {
    train: train_data,
    state,
    timeout_ms: timeout,
    progress_cb: progress_tsfn_for_task,
    enable_short_term,
    num_relearning_steps,
  })
}
