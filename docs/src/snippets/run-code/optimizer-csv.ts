import { convertCsvToFsrsItems } from '@open-spaced-repetition/binding'

// One card with two reviews: first review today, second the next day.
const csv = [
  'review_time,card_id,review_rating,review_duration,review_state',
  '1704067200000,card-one,3,1000,0',
  '1704153600000,card-one,4,900,2',
].join('\n')

// The day starts at 04:00 local, in the UTC timezone.
const items = convertCsvToFsrsItems(new TextEncoder().encode(csv), 4, 'UTC')

console.log(
  JSON.stringify(
    {
      itemCount: items.length,
      reviewsPerItem: items.map((item) => item.reviews.length),
      ratings: items.map((item) => item.reviews.map((review) => review.rating)),
    },
    null,
    2
  )
)
