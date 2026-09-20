import { numericChrono } from 'ts-fsrs'

const clock = numericChrono.create()

console.log(
  JSON.stringify({
    now: clock.now(),
    elapsedDays: clock.difference(1.25, 4.5),
    nextTime: clock.add(4.5, 2.25),
    normalize: numericChrono.normalize['~standard'].validate({ time: 4.5 }),
  })
)
