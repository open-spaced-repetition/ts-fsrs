use std::collections::HashMap;

use csv::ReaderBuilder;
use itertools::Itertools;
use napi::bindgen_prelude::{Either, Result};
use napi_derive::napi;

use crate::convert::RevlogEntry;
use crate::model::{StepRatingStats, StepStatsResult};

// Rating group keys
const RATING_AGAIN: u32 = 1;
const RATING_HARD: u32 = 2;
const RATING_GOOD: u32 = 3;
const RATING_AGAIN_THEN_GOOD: u32 = 4;
const RATING_GOOD_THEN_AGAIN: u32 = 5;
const RATING_RELEARNING: u32 = 0;

// review_state constants from CSV
const STATE_NEW: u32 = 0;
const STATE_LEARNING: u32 = 1;
const STATE_REVIEW: u32 = 2;

const STEP_CUTOFF: f64 = 86400.0 / 2.0; // 12 hours in seconds
const MIN_COUNT_FOR_RECOMMEND: usize = 100;
const MIN_COUNT_FOR_STATS: usize = 4;
const IQR_OUTLIER_THRESHOLD: usize = 250;
const DEFAULT_STABILITY: f64 = 86400.0;
const MAX_SEARCH_STABILITY: f64 = 86400.0 * 30.0; // 30 days in seconds
const INV_PHI: f64 = 0.6180339887498949; // (sqrt(5) - 1) / 2

fn total_loss(points: &[(f64, f64)], stability: f64, factor: f64, decay: f64) -> f64 {
  let epsilon = 1e-15;
  let inv_s = 1.0 / stability;
  points.iter().fold(0.0, |acc, &(t, y)| {
    let y_pred = (1.0 + factor * t * inv_s).powf(decay).clamp(epsilon, 1.0 - epsilon);
    acc - (y * y_pred.ln() + (1.0 - y) * (1.0 - y_pred).ln())
  })
}

fn fit_forgetting_curve(points: &[(f64, f64)], decay: f64) -> f64 {
  let factor = 0.9_f64.powf(1.0 / decay) - 1.0;
  let (mut low, mut high) = (1.0, MAX_SEARCH_STABILITY);
  let mut x1 = high - INV_PHI * (high - low);
  let mut x2 = low + INV_PHI * (high - low);
  let mut f1 = total_loss(points, x1, factor, decay);
  let mut f2 = total_loss(points, x2, factor, decay);
  let tolerance = 0.1;
  while high - low > tolerance {
    if f1 < f2 {
      high = x2;
      x2 = x1;
      f2 = f1;
      x1 = high - INV_PHI * (high - low);
      f1 = total_loss(points, x1, factor, decay);
    } else {
      low = x1;
      x1 = x2;
      f1 = f2;
      x2 = low + INV_PHI * (high - low);
      f2 = total_loss(points, x2, factor, decay);
    }
  }
  (high + low) / 2.0
}

fn compute_rating_stats(points: &mut [(f64, f64)], decay: f64) -> Option<StepRatingStats> {
  let n = points.len();
  if n < MIN_COUNT_FOR_STATS {
    return None;
  }

  points.sort_by(|(t_a, _), (t_b, _)| t_a.partial_cmp(t_b).unwrap_or(std::cmp::Ordering::Equal));

  let delta_ts: Vec<f64> = points.iter().map(|(t, _)| *t).collect();
  let recalls: Vec<f64> = points.iter().map(|(_, r)| *r).collect();

  // Nearest-rank quartile indices (not interpolated like numpy's default)
  let q1_idx = n / 4;
  let q2_idx = n / 2;
  let q3_idx = 3 * n / 4;

  let delay_q1 = if n % 4 != 0 {
    delta_ts[q1_idx]
  } else {
    (delta_ts[q1_idx.saturating_sub(1)] + delta_ts[q1_idx]) / 2.0
  };
  let delay_q2 = if n % 2 != 0 {
    delta_ts[q2_idx]
  } else {
    (delta_ts[q2_idx.saturating_sub(1)] + delta_ts[q2_idx]) / 2.0
  };
  let delay_q3 = if n % 4 != 0 {
    delta_ts[q3_idx]
  } else {
    (delta_ts[q3_idx.saturating_sub(1)] + delta_ts[q3_idx]) / 2.0
  };

  let r1 = if q1_idx > 0 {
    recalls[..q1_idx].iter().sum::<f64>() / q1_idx as f64
  } else {
    f64::NAN
  };
  let r2 = if q2_idx > q1_idx {
    recalls[q1_idx..q2_idx].iter().sum::<f64>() / (q2_idx - q1_idx) as f64
  } else {
    f64::NAN
  };
  let r3 = if q3_idx > q2_idx {
    recalls[q2_idx..q3_idx].iter().sum::<f64>() / (q3_idx - q2_idx) as f64
  } else {
    f64::NAN
  };
  let r4 = if n > q3_idx {
    recalls[q3_idx..].iter().sum::<f64>() / (n - q3_idx) as f64
  } else {
    f64::NAN
  };

  let retention = recalls.iter().sum::<f64>() / n as f64;

  // Fit forgetting curve with optional outlier filtering
  let stability = if retention == 1.0 || retention == 0.0 {
    DEFAULT_STABILITY
  } else if n >= IQR_OUTLIER_THRESHOLD {
    let iqr = delay_q3 - delay_q1;
    let lower = delay_q1 - 1.5 * iqr;
    let upper = delay_q3 + 1.5 * iqr;
    let filtered: Vec<_> = points
      .iter()
      .filter(|(t, _)| *t >= lower && *t <= upper)
      .copied()
      .collect();
    if filtered.is_empty() {
      DEFAULT_STABILITY
    } else {
      fit_forgetting_curve(&filtered, decay).round()
    }
  } else {
    fit_forgetting_curve(points, decay).round()
  };

  Some(StepRatingStats {
    count: n as u32,
    delay_q1: delay_q1.round(),
    delay_q2: delay_q2.round(),
    delay_q3: delay_q3.round(),
    r1,
    r2,
    r3,
    r4,
    retention,
    stability,
  })
}

/// Compute the forgetting interval in seconds between two reviews,
/// subtracting the second review's duration (answering time) to get
/// the pure forgetting time. Clamps to a minimum of 0.
fn forgetting_interval(earlier_time: i64, later_time: i64, later_duration_ms: u32) -> f64 {
  let raw = (later_time - earlier_time) as f64 / 1000.0;
  let duration = later_duration_ms as f64 / 1000.0;
  (raw - duration).max(0.0)
}

/// Extract learning step data from revlog entries grouped by card_id.
/// Returns a HashMap: rating_group -> Vec<(delta_t_seconds, recall)>
fn extract_step_data(revlogs: &[RevlogEntry]) -> HashMap<u32, Vec<(f64, f64)>> {
  let mut stats: HashMap<u32, Vec<(f64, f64)>> = HashMap::new();

  // Group by card_id (already sorted by card_id, review_time)
  for (_card_id, entries) in &revlogs.iter().chunk_by(|r| &r.card_id) {
    let entries: Vec<&RevlogEntry> = entries.collect();

    // --- Learning stats (rating 1-3) ---
    // Find the first learning review (state 0 or 1) with rating 1-4
    if let Some(first_idx) = entries.iter().position(|e| {
      matches!(e.review_state, STATE_NEW | STATE_LEARNING) && (1..=4).contains(&e.review_rating)
    }) {
      let first = &entries[first_idx];
      let first_rating = first.review_rating;

      // Find next review after first learning (rating 1-4)
      if let Some((second_offset, second)) = entries[first_idx + 1..]
        .iter()
        .enumerate()
        .find(|(_, e)| (1..=4).contains(&e.review_rating))
      {
        let second_idx = first_idx + 1 + second_offset;
        let delta_t = forgetting_interval(
          first.review_time,
          second.review_time,
          second.review_duration,
        );
        let recall = if second.review_rating == 1 { 0.0 } else { 1.0 };

        if (1..=3).contains(&first_rating) {
          stats
            .entry(first_rating)
            .or_default()
            .push((delta_t, recall));
        }

        // --- Again then Good / Good then Again ---
        let second_rating = second.review_rating;

        if (first_rating == 1 && second_rating == 3) || (first_rating == 3 && second_rating == 1) {
          // Find third review after second
          if let Some(third) = entries[second_idx + 1..]
            .iter()
            .find(|e| (1..=4).contains(&e.review_rating))
          {
            let delta_t_23 =
              forgetting_interval(second.review_time, third.review_time, third.review_duration);
            let recall_3 = if third.review_rating == 1 { 0.0 } else { 1.0 };
            let group = if first_rating == 1 {
              RATING_AGAIN_THEN_GOOD
            } else {
              RATING_GOOD_THEN_AGAIN
            };
            stats.entry(group).or_default().push((delta_t_23, recall_3));
          }
        }
      }
    }

    // --- Relearning stats ---
    // Find reviews where review_state=2 (review) and rating=1 (Again) -> lapse
    for (i, entry) in entries.iter().enumerate() {
      if entry.review_state == STATE_REVIEW && entry.review_rating == 1 {
        // Find next review after this lapse
        if let Some(next) = entries[i + 1..]
          .iter()
          .find(|e| (1..=4).contains(&e.review_rating))
        {
          let delta_t =
            forgetting_interval(entry.review_time, next.review_time, next.review_duration);
          let recall = if next.review_rating == 1 { 0.0 } else { 1.0 };
          stats
            .entry(RATING_RELEARNING)
            .or_default()
            .push((delta_t, recall));
        }
      }
    }
  }

  stats
}

fn calculate_step(stability: f64, decay: f64, desired_retention: f64) -> Option<i64> {
  let base_factor = 0.9_f64.powf(1.0 / -decay) - 1.0;
  let factor = (1.0 / base_factor) * (desired_retention.powf(1.0 / -decay) - 1.0);
  let step = stability * factor;
  if step >= STEP_CUTOFF || step.is_nan() {
    None
  } else {
    Some(step.max(1.0).round() as i64)
  }
}

#[napi]
pub fn compute_optimal_steps(
  data: &[u8],
  desired_retention: f64,
  #[napi(ts_arg_type = "number | number[]")] decay_or_params: Either<f64, Vec<f64>>,
) -> Result<StepStatsResult> {
  // Resolve decay from Either<f64, Vec<f64>>
  let decay = match &decay_or_params {
    Either::A(val) => -val,
    Either::B(params) => {
      if params.len() < 21 {
        return Err(napi::Error::from_reason(
          "Parameters array must have at least 21 elements (w[0]..w[20])".to_string(),
        ));
      }
      -params[20]
    }
  };

  if desired_retention <= 0.0 || desired_retention >= 1.0 {
    return Err(napi::Error::from_reason(
      "desired_retention must be between 0 and 1 (exclusive)".to_string(),
    ));
  }

  // Parse CSV
  let mut rdr = ReaderBuilder::new().has_headers(true).from_reader(data);
  let mut revlogs: Vec<RevlogEntry> = rdr
    .deserialize::<RevlogEntry>()
    .collect::<std::result::Result<Vec<RevlogEntry>, _>>()
    .map_err(|e| napi::Error::from_reason(format!("CSV deserialization error: {}", e)))?;

  // Sort by (card_id, review_time)
  revlogs.sort_by(|a, b| a.card_id.cmp(&b.card_id).then(a.review_time.cmp(&b.review_time)));

  // Extract step data
  let mut stats_map = extract_step_data(&revlogs);

  // Compute stats for each rating group
  let again = stats_map
    .get_mut(&RATING_AGAIN)
    .and_then(|pts| compute_rating_stats(pts, decay));
  let hard = stats_map
    .get_mut(&RATING_HARD)
    .and_then(|pts| compute_rating_stats(pts, decay));
  let good = stats_map
    .get_mut(&RATING_GOOD)
    .and_then(|pts| compute_rating_stats(pts, decay));
  let again_then_good = stats_map
    .get_mut(&RATING_AGAIN_THEN_GOOD)
    .and_then(|pts| compute_rating_stats(pts, decay));
  let good_then_again = stats_map
    .get_mut(&RATING_GOOD_THEN_AGAIN)
    .and_then(|pts| compute_rating_stats(pts, decay));
  let relearning = stats_map
    .get_mut(&RATING_RELEARNING)
    .and_then(|pts| compute_rating_stats(pts, decay));

  // Compute recommended learning steps
  let mut recommended_learning_steps: Vec<i64> = Vec::new();

  // Learning step 1: from Again stability
  if let Some(ref again_stats) = again
    && again_stats.count >= MIN_COUNT_FOR_RECOMMEND as u32
    && let Some(step) = calculate_step(again_stats.stability, decay, desired_retention)
  {
    recommended_learning_steps.push(step);
  }

  // Learning step 2: from candidates (Hard*2-Again, Good, AgainThenGood)
  let again_stability = again
    .as_ref()
    .map(|s| s.stability)
    .unwrap_or(DEFAULT_STABILITY);
  let mut candidates: Vec<f64> = Vec::new();
  if let Some(ref h) = hard
    && h.count >= MIN_COUNT_FOR_RECOMMEND as u32
  {
    candidates.push(h.stability * 2.0 - again_stability);
  }
  if let Some(ref g) = good
    && g.count >= MIN_COUNT_FOR_RECOMMEND as u32
  {
    candidates.push(g.stability);
  }
  if let Some(ref atg) = again_then_good
    && atg.count >= MIN_COUNT_FOR_RECOMMEND as u32
  {
    candidates.push(atg.stability);
  }
  if !candidates.is_empty() {
    let min_candidate = candidates
      .iter()
      .copied()
      .reduce(f64::min)
      .unwrap()
      .max(again_stability);
    if let Some(step) = calculate_step(min_candidate, decay, desired_retention) {
      recommended_learning_steps.push(step);
    }
  }

  // Compute recommended relearning steps
  let mut recommended_relearning_steps: Vec<i64> = Vec::new();
  if let Some(ref rl) = relearning
    && rl.count >= MIN_COUNT_FOR_RECOMMEND as u32
    && let Some(step) = calculate_step(rl.stability, decay, desired_retention)
  {
    recommended_relearning_steps.push(step);
  }

  Ok(StepStatsResult {
    again,
    hard,
    good,
    again_then_good,
    good_then_again,
    relearning,
    recommended_learning_steps,
    recommended_relearning_steps,
  })
}
