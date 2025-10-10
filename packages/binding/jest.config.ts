/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
export default {
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: ['text', 'cobertura', 'html'],

  // An object that configures minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },

  // Display individual test results with package names
  displayName: {
    name: '@open-spaced-repetition/binding',
    color: 'green',
  },

  // Enable experimental ESM support
  extensionsToTreatAsEsm: ['.ts'],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@open-spaced-repetition/binding$': '<rootDir>/index.js',
    '^@open-spaced-repetition/binding/(.*)$': '<rootDir>/$1',
  },

  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest/presets/default-esm',

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // The glob patterns Jest uses to detect test files
  testMatch: ['**/__tests__/*.spec.ts?(x)', '**/__tests__/*.test.ts?(x)'],

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '__tests__/tsconfig.json',
        useESM: true,
      },
    ],
  },

  // Transform ignore patterns for ES modules
  transformIgnorePatterns: ['node_modules/(?!@open-spaced-repetition/.*)'],

  // Verbose output to show individual test names
  verbose: true,
}
