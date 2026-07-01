/** biome-ignore-all lint/correctness/noUnusedVariables: type-display fixtures read by LanguageService */
import { describe, expect, it } from 'vitest'
import { dateChrono } from './presets/date/chrono.js'
import { numericChrono } from './presets/numeric/chrono.js'
import { temporalInstantChrono } from './presets/temporal-instant/chrono.js'

// Type fixtures — names must be unique and appear before any expected-value
// strings so that quickInfoAt's indexOf hits the declaration first.
const chronoNumeric = numericChrono
const chronoDate = dateChrono
const chronoTemporalInstant = temporalInstantChrono
const coreNumeric = numericChrono.create()
const coreDate = dateChrono.create()
const coreTemporalInstant = temporalInstantChrono.create({
  config: { timezone: 'UTC', fractionalDays: false },
})

const SELF = 'src/chrono/define-chrono.type-display.spec.ts'

describe('defineChrono type display', () => {
  const service = getTypeDisplayService()

  const expectedChronos = {
    chronoNumeric: `const chronoNumeric: Chrono<{
    readonly time: SRSSchema<{
        input: {};
        output: number;
    }>;
    readonly fields: {};
}>`,
    chronoDate: `const chronoDate: Chrono<{
    readonly time: SRSSchema<{
        input: Date;
        output: Date;
    }>;
    readonly fields: {
        readonly card: SRSSchema<{
            input: {
                dueAt: Date;
                lastReviewAt?: (Date | null) | undefined;
            };
            output: {
                dueAt: Date;
                lastReviewAt: Date | null;
            };
        }>;
        readonly revlog: SRSSchema<{
            input: {
                dueAt: Date;
                reviewTime: Date;
            };
            output: {
                dueAt: Date;
                reviewTime: Date;
            };
        }>;
    };
}>`,
    chronoTemporalInstant: `const chronoTemporalInstant: Chrono<{
    readonly time: SRSSchema<{
        input: Temporal.Instant;
        output: Temporal.Instant;
    }>;
    readonly config: SRSSchema<{
        input: {
            readonly timezone?: string | undefined;
            readonly fractionalDays?: boolean | undefined;
        };
        output: {
            readonly timezone: string;
            readonly fractionalDays: boolean;
        };
    }>;
    readonly fields: {
        readonly card: SRSSchema<{
            input: {
                dueAt: Temporal.Instant;
                lastReviewAt?: (Temporal.Instant | null) | undefined;
            };
            output: {
                dueAt: Temporal.Instant;
                lastReviewAt: Temporal.Instant | null;
            };
        }>;
        readonly revlog: SRSSchema<{
            input: {
                dueAt: Temporal.Instant;
                reviewTime: Temporal.Instant;
            };
            output: {
                dueAt: Temporal.Instant;
                reviewTime: Temporal.Instant;
            };
        }>;
    };
}>`,
  }

  const expectedCores = {
    coreNumeric: 'const coreNumeric: ChronoCore<number>',
    coreDate: 'const coreDate: ChronoCore<Date>',
    coreTemporalInstant:
      'const coreTemporalInstant: ChronoCore<Temporal.Instant>',
  }

  it('keeps chrono preset hovers readable', () => {
    for (const [marker, expected] of Object.entries(expectedChronos)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })

  it('shows ChronoCore<T> for chrono.create()', () => {
    for (const [marker, expected] of Object.entries(expectedCores)) {
      expect(quickInfoAt(service, SELF, marker)).toBe(expected)
    }
  })
}, 20_000)
