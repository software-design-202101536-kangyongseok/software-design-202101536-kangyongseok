module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setupTests.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!__tests__/**',
    '!*.test.js',
    '!*.spec.js',
    '!app.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text', 'text-summary', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.{spec,test}.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ]
};