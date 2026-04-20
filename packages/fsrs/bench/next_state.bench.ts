import { bench, describe } from 'vitest'
import {
  FSRSAlgorithm,
  forgetting_curve,
  computeDecayFactor,
} from '../src/algorithm'
import { default_w } from '../src/constant'
import { Rating, type FSRSState } from '../src/models'
import { fsrs } from '../src/fsrs'

// Weights from real-world Anki FSRS training output (19 params, auto-migrated to 21)
const weights = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
  1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898,
  0.51655, 0.6621,
]

const algorithm = new FSRSAlgorithm({})
const algorithmCustom = new FSRSAlgorithm({ w: weights })
const FSRS_A = fsrs({ w: weights })
const FSRS_B = fsrs({}) // default weights

// Pre-computed states for benchmarking
const newState: FSRSState | null = null
const learningState: FSRSState = { difficulty: 5.0, stability: 1.2931 }
const reviewState: FSRSState = { difficulty: 6.5, stability: 30.0 }
const matureState: FSRSState = { difficulty: 4.2, stability: 180.0 }

// --- forgetting_curve benchmarks ---

describe('forgetting_curve - standalone function', () => {
  bench('with decay number (default_w[20])', () => {
    forgetting_curve(default_w[20], 5, 30.0)
  })
  bench('with params array (default_w)', () => {
    forgetting_curve(default_w, 5, 30.0)
  })
  bench('with custom weights array', () => {
    forgetting_curve(weights, 5, 30.0)
  })
})

describe('forgetting_curve - instance method (cached)', () => {
  bench('default params: t=5, s=30', () => {
    algorithm.forgetting_curve(5, 30.0)
  })
  bench('custom weights: t=5, s=30', () => {
    algorithmCustom.forgetting_curve(5, 30.0)
  })
  bench('fsrs instance: t=10, s=31.72', () => {
    FSRS_A.forgetting_curve(10, 31.722975)
  })
  bench('t=1, s=1.29', () => {
    algorithm.forgetting_curve(1, 1.2931)
  })
  bench('t=30, s=180', () => {
    algorithm.forgetting_curve(30, 180.0)
  })
  bench('t=90, s=365', () => {
    algorithm.forgetting_curve(90, 365.0)
  })
})

describe('forgetting_curve - multi-instance interleaved', () => {
  bench('alternate between two FSRS instances (100 calls)', () => {
    for (let i = 0; i < 100; i++) {
      if (i % 2 === 0) {
        FSRS_A.forgetting_curve(i + 1, 31.722975)
      } else {
        FSRS_B.forgetting_curve(i + 1, 50.0)
      }
    }
  })
})

describe('computeDecayFactor', () => {
  bench('from decay number', () => {
    computeDecayFactor(default_w[20])
  })
  bench('from params array', () => {
    computeDecayFactor(default_w)
  })
})

// --- next_state benchmarks ---

describe('next_state - new card (null state)', () => {
  bench('grade Again', () => {
    algorithm.next_state(newState, 0, Rating.Again)
  })
  bench('grade Hard', () => {
    algorithm.next_state(newState, 0, Rating.Hard)
  })
  bench('grade Good', () => {
    algorithm.next_state(newState, 0, Rating.Good)
  })
  bench('grade Easy', () => {
    algorithm.next_state(newState, 0, Rating.Easy)
  })
})

describe('next_state - learning (short-term, t=0)', () => {
  bench('grade Again', () => {
    algorithm.next_state(learningState, 0, Rating.Again)
  })
  bench('grade Hard', () => {
    algorithm.next_state(learningState, 0, Rating.Hard)
  })
  bench('grade Good', () => {
    algorithm.next_state(learningState, 0, Rating.Good)
  })
  bench('grade Easy', () => {
    algorithm.next_state(learningState, 0, Rating.Easy)
  })
})

describe('next_state - review (t=5)', () => {
  bench('grade Again', () => {
    algorithm.next_state(reviewState, 5, Rating.Again)
  })
  bench('grade Hard', () => {
    algorithm.next_state(reviewState, 5, Rating.Hard)
  })
  bench('grade Good', () => {
    algorithm.next_state(reviewState, 5, Rating.Good)
  })
  bench('grade Easy', () => {
    algorithm.next_state(reviewState, 5, Rating.Easy)
  })
})

describe('next_state - mature card (t=30)', () => {
  bench('grade Again', () => {
    algorithm.next_state(matureState, 30, Rating.Again)
  })
  bench('grade Hard', () => {
    algorithm.next_state(matureState, 30, Rating.Hard)
  })
  bench('grade Good', () => {
    algorithm.next_state(matureState, 30, Rating.Good)
  })
  bench('grade Easy', () => {
    algorithm.next_state(matureState, 30, Rating.Easy)
  })
})

describe('next_state - with pre-computed retrievability', () => {
  bench('grade Good with r=0.9', () => {
    algorithm.next_state(reviewState, 5, Rating.Good, 0.9)
  })
  bench('grade Again with r=0.7', () => {
    algorithm.next_state(reviewState, 5, Rating.Again, 0.7)
  })
})

describe('next_state - batch simulation (100 reviews)', () => {
  bench('simulate 100 sequential reviews', () => {
    let state: FSRSState | null = null
    for (let i = 0; i < 100; i++) {
      const grade = (i % 4) + 1 // cycle through 1-4
      const t = state === null ? 0 : Math.max(1, Math.floor(state.stability))
      state = algorithm.next_state(state, t, grade)
    }
  })
})
