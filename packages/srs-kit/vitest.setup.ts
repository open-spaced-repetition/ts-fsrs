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
let typeDisplayProgram: ts.Program | undefined

const typeDisplayFlags =
  ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.MultilineObjectLiterals
const typeDisplayPrinter = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
})

function getTypeDisplayProgram(): ts.Program {
  if (!typeDisplayProgram) {
    typeDisplayProgram = ts.createProgram(
      parsedConfig.fileNames.map((file) => path.resolve(file)),
      parsedConfig.options
    )
  }

  return typeDisplayProgram
}

type VariableDeclarationMatch = {
  readonly declaration: ts.VariableDeclaration
  readonly declarationKind: string
}

function variableDeclarationListKind(
  declarationList: ts.VariableDeclarationList
): string {
  const flags = declarationList.flags

  if ((flags & ts.NodeFlags.Const) !== 0) {
    return 'const'
  }

  if ((flags & ts.NodeFlags.Let) !== 0) {
    return 'let'
  }

  return 'var'
}

function variableDeclarationAt(
  sourceFile: ts.SourceFile,
  position: number
): VariableDeclarationMatch | undefined {
  function visit(node: ts.Node): VariableDeclarationMatch | undefined {
    if (position < node.getFullStart() || position >= node.getEnd()) {
      return undefined
    }

    if (ts.isVariableStatement(node)) {
      const declarationKind = variableDeclarationListKind(node.declarationList)
      const declaration = node.declarationList.declarations.find(
        (item) =>
          position >= item.name.getStart(sourceFile) &&
          position < item.name.getEnd()
      )

      if (declaration) {
        return { declaration, declarationKind }
      }
    }

    return ts.forEachChild(node, visit)
  }

  return visit(sourceFile)
}

function renderType(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  node: ts.Node
) {
  const type = checker.getTypeAtLocation(node)
  const typeNode = checker.typeToTypeNode(type, node, typeDisplayFlags)

  if (!typeNode) {
    throw new Error(`Unable to render type for "${node.getText(sourceFile)}"`)
  }

  return typeDisplayPrinter
    .printNode(ts.EmitHint.Unspecified, typeNode, sourceFile)
    .replaceAll(/import\("[^"]+"\)\./g, '')
}

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

globalThis.quickInfoAt = (_svc, rel, marker) => {
  const fileName = path.join(packageRoot, rel)
  const source = ts.sys.readFile(fileName)

  if (!source) {
    throw new Error(`Missing source file: ${rel}`)
  }

  const markerStart = source.indexOf(marker)
  if (markerStart === -1) {
    throw new Error(`Missing marker "${marker}" in ${rel}`)
  }

  const program = getTypeDisplayProgram()
  const sourceFile = program.getSourceFile(fileName)

  if (!sourceFile) {
    throw new Error(`Missing TypeScript source file: ${rel}`)
  }

  const match = variableDeclarationAt(
    sourceFile,
    markerStart + marker.length - 1
  )

  if (!match || !ts.isIdentifier(match.declaration.name)) {
    throw new Error(`Expected "${marker}" in ${rel} to be a variable name`)
  }

  const checker = program.getTypeChecker()
  const displayType = renderType(checker, sourceFile, match.declaration.name)

  return `${match.declarationKind} ${match.declaration.name.text}: ${displayType}`
}
