#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
use napi::bindgen_prelude::Task;
use napi::bindgen_prelude::{Env, PromiseRaw, Result};
use napi_derive::napi;
#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
use std::sync::{Arc, Mutex};

use crate::{ComputeParametersOptions, FSRSItem, validate_card_ids};
#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
use crate::{model::ResolvedOptions, progress};

#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
pub struct ComputeParametersTask {
  pub(crate) train: Vec<fsrs::FSRSItem>,
  pub(crate) card_ids: Option<Vec<i64>>,
  pub(crate) state: Arc<Mutex<fsrs::CombinedProgressState>>,
  pub(crate) options: ResolvedOptions,
  pub(crate) progress_cb: Option<progress::ProgressCallback>,
}

#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
impl ComputeParametersTask {
  fn new(train_set: Vec<&FSRSItem>, options: Option<&ComputeParametersOptions>) -> Result<Self> {
    let resolved = ComputeParametersOptions::resolve(options);
    let card_ids = validate_card_ids(train_set.len(), ComputeParametersOptions::card_ids(options))?;
    let state = fsrs::CombinedProgressState::new_shared();

    Ok(Self {
      train: train_set
        .into_iter()
        .map(|item| item.inner.clone())
        .collect(),
      card_ids,
      state,
      options: resolved,
      progress_cb: progress::build_callback(options),
    })
  }
}

#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
impl ComputeParametersTask {
  fn run(&mut self) -> Result<Vec<f32>> {
    let progress_thread = progress::spawn_progress_poller(
      Arc::clone(&self.state),
      self.options.timeout_ms,
      self.progress_cb.take(),
    );

    let out = fsrs::compute_parameters(fsrs::ComputeParametersInput {
      card_ids: self.card_ids.take(),
      train_set: std::mem::take(&mut self.train),
      progress: Some(Arc::clone(&self.state)),
      enable_short_term: self.options.enable_short_term,
      enable_sched_penalties: self.options.enable_sched_penalties,
      num_relearning_steps: self.options.num_relearning_steps,
      training_config: self.options.training_config,
      model_version: self.options.model_version,
    })
    .map_err(|e| napi::Error::from_reason(format!("compute_parameters failed: {e}")))?;

    let _ = progress_thread.join().ok();

    Ok(out)
  }
}

#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
impl Task for ComputeParametersTask {
  type Output = Vec<f32>;
  type JsValue = Vec<f64>;

  fn compute(&mut self) -> Result<Self::Output> {
    let state = Arc::clone(&self.state);
    progress::catch_task_panic(&state, "compute_parameters", || self.run())
  }

  fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
    Ok(output.iter().map(|&x| x as f64).collect())
  }
}

/// Calculate appropriate parameters for the provided review history.
#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
#[napi(ts_return_type = "Promise<number[]>", catch_unwind)]
pub fn compute_parameters<'env>(
  env: &'env Env,
  train_set: Vec<&FSRSItem>,
  #[napi(ts_arg_type = "ComputeParametersOptions")] options: Option<ComputeParametersOptions>,
) -> Result<PromiseRaw<'env, Vec<f64>>> {
  match ComputeParametersTask::new(train_set, options.as_ref()) {
    Ok(task) => Ok(env.spawn(task)?.promise_object()),
    Err(error) => PromiseRaw::reject(env, error),
  }
}

/// Calculate appropriate parameters on the current thread for WASI Preview 1.
#[cfg(all(target_os = "wasi", target_env = "p1"))]
#[napi(ts_return_type = "Promise<number[]>", catch_unwind)]
pub fn compute_parameters<'env>(
  env: &'env Env,
  train_set: Vec<&FSRSItem>,
  #[napi(ts_arg_type = "ComputeParametersOptions")] options: Option<ComputeParametersOptions>,
) -> Result<PromiseRaw<'env, Vec<f64>>> {
  let resolved = ComputeParametersOptions::resolve(options.as_ref());
  let card_ids = match validate_card_ids(
    train_set.len(),
    ComputeParametersOptions::card_ids(options.as_ref()),
  ) {
    Ok(ids) => ids,
    Err(error) => return PromiseRaw::reject(env, error),
  };
  let callback = options
    .as_ref()
    .and_then(|options| options.progress.as_ref());
  let mut callback_error = None;
  let result = fsrs::compute_parameters_with_progress(
    fsrs::ComputeParametersInput {
      card_ids,
      train_set: train_set
        .into_iter()
        .map(|item| item.inner.clone())
        .collect(),
      progress: None,
      enable_short_term: resolved.enable_short_term,
      enable_sched_penalties: resolved.enable_sched_penalties,
      num_relearning_steps: resolved.num_relearning_steps,
      training_config: resolved.training_config,
      model_version: resolved.model_version,
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
  .map_err(|error| napi::Error::from_reason(format!("compute_parameters failed: {error}")));

  if let Some(error) = callback_error {
    return PromiseRaw::reject(env, error);
  }
  match result {
    Ok(parameters) => PromiseRaw::resolve(
      env,
      parameters.into_iter().map(f64::from).collect::<Vec<_>>(),
    ),
    Err(error) => PromiseRaw::reject(env, error),
  }
}
