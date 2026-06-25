export {}

if (globalThis.Temporal === undefined) {
  await import('temporal-polyfill/global')
}
