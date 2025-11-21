import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^ts-fsrs\/(.+)$/,
        replacement: path.resolve(__dirname, './src/$1'),
      },
      {
        find: /^ts-fsrs$/,
        replacement: path.resolve(__dirname, './src/index.ts'),
      },
    ],
  },
  test: {
    globals: true,
    include: ['**/__tests__/*.ts?(x)', '**/__tests__/**/*.ts?(x)'],
  },
})
