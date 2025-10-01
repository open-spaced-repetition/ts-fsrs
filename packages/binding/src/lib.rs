#![deny(clippy::all)]

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
  inner: fsrs::FSRS,
}

#[napi]
impl FSRS {
  /// - Parameters must be provided before running commands that need them.
  /// - Parameters may be an empty array to use the default values instead.
  #[napi(constructor)]
  pub fn new(#[napi(ts_arg_type = "number[]")] parameters: Option<Vec<f64>>) -> Self {
    let fsrs = match parameters {
      Some(p) if !p.is_empty() => {
        let params: Vec<f32> = p.iter().map(|&x| x as f32).collect();
        fsrs::FSRS::new(&params).expect("Failed to create FSRS")
      }
      _ => fsrs::FSRS::default(),
    };
    Self { inner: fsrs }
  }

  #[napi]
  pub fn next_states(
    &self,
    current_memory_state: Option<&MemoryState>,
    desired_retention: f64,
    days_elapsed: u32,
  ) -> NextStates {
    NextStates {
      inner: self
        .inner
        .next_states(
          current_memory_state.map(|x| x.inner),
          desired_retention as f32,
          days_elapsed,
        )
        .unwrap(),
    }
  }
}
