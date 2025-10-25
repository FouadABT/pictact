// Test setup file for Jest
// This file runs before each test file

// Mock console methods to reduce noise in tests
const mockConsole = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

global.console = mockConsole;

// Set up test environment variables
process.env.NODE_ENV = 'test';

// Add a dummy test to prevent Jest from complaining about empty test suite
describe('Setup', () => {
  it('should set up test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});