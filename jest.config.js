/** @type {import('ts-jest').JestConfigWithTsJest} */
export default  {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/*.js?(x)',
    '**/__tests__/*.ts?(x)',
  ],
};