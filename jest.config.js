/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports =  {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/*.js?(x)',
    '**/__tests__/*.ts?(x)',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
};