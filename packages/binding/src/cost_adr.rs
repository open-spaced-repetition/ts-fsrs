use napi::bindgen_prelude::{AsyncTask, Env, Result, Task};
use napi_derive::napi;
use serde::Deserialize;
use std::sync::Arc;
#[cfg(not(target_arch = "wasm32"))]
use std::sync::Mutex;

#[cfg(not(target_arch = "wasm32"))]
use crate::progress;
use crate::progress::ProgressFunc;
use crate::{SimulatorConfig, SimulatorConfigInput};

#[napi(object)]
#[derive(Debug, Deserialize)]
pub struct CostAdrMetrics {
  pub memorized_average: f64,
  pub time_average: f64,
  pub memorized_per_minute: f64,
  pub total_reviews: u32,
  pub total_lapses: u32,
  pub total_cost: f64,
}

#[napi(object)]
#[derive(Debug, Deserialize)]
pub struct CostAdrAucMetrics {
  pub baseline_point_count: u32,
  pub scheduler_point_count: u32,
  pub baseline_frontier_count: u32,
  pub scheduler_frontier_count: u32,
  pub target_count: u32,
  pub covered_target_count: u32,
  pub total_span: f64,
  pub covered_span: f64,
  pub span_coverage_percent: f64,
  pub same_target_time_saved_auc: Option<f64>,
  pub baseline_time_auc: Option<f64>,
  pub relative_same_target_time_saved_auc_percent: Option<f64>,
}

#[napi(object)]
#[derive(Debug, Deserialize)]
pub struct CostAdrEvaluationPoint {
  pub goal_cost_weight: f64,
  pub metrics: CostAdrMetrics,
  pub average_desired_retention: Option<f64>,
}

#[napi(object)]
#[derive(Debug, Deserialize)]
pub struct CostAdrGenerationMetrics {
  pub generation: u32,
  pub best_hypervolume_delta: f64,
  pub generation_best_hypervolume_delta: f64,
  pub mean_hypervolume_delta: f64,
  pub sigma: f64,
}

/// Napi wrapper around [`fsrs::CostAdrPolicy`].
#[napi(js_name = "BindingCostAdrPolicy")]
#[derive(Debug)]
pub struct CostAdrPolicy {
  pub(crate) inner: fsrs::CostAdrPolicy,
}

#[napi]
impl CostAdrPolicy {
  #[napi(getter)]
  pub fn coefficients(&self) -> Vec<f64> {
    self.inner.coefficients.iter().map(|&x| x as f64).collect()
  }
  #[napi(getter)]
  pub fn cost_weight_min(&self) -> f64 {
    self.inner.cost_weight_min as f64
  }
  #[napi(getter)]
  pub fn cost_weight_max(&self) -> f64 {
    self.inner.cost_weight_max as f64
  }
  #[napi(getter)]
  pub fn retention_min(&self) -> f64 {
    self.inner.retention_min as f64
  }
  #[napi(getter)]
  pub fn retention_max(&self) -> f64 {
    self.inner.retention_max as f64
  }
  #[napi(getter)]
  pub fn max_interval_days(&self) -> Option<f64> {
    self.inner.max_interval_days.map(|x| x as f64)
  }
}

/// Napi wrapper around [`fsrs::CostAdrTrainingResult`].
#[napi(js_name = "BindingCostAdrTrainingResult")]
#[derive(Debug)]
pub struct CostAdrTrainingResult {
  pub(crate) inner: fsrs::CostAdrTrainingResult,
}

#[napi]
impl CostAdrTrainingResult {
  #[napi(getter)]
  pub fn policy(&self) -> CostAdrPolicy {
    CostAdrPolicy {
      inner: self.inner.policy.clone(),
    }
  }
  #[napi(getter)]
  pub fn baseline_metrics(&self) -> Result<Vec<CostAdrMetrics>> {
    serde_json::to_value(&self.inner.baseline_metrics)
      .and_then(serde_json::from_value)
      .map_err(|e| napi::Error::from_reason(format!("convert baseline_metrics failed: {e}")))
  }
  #[napi(getter)]
  pub fn baseline_hypervolume(&self) -> f64 {
    self.inner.baseline_hypervolume as f64
  }
  #[napi(getter)]
  pub fn best_hypervolume(&self) -> f64 {
    self.inner.best_hypervolume as f64
  }
  #[napi(getter)]
  pub fn best_hypervolume_delta(&self) -> f64 {
    self.inner.best_hypervolume_delta as f64
  }
  #[napi(getter)]
  pub fn best_auc_metrics(&self) -> Result<CostAdrAucMetrics> {
    // `CostAdrAucMetrics` is `Copy`, so pass it by value (no needless borrow).
    serde_json::to_value(self.inner.best_auc_metrics)
      .and_then(serde_json::from_value)
      .map_err(|e| napi::Error::from_reason(format!("convert best_auc_metrics failed: {e}")))
  }
  #[napi(getter)]
  pub fn best_cost_weight_metrics(&self) -> Result<Vec<CostAdrEvaluationPoint>> {
    serde_json::to_value(&self.inner.best_cost_weight_metrics)
      .and_then(serde_json::from_value)
      .map_err(|e| {
        napi::Error::from_reason(format!("convert best_cost_weight_metrics failed: {e}"))
      })
  }
  #[napi(getter)]
  pub fn history(&self) -> Result<Vec<CostAdrGenerationMetrics>> {
    serde_json::to_value(&self.inner.history)
      .and_then(serde_json::from_value)
      .map_err(|e| napi::Error::from_reason(format!("convert history failed: {e}")))
  }
  #[napi(getter)]
  pub fn training_seconds(&self) -> f64 {
    self.inner.training_seconds as f64
  }
}

// ============================================================================
// Training entry point
// ============================================================================

#[napi(object)]
pub struct CostAdrTrainingInput<'env> {
  pub simulator_config: SimulatorConfigInput,
  pub parameters: Vec<f64>,
  pub population_size: Option<u32>,
  pub generations: Option<u32>,
  pub sigma0: Option<f64>,
  pub seed: Option<u32>,
  pub simulation_seed: Option<u32>,
  pub lower_bound: Option<f64>,
  pub upper_bound: Option<f64>,
  pub initial_coefficients: Option<Vec<f64>>,
  pub cost_weights: Option<Vec<f64>>,
  pub baseline_desired_retentions: Option<Vec<f64>>,
  #[napi(ts_type = "(current: number, total: number) => boolean | undefined | void")]
  pub progress: Option<ProgressFunc<'env>>,
  #[napi(ts_type = "number")]
  pub timeout: Option<u32>,
}

fn non_empty_finite_vec(values: Vec<f64>, name: &str) -> Result<Vec<f32>> {
  if values.is_empty() {
    return Err(napi::Error::from_reason(format!(
      "`{name}` must not be empty"
    )));
  }
  let converted: Vec<f32> = values.iter().map(|&x| x as f32).collect();
  if converted.iter().any(|value| !value.is_finite()) {
    return Err(napi::Error::from_reason(format!(
      "`{name}` must contain only finite numbers"
    )));
  }
  Ok(converted)
}

fn optional_f32_vec(values: &Option<Vec<f64>>) -> Option<Vec<f32>> {
  values.as_ref().and_then(|values| {
    if values.is_empty() {
      None
    } else {
      Some(values.iter().map(|&x| x as f32).collect())
    }
  })
}

#[napi(object)]
#[derive(Debug, Default)]
pub struct CostAdrTrainingConfigInput {
  pub population_size: Option<u32>,
  pub generations: Option<u32>,
  pub sigma0: Option<f64>,
  pub seed: Option<u32>,
  pub simulation_seed: Option<u32>,
  pub lower_bound: Option<f64>,
  pub upper_bound: Option<f64>,
  pub initial_coefficients: Option<Vec<f64>>,
  pub cost_weights: Option<Vec<f64>>,
  pub baseline_desired_retentions: Option<Vec<f64>>,
}

/// Build a [`fsrs::CostAdrTrainingConfig`] from the JS input, falling back to
/// fsrs defaults for any omitted field. The `progress` handle is attached later.
fn build_fsrs_training_config(input: &CostAdrTrainingConfigInput) -> fsrs::CostAdrTrainingConfig {
  let defaults = fsrs::CostAdrTrainingConfig::default();
  fsrs::CostAdrTrainingConfig {
    population_size: input
      .population_size
      .map(|v| v as usize)
      .unwrap_or(defaults.population_size),
    generations: input
      .generations
      .map(|v| v as usize)
      .unwrap_or(defaults.generations),
    sigma0: input.sigma0.map(|v| v as f32).unwrap_or(defaults.sigma0),
    seed: input.seed.map(|v| v as u64).or(defaults.seed),
    simulation_seed: input
      .simulation_seed
      .map(|v| v as u64)
      .or(defaults.simulation_seed),
    lower_bound: input
      .lower_bound
      .map(|v| v as f32)
      .unwrap_or(defaults.lower_bound),
    upper_bound: input
      .upper_bound
      .map(|v| v as f32)
      .unwrap_or(defaults.upper_bound),
    initial_coefficients: optional_f32_vec(&input.initial_coefficients)
      .unwrap_or(defaults.initial_coefficients),
    cost_weights: optional_f32_vec(&input.cost_weights).unwrap_or(defaults.cost_weights),
    baseline_desired_retentions: optional_f32_vec(&input.baseline_desired_retentions)
      .unwrap_or(defaults.baseline_desired_retentions),
    progress: None,
  }
}

/// Napi wrapper around [`fsrs::CostAdrTrainingConfig`] (inner form).
#[napi(js_name = "BindingCostAdrTrainingConfig")]
#[derive(Debug)]
pub struct CostAdrTrainingConfig {
  pub(crate) inner: fsrs::CostAdrTrainingConfig,
}

#[napi]
impl CostAdrTrainingConfig {
  #[napi(constructor)]
  pub fn new(input: Option<CostAdrTrainingConfigInput>) -> Self {
    Self {
      inner: build_fsrs_training_config(&input.unwrap_or_default()),
    }
  }
  #[napi(getter)]
  pub fn population_size(&self) -> u32 {
    self.inner.population_size as u32
  }
  #[napi(getter)]
  pub fn generations(&self) -> u32 {
    self.inner.generations as u32
  }
  #[napi(getter)]
  pub fn sigma0(&self) -> f64 {
    self.inner.sigma0 as f64
  }
  #[napi(getter)]
  pub fn seed(&self) -> Option<f64> {
    self.inner.seed.map(|v| v as f64)
  }
  #[napi(getter)]
  pub fn simulation_seed(&self) -> Option<f64> {
    self.inner.simulation_seed.map(|v| v as f64)
  }
  #[napi(getter)]
  pub fn lower_bound(&self) -> f64 {
    self.inner.lower_bound as f64
  }
  #[napi(getter)]
  pub fn upper_bound(&self) -> f64 {
    self.inner.upper_bound as f64
  }
  #[napi(getter)]
  pub fn initial_coefficients(&self) -> Vec<f64> {
    self
      .inner
      .initial_coefficients
      .iter()
      .map(|&x| x as f64)
      .collect()
  }
  #[napi(getter)]
  pub fn cost_weights(&self) -> Vec<f64> {
    self.inner.cost_weights.iter().map(|&x| x as f64).collect()
  }
  #[napi(getter)]
  pub fn baseline_desired_retentions(&self) -> Vec<f64> {
    self
      .inner
      .baseline_desired_retentions
      .iter()
      .map(|&x| x as f64)
      .collect()
  }
}

/// Build the inner-form training config from the flat training input.
fn training_config_from_input(input: &CostAdrTrainingInput) -> CostAdrTrainingConfig {
  CostAdrTrainingConfig {
    inner: build_fsrs_training_config(&CostAdrTrainingConfigInput {
      population_size: input.population_size,
      generations: input.generations,
      sigma0: input.sigma0,
      seed: input.seed,
      simulation_seed: input.simulation_seed,
      lower_bound: input.lower_bound,
      upper_bound: input.upper_bound,
      initial_coefficients: input.initial_coefficients.clone(),
      cost_weights: input.cost_weights.clone(),
      baseline_desired_retentions: input.baseline_desired_retentions.clone(),
    }),
  }
}

pub struct TrainCostAdrTask {
  pub(crate) config: fsrs::SimulatorConfig,
  pub(crate) parameters: Vec<f32>,
  pub(crate) training_config: fsrs::CostAdrTrainingConfig,
  #[cfg(not(target_arch = "wasm32"))]
  pub(crate) state: Arc<Mutex<fsrs::CombinedProgressState>>,
  #[cfg(not(target_arch = "wasm32"))]
  pub(crate) timeout_ms: u32,
  #[cfg(not(target_arch = "wasm32"))]
  pub(crate) progress_cb: Option<progress::ProgressCallback>,
  #[cfg(target_arch = "wasm32")]
  pub(crate) progress_thread: Option<std::thread::JoinHandle<()>>,
}

impl Task for TrainCostAdrTask {
  type Output = fsrs::CostAdrTrainingResult;
  type JsValue = CostAdrTrainingResult;

  fn compute(&mut self) -> Result<Self::Output> {
    #[cfg(not(target_arch = "wasm32"))]
    let progress_thread = {
      use crate::progress::spawn_progress_poller;
      spawn_progress_poller(
        Arc::clone(&self.state),
        self.timeout_ms,
        self.progress_cb.take(),
      )
    };

    let result =
      fsrs::CostAdrPolicy::train_single_user(&self.config, &self.parameters, &self.training_config)
        .map_err(|e| match e {
          fsrs::FSRSError::Interrupted => napi::Error::from_reason("Interrupted"),
          other => napi::Error::from_reason(format!("train_cost_adr_experiment failed: {other}")),
        });

    #[cfg(not(target_arch = "wasm32"))]
    let _ = progress_thread.join().ok();

    #[cfg(target_arch = "wasm32")]
    if let Some(handle) = self.progress_thread.take() {
      let _ = handle.join().ok();
    }

    result
  }

  fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
    Ok(CostAdrTrainingResult { inner: output })
  }
}

#[napi(ts_return_type = "Promise<BindingCostAdrTrainingResult>", catch_unwind)]
pub fn train_cost_adr_experiment(
  input: CostAdrTrainingInput,
) -> Result<AsyncTask<TrainCostAdrTask>> {
  let mut training_config = training_config_from_input(&input).inner;
  let CostAdrTrainingInput {
    simulator_config,
    parameters,
    progress,
    timeout,
    ..
  } = input;
  let config = SimulatorConfig::new(Some(simulator_config)).inner;
  let parameters = non_empty_finite_vec(parameters, "parameters")?;

  let state = fsrs::CombinedProgressState::new_shared();
  let timeout = timeout.unwrap_or(500);
  let progress_tsfn = progress
    .as_ref()
    .and_then(|cb| cb.build_threadsafe_function().weak::<true>().build().ok());

  #[cfg(target_arch = "wasm32")]
  let progress_thread_handle = {
    use crate::progress::spawn_progress_poller;
    Some(spawn_progress_poller(
      Arc::clone(&state),
      timeout,
      progress_tsfn,
    ))
  };

  #[cfg(not(target_arch = "wasm32"))]
  let progress_tsfn_for_task = progress_tsfn;

  training_config.progress = Some(Arc::clone(&state));

  Ok(AsyncTask::new(TrainCostAdrTask {
    config,
    parameters,
    training_config,
    #[cfg(not(target_arch = "wasm32"))]
    state,
    #[cfg(not(target_arch = "wasm32"))]
    timeout_ms: timeout,
    #[cfg(not(target_arch = "wasm32"))]
    progress_cb: progress_tsfn_for_task,
    #[cfg(target_arch = "wasm32")]
    progress_thread: progress_thread_handle,
  }))
}
