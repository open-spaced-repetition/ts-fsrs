const UINT32_MASK = 0xffffffff
const UINT32_MOD = 0x1_0000_0000n
const UINT64_MASK = 0xffff_ffff_ffff_ffffn
const PCG32_MULTIPLIER = 6_364_136_223_846_793_005n
const PCG32_INCREMENT = 11_634_580_027_462_260_723n
const CHACHA_CONSTANTS = [0x6170_7865, 0x3320_646e, 0x7962_2d32, 0x6b20_6574]

function rotateLeft32(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0
}

function quarterRound(
  state: Uint32Array,
  a: number,
  b: number,
  c: number,
  d: number
): void {
  state[a] = (state[a] + state[b]) >>> 0
  state[d] = rotateLeft32(state[d] ^ state[a], 16)
  state[c] = (state[c] + state[d]) >>> 0
  state[b] = rotateLeft32(state[b] ^ state[c], 12)
  state[a] = (state[a] + state[b]) >>> 0
  state[d] = rotateLeft32(state[d] ^ state[a], 8)
  state[c] = (state[c] + state[d]) >>> 0
  state[b] = rotateLeft32(state[b] ^ state[c], 7)
}

function writeUint32LE(
  buffer: Uint8Array,
  offset: number,
  value: number
): void {
  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >>> 8) & 0xff
  buffer[offset + 2] = (value >>> 16) & 0xff
  buffer[offset + 3] = (value >>> 24) & 0xff
}

function readUint32LE(buffer: Uint8Array, offset: number): number {
  return (
    (buffer[offset] |
      (buffer[offset + 1] << 8) |
      (buffer[offset + 2] << 16) |
      (buffer[offset + 3] << 24)) >>>
    0
  )
}

function pcg32Step(state: bigint): { nextState: bigint; value: number } {
  const nextState = (state * PCG32_MULTIPLIER + PCG32_INCREMENT) & UINT64_MASK
  const xorshifted = Number(
    (((nextState >> 18n) ^ nextState) >> 27n) & 0xffffffffn
  )
  const rotation = Number((nextState >> 59n) & 31n)
  const value =
    ((xorshifted >>> rotation) | (xorshifted << ((32 - rotation) & 31))) >>> 0
  return { nextState, value }
}

function seedFromU64(seed: number): Uint8Array {
  const result = new Uint8Array(32)
  let state = BigInt.asUintN(64, BigInt(seed))
  for (let offset = 0; offset < result.length; offset += 4) {
    const step = pcg32Step(state)
    state = step.nextState
    writeUint32LE(result, offset, step.value)
  }
  return result
}

function multiplyUint32(
  left: number,
  right: number
): { hi: number; lo: number } {
  const product = BigInt(left >>> 0) * BigInt(right >>> 0)
  return {
    hi: Number((product >> 32n) & 0xffffffffn) >>> 0,
    lo: Number(product & 0xffffffffn) >>> 0,
  }
}

function calculateBoundU32(m: number): { bound: number; remaining: number } {
  const start = BigInt(m >>> 0)
  let product = start
  let current = start + 1n

  while (product * current <= 0xffff_ffffn) {
    product *= current
    current += 1n
  }

  return {
    bound: Number(product),
    remaining: Number(current - start),
  }
}

class ChaCha12StdRng {
  private readonly keyWords: Uint32Array
  private readonly buffer = new Uint32Array(64)
  private bufferIndex = 64
  private counterLow = 0
  private counterHigh = 0

  constructor(seed: number) {
    const seedBytes = seedFromU64(seed)
    this.keyWords = new Uint32Array(8)
    for (let index = 0; index < this.keyWords.length; index++) {
      this.keyWords[index] = readUint32LE(seedBytes, index * 4)
    }
  }

  nextU32(): number {
    if (this.bufferIndex >= this.buffer.length) {
      this.refill()
    }
    const value = this.buffer[this.bufferIndex]
    this.bufferIndex += 1
    return value >>> 0
  }

  randomRange(bound: number): number {
    const range = bound >>> 0
    if (range === 0) {
      return this.nextU32()
    }

    let { hi, lo } = multiplyUint32(this.nextU32(), range)
    const threshold = (UINT32_MOD - BigInt(range)) & 0xffffffffn
    if (BigInt(lo) > threshold) {
      const { hi: newHi } = multiplyUint32(this.nextU32(), range)
      if (lo + newHi > UINT32_MASK) {
        hi = (hi + 1) >>> 0
      }
    }
    return hi
  }

  private refill(): void {
    let blockCounterLow = this.counterLow
    let blockCounterHigh = this.counterHigh

    for (let block = 0; block < 4; block++) {
      const words = this.generateBlock(blockCounterLow, blockCounterHigh)
      this.buffer.set(words, block * 16)
      blockCounterLow = (blockCounterLow + 1) >>> 0
      if (blockCounterLow === 0) {
        blockCounterHigh = (blockCounterHigh + 1) >>> 0
      }
    }

    this.counterLow = (this.counterLow + 4) >>> 0
    if (this.counterLow < 4) {
      this.counterHigh = (this.counterHigh + 1) >>> 0
    }
    this.bufferIndex = 0
  }

  private generateBlock(counterLow: number, counterHigh: number): Uint32Array {
    const initial = new Uint32Array(16)
    initial.set(CHACHA_CONSTANTS, 0)
    initial.set(this.keyWords, 4)
    initial[12] = counterLow >>> 0
    initial[13] = counterHigh >>> 0
    initial[14] = 0
    initial[15] = 0

    const working = initial.slice()
    for (let round = 0; round < 6; round++) {
      quarterRound(working, 0, 4, 8, 12)
      quarterRound(working, 1, 5, 9, 13)
      quarterRound(working, 2, 6, 10, 14)
      quarterRound(working, 3, 7, 11, 15)

      quarterRound(working, 0, 5, 10, 15)
      quarterRound(working, 1, 6, 11, 12)
      quarterRound(working, 2, 7, 8, 13)
      quarterRound(working, 3, 4, 9, 14)
    }

    for (let index = 0; index < working.length; index++) {
      working[index] = (working[index] + initial[index]) >>> 0
    }
    return working
  }
}

class IncreasingUniform {
  private readonly rng: ChaCha12StdRng
  private n: number
  private chunk = 0
  private chunkRemaining: number

  constructor(rng: ChaCha12StdRng, n: number) {
    this.rng = rng
    this.n = n >>> 0
    this.chunkRemaining = n === 0 ? 1 : 0
  }

  nextIndex(): number {
    const nextN = (this.n + 1) >>> 0
    let nextChunkRemaining = this.chunkRemaining - 1

    if (nextChunkRemaining < 0) {
      const { bound, remaining } = calculateBoundU32(nextN)
      this.chunk = this.rng.randomRange(bound)
      nextChunkRemaining = remaining - 1
    }

    let result: number
    if (nextChunkRemaining === 0) {
      result = this.chunk
    } else {
      result = this.chunk % nextN
      this.chunk = Math.floor(this.chunk / nextN)
    }

    this.chunkRemaining = nextChunkRemaining
    this.n = nextN
    return result
  }
}

export function createStdRng(seed = Date.now()): ChaCha12StdRng {
  return new ChaCha12StdRng(seed)
}

export function shuffleIndices(length: number, rng: ChaCha12StdRng): number[] {
  const values = Array.from({ length }, (_, index) => index)
  if (values.length <= 1) {
    return values
  }

  const chooser = new IncreasingUniform(rng, 0)
  for (let index = 0; index < values.length; index++) {
    const randomIndex = chooser.nextIndex()
    const current = values[index]
    values[index] = values[randomIndex]
    values[randomIndex] = current
  }

  return values
}
