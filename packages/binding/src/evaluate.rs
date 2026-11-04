#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
use napi::bindgen_prelude::Task;
use napi::bindgen_prelude::{Env, PromiseRaw, Result};
use napi_derive::napi;
#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
use std::sync::{Arc, Mutex};

use crate::{ComputeParametersOptions, FSRSItem, ModelEvaluation, prepare_items};
#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
use crate::{model::ResolvedOptions, progress};

/// Evaluate parameters using time-series splits.
#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
#[napi(ts_return_type = "Promise<ModelEvaluation>", catch_unwind)]
pub fn evaluate_with_time_series_splits<'env>(
  env: &'env Env,
  train_set: Vec<&FSRSItem>,
  #[napi(ts_arg_type = "ComputeParametersOptions")] options: Option<ComputeParametersOptions>,
) -> Result<PromiseRaw<'env, ModelEvaluation>> {
  match EvaluateParametersTask::new(train_set, options.as_ref()) {
    Ok(task) => Ok(env.spawn(task)?.promise_object()),
    Err(error) => PromiseRaw::reject(env, error),
  }
}

/// Evaluate parameters on the current thread for WASI Preview 1.
#[cfg(all(target_os = "wasi", target_env = "p1"))]
#[napi(ts_return_type = "Promise<ModelEvaluation>", catch_unwind)]
pub fn evaluate_with_time_series_splits<'env>(
  env: &'env Env,
  train_set: Vec<&FSRSItem>,
  #[napi(ts_arg_type = "ComputeParametersOptions")] options: Option<ComputeParametersOptions>,
) -> Result<PromiseRaw<'env, ModelEvaluation>> {
  let resolved = ComputeParametersOptions::resolve(options.as_ref());
  let prepared = prepare_items(
    train_set,
    ComputeParametersOptions::card_ids(options.as_ref()),
  );
  let (train, card_ids) = match prepared {
    Ok(input) => input,
    Err(error) => return PromiseRaw::reject(env, error),
  };
  let callback = options
    .as_ref()
    .and_then(|options| options.progress.as_ref());
  let mut callback_error = None;
  let result = fsrs::evaluate_with_time_series_splits(
    fsrs::ComputeParametersInput {
      card_ids,
      train_set: train,
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

#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
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
// Non-WASI-p1 targets: evaluation runs with a progress poller
// ============================================================================

#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
pub struct EvaluateParametersTask {
  pub(crate) train: Vec<fsrs::FSRSItem>,
  card_ids: Option<Vec<i64>>,
  pub(crate) state: Arc<Mutex<progress::ProgressState>>,
  options: ResolvedOptions,
  pub(crate) progress_cb: Option<progress::ProgressCallback>,
}

#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
impl EvaluateParametersTask {
  fn new(train_set: Vec<&FSRSItem>, options: Option<&ComputeParametersOptions>) -> Result<Self> {
    let resolved = ComputeParametersOptions::resolve(options);
    let (train, card_ids) = prepare_items(train_set, ComputeParametersOptions::card_ids(options))?;
    let state = Arc::new(Mutex::new(progress::ProgressState::default()));

    Ok(Self {
      train,
      card_ids,
      state,
      options: resolved,
      progress_cb: progress::build_callback(options),
    })
  }

  fn evaluate(&mut self) -> Result<fsrs::ModelEvaluation> {
    let progress_thread = progress::spawn_progress_poller(
      Arc::clone(&self.state),
      self.options.timeout_ms,
      self.progress_cb.take(),
    );

    let state = Arc::clone(&self.state);
    let input = fsrs::ComputeParametersInput {
      card_ids: self.card_ids.take(),
      train_set: std::mem::take(&mut self.train),
      progress: None,
      enable_short_term: self.options.enable_short_term,
      enable_sched_penalties: self.options.enable_sched_penalties,
      num_relearning_steps: self.options.num_relearning_steps,
      training_config: self.options.training_config,
      model_version: self.options.model_version,
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

    let _ = progress_thread.join().ok();

    result
  }
}
