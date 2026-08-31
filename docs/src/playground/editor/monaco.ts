import type { typescript as MonacoTypeScript } from 'monaco-editor'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import * as typeScriptRuntime from 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js'
import { registerPlaygroundCompletions } from './completions'
import type { PlaygroundDeclaration } from './declarations'

declare const __PLAYGROUND_DTS_FILES__: readonly PlaygroundDeclaration[]
// Monaco's prebuilt stylesheet, inlined by rspress.config.ts so that it ships
// with this async chunk instead of the site-wide CSS bundle.
declare const __MONACO_EDITOR_STYLES__: string

type MonacoEnvironment = {
  getWorker(moduleId: string, label: string): Worker
}

type TypeScriptEmitOutput = {
  readonly outputFiles: readonly {
    readonly name: string
    readonly text: string
  }[]
}

type TypeScriptWorkerClient = {
  getEmitOutput(fileName: string): Promise<TypeScriptEmitOutput>
}

export type MonacoEditorHandle = {
  dispose(): void
  getValue(): string
  setTheme(dark: boolean): void
  setValue(value: string): void
}

const monacoGlobal = globalThis as typeof globalThis & {
  MonacoEnvironment?: MonacoEnvironment
}
const typeScript = typeScriptRuntime as typeof MonacoTypeScript
monacoGlobal.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(new URL('./typescript.worker.ts', import.meta.url), {
        name: 'ts-fsrs-typecheck',
        type: 'module',
      })
    }
    return new Worker(new URL('./editor.worker.ts', import.meta.url), {
      name: 'ts-fsrs-editor',
      type: 'module',
    })
  },
}

let configured = false
let compileSequence = 0
let stylesInjected = false

function injectEditorStyles(): void {
  if (stylesInjected) return
  stylesInjected = true
  const style = document.createElement('style')
  style.dataset.playgroundStyles = 'monaco-editor'
  style.textContent = __MONACO_EDITOR_STYLES__
  document.head.append(style)
}

function configureTypeScript(): void {
  if (configured) return
  configured = true

  const defaults = typeScript.typescriptDefaults
  defaults.setCompilerOptions({
    allowNonTsExtensions: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    module: typeScript.ModuleKind.CommonJS,
    moduleResolution: typeScript.ModuleResolutionKind.NodeJs,
    noEmitOnError: false,
    strict: true,
    target: typeScript.ScriptTarget.ESNext,
  })
  defaults.setDiagnosticsOptions({
    diagnosticCodesToIgnore: [1378],
    noSemanticValidation: false,
    noSyntaxValidation: false,
  })
  defaults.setEagerModelSync(true)
  defaults.setExtraLibs(
    __PLAYGROUND_DTS_FILES__.map(({ content, filePath }) => ({
      content,
      filePath,
    }))
  )

  // Monaco's own completion provider cannot auto-import, and leaving it enabled
  // would duplicate every entry alongside the replacement.
  defaults.setModeConfiguration({
    ...defaults.modeConfiguration,
    completionItems: false,
  })
  registerPlaygroundCompletions(async (...resources) => {
    const workerFactory = await typeScript.getTypeScriptWorker()
    return (await workerFactory(...resources)) as never
  })
}

export function createMonacoEditor(
  container: HTMLElement,
  initialValue: string,
  dark: boolean,
  onChange: (value: string) => void
): MonacoEditorHandle {
  injectEditorStyles()
  configureTypeScript()
  const uri = monaco.Uri.parse('file:///playground.ts')
  const existingModel = monaco.editor.getModel(uri)
  existingModel?.dispose()
  const model = monaco.editor.createModel(initialValue, 'typescript', uri)
  const initialTheme = dark ? 'vs-dark' : 'vs'
  const overflowWidgets = document.createElement('div')
  overflowWidgets.className = `live-playground__overflow-widgets monaco-editor ${initialTheme}`
  document.body.append(overflowWidgets)
  const editor = monaco.editor.create(container, {
    automaticLayout: true,
    fixedOverflowWidgets: true,
    hover: { above: false },
    fontFamily: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
    fontSize: 14,
    glyphMargin: false,
    lineNumbersMinChars: 3,
    minimap: { enabled: false },
    model,
    overflowWidgetsDomNode: overflowWidgets,
    padding: { bottom: 14, top: 14 },
    roundedSelection: true,
    scrollBeyondLastLine: false,
    tabSize: 2,
    theme: initialTheme,
  })
  const subscription = editor.onDidChangeModelContent(() => {
    onChange(model.getValue())
  })
  return {
    dispose() {
      subscription.dispose()
      editor.dispose()
      overflowWidgets.remove()
      model.dispose()
    },
    getValue() {
      return model.getValue()
    },
    setTheme(nextDark) {
      const nextTheme = nextDark ? 'vs-dark' : 'vs'
      overflowWidgets.className = `live-playground__overflow-widgets monaco-editor ${nextTheme}`
      monaco.editor.setTheme(nextTheme)
    },
    setValue(value) {
      model.setValue(value)
    },
  }
}

export async function compileTypeScript(source: string): Promise<string> {
  configureTypeScript()
  const uri = monaco.Uri.parse(`file:///run-${++compileSequence}.ts`)
  const model = monaco.editor.createModel(source, 'typescript', uri)
  try {
    const workerFactory = await typeScript.getTypeScriptWorker()
    const worker = (await workerFactory(uri)) as TypeScriptWorkerClient
    const output = await worker.getEmitOutput(uri.toString())
    const javascript = output.outputFiles.find(({ name }) =>
      name.endsWith('.js')
    )?.text
    if (!javascript) {
      throw new Error('The TypeScript Worker did not emit JavaScript.')
    }
    return javascript
  } finally {
    model.dispose()
  }
}
