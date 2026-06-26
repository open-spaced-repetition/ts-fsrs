import path from 'node:path'
import ts from 'typescript'

if (globalThis.Temporal === undefined) {
  await import('temporal-polyfill/global')
}

// Type-display test infrastructure (service created lazily on first access)

const packageRoot = path.resolve(import.meta.dirname)
const configPath = path.join(packageRoot, 'tsconfig.json')
const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  packageRoot
)

let service: ts.LanguageService | undefined

globalThis.getTypeDisplayService = () => {
  if (!service) {
    const files = new Map(
      parsedConfig.fileNames.map((file) => [
        path.resolve(file),
        { version: '0' },
      ])
    )

    service = ts.createLanguageService({
      getScriptFileNames: () => Array.from(files.keys()),
      getScriptVersion: (file) => files.get(path.resolve(file))?.version ?? '0',
      getScriptSnapshot: (file) =>
        ts.sys.fileExists(file)
          ? ts.ScriptSnapshot.fromString(ts.sys.readFile(file) ?? '')
          : undefined,
      getCurrentDirectory: () => packageRoot,
      getCompilationSettings: () => parsedConfig.options,
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
    })
  }

  return service
}

globalThis.quickInfoAt = (svc, rel, marker) => {
  const fileName = path.join(packageRoot, rel)
  const source = ts.sys.readFile(fileName)

  if (!source) {
    throw new Error(`Missing source file: ${rel}`)
  }

  const markerStart = source.indexOf(marker)
  if (markerStart === -1) {
    throw new Error(`Missing marker "${marker}" in ${rel}`)
  }

  const info = svc.getQuickInfoAtPosition(
    fileName,
    markerStart + marker.length - 1
  )

  if (!info) {
    throw new Error(`Missing quick info for "${marker}" in ${rel}`)
  }

  return ts.displayPartsToString(info.displayParts)
}
