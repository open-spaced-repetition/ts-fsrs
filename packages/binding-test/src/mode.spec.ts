import { readFileSync } from 'node:fs'
import {
  BindingMemoryState,
  computeParameters,
  convertCsvToFsrsItems,
  FSRSBinding,
  FSRSBindingItem,
  FSRSBindingReview,
} from '@open-spaced-repetition/binding'

describe('FSRS model', () => {
  test('model', () => {
    const f = new FSRSBinding()
    expect(f).toBeInstanceOf(FSRSBinding)
    const prototype = Object.getOwnPropertyDescriptors(f.constructor.prototype)
    console.log(prototype)

    expect(typeof f.nextStates).toBe('function')

    const review = new FSRSBindingReview(3, 1)
    expect(review).toBeInstanceOf(FSRSBindingReview)

    const item = new FSRSBindingItem([review])
    expect(item).toBeInstanceOf(FSRSBindingItem)
    expect(item.reviews.length).toBe(1)
    expect(item.reviews[0]).toBeInstanceOf(FSRSBindingReview)

    const memoryState = new BindingMemoryState(1.0, 0.5, 1.0)
    expect(memoryState).toBeInstanceOf(BindingMemoryState)
  })

  test('preserves fractional review intervals and FSRS7 fast stability', () => {
    expect(new FSRSBindingReview(3, 0.25).deltaT).toBe(0.25)
    const sameDay = new FSRSBindingItem([
      new FSRSBindingReview(3, 0),
      new FSRSBindingReview(4, 0.25),
    ])
    expect(sameDay.longTermReviewCnt()).toBe(0)
    expect(sameDay.includeLongTermReviews()).toBe(false)
    const interday = new FSRSBindingItem([
      new FSRSBindingReview(3, 0),
      new FSRSBindingReview(4, 1.25),
    ])
    expect(interday.longTermReviewCnt()).toBe(1)
    expect(interday.includeLongTermReviews()).toBe(true)
    expect(new BindingMemoryState(10, 5, 10).stabilityFast).toBe(10)
    const state = new BindingMemoryState(10, 5, 2)
    expect(state.stabilityFast).toBe(2)
    expect(JSON.parse(state.toString())).toEqual({
      stability: 10,
      difficulty: 5,
      stability_fast: 2,
    })
    expect(
      JSON.parse(new BindingMemoryState(0.1, 0.2, 0.3).toString())
    ).toEqual({
      stability: 0.1,
      difficulty: 0.2,
      stability_fast: 0.3,
    })
  })

  test('migrates legacy memory states with stability as fast stability', () => {
    for (const args of [
      [10, 5],
      [10, 5, undefined],
      [10, 5, null],
    ]) {
      const state = Reflect.construct(
        BindingMemoryState,
        args
      ) as BindingMemoryState
      expect(JSON.parse(state.toString())).toEqual({
        stability: 10,
        difficulty: 5,
        stability_fast: 10,
      })
    }
    expect(new BindingMemoryState(10, 5, 0).stabilityFast).toBe(0)
  })

  test('next_states defaults to FSRS7', () => {
    for (const parameters of [undefined, []]) {
      const f = new FSRSBinding(parameters)
      const nextStates = f.nextStates(null, 0.9, 0)
      expect(nextStates.again).not.toBeUndefined()
      expect(nextStates.hard).not.toBeUndefined()
      expect(nextStates.good).not.toBeUndefined()
      expect(nextStates.easy).not.toBeUndefined()
      expect(nextStates.good.memory.stabilityFast).toBeCloseTo(
        nextStates.good.memory.stability * 0.8,
        6
      )
    }
  })

  test('next_states preserves fractional elapsed days for FSRS7', async () => {
    const parameters = await computeParameters([], {
      enableShortTerm: true,
      modelVersion: 'FSRS-7'
    })
    const model = new FSRSBinding(parameters)
    const state = new BindingMemoryState(10, 5, 2)
    for (const days of [0.25, 1.25]) {
      const fractional = model.nextStates(state, 0.9, days)
      const integer = model.nextStates(state, 0.9, Math.floor(days))
      for (const rating of ['again', 'hard', 'good', 'easy'] as const) {
        expect(fractional[rating].memory.stabilityFast).not.toBe(
          integer[rating].memory.stabilityFast
        )
        expect(Number.isFinite(fractional[rating].memory.stabilityFast)).toBe(
          true
        )
        expect(fractional[rating].interval).not.toBe(integer[rating].interval)
        expect(Number.isFinite(fractional[rating].interval)).toBe(true)
      }
    }
  })

  test('next_states uses integer elapsed days for FSRS6', async () => {
    const parameters = await computeParameters([], {
      enableShortTerm: true,
      modelVersion: 'FSRS-6',
    })
    const model = new FSRSBinding(parameters)
    const state = new BindingMemoryState(10, 5, 10)
    for (const days of [0.25, 1.25]) {
      const fractional = model.nextStates(state, 0.9, days)
      const integer = model.nextStates(state, 0.9, Math.floor(days))
      for (const rating of ['again', 'hard', 'good', 'easy'] as const) {
        expect(fractional[rating].memory.toString()).toBe(
          integer[rating].memory.toString()
        )
        expect(fractional[rating].interval).toBe(integer[rating].interval)
      }
    }
  })

  test('memoryStateFromSM2 with explicit FSRS6 parameters', async () => {
    const parameters = await computeParameters([], {
      enableShortTerm: true,
      modelVersion: 'FSRS-6',
      timeout: 5,
    })
    const f = new FSRSBinding(parameters)

    let m = f.memoryStateFromSM2(2.5, 10, 0.9)
    expect(m).toBeInstanceOf(BindingMemoryState)
    expect(m.stability).toBeCloseTo(10.0, 3)
    expect(m.difficulty).toBeCloseTo(6.9140563, 3)

    m = f.memoryStateFromSM2(2.5, 10, 0.8)
    expect(m.stability).toBeCloseTo(3.01572, 3)
    expect(m.difficulty).toBeCloseTo(9.393428, 3)

    m = f.memoryStateFromSM2(2.5, 10, 0.95)
    expect(m.stability).toBeCloseTo(24.841097, 3)
    expect(m.difficulty).toBeCloseTo(1.2974405, 3)

    // clamps difficulty to D_MAX
    m = f.memoryStateFromSM2(1.3, 20, 0.9)
    expect(m.stability).toBeCloseTo(20.0, 3)
    expect(m.difficulty).toBeCloseTo(10.0, 3)

    // fsrs_factor consistency: next_states(good).stability / interval ≈ ease_factor
    const interval = 15
    const easeFactor = 2.0
    const seed = f.memoryStateFromSM2(easeFactor, interval, 0.9)
    const fsrsFactor =
      f.nextStates(seed, 0.9, interval).good.memory.stability / interval
    expect(Math.abs(fsrsFactor - easeFactor)).toBeLessThan(0.01)
  })

  test('memoryStateFromSM2 with FSRS6 throws on invalid input', async () => {
    const parameters = await computeParameters([], {
      enableShortTerm: true,
      modelVersion: 'FSRS-6',
      timeout: 5,
    })
    const f = new FSRSBinding(parameters)
    expect(() => f.memoryStateFromSM2(2.5, 10, 1.0)).toThrow()
  })

  /**
diff --git a/src/inference.rs b/src/inference.rs
index f5b20bf..6ff1d3b 100644
--- a/src/inference.rs
+++ b/src/inference.rs
@@ -780,7 +780,7 @@ fn measure_a_by_b(pred_a: &[f32], pred_b: &[f32], true_val: &[f32]) -> f32 {
 mod tests {
     use super::*;
     use crate::{
-        FSRSReview, convertor_tests::anki21_sample_file_converted_to_fsrs, current_retrievability,
+        FSRSReview, convertor_tests::{anki21_sample_file_converted_to_fsrs, data_from_csv}, current_retrievability,
         dataset::filter_outlier, test_helpers::TestHelper,
     };
 
@@ -939,7 +939,7 @@ mod tests {
 
     #[test]
     fn test_evaluate() -> Result<()> {
-        let items = anki21_sample_file_converted_to_fsrs();
+        let items = data_from_csv();
         let (mut dataset_for_initialization, mut trainset): (Vec<FSRSItem>, Vec<FSRSItem>) = items
             .into_iter()
             .partition(|item| item.long_term_review_cnt() == 1);
@@ -972,23 +972,13 @@ mod tests {
         ])?;
         let metrics = fsrs.evaluate(items.clone(), |_| true).unwrap();
 
-        [metrics.log_loss, metrics.rmse_bins].assert_approx_eq([0.20580745, 0.026005825]);
-
-        let fsrs = FSRS::default();
-        let metrics = fsrs.evaluate(items.clone(), |_| true).unwrap();
-
-        [metrics.log_loss, metrics.rmse_bins].assert_approx_eq([0.20967911, 0.030774858]);
-
-        let fsrs = FSRS::new(PARAMETERS)?;
-        let metrics = fsrs.evaluate(items.clone(), |_| true).unwrap();
-
-        [metrics.log_loss, metrics.rmse_bins].assert_approx_eq([0.208_657_4, 0.030_946_612]);
+        [metrics.log_loss, metrics.rmse_bins].assert_approx_eq([0.3340487, 0.038114432]);
 
         let (self_by_other, other_by_self) = fsrs
             .universal_metrics(items.clone(), &DEFAULT_PARAMETERS, |_| true)
             .unwrap();
 
-        [self_by_other, other_by_self].assert_approx_eq([0.014087644, 0.017199915]);
+        [self_by_other, other_by_self].assert_approx_eq([0.023714684, 0.017120838]);
 
         Ok(())
     }
   */
  test.each([
    'FSRS-6',
    'FSRS-7',
  ] as const)('universalMetrics uses %s defaults for omitted or empty comparison parameters', async (modelVersion) => {
    const reference = await computeParameters([], {
      enableShortTerm: true,
      modelVersion,
    })
    const parameters = [...reference]
    parameters[0] *= 2
    const model = new FSRSBinding(parameters)
    const items = [1, 2, 3, 4].map(
      (rating) =>
        new FSRSBindingItem([
          new FSRSBindingReview(1, 0),
          new FSRSBindingReview(3, 1),
          new FSRSBindingReview(rating, 3),
        ])
    )
    const expected = model.universalMetrics(items, reference)
    expect(expected.every(Number.isFinite)).toBe(true)
    expect(model.universalMetrics(items)).toEqual(expected)
    expect(model.universalMetrics(items, [])).toEqual(expected)
  })

  test('evaluate with explicit FSRS6 parameters', async () => {
    const f = new FSRSBinding([
      0.335561, 1.6840581, 5.166598, 11.659035, 7.466705, 0.7205129, 2.622295,
      0.001, 1.315015, 0.10468433, 0.8349206, 1.822305, 0.12473127, 0.26111007,
      2.3030033, 0.13117497, 3.0265594, 0.41468078, 0.09714265, 0.106824234,
      0.20447432,
    ])
    expect(() => f.evaluate([])).toThrow()
    expect(() => f.universalMetrics([])).toThrow()

    const csvBuffer = readFileSync(new URL('./revlog.csv', import.meta.url))
    const items = convertCsvToFsrsItems(csvBuffer, 4, 'Asia/Shanghai', 'FSRS-6')
    const metrics = f.evaluate(items)
    console.debug('metrics', metrics)
    expect(metrics.logLoss).toBeCloseTo(0.3340487, 4)
    expect(metrics.rmseBins).toBeCloseTo(0.038114432, 4)

    const reference = await computeParameters([], {
      enableShortTerm: true,
      modelVersion: 'FSRS-6',
      timeout: 5,
    })
    const result = f.universalMetrics(items, reference)
    console.debug('universal metrics', result)
    expect(result.length).toBe(2)
    // FSRS-6 reference after the fsrs-rs inference update to 4c168e4.
    expect(result[0]).toBeCloseTo(0.023871411, 4)
    expect(result[1]).toBeCloseTo(0.017724499, 4)
  })
})
