import { createEmptyCard, fsrs, Grade, Rating } from '../../src/fsrs'

/**
 * @see https://forums.ankiweb.net/t/feature-request-estimated-total-knowledge-over-time/53036/58?u=l.m.sherlock
 * @see https://ankiweb.net/shared/info/1613056169
 */
test('TS-FSRS-Simulator', () => {
  const f = fsrs({
    w: [
      1.1596, 1.7974, 13.1205, 49.3729, 7.2303, 0.5081, 1.5371, 0.001, 1.5052,
      0.1261, 0.9735, 1.8924, 0.1486, 0.2407, 2.1937, 0.1518, 3.0699, 0.4636,
      0.6048,
    ],
  })
  const rids = [1704468957000, 1704469645000, 1704599572000, 1705509507000]

  const expected = [13.1205, 17.3668145, 21.28550751, 39.63452215]
  let card = createEmptyCard(new Date(rids[0]))
  const grades: Grade[] = [Rating.Good, Rating.Good, Rating.Good, Rating.Good]
  for (let i = 0; i < rids.length; i++) {
    const now = new Date(rids[i])
    const log = f.next(card, now, grades[i])
    card = log.card
    expect(card.stability).toBeCloseTo(expected[i], 4)
  }
})
