---
"@open-spaced-repetition/binding": minor
---

- **BREAKING CHANGE:** `convertCsvToFsrsItems` now resolves IANA timezones in Rust and no longer accepts the JavaScript offset-provider callback.

Use `convertCsvToFsrsItems(data, nextDayStartsAt, timezone)` instead of passing `(ms, timezone) => offsetMinutes`. The binding now applies the timezone offset for each review timestamp internally, including daylight saving time transitions.
