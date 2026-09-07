/**
 * Shared by the TypeScript worker and the completion provider: the language
 * service only offers auto-imports when the same preferences are passed to both
 * `getCompletionsAtPosition` and `getCompletionEntryDetails`.
 */
export const COMPLETION_PREFERENCES = {
  allowIncompleteCompletions: true,
  // Without this, completions list only what is already in scope.
  includeCompletionsForModuleExports: true,
  includeCompletionsWithInsertText: true,
  // The playground's examples import package specifiers, not relative paths.
  importModuleSpecifierPreference: 'non-relative',
  // Matches the examples, which the inserted import sits above.
  quotePreference: 'single',
} as const
