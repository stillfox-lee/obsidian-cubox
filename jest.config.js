module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  testMatch: ['**/test/**/*.test.ts'],
  moduleNameMapper: {
    // 模拟 Obsidian API
    'obsidian': '<rootDir>/test/__mocks__/obsidian.ts',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
} 