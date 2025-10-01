#![deny(clippy::all)]

use napi::bindgen_prelude::Result;
use napi_derive::napi;
mod model;

pub use model::*;

#[napi]
pub fn plus_100(input: u32) -> u32 {
  input + 100
}

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
}
