import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      error: 'src/error.ts',
      'models/fsrs-3': 'src/models/fsrs-3/index.ts',
      'models/fsrs-4': 'src/models/fsrs-4/index.ts',
      'models/fsrs-4dot5': 'src/models/fsrs-4dot5/index.ts',
      'models/fsrs-5': 'src/models/fsrs-5/index.ts',
      'models/fsrs-6': 'src/models/fsrs-6/index.ts',
    },
    format: ['esm', 'cjs'],
    outDir: 'dist',
    dts: true
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
    deps: {
      alwaysBundle: [
        '@open-spaced-repetition/srs-kit',
        '@open-spaced-repetition/srs-kit/chrono/date',
      ],
    },
    sourcemap: false,
    minify: false,
    target: 'es2017',
    outExtensions: () => ({ js: '.js' }),
  },
])
