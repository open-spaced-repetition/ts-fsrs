import { FSRSVersion } from 'ts-fsrs'
import { version } from '../package.json'

test('TS-FSRS-Version', () => {
  // v3.5.7 using FSRS V5.0
  // test 3.5.7
  expect(version).toBe(FSRSVersion.split(' ')[0].slice(1))
})
