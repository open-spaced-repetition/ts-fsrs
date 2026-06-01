use napi_derive::napi;

/// Subset of [`fsrs::SimulatorConfig`] fields configurable from JS.
///
/// Passed as a single object so callers use named fields
/// (`new BindingSimulatorConfig({ deckSize, learnSpan, ... })`) instead of a
/// long positional argument list. Any field left out keeps its `Default` value.
#[napi(object)]
#[derive(Debug, Default)]
pub struct SimulatorConfigInput {
  pub deck_size: Option<u32>,
  pub learn_span: Option<u32>,
  pub learn_limit: Option<u32>,
  pub review_limit: Option<u32>,
  pub max_cost_perday: Option<f64>,
}

/// Napi wrapper around [`fsrs::SimulatorConfig`].
///
/// Only the type definition is ported here, exposed through the `inner`
/// pattern (see `model.rs`): the full `fsrs::SimulatorConfig` is held as
/// `inner`. No conversion layer (e.g. `TryFrom`) is introduced.
#[napi(js_name = "BindingSimulatorConfig")]
#[derive(Debug, Default)]
pub struct SimulatorConfig {
  pub(crate) inner: fsrs::SimulatorConfig,
}

#[napi]
impl SimulatorConfig {
  #[napi(constructor)]
  pub fn new(input: Option<SimulatorConfigInput>) -> Self {
    let mut inner = fsrs::SimulatorConfig::default();
    if let Some(input) = input {
      if let Some(deck_size) = input.deck_size {
        inner.deck_size = deck_size as usize;
      }
      if let Some(learn_span) = input.learn_span {
        inner.learn_span = learn_span as usize;
      }
      if let Some(learn_limit) = input.learn_limit {
        inner.learn_limit = learn_limit as usize;
      }
      if let Some(review_limit) = input.review_limit {
        inner.review_limit = review_limit as usize;
      }
      if let Some(max_cost_perday) = input.max_cost_perday {
        inner.max_cost_perday = max_cost_perday as f32;
      }
    }
    Self { inner }
  }
}
