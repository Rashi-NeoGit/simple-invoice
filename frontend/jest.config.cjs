/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  // Mock call history/implementations don't leak between tests in the same file —
  // without this, a mockResolvedValue/mockRejectedValue set in one `it` silently
  // persists into the next one's assertions.
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '(.*)/config/apiBaseUrl$': '<rootDir>/src/config/apiBaseUrl.jest.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
