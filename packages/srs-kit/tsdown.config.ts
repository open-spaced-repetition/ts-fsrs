import { defineConfig } from 'tsdown'

export default defineConfig({
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
  deps: {
    neverBundle: ['zod', 'zod/mini'],
  },
  sourcemap: true,
  minify: false,
  target: 'node20',
  platform: 'neutral',
  shims: false,
  outExtensions: () => ({ js: '.js' }),
})
