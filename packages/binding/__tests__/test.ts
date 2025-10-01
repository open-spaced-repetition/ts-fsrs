import { plus100 } from '@open-spaced-repetition/binding'

test('sync function from native code', () => {
  const fixture = 42
  expect(plus100(fixture)).toBe(fixture + 100)
})
