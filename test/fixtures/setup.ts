/**
 * Jest test setup file
 * Runs before all tests
 */

import { loadConfig, resetConfig } from '@/config/index';
import { logger } from '@/logging/index';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Load config before tests run
beforeAll(() => {
  // Reset any existing config and load fresh for tests
  resetConfig();
  loadConfig();
});

// Clear logger entries after each test to prevent accumulation
afterEach(() => {
  logger.clear();
});

// Clean up after all tests
afterAll(async () => {
  // Cleanup logic will be added as needed
});

// Global test utilities
export {};
