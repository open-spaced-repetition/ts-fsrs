// Apply the build-time base constant to source imported with ?raw.
export function prepareExampleSource(code: string, base: string): string {
  const baseUrl = JSON.stringify(base.replace(/\/$/, ''))
  return code.replaceAll('import.meta.env.BASE_URL', () => baseUrl)
}
