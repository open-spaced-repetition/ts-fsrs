import type { editor, IDisposable, languages, Position } from 'monaco-editor'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'

/**
 * Monaco's built-in TypeScript completion provider cannot auto-import: it
 * resolves an entry by label alone and discards the language service's code
 * actions, so the import statement is never inserted. This provider keeps each
 * entry's `source`/`data` and turns those code actions into
 * `additionalTextEdits`.
 */

type CompletionEntry = {
  readonly data?: unknown
  readonly kind: string
  readonly kindModifiers?: string
  readonly name: string
  readonly replacementSpan?: { readonly length: number; readonly start: number }
  readonly sortText: string
  readonly source?: string
  readonly sourceDisplay?: readonly { readonly text: string }[]
}

type CompletionInfo = { readonly entries: readonly CompletionEntry[] }

type CompletionDetails = {
  readonly codeActions?: readonly {
    readonly changes: readonly {
      readonly fileName: string
      readonly textChanges: readonly {
        readonly newText: string
        readonly span: { readonly length: number; readonly start: number }
      }[]
    }[]
    readonly description: string
  }[]
  readonly displayParts?: readonly { readonly text: string }[]
  readonly documentation?: readonly { readonly text: string }[]
  readonly kind: string
  readonly name: string
}

type TypeScriptCompletionWorker = {
  getCompletionEntryDetails(
    fileName: string,
    position: number,
    entry: string,
    source?: string,
    data?: unknown
  ): Promise<CompletionDetails | undefined>
  getCompletionsAtPosition(
    fileName: string,
    position: number
  ): Promise<CompletionInfo | undefined>
}

type WorkerAccessor = (
  ...resources: monaco.Uri[]
) => Promise<TypeScriptCompletionWorker>

// Carries the request context an entry needs when it is resolved later.
type PlaygroundCompletionItem = languages.CompletionItem & {
  readonly data?: unknown
  readonly offset: number
  readonly source?: string
  readonly uri: monaco.Uri
}

const { CompletionItemKind } = monaco.languages

// Mirrors the mapping in Monaco's own SuggestAdapter.
const KIND_BY_TYPESCRIPT_KIND: Readonly<
  Record<string, languages.CompletionItemKind>
> = {
  class: CompletionItemKind.Class,
  const: CompletionItemKind.Variable,
  constructor: CompletionItemKind.Constructor,
  directory: CompletionItemKind.Folder,
  enum: CompletionItemKind.Enum,
  'enum member': CompletionItemKind.EnumMember,
  external_module_name: CompletionItemKind.Module,
  file: CompletionItemKind.File,
  function: CompletionItemKind.Function,
  getter: CompletionItemKind.Property,
  interface: CompletionItemKind.Interface,
  keyword: CompletionItemKind.Keyword,
  let: CompletionItemKind.Variable,
  'local class': CompletionItemKind.Class,
  'local function': CompletionItemKind.Function,
  'local var': CompletionItemKind.Variable,
  method: CompletionItemKind.Method,
  module: CompletionItemKind.Module,
  parameter: CompletionItemKind.Variable,
  'primitive type': CompletionItemKind.Keyword,
  property: CompletionItemKind.Property,
  setter: CompletionItemKind.Property,
  type: CompletionItemKind.Class,
  var: CompletionItemKind.Variable,
}

function toCompletionItemKind(kind: string): languages.CompletionItemKind {
  return KIND_BY_TYPESCRIPT_KIND[kind] ?? CompletionItemKind.Property
}

function displayPartsToString(
  parts: readonly { readonly text: string }[] | undefined
): string {
  return parts?.map(({ text }) => text).join('') ?? ''
}

export function registerPlaygroundCompletions(
  getWorker: WorkerAccessor
): IDisposable {
  return monaco.languages.registerCompletionItemProvider('typescript', {
    triggerCharacters: ['.', '"', "'", '`', '/', '@', '<'],

    async provideCompletionItems(
      model: editor.ITextModel,
      position: Position
    ): Promise<languages.CompletionList | undefined> {
      const word = model.getWordUntilPosition(position)
      const defaultRange = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      )
      const resource = model.uri
      const offset = model.getOffsetAt(position)
      const worker = await getWorker(resource)
      if (model.isDisposed()) return undefined

      const info = await worker.getCompletionsAtPosition(
        resource.toString(),
        offset
      )
      if (!info || model.isDisposed()) return undefined

      const suggestions = info.entries.map(
        (entry): PlaygroundCompletionItem => {
          let range = defaultRange
          if (entry.replacementSpan) {
            const start = model.getPositionAt(entry.replacementSpan.start)
            const end = model.getPositionAt(
              entry.replacementSpan.start + entry.replacementSpan.length
            )
            range = new monaco.Range(
              start.lineNumber,
              start.column,
              end.lineNumber,
              end.column
            )
          }

          return {
            data: entry.data,
            // The module an auto-import would pull the symbol from.
            detail: displayPartsToString(entry.sourceDisplay),
            insertText: entry.name,
            kind: toCompletionItemKind(entry.kind),
            label: entry.name,
            offset,
            range,
            sortText: entry.sortText,
            source: entry.source,
            tags: entry.kindModifiers?.includes('deprecated')
              ? [monaco.languages.CompletionItemTag.Deprecated]
              : [],
            uri: resource,
          }
        }
      )

      return { suggestions }
    },

    async resolveCompletionItem(
      item: languages.CompletionItem
    ): Promise<languages.CompletionItem> {
      const resolving = item as PlaygroundCompletionItem
      const worker = await getWorker(resolving.uri)
      const details = await worker.getCompletionEntryDetails(
        resolving.uri.toString(),
        resolving.offset,
        typeof resolving.label === 'string'
          ? resolving.label
          : resolving.label.label,
        resolving.source,
        resolving.data
      )
      if (!details) return resolving

      // Code actions carry the import statement to insert, which Monaco's own
      // provider drops. Only edits to this file can travel with a completion.
      const model = monaco.editor.getModel(resolving.uri)
      const additionalTextEdits = model
        ? details.codeActions?.flatMap((action) =>
            action.changes
              .filter(({ fileName }) => fileName === resolving.uri.toString())
              .flatMap(({ textChanges }) =>
                textChanges.map(({ newText, span }) => ({
                  range: monaco.Range.fromPositions(
                    model.getPositionAt(span.start),
                    model.getPositionAt(span.start + span.length)
                  ),
                  text: newText,
                }))
              )
          )
        : undefined

      return {
        ...resolving,
        additionalTextEdits,
        detail: displayPartsToString(details.displayParts),
        documentation: { value: displayPartsToString(details.documentation) },
        kind: toCompletionItemKind(details.kind),
        label: details.name,
      }
    },
  })
}
