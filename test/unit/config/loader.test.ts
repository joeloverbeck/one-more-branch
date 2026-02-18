import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getConfig, loadConfig, resetConfig } from '@/config/index';

describe('config loader', () => {
  const originalEnv = process.env['CONFIG_PATH'];

  beforeEach(() => {
    resetConfig();
    delete process.env['CONFIG_PATH'];
  });

  afterEach(() => {
    resetConfig();
    if (originalEnv !== undefined) {
      process.env['CONFIG_PATH'] = originalEnv;
    } else {
      delete process.env['CONFIG_PATH'];
    }
  });

  describe('loadConfig', () => {
    it('loads default.json from configs directory', () => {
      const config = loadConfig();

      expect(config.server.port).toBe(3000);
      expect(config.storage.storiesDir).toBe('stories');
    });

    it('returns frozen immutable config object', () => {
      const config = loadConfig();

      expect(Object.isFrozen(config)).toBe(true);
      expect(Object.isFrozen(config.server)).toBe(true);
      expect(Object.isFrozen(config.llm)).toBe(true);
      expect(Object.isFrozen(config.llm.retry)).toBe(true);
    });

    it('uses CONFIG_PATH env var when set', () => {
      const fixturesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omb-config-'));
      process.env['CONFIG_PATH'] = fixturesDir;
      const defaultPath = path.join(fixturesDir, 'default.json');

      try {
        fs.writeFileSync(defaultPath, JSON.stringify({ server: { port: 9999 } }));

        const config = loadConfig();
        expect(config.server.port).toBe(9999);
      } finally {
        fs.rmSync(fixturesDir, { recursive: true, force: true });
      }
    });

    it('applies Zod defaults when config file is empty or missing sections', () => {
      const fixturesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omb-config-'));
      process.env['CONFIG_PATH'] = fixturesDir;

      const defaultPath = path.join(fixturesDir, 'default.json');

      try {
        // Write minimal config with only server.port
        fs.writeFileSync(defaultPath, JSON.stringify({ server: { port: 5000 } }));

        const config = loadConfig();

        // Explicit value
        expect(config.server.port).toBe(5000);

        // Zod defaults for missing sections
        expect(config.storage.storiesDir).toBe('stories');
        expect(config.llm.defaultModel).toBe('anthropic/claude-sonnet-4.5');
        expect(config.logging.level).toBe('info');
        expect(config.logging.prompts.enabled).toBe(true);
        expect(config.logging.prompts.baseDir).toBe('logs');
        expect(config.logging.prompts.fileName).toBe('prompts.jsonl');
      } finally {
        fs.rmSync(fixturesDir, { recursive: true, force: true });
      }
    });

    it('throws on invalid configuration values', () => {
      const fixturesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omb-config-'));
      process.env['CONFIG_PATH'] = fixturesDir;

      const defaultPath = path.join(fixturesDir, 'default.json');

      try {
        // Write invalid config
        fs.writeFileSync(defaultPath, JSON.stringify({ server: { port: 70000 } }));

        expect(() => loadConfig()).toThrow('Invalid configuration');
      } finally {
        fs.rmSync(fixturesDir, { recursive: true, force: true });
      }
    });

    it('throws on malformed JSON', () => {
      const fixturesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omb-config-'));
      process.env['CONFIG_PATH'] = fixturesDir;

      const defaultPath = path.join(fixturesDir, 'default.json');

      try {
        fs.writeFileSync(defaultPath, '{ invalid json }');

        expect(() => loadConfig()).toThrow('Failed to parse config file');
      } finally {
        fs.rmSync(fixturesDir, { recursive: true, force: true });
      }
    });

    it('deep merges local.json overrides', () => {
      const fixturesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omb-config-'));
      process.env['CONFIG_PATH'] = fixturesDir;

      const defaultPath = path.join(fixturesDir, 'default.json');
      const localPath = path.join(fixturesDir, 'local.json');

      try {
        // Write base config
        fs.writeFileSync(
          defaultPath,
          JSON.stringify({
            server: { port: 3000 },
            llm: {
              defaultModel: 'anthropic/claude-sonnet-4.5',
              temperature: 0.8,
              retry: { maxRetries: 3, baseDelayMs: 1000 },
            },
          })
        );

        // Write partial override
        fs.writeFileSync(
          localPath,
          JSON.stringify({
            server: { port: 8080 },
            llm: { retry: { maxRetries: 5 } },
          })
        );

        const config = loadConfig();

        // Overridden values
        expect(config.server.port).toBe(8080);
        expect(config.llm.retry.maxRetries).toBe(5);

        // Preserved values
        expect(config.llm.defaultModel).toBe('anthropic/claude-sonnet-4.5');
        expect(config.llm.temperature).toBe(0.8);
        expect(config.llm.retry.baseDelayMs).toBe(1000);
      } finally {
        fs.rmSync(fixturesDir, { recursive: true, force: true });
      }
    });
  });

  describe('getConfig', () => {
    it('throws if loadConfig has not been called', () => {
      expect(() => getConfig()).toThrow('Configuration not loaded');
    });

    it('returns the same instance on subsequent calls', () => {
      loadConfig();

      const config1 = getConfig();
      const config2 = getConfig();

      expect(config1).toBe(config2);
    });
  });

  describe('resetConfig', () => {
    it('allows reloading configuration', () => {
      loadConfig();
      const firstConfig = getConfig();

      resetConfig();

      expect(() => getConfig()).toThrow('Configuration not loaded');

      loadConfig();
      const secondConfig = getConfig();

      // Both have same values but are different frozen instances
      expect(secondConfig.server.port).toBe(firstConfig.server.port);
    });
  });
});
