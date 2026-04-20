import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist',
    dts: true,
    clean: true,
    sourcemap: false,
    minify: false,
    target: 'node20',
    platform: 'node',
    shims: true,
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
