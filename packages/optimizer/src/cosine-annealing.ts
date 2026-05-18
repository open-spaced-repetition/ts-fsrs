export class CosineAnnealingLR {
  private readonly tMax: number
  private readonly etaMin: number
  private readonly initLr: number
  private stepCount = -1
  private currentLr: number

  constructor(tMax: number, initLr: number, etaMin: number = 0) {
    this.tMax = tMax
    this.etaMin = etaMin
    this.initLr = initLr
    this.currentLr = initLr
  }

  step(): number {
    this.stepCount += 1
    if (this.stepCount === 0) {
      this.currentLr = this.initLr
      return this.currentLr
    }
    if ((this.stepCount - 1 - this.tMax) % (2 * this.tMax) === 0) {
      this.currentLr =
        ((this.initLr - this.etaMin) * (1 - Math.cos(Math.PI / this.tMax))) / 2
      return this.currentLr
    }
    this.currentLr =
      ((1 + Math.cos((Math.PI * this.stepCount) / this.tMax)) /
        (1 + Math.cos((Math.PI * (this.stepCount - 1)) / this.tMax))) *
        (this.currentLr - this.etaMin) +
      this.etaMin
    return this.currentLr
  }
}
