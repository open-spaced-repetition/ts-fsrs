import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'tsdown'

const shared = {
  alias: {
    '@': path.resolve(import.meta.dirname, 'src'),
    '@vendor': path.resolve(import.meta.dirname, 'vendor'),
  },
  entry: {
    index: 'src/index.ts',
    'schema/index': 'src/schema/index.ts',
    'primitives/index': 'src/primitives/index.ts',
    'model/index': 'src/model/index.ts',
    'chrono/index': 'src/chrono/index.ts',
    'chrono/date/index': 'src/chrono/presets/date/index.ts',
    'chrono/numeric/index': 'src/chrono/presets/numeric/index.ts',
    'chrono/temporal-instant/index':
      'src/chrono/presets/temporal-instant/index.ts',
    'scheduler/index': 'src/scheduler/index.ts',
  },
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'node20' as const,
  platform: 'neutral' as const,
  shims: false,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
}

export default defineConfig([
  {
    ...shared,
    format: ['esm'],
    outDir: 'dist/esm',
  },
  {
    ...shared,
    format: ['cjs'],
    outDir: 'dist/cjs',
    plugins: [
      {
        name: 'cjs-package-json',
        writeBundle() {
          writeFileSync(
            path.resolve(import.meta.dirname, 'dist/cjs/package.json'),
            '{ "type": "commonjs" }\n'
          )
        },
      },
    ],
  },
])
