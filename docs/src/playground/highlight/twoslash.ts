import ts from 'typescript'
import type { PlaygroundDeclaration } from '../editor/declarations'

type TwoslashNode = {
  readonly type: string
  readonly text?: string
}

const highlightedPackageRoots = [
  'file:///node_modules/ts-fsrs/',
  'file:///node_modules/@open-spaced-repetition/binding/',
]

// The bundled declarations are split into hash-named chunks, and each chunk
// re-exports its neighbours under one-letter aliases — `export { Middleware as
// A, PreviewItem as At }`. Those aliases are not names anyone can import, and
// collecting them puts `z`, `A` and the rest of the alphabet in the set, which
// then matches the hover of any symbol at all. Only the entry declarations
// carry the public names.
const CHUNK_DECLARATION = /-[A-Za-z0-9_-]{8,}\.d\.[cm]?ts$/

export function collectHighlightedExportNames(
  declarations: readonly PlaygroundDeclaration[]
): ReadonlySet<string> {
  const names = new Set<string>()

  for (const declaration of declarations) {
    if (
      !highlightedPackageRoots.some((root) =>
        declaration.filePath.startsWith(root)
      ) ||
      CHUNK_DECLARATION.test(declaration.filePath)
    ) {
      continue
    }
    const source = ts.createSourceFile(
      declaration.filePath,
      declaration.content,
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS
    )
    for (const statement of source.statements) {
      if (ts.isExportDeclaration(statement)) {
        if (
          statement.exportClause &&
          ts.isNamedExports(statement.exportClause)
        ) {
          for (const element of statement.exportClause.elements) {
            names.add(element.name.text)
          }
        }
        continue
      }

      if (
        !ts.canHaveModifiers(statement) ||
        !ts
          .getModifiers(statement)
          ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        continue
      }

      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name))
            names.add(declaration.name.text)
        }
      } else {
        const name = 'name' in statement ? statement.name : undefined
        if (name && ts.isIdentifier(name)) names.add(name.text)
      }
    }
  }

  return names
}

// A hover is attributed to ts-fsrs by the names its text mentions, so a name
// short and generic enough to belong to any library attributes nothing: zod's
// `z.int()` would be kept purely because ts-fsrs also exports a branded `int`.
// Anything distinctive — every PascalCase type, every multi-word function — is
// still matched, and a genuinely ts-fsrs hover names more than `int` anyway.
function isDistinctive(name: string): boolean {
  return name.length > 3 || /[A-Z]/.test(name)
}

export function keepTsFsrsTypeHover(
  node: TwoslashNode,
  exportNames: ReadonlySet<string>
): boolean {
  if (node.type !== 'hover') return true
  return (node.text?.match(/[A-Za-z_$][\w$]*/g) ?? []).some(
    (name) => isDistinctive(name) && exportNames.has(name)
  )
}
