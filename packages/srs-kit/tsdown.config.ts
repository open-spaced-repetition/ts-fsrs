import path from 'node:path'
import { defineConfig } from 'tsdown'

export default defineConfig({
  alias: {
    '@': path.resolve(import.meta.dirname, 'src'),
    '@vendor': path.resolve(import.meta.dirname, 'vendor'),
  },
  entry: {
    index: 'src/index.ts',
    'schema/index': 'src/schema/index.ts',
    'primitives/index': 'src/primitives/index.ts',
    'model/index': 'src/model/index.ts',
  },
  format: ['esm'],
  outDir: 'dist',
  dts: {
    sourcemap: true,
  },
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'node20',
  platform: 'neutral',
  shims: false,
  outExtensions: () => ({ js: '.js' }),
})
