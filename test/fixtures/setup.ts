/**
 * Jest test setup file
 * Runs before all tests
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { loadConfig, resetConfig } from '@/config/index';
import { logger, resetPromptSinkForTesting, setPromptSinkForTesting } from '@/logging/index';

const NOOP_PROMPT_SINK = {
  appendPrompt: (): Promise<void> => Promise.resolve(),
};
const originalConfigPath = process.env['CONFIG_PATH'];
let tempConfigDir: string | null = null;
let tempStorageRoot: string | null = null;

// Increase timeout for integration tests
jest.setTimeout(30000);

async function clearTestStorage(): Promise<void> {
  if (tempStorageRoot === null) {
    return;
  }

  const storageDirs = ['stories', 'concepts', 'kernels'];
  await Promise.all(
    storageDirs.map(async (dirName) => {
      const dirPath = path.join(tempStorageRoot as string, dirName);
      await fs.rm(dirPath, { recursive: true, force: true });
      await fs.mkdir(dirPath, { recursive: true });
    })
  );
}

// Load config before tests run
beforeAll(async () => {
  // Reset any existing config and load fresh for tests
  resetConfig();
  tempStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'omb-test-storage-'));
  tempConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'omb-test-config-'));

  const storiesDir = path.join(tempStorageRoot, 'stories');
  const conceptsDir = path.join(tempStorageRoot, 'concepts');
  const kernelsDir = path.join(tempStorageRoot, 'kernels');
  await Promise.all([
    fs.mkdir(storiesDir, { recursive: true }),
    fs.mkdir(conceptsDir, { recursive: true }),
    fs.mkdir(kernelsDir, { recursive: true }),
  ]);

  const testConfig = {
    storage: {
      storiesDir,
      conceptsDir,
      kernelsDir,
    },
    logging: {
      prompts: {
        enabled: false,
      },
    },
  };

  await fs.writeFile(path.join(tempConfigDir, 'default.json'), JSON.stringify(testConfig), 'utf-8');
  process.env['CONFIG_PATH'] = tempConfigDir;
  loadConfig();
});

beforeEach(() => {
  // Prevent tests from writing prompt payloads to disk.
  setPromptSinkForTesting(NOOP_PROMPT_SINK);
});

// Clear logger entries after each test to prevent accumulation
afterEach(async () => {
  resetPromptSinkForTesting();
  logger.clear();
  await clearTestStorage();
});

// Clean up after all tests
afterAll(async () => {
  if (tempStorageRoot !== null) {
    await fs.rm(tempStorageRoot, { recursive: true, force: true });
    tempStorageRoot = null;
  }
  if (tempConfigDir !== null) {
    await fs.rm(tempConfigDir, { recursive: true, force: true });
    tempConfigDir = null;
  }

  resetConfig();
  if (originalConfigPath !== undefined) {
    process.env['CONFIG_PATH'] = originalConfigPath;
  } else {
    delete process.env['CONFIG_PATH'];
  }
});

// Global test utilities
export {};
