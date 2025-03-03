import pluginJs from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },

    languageOptions: {
      parser: tseslint.parser,
    },

    rules: {
      'no-console': 'warn',
      'require-await': 'error',

      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/no-empty-interface': 'error',
    },
  },
  eslintConfigPrettier,
  {
    ignores: ['dist/*'],
  },
]
