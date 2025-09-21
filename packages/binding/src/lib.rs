#![deny(clippy::all)]

use std::sync::{Arc, Mutex};

use napi_derive::napi;

mod model;

pub use model::*;

#[napi]
pub fn plus_100(input: u32) -> u32 {
  input + 100
}

#[napi(js_name = "FSRS")]
#[derive(Debug)]
pub struct FSRS {
  inner: Arc<Mutex<fsrs::FSRS>>,
}

#[napi]
impl FSRS {
  /// - Parameters must be provided before running commands that need them.
  /// - Parameters may be an empty array to use the default values instead.
  #[napi(constructor)]
  pub fn new(#[napi(ts_arg_type = "number[]")] parameters: Option<Vec<f64>>) -> Self {
    let params = match parameters {
      Some(p) => p.iter().map(|&x| x as f32).collect(),
      None => vec![],
    };
    Self {
      inner: Arc::new(Mutex::new(
        fsrs::FSRS::new(Some(&params)).expect("Failed to create FSRS"),
      )),
    }
  }

  #[napi]
  pub fn next_states(
    &self,
    current_memory_state: Option<&MemoryState>,
    desired_retention: f64,
    days_elapsed: u32,
  ) -> NextStates {
    let locked_model = self.inner.lock().unwrap();
    NextStates {
      inner: locked_model
        .next_states(
          current_memory_state.map(|x| x.inner),
          desired_retention as f32,
          days_elapsed,
        )
        .unwrap(),
    }
  }
}
