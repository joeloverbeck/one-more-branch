/**
 * Jest test setup file
 * Runs before all tests
 */

import { loadConfig, resetConfig } from '@/config/index';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Load config before tests run
beforeAll(() => {
  // Reset any existing config and load fresh for tests
  resetConfig();
  loadConfig();
});

// Clean up after all tests
afterAll(async () => {
  // Cleanup logic will be added as needed
});

// Global test utilities
export {};
