import { FSRSVersion } from 'ts-fsrs'
import { version } from '../package.json'

test('TS-FSRS-Version', () => {
  expect(FSRSVersion).toBe(`v${version}`)
})
