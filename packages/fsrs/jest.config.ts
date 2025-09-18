/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest'

const config: Config = {
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
    name: 'ts-fsrs',
    color: 'blue',
  },

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^ts-fsrs/(.*).js$': '<rootDir>/src/$1.ts',
    '^ts-fsrs$': '<rootDir>/src/index.ts',
  },

  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest',

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // The glob patterns Jest uses to detect test files
  testMatch: ['**/__tests__/*.ts?(x)', '**/__tests__/**/*.ts?(x)'],

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '__tests__/tsconfig.json',
      },
    ],
  },

  // Verbose output to show individual test names
  verbose: true,
}

export default config