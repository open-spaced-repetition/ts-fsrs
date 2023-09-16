// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {version} from '../package.json';
import { FSRSVersion } from "../src/fsrs";


test("TS-FSRS-Version", () => {
  expect(FSRSVersion).toBe(version);
});