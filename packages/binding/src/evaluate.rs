use napi::bindgen_prelude::{AsyncTask, Env, Result, Task};
use napi_derive::napi;

use crate::{FSRSItem, ModelEvaluation};
use fsrs::{ComputeParametersInput, evaluate_with_time_series_splits};

pub struct EvaluateTask {
  pub(crate) train: Vec<fsrs::FSRSItem>,
  pub(crate) enable_short_term: bool,
  pub(crate) num_relearning_steps: Option<usize>,
}

impl Task for EvaluateTask {
  type Output = fsrs::ModelEvaluation;
  type JsValue = ModelEvaluation;

  fn compute(&mut self) -> Result<Self::Output> {
    let input = ComputeParametersInput {
      train_set: std::mem::take(&mut self.train),
      progress: None,
      enable_short_term: self.enable_short_term,
      num_relearning_steps: self.num_relearning_steps,
    };

    let out = evaluate_with_time_series_splits(input, |_| true)
      .map_err(|e| napi::Error::from_reason(format!("evaluate_parameters failed: {e}")))?;

    Ok(out)
  }

  fn resolve(&mut self, _env: Env, output: Self::Output) -> Result<Self::JsValue> {
    Ok(ModelEvaluation {
      log_loss: output.log_loss as f64,
      rmse_bins: output.rmse_bins as f64,
    })
  }
}

/// Evaluate FSRS model performance using time series cross-validation.
#[napi(ts_return_type = "Promise<ModelEvaluation>", catch_unwind)]
pub fn evaluate_parameters(
  train_set: Vec<&FSRSItem>,
  enable_short_term: Option<bool>,
  num_relearning_steps: Option<u32>,
) -> AsyncTask<EvaluateTask> {
  // Convert training data
  let trainset = train_set
    .into_iter()
    .map(|item| item.inner.clone())
    .collect();
  let enable_short_term = enable_short_term.unwrap_or(true);
  let num_relearning_steps = num_relearning_steps.map(|x| x as usize);

  AsyncTask::new(EvaluateTask {
    train: trainset,
    enable_short_term,
    num_relearning_steps,
  })
}
