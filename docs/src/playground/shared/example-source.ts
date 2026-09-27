// Apply the build-time base constant to source imported with ?raw.
export function prepareExampleSource(code: string, base: string): string {
  const baseUrl = base.replace(/\/$/, '')
  // Fold static paths, leaving dynamic or escaped templates intact.
  return code
    .replaceAll(
      /`\$\{import\.meta\.env\.BASE_URL\}([^`\\$]*)`/g,
      (_match, suffix: string) => JSON.stringify(baseUrl + suffix)
    )
    .replaceAll('import.meta.env.BASE_URL', () => JSON.stringify(baseUrl))
}
