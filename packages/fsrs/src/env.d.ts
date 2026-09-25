export {}

declare global {
  interface ImportMeta {
    readonly env?: {
      readonly TS_FSRS_DISABLE_ROUNDING?: boolean
    }
  }
}
