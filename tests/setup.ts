// Global test setup
import 'cross-fetch/polyfill';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.GRAPHQL_URL = 'http://localhost:4000/graphql';