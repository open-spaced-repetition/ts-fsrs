import {
  computeParameters,
  convertCsvToFsrsItems,
} from '@open-spaced-repetition/binding'

console.log('Downloading revlog.csv…')
const response = await fetch('/revlog.csv', { cache: 'force-cache' })
if (!response.ok) throw new Error(`revlog.csv: ${response.status}`)
if (!response.body) throw new Error('revlog.csv: empty response body')

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
const items = await convertCsvToFsrsItems(response.body, 4, timezone)
console.log('Downloaded revlog.csv.')
console.log(`Optimising ${items.length} reviews (${timezone})…`)

// Console output is streamed while the run is still going, so `progress`
// reports the optimiser as it advances. It fires per epoch, which is far more
// often than the output needs to change, so lines are kept to every tenth.
const STEP_PERCENT = 10
let reportedStep = -1
const weights = await computeParameters(items, {
  enableShortTerm: true,
  progress(current, total) {
    const step = Math.floor((current / total) * (100 / STEP_PERCENT))
    if (step === reportedStep) return
    reportedStep = step
    console.log(`${step * STEP_PERCENT}% (${current}/${total})`)
  },
})

console.log(
  JSON.stringify({ timezone, reviews: items.length, weights }, null, 2)
)
