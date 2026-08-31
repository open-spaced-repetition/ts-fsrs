import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { PlaygroundDeclaration } from './declarations'

/**
 * Drops the `.mjs` suffix from the declarations' own relative imports.
 *
 * The bundled declarations point at siblings as `./chunk.mjs`, which Node10 —
 * the resolver Monaco uses — cannot map onto the `.d.ts` files published here.
 * Those failures are invisible: `skipLibCheck` hides the unresolved modules,
 * and the missing types degrade generics into `any`, so an example only shows
 * up as a spurious "implicitly has an 'any' type" on an unrelated line.
 */
function rewriteRelativeSpecifiers(content: string): string {
  return content
    .replace(/(from\s+")(\.[^"]*?)\.mjs(")/g, '$1$2$3')
    .replace(/(import\(")(\.[^"]*?)\.mjs("\))/g, '$1$2$3')
}

function collectModuleDeclarations(
  sourceRoot: string,
  virtualRoot: string
): PlaygroundDeclaration[] {
  const declarations: PlaygroundDeclaration[] = []
  if (!existsSync(sourceRoot)) return declarations

  const visit = (directory: string) => {
    const entries = readdirSync(directory, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name)
    )

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        visit(absolutePath)
        continue
      }
      if (!entry.isFile() || !entry.name.endsWith('.d.mts')) continue

      const relativePath = path
        .relative(sourceRoot, absolutePath)
        .split(path.sep)
        .join('/')

      // Published only under `.d.ts`, never the original `.d.mts`. The package
      // exports extensionless subpaths such as `ts-fsrs/models/fsrs-6`, and
      // Monaco resolves with Node10: given a `.d.mts` entry it treats the
      // module as ESM and auto-import writes `ts-fsrs/models/fsrs-6.mjs`, a
      // specifier the package does not expose and the runner cannot resolve.
      declarations.push({
        content: rewriteRelativeSpecifiers(readFileSync(absolutePath, 'utf8')),
        filePath: `${virtualRoot}/${relativePath}`.replace(
          /\.d\.mts$/,
          '.d.ts'
        ),
      })
    }
  }

  visit(sourceRoot)
  return declarations
}

export function collectPlaygroundDeclarations(
  workspaceRoot: string
): PlaygroundDeclaration[] {
  const bindingDeclaration = path.join(
    workspaceRoot,
    'packages/binding/dist/fsrs-binding.wasip1.d.cts'
  )
  if (!existsSync(bindingDeclaration)) {
    throw new Error(
      `Missing WASIP1 binding declaration: ${bindingDeclaration}. Run docs:prepare first.`
    )
  }

  return [
    ...collectModuleDeclarations(
      path.join(workspaceRoot, 'packages/fsrs/dist'),
      'file:///node_modules/ts-fsrs'
    ),
    {
      // Published under the platform-agnostic package name: the wasm32-wasip1
      // build is one of the binding's optional platform artifacts, not the
      // specifier applications import.
      content: readFileSync(bindingDeclaration, 'utf8'),
      filePath:
        'file:///node_modules/@open-spaced-repetition/binding/index.d.ts',
    },
  ]
}
