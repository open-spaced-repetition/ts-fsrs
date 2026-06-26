import type ts from 'typescript'

declare global {
  function getTypeDisplayService(): ts.LanguageService
  function quickInfoAt(
    service: ts.LanguageService,
    rel: string,
    marker: string
  ): string
}
