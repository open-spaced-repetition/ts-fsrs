/// <reference lib="webworker" />

import {
  initialize,
  TypeScriptWorker,
} from 'monaco-editor/esm/vs/language/typescript/ts.worker'
import { COMPLETION_PREFERENCES } from './completion-preferences'

// Required, not optional: building an auto-import code action runs the change
// tracker, which dereferences `formatContext.options` and throws on undefined.
// That error surfaces as a silently unresolved completion, so the import is
// simply never inserted. Monaco bundles a trimmed TypeScript that omits
// `getDefaultFormatCodeSettings`, hence the literal — matched to the two-space
// style of the playground examples.
const FORMAT_OPTIONS = {
  convertTabsToSpaces: true,
  indentSize: 2,
  insertSpaceAfterCommaDelimiter: true,
  insertSpaceAfterKeywordsInControlFlowStatements: true,
  insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
  insertSpaceBeforeAndAfterBinaryOperators: true,
  newLineCharacter: '\n',
  tabSize: 2,
}

// Monaco calls the language service with no `UserPreferences`, which leaves
// `includeCompletionsForModuleExports` off: completions only ever list symbols
// already in scope. Passing preferences here surfaces every exported symbol,
// and forwarding `source`/`data` lets the language service produce the code
// action that inserts the import. Monaco's own worker drops both arguments, so
// the methods are widened rather than merely re-called.
class PlaygroundTypeScriptWorker extends TypeScriptWorker {
  override async getCompletionsAtPosition(fileName: string, position: number) {
    return this._languageService.getCompletionsAtPosition(
      fileName,
      position,
      COMPLETION_PREFERENCES
    )
  }

  override async getCompletionEntryDetails(
    fileName: string,
    position: number,
    entry: string,
    source?: string,
    data?: unknown
  ) {
    return this._languageService.getCompletionEntryDetails(
      fileName,
      position,
      entry,
      FORMAT_OPTIONS,
      source,
      COMPLETION_PREFERENCES,
      data
    )
  }
}

// `ts.worker` registers its own handler on import; this replaces it so the
// subclass is what Monaco instantiates.
self.onmessage = () => {
  initialize(
    (context: unknown, createData: unknown) =>
      new PlaygroundTypeScriptWorker(context, createData)
  )
}
