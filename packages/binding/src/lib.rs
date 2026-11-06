#![deny(clippy::all)]

use napi::bindgen_prelude::{Float64Array, Result, Uint32Array};
use napi_derive::napi;
mod card_id_generator;
mod convert;
mod convert_stream;
mod evaluate;
mod model;
#[cfg(not(all(target_os = "wasi", target_env = "p1")))]
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
  /// Single-rating inference. Inputs must be finite, with rating 1-4 and nonnegative elapsed days.
  /// FSRS-6 rounds elapsed days; FSRS-7 preserves fractional days.
  #[napi]
  pub fn step(
    &self,
    state: Option<InferenceMemoryState>,
    days_elapsed: f64,
    rating: u32,
  ) -> Result<InferenceMemoryState> {
    let state = self
      .inner
      .memory_state(
        fsrs::FSRSItem {
          reviews: vec![fsrs::FSRSReview {
            delta_t: days_elapsed as f32,
            rating,
          }],
        },
        state
          .map(Into::into)
          .filter(|s: &fsrs::MemoryState| s.stability != 0.0),
      )
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    Ok(InferenceMemoryState {
      stability: state.stability as f64,
      difficulty: state.difficulty as f64,
      stability_fast: (self.inner.version() == fsrs::ModelVersion::Fsrs7)
        .then_some(state.stability_fast as f64),
    })
  }

  /// Evaluate the active model's forgetting curve. New cards have retrievability zero.
  #[napi]
  pub fn current_retrievability(&self, state: InferenceMemoryState, days_elapsed: f64) -> f64 {
    let state: fsrs::MemoryState = state.into();
    if state.stability == 0.0 {
      return 0.0;
    }
    self
      .inner
      .current_retrievability(state, days_elapsed as f32) as f64
  }

  /// Compute an interval without scheduler fuzzing. Retention must be in (0, 1).
  #[napi]
  pub fn next_interval(&self, state: InferenceMemoryState, desired_retention: f64) -> f64 {
    let value = self
      .inner
      .next_interval_for_state(state.into(), desired_retention as f32);
    match self.inner.version() {
      fsrs::ModelVersion::Fsrs6 => value.round().max(1.0) as f64,
      fsrs::ModelVersion::Fsrs7 => value as f64,
    }
  }

  /// Replay one card. Input pairs: [deltaT, rating]; output triples:
  /// [stability, difficulty, stabilityFast], one per review (excluding initial state).
  /// Inputs must be finite with rating 1-4. Split histories at resets.
  #[napi]
  pub fn forward(
    &self,
    history: Float64Array,
    initial_state: Option<InferenceMemoryState>,
  ) -> Result<Float64Array> {
    if !history.len().is_multiple_of(2) {
      return Err(napi::Error::from_reason(
        "history must contain [deltaT, rating] pairs",
      ));
    }
    let mut output = Vec::with_capacity(history.len() / 2 * 3);
    self.append_history(
      &history,
      initial_state
        .map(Into::into)
        .filter(|s: &fsrs::MemoryState| s.stability != 0.0),
      &mut output,
      false,
    )?;
    Ok(output.into())
  }

  /// Replay many independent cards in one crossing, starting each card as new.
  /// Offsets are review indices, starting at 0 and ending at history.length / 2.
  /// Output has the same review order as forward(), including all intermediate states.
  /// With includeRetrievability, each triple gains a fourth value: pre-review retrievability (0 for new cards).
  #[napi]
  pub fn forward_batch(
    &self,
    history: Float64Array,
    offsets: Uint32Array,
    include_retrievability: Option<bool>,
  ) -> Result<Float64Array> {
    if !history.len().is_multiple_of(2)
      || offsets.first() != Some(&0)
      || offsets.last().map(|n| *n as usize) != Some(history.len() / 2)
      || offsets.windows(2).any(|pair| pair[0] > pair[1])
    {
      return Err(napi::Error::from_reason("Invalid review offsets"));
    }
    let include_retrievability = include_retrievability.unwrap_or(false);
    let stride = if include_retrievability { 4 } else { 3 };
    let mut output = Vec::with_capacity(history.len() / 2 * stride);
    for pair in offsets.windows(2) {
      self.append_history(
        &history[pair[0] as usize * 2..pair[1] as usize * 2],
        None,
        &mut output,
        include_retrievability,
      )?;
    }
    Ok(output.into())
  }

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
  pub fn evaluate(
    &self,
    train_set: Vec<&FSRSItem>,
    card_ids: Option<Vec<i64>>,
  ) -> Result<ModelEvaluation> {
    let (items, card_ids) = prepare_items(train_set, card_ids)?;

    // Because the computation finishes very quickly, progress reporting is not supported here
    match card_ids {
      Some(ids) => self.inner.evaluate_with_card_ids(items, ids, |_| true),
      None => self.inner.evaluate(items, |_| true),
    }
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
    let (items, _) = prepare_items(train_set, None)?;

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

impl FSRS {
  fn append_history(
    &self,
    history: &[f64],
    initial: Option<fsrs::MemoryState>,
    output: &mut Vec<f64>,
    include_retrievability: bool,
  ) -> Result<()> {
    let reviews = history
      .chunks_exact(2)
      .map(|pair| fsrs::FSRSReview {
        delta_t: pair[0] as f32,
        rating: pair[1] as u32,
      })
      .collect();
    let states = self
      .inner
      .historical_memory_states(fsrs::FSRSItem { reviews }, initial)
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let mut previous = initial;
    for (index, state) in states
      .into_iter()
      .skip(usize::from(initial.is_some()))
      .enumerate()
    {
      output.extend([
        state.stability as f64,
        state.difficulty as f64,
        state.stability_fast as f64,
      ]);
      if include_retrievability {
        output.push(
          previous
            .map(|state| {
              self
                .inner
                .current_retrievability(state, history[index * 2] as f32) as f64
            })
            .unwrap_or(0.0),
        );
        previous = Some(state);
      }
    }
    Ok(())
  }
}
