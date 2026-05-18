export class AdamOptimizer {
  private readonly beta1: number
  private readonly beta2: number
  private readonly epsilon: number
  private readonly m: number[]
  private readonly v: number[]
  private t = 0

  constructor(
    parameterCount: number,
    beta1: number,
    beta2: number,
    epsilon: number
  ) {
    this.beta1 = beta1
    this.beta2 = beta2
    this.epsilon = epsilon
    this.m = Array<number>(parameterCount).fill(0)
    this.v = Array<number>(parameterCount).fill(0)
  }

  step(
    parameters: readonly number[],
    gradients: readonly number[],
    learningRate: number
  ): number[] {
    this.t += 1
    const next = Array.from(parameters)
    const beta1Correction = 1 - Math.pow(this.beta1, this.t)
    const beta2Correction = 1 - Math.pow(this.beta2, this.t)

    for (let index = 0; index < parameters.length; index++) {
      const gradient = gradients[index]
      this.m[index] = this.beta1 * this.m[index] + (1 - this.beta1) * gradient
      this.v[index] =
        this.beta2 * this.v[index] + (1 - this.beta2) * gradient * gradient

      const mHat = this.m[index] / beta1Correction
      const vHat = this.v[index] / beta2Correction
      next[index] =
        parameters[index] -
        learningRate * (mHat / (Math.sqrt(vHat) + this.epsilon))
    }

    return next
  }
}
