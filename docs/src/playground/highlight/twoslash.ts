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

export function collectHighlightedExportNames(
  declarations: readonly PlaygroundDeclaration[]
): ReadonlySet<string> {
  const names = new Set<string>()

  for (const declaration of declarations) {
    if (
      !highlightedPackageRoots.some((root) =>
        declaration.filePath.startsWith(root)
      )
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

export function keepTsFsrsTypeHover(
  node: TwoslashNode,
  exportNames: ReadonlySet<string>
): boolean {
  if (node.type !== 'hover') return true
  return (node.text?.match(/[A-Za-z_$][\w$]*/g) ?? []).some((name) =>
    exportNames.has(name)
  )
}
