import {
  computeParameters,
  convertCsvToFsrsItemsWithCardIds,
  evaluateWithTimeSeriesSplits,
} from '@open-spaced-repetition/binding'

const response = await fetch(`${import.meta.env.BASE_URL}/revlog.csv`, {
  cache: 'force-cache',
})
if (!response.ok) throw new Error(`revlog.csv: ${response.status}`)
if (!response.body) throw new Error('revlog.csv: empty response body')
console.log('Response received. Converting reviews and training…')

const dataset = await convertCsvToFsrsItemsWithCardIds(
  response.body,
  4,
  'UTC',
  'FSRS-7'
)
const optimizedWeights = await computeParameters(dataset.items, {
  modelVersion: 'FSRS-7',
  enableShortTerm: true,
  cardIds: dataset.cardIds,
})
const metrics = await evaluateWithTimeSeriesSplits(dataset.items, {
  modelVersion: 'FSRS-7',
  enableShortTerm: true,
  cardIds: dataset.cardIds,
})

console.log(JSON.stringify({ optimizedWeights, metrics }, null, 2))
