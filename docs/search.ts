import type { BeforeSearch } from '@rspress/core/theme'

export const beforeSearch: BeforeSearch = (query) =>
  query.trim().replace(/\s+/g, ' ')
