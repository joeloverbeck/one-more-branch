/**
 * Jest test setup file
 * Runs before all tests
 */

// Increase timeout for integration tests
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Cleanup logic will be added as needed
});

// Global test utilities
export {};
