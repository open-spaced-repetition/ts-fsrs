import {
  BindingMemoryState,
  convertCsvToFsrsItems,
  FSRSBinding,
  FSRSBindingItem,
  FSRSBindingReview,
} from '@open-spaced-repetition/binding/index.js'
import { readFileSync } from 'node:fs'

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

    const memoryState = new BindingMemoryState(1.0, 0.5)
    expect(memoryState).toBeInstanceOf(BindingMemoryState)
  })

  test('next_states', () => {
    const f = new FSRSBinding()
    const nextStates = f.nextStates(null, 0.9, 0)
    expect(nextStates.again).not.toBeUndefined()
    expect(nextStates.hard).not.toBeUndefined()
    expect(nextStates.good).not.toBeUndefined()
    expect(nextStates.easy).not.toBeUndefined()
    console.log(nextStates)
  })

  /**
diff --git a/src/inference.rs b/src/inference.rs
index f5b20bf..f662363 100644
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
@@ -972,7 +972,7 @@ mod tests {
         ])?;
         let metrics = fsrs.evaluate(items.clone(), |_| true).unwrap();
 
-        [metrics.log_loss, metrics.rmse_bins].assert_approx_eq([0.20580745, 0.026005825]);
+        [metrics.log_loss, metrics.rmse_bins].assert_approx_eq([0.3340487, 0.038114432]);
 
         let fsrs = FSRS::default();
         let metrics = fsrs.evaluate(items.clone(), |_| true).unwrap();

   */
  test('evaluate with empty training set', () => {
    const f = new FSRSBinding([
      0.335561, 1.6840581, 5.166598, 11.659035, 7.466705, 0.7205129, 2.622295,
      0.001, 1.315015, 0.10468433, 0.8349206, 1.822305, 0.12473127, 0.26111007,
      2.3030033, 0.13117497, 3.0265594, 0.41468078, 0.09714265, 0.106824234,
      0.20447432,
    ])
    expect(() => f.evaluate([])).toThrow()

    const csvBuffer = readFileSync(new URL('./revlog.csv', import.meta.url))
    const offset = 480 // UTC+8
    const items = convertCsvToFsrsItems(csvBuffer, 4, 'Asia/Shanghai', () =>
      offset
    )
    const metrics = f.evaluate(items)
    console.debug('metrics', metrics)
    expect(metrics.logLoss).toBeCloseTo(0.3340487, 4)
    expect(metrics.rmseBins).toBeCloseTo(0.038114432, 4)
  })
})
