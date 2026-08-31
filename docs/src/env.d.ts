declare module '*.css'

declare module 'monaco-editor/esm/vs/editor/editor.worker'

// Monaco ships no types for the worker entry. Only the surface the playground
// subclasses is declared; see src/playground/monaco-typescript.worker.ts.
declare module 'monaco-editor/esm/vs/language/typescript/ts.worker' {
  export class TypeScriptWorker {
    constructor(context: unknown, createData: unknown)

    protected _languageService: {
      getCompletionEntryDetails(
        fileName: string,
        position: number,
        entryName: string,
        formatOptions?: unknown,
        source?: string,
        preferences?: unknown,
        data?: unknown
      ): unknown
      getCompletionsAtPosition(
        fileName: string,
        position: number,
        options?: unknown
      ): unknown
    }

    getCompletionEntryDetails(
      fileName: string,
      position: number,
      entry: string
    ): Promise<unknown>
    getCompletionsAtPosition(
      fileName: string,
      position: number
    ): Promise<unknown>
  }

  export function initialize(
    factory: (context: unknown, createData: unknown) => unknown
  ): void
}

declare module '*?raw' {
  const source: string
  export default source
}

declare module '*?worker' {
  const WorkerFactory: { new (): Worker }
  export default WorkerFactory
}
