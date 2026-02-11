/**
 * Jest test setup file
 * Runs before all tests
 */

import { loadConfig, resetConfig } from '@/config/index';
import { logger, resetPromptSinkForTesting, setPromptSinkForTesting } from '@/logging/index';

const NOOP_PROMPT_SINK = {
  appendPrompt: (): Promise<void> => Promise.resolve(),
};

// Increase timeout for integration tests
jest.setTimeout(30000);

// Load config before tests run
beforeAll(() => {
  // Reset any existing config and load fresh for tests
  resetConfig();
  loadConfig();
});

beforeEach(() => {
  // Prevent tests from writing prompt payloads to disk.
  setPromptSinkForTesting(NOOP_PROMPT_SINK);
});

// Clear logger entries after each test to prevent accumulation
afterEach(() => {
  resetPromptSinkForTesting();
  logger.clear();
});

// Clean up after all tests
afterAll(async () => {
  // Cleanup logic will be added as needed
});

// Global test utilities
export {};
