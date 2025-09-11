module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Main entry point often has minimal logic to test
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 65, // Relaxed globally for now
      lines: 70,
      statements: 70,
    },
    './src/**/*.ts': {
      branches: 45, // Relaxed for now, will improve over time
      functions: 65,
      lines: 65,
      statements: 65,
    },
    // Specific overrides for files that need improvement
    './src/tools/cue-tools.ts': {
      branches: 45,
      functions: 75,
      lines: 65,
      statements: 65,
    },
    './src/tools/fixture-tools.ts': {
      branches: 45,
      functions: 75,
      lines: 65,
      statements: 65,
    },
    './src/services/ai-lighting.ts': {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 10000,
};