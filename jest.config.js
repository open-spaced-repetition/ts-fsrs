/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/*.ts?(x)',
    '**/__tests__/**/*.ts?(x)',
  ],
  collectCoverage: true,
  coverageReporters: ['text', 'cobertura'],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
  transformIgnorePatterns: ['/node_modules/(?!(module-to-transform)/)'],
}
