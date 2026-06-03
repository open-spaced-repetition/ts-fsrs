import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      error: 'src/error.ts',
      'models/fsrs-3': 'src/models/fsrs-3/index.ts',
      'models/fsrs-6': 'src/models/fsrs-6/index.ts',
    },
    format: ['esm', 'cjs'],
    outDir: 'dist',
    dts: true,
    clean: true,
    sourcemap: false,
    minify: false,
    target: 'node20',
    platform: 'node',
    shims: false,
  },
  {
    entry: { index: 'src/index.ts' },
    format: ['umd'],
    outDir: 'dist',
    globalName: 'FSRS',
    platform: 'browser',
    sourcemap: false,
    minify: false,
    target: 'es2017',
    outExtensions: () => ({ js: '.js' }),
  },
])
