#![deny(clippy::all)]

use fsrs::filter_outlier;
use napi::bindgen_prelude::Result;
use napi_derive::napi;
mod convert;
mod model;
mod progress;
mod train;
pub use convert::*;
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
    let train_data: Vec<fsrs::FSRSItem> = train_set
      .into_iter()
      .map(|item| item.inner.clone())
      .collect();
    let (mut dataset_for_initialization, mut trainset): (Vec<fsrs::FSRSItem>, Vec<fsrs::FSRSItem>) =
      train_data
        .into_iter()
        .partition(|item| item.long_term_review_cnt() == 1);
    (dataset_for_initialization, trainset) = filter_outlier(dataset_for_initialization, trainset);
    let items = [dataset_for_initialization, trainset].concat();

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
}
