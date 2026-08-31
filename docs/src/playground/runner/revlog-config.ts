export type RevlogTrainingConfig = {
  readonly nextDayStartsAt: number
  readonly timezone: string
}

export type RevlogTrainingConfigError =
  | 'invalid-next-day-start'
  | 'invalid-timezone'

export type RevlogTrainingConfigValidation =
  | { readonly config: RevlogTrainingConfig; readonly ok: true }
  | { readonly error: RevlogTrainingConfigError; readonly ok: false }

type TimeZoneIntl = {
  readonly supportedValuesOf?: (key: 'timeZone') => string[]
}

const FIXED_OFFSET = /^[+-]/

export function validateRevlogTrainingConfig(
  timezone: string,
  nextDayStartsAt: number
): RevlogTrainingConfigValidation {
  if (
    !Number.isInteger(nextDayStartsAt) ||
    nextDayStartsAt < 0 ||
    nextDayStartsAt > 23
  ) {
    return { error: 'invalid-next-day-start', ok: false }
  }

  const requestedTimezone = timezone.trim()
  if (!requestedTimezone || FIXED_OFFSET.test(requestedTimezone)) {
    return { error: 'invalid-timezone', ok: false }
  }

  try {
    const resolvedTimezone = new Intl.DateTimeFormat('en', {
      timeZone: requestedTimezone,
    }).resolvedOptions().timeZone
    if (!resolvedTimezone || FIXED_OFFSET.test(resolvedTimezone)) {
      return { error: 'invalid-timezone', ok: false }
    }
    return {
      config: { nextDayStartsAt, timezone: resolvedTimezone },
      ok: true,
    }
  } catch {
    return { error: 'invalid-timezone', ok: false }
  }
}

export function getBrowserTimezone(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const validation = validateRevlogTrainingConfig(timezone || 'UTC', 4)
  return validation.ok ? validation.config.timezone : 'UTC'
}

export function getTimezoneOptions(
  currentTimezone: string,
  intl: TimeZoneIntl | null = Intl
): readonly string[] | undefined {
  if (typeof intl?.supportedValuesOf !== 'function') return undefined

  try {
    const supported = intl.supportedValuesOf('timeZone')
    const required = ['UTC', currentTimezone]
    return [
      ...required.filter(
        (timezone, index) =>
          required.indexOf(timezone) === index && !supported.includes(timezone)
      ),
      ...supported,
    ]
  } catch {
    return undefined
  }
}

export function getRevlogTrainingConfigErrorMessage(
  error: RevlogTrainingConfigError
): string {
  return error === 'invalid-timezone'
    ? 'timezone must be a valid IANA timezone name'
    : 'nextDayStartsAt must be an integer from 0 through 23'
}
