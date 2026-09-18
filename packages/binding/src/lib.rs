#![deny(clippy::all)]

use napi::bindgen_prelude::Result;
use napi_derive::napi;
mod convert;
mod convert_stream;
mod evaluate;
mod model;
#[cfg(not(threadless_wasm))]
mod progress;
mod steps;
mod timezone;
mod train;
pub use convert::*;
pub use evaluate::*;
pub use model::*;
pub use steps::*;
pub use timezone::TimezoneOrOffset;
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
    let params = match parameters {
      Some(p) if !p.is_empty() => p.into_iter().map(|x| x as f32).collect(),
      _ => fsrs::DEFAULT_PARAMETERS.to_vec(),
    };
    let inner = fsrs::FSRS::new(&params)
      .map_err(|e| napi::Error::from_reason(format!("Failed to create FSRS: {}", e)))?;
    Ok(Self { inner })
  }

  #[napi]
  pub fn next_states(
    &self,
    current_memory_state: Option<&MemoryState>,
    desired_retention: f64,
    days_elapsed: f64,
  ) -> Result<NextStates> {
    let memory_state = current_memory_state.map(|x| x.inner);
    let result = match self.inner.version() {
      fsrs::ModelVersion::Fsrs7 => self.inner.next_states_with_elapsed_days(
        memory_state,
        desired_retention as f32,
        days_elapsed as f32,
      ),
      fsrs::ModelVersion::Fsrs6 => {
        self
          .inner
          .next_states(memory_state, desired_retention as f32, days_elapsed as u32)
      }
    };
    result
      .map(|inner| NextStates { inner })
      .map_err(|e| napi::Error::from_reason(format!("Failed to get next states: {}", e)))
  }

  #[napi]
  pub fn evaluate(&self, train_set: Vec<&FSRSItem>) -> Result<ModelEvaluation> {
    let items = prepare_items(train_set);

    // Because the computation finishes very quickly, progress reporting is not supported here
    self
      .inner
      .evaluate(items, |_| true)
      .map(ModelEvaluation::from)
      .map_err(|e| napi::Error::from_reason(format!("Evaluation failed: {}", e)))
  }

  #[napi(js_name = "memoryStateFromSM2")]
  pub fn memory_state_from_sm2(
    &self,
    ease_factor: f64,
    interval: f64,
    sm2_retention: f64,
  ) -> Result<MemoryState> {
    self
      .inner
      .memory_state_from_sm2(ease_factor as f32, interval as f32, sm2_retention as f32)
      .map(|inner| MemoryState { inner })
      .map_err(|e| {
        napi::Error::from_reason(format!("Failed to create memory state from SM-2: {}", e))
      })
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
      _ => match self.inner.version() {
        fsrs::ModelVersion::Fsrs6 => fsrs::FSRS6_DEFAULT_PARAMETERS.to_vec(),
        fsrs::ModelVersion::Fsrs7 => fsrs::DEFAULT_PARAMETERS.to_vec(),
      },
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
