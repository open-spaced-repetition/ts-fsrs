use napi::bindgen_prelude::{FnArgs, Function};
use napi_derive::napi;
use serde::{Deserialize, Serialize};

#[napi(js_name = "FSRSReview")]
#[derive(Debug)]
pub struct FSRSReview {
  pub(crate) inner: fsrs::FSRSReview,
}

#[napi]
impl FSRSReview {
  #[napi(constructor)]
  pub fn new(rating: u32, delta_t: u32) -> Self {
    Self {
      inner: fsrs::FSRSReview { rating, delta_t },
    }
  }
  /// 1-4
  #[napi(getter)]
  pub fn rating(&self) -> u32 {
    self.inner.rating
  }
  /// The number of days that passed
  /// # Warning
  /// `delta_t` for item first(initial) review must be 0
  #[napi(getter)]
  pub fn delta_t(&self) -> u32 {
    self.inner.delta_t
  }

  #[napi(js_name = "toString")]
  pub fn to_string(&self) -> napi::Result<String> {
    serde_json::to_string(&self.inner)
      .map_err(|e| napi::Error::from_reason(format!("Failed to serialize to JSON: {}", e)))
  }

  #[napi(js_name = "[Symbol.toStringTag]")]
  pub fn string_tag(&self) -> String {
    "FSRSReview".to_string()
  }
}

/// Stores a list of reviews for a card, in chronological order. Each FSRSItem corresponds
/// to a single review, but contains the previous reviews of the card as well, after the
/// first one.
///
/// When used during review, the last item should include the correct `delta_t`, but
/// the provided rating is ignored as all four ratings are returned by `.nextStates()`
#[napi(js_name = "FSRSItem")]
#[derive(Serialize, Deserialize, Debug)]
pub struct FSRSItem {
  pub(crate) inner: fsrs::FSRSItem,
}
#[napi]
impl FSRSItem {
  #[napi(constructor)]
  pub fn new(reviews: Vec<&FSRSReview>) -> Self {
    Self {
      inner: fsrs::FSRSItem {
        reviews: reviews.iter().map(|x| x.inner).collect(),
      },
    }
  }

  #[napi(getter)]
  pub fn reviews(&self) -> Vec<FSRSReview> {
    self
      .inner
      .reviews
      .iter()
      .map(|x| FSRSReview { inner: *x })
      .collect()
  }

  #[napi(getter)]
  pub fn current(&self) -> FSRSReview {
    self
      .inner
      .reviews
      .last()
      .map(|&x| FSRSReview { inner: x })
      .expect("FSRSItem must have at least one review")
  }

  #[napi]
  pub fn long_term_review_cnt(&self) -> u32 {
    self.inner.long_term_review_cnt() as u32
  }

  #[napi(js_name = "toString")]
  pub fn to_string(&self) -> napi::Result<String> {
    serde_json::to_string(&self.inner)
      .map_err(|e| napi::Error::from_reason(format!("Failed to serialize to JSON: {}", e)))
  }

  #[napi(js_name = "[Symbol.toStringTag]")]
  pub fn string_tag(&self) -> String {
    "FSRSItem".to_string()
  }
}

#[napi(js_name = "MemoryState")]
#[derive(Debug)]
pub struct MemoryState {
  pub(crate) inner: fsrs::MemoryState,
}
#[napi]
impl MemoryState {
  #[napi(constructor)]
  pub fn new(stability: f64, difficulty: f64) -> Self {
    Self {
      inner: fsrs::MemoryState {
        stability: stability as f32,
        difficulty: difficulty as f32,
      },
    }
  }
  #[napi(getter)]
  pub fn stability(&self) -> f64 {
    self.inner.stability as f64
  }
  #[napi(getter)]
  pub fn difficulty(&self) -> f64 {
    self.inner.difficulty as f64
  }
  #[napi(js_name = "toString")]
  pub fn to_string(&self) -> napi::Result<String> {
    serde_json::to_string(&serde_json::json!({
      "stability": self.inner.stability as f64,
      "difficulty": self.inner.difficulty as f64
    }))
    .map_err(|e| napi::Error::from_reason(format!("Failed to serialize to JSON: {}", e)))
  }

  #[napi(js_name = "[Symbol.toStringTag]")]
  pub fn string_tag(&self) -> String {
    "MemoryState".to_string()
  }
}

#[napi(js_name = "NextStates")]
#[derive(Debug)]
pub struct NextStates {
  pub(crate) inner: fsrs::NextStates,
}
#[napi]
impl NextStates {
  #[napi(getter)]
  pub fn hard(&self) -> ItemState {
    ItemState {
      inner: self.inner.hard.clone(),
    }
  }
  #[napi(getter)]
  pub fn good(&self) -> ItemState {
    ItemState {
      inner: self.inner.good.clone(),
    }
  }
  #[napi(getter)]
  pub fn easy(&self) -> ItemState {
    ItemState {
      inner: self.inner.easy.clone(),
    }
  }
  #[napi(getter)]
  pub fn again(&self) -> ItemState {
    ItemState {
      inner: self.inner.again.clone(),
    }
  }

  #[napi(js_name = "toString")]
  pub fn to_string(&self) -> napi::Result<String> {
    let item_state_to_json = |item: &fsrs::ItemState| {
      serde_json::json!({
          "memory": {
              "stability": item.memory.stability as f64,
              "difficulty": item.memory.difficulty as f64,
          },
          "interval": item.interval,
      })
    };
    serde_json::to_string(&serde_json::json!({
      "hard": item_state_to_json(&self.inner.hard),
      "good": item_state_to_json(&self.inner.good),
      "easy": item_state_to_json(&self.inner.easy),
      "again": item_state_to_json(&self.inner.again)
    }))
    .map_err(|e| napi::Error::from_reason(format!("Failed to serialize to JSON: {}", e)))
  }

  #[napi(js_name = "[Symbol.toStringTag]")]
  pub fn string_tag(&self) -> String {
    "NextStates".to_string()
  }
}

#[napi(js_name = "ItemState")]
#[derive(Debug)]
pub struct ItemState {
  pub(crate) inner: fsrs::ItemState,
}
#[napi]
impl ItemState {
  #[napi(getter)]
  pub fn memory(&self) -> MemoryState {
    MemoryState {
      inner: self.inner.memory,
    }
  }
  #[napi(getter)]
  pub fn interval(&self) -> f32 {
    self.inner.interval
  }

  #[napi(js_name = "toString")]
  pub fn to_string(&self) -> napi::Result<String> {
    serde_json::to_string(&serde_json::json!({
      "memory": {
        "stability": self.inner.memory.stability as f64,
        "difficulty": self.inner.memory.difficulty as f64
      },
      "interval": self.inner.interval
    }))
    .map_err(|e| napi::Error::from_reason(format!("Failed to serialize to JSON: {}", e)))
  }

  #[napi(js_name = "[Symbol.toStringTag]")]
  pub fn string_tag(&self) -> String {
    "ItemState".to_string()
  }
}

#[napi(object)]
pub struct ModelEvaluation {
  pub log_loss: f64,
  pub rmse_bins: f64,
}

#[napi(object)]
pub struct ComputeParametersOption<'env> {
  /// Whether to enable short-term memory parameters
  pub enable_short_term: bool,
  /// Number of relearning steps
  pub num_relearning_steps: Option<u32>,
  // Progress callback temporarily disabled for v3 migration
  #[napi(ts_type = "(current: number, total: number) => void | Promise<void>")]
  pub progress: Option<Function<'env, FnArgs<(u32, u32)>, ()>>,
  #[napi(ts_type = "number")]
  pub timeout: Option<u32>,
}
