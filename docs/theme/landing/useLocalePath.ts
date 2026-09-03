import { useLang, useSite } from '@rspress/core/runtime'

// Shared sections need a runtime locale prefix; the default locale stays at root.
export function useLocalePath(): (path: string) => string {
  const lang = useLang()
  const { site } = useSite()
  const prefix = lang && lang !== site.lang ? `/${lang}` : ''
  return (path) => `${prefix}${path}`
}
