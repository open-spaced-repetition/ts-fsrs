#![deny(clippy::all)]

use napi::bindgen_prelude::Result;
use napi_derive::napi;
mod convert;
mod evaluate;
mod model;
mod progress;
mod train;
pub use convert::*;
pub use evaluate::*;
pub use model::*;
pub use train::*;

#[napi(js_name = "FSRSBinding")]
#[derive(Debug)]
pub struct FSRS {
  inner: fsrs::FSRS,
}

#[napi]
impl FSRS {
  // allow users to create FSRS with custom parameters
  #[napi(constructor)]
  pub fn new(#[napi(ts_arg_type = "number[]")] parameters: Option<Vec<f64>>) -> Result<Self> {
    let fsrs = match parameters {
      Some(p) if !p.is_empty() => {
        let params: Vec<f32> = p.iter().map(|&x| x as f32).collect();
        fsrs::FSRS::new(&params)
          .map_err(|e| napi::Error::from_reason(format!("Failed to create FSRS: {}", e)))?
      }
      _ => fsrs::FSRS::default(),
    };
    Ok(Self { inner: fsrs })
  }

  #[napi]
  pub fn next_states(
    &self,
    current_memory_state: Option<&MemoryState>,
    desired_retention: f64,
    days_elapsed: u32,
  ) -> Result<NextStates> {
    self
      .inner
      .next_states(
        current_memory_state.map(|x| x.inner),
        desired_retention as f32,
        days_elapsed,
      )
      .map(|inner| NextStates { inner })
      .map_err(|e| napi::Error::from_reason(format!("Failed to get next states: {}", e)))
  }

  #[napi]
  pub fn evaluate(&self, train_set: Vec<&FSRSItem>) -> Result<ModelEvaluation> {
    let items = prepare_items(train_set);

    // Because the computation finishes very quickly, progress reporting is not supported here
    let result = self.inner.evaluate(items, |_| true);

    match result {
      Ok(eval) => Ok(ModelEvaluation {
        log_loss: eval.log_loss as f64,
        rmse_bins: eval.rmse_bins as f64,
      }),
      Err(e) => Err(napi::Error::from_reason(format!(
        "Evaluation failed: {}",
        e
      ))),
    }
  }

  #[napi]
  pub fn universal_metrics(
    &self,
    train_set: Vec<&FSRSItem>,
    parameter: Option<Vec<f64>>,
  ) -> Result<(f32, f32)> {
    let items = prepare_items(train_set);

    let params: Vec<f32> = match parameter {
      Some(p) if !p.is_empty() => p.iter().map(|&x| x as f32).collect(),
      _ => fsrs::DEFAULT_PARAMETERS.clone().to_vec(),
    };

    let result = self.inner.universal_metrics(items, &params, |_| true);

    match result {
      Ok((self_by_other, other_by_self)) => Ok((self_by_other, other_by_self)),
      Err(e) => Err(napi::Error::from_reason(format!(
        "Universal metrics computation failed: {}",
        e
      ))),
    }
  }
}
