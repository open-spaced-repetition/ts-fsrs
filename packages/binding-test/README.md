# @open-spaced-repetition/binding-test

Tests for the `@open-spaced-repetition/binding` package.

## Overview

This package contains tests for the FSRS binding (napi-rs based Node.js bindings). Because the binding uses napi-rs, it cannot be tested directly without compilation. The binding must be compiled before these tests can run.

## Running Tests

```bash
# From the root of the monorepo
pnpm test

# Or specifically for this package
pnpm -F @open-spaced-repetition/binding-test test
```

## Test Data

The tests require `revlog.csv` which is downloaded automatically during CI. To run tests locally, download it from:
https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv

And place it in `packages/binding-test/src/revlog.csv`

## Structure

- `src/*.spec.ts` - Test files
- `src/helpers/` - Helper utilities for tests
- `src/demo/` - Demo scripts showing usage examples
