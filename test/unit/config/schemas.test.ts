import { AppConfigSchema } from '@/config/schemas';

describe('config schemas', () => {
  describe('AppConfigSchema', () => {
    it('applies defaults when parsing empty object', () => {
      const result = AppConfigSchema.parse({});

      expect(result.server.port).toBe(3000);
      expect(result.storage.storiesDir).toBe('stories');
      expect(result.llm.defaultModel).toBe('anthropic/claude-sonnet-4.5');
      expect(result.llm.temperature).toBe(0.8);
      expect(result.llm.maxTokens).toBe(8192);
      expect(result.llm.retry.maxRetries).toBe(3);
      expect(result.llm.retry.baseDelayMs).toBe(1000);
      expect(result.llm.promptOptions.fewShotMode).toBe('minimal');
      expect(result.llm.promptOptions.choiceGuidance).toBe('strict');
      expect(result.logging.level).toBe('info');
      expect(result.logging.prompts.enabled).toBe(true);
      expect(result.logging.prompts.baseDir).toBe('logs');
      expect(result.logging.prompts.fileName).toBe('prompts.jsonl');
    });

    it('overrides defaults with provided values', () => {
      const input = {
        server: { port: 8080 },
        storage: { storiesDir: 'custom-stories' },
        llm: {
          defaultModel: 'openai/gpt-4',
          temperature: 0.5,
          maxTokens: 4096,
        },
        logging: {
          level: 'debug' as const,
          prompts: {
            enabled: false,
            baseDir: 'tmp/prompts',
            fileName: 'prompt.log',
          },
        },
      };

      const result = AppConfigSchema.parse(input);

      expect(result.server.port).toBe(8080);
      expect(result.storage.storiesDir).toBe('custom-stories');
      expect(result.llm.defaultModel).toBe('openai/gpt-4');
      expect(result.llm.temperature).toBe(0.5);
      expect(result.llm.maxTokens).toBe(4096);
      // Nested defaults still apply
      expect(result.llm.retry.maxRetries).toBe(3);
      expect(result.logging.level).toBe('debug');
      expect(result.logging.prompts.enabled).toBe(false);
      expect(result.logging.prompts.baseDir).toBe('tmp/prompts');
      expect(result.logging.prompts.fileName).toBe('prompt.log');
    });

    it('validates port range (1-65535)', () => {
      expect(() => AppConfigSchema.parse({ server: { port: 0 } })).toThrow();
      expect(() => AppConfigSchema.parse({ server: { port: 65536 } })).toThrow();
      expect(() => AppConfigSchema.parse({ server: { port: 70000 } })).toThrow();

      const validLow = AppConfigSchema.parse({ server: { port: 1 } });
      expect(validLow.server.port).toBe(1);

      const validHigh = AppConfigSchema.parse({ server: { port: 65535 } });
      expect(validHigh.server.port).toBe(65535);
    });

    it('validates temperature range (0-2)', () => {
      expect(() => AppConfigSchema.parse({ llm: { temperature: -0.1 } })).toThrow();
      expect(() => AppConfigSchema.parse({ llm: { temperature: 2.1 } })).toThrow();

      const validZero = AppConfigSchema.parse({ llm: { temperature: 0 } });
      expect(validZero.llm.temperature).toBe(0);

      const validTwo = AppConfigSchema.parse({ llm: { temperature: 2 } });
      expect(validTwo.llm.temperature).toBe(2);
    });

    it('validates maxTokens range (256-32768)', () => {
      expect(() => AppConfigSchema.parse({ llm: { maxTokens: 100 } })).toThrow();
      expect(() => AppConfigSchema.parse({ llm: { maxTokens: 50000 } })).toThrow();

      const validLow = AppConfigSchema.parse({ llm: { maxTokens: 256 } });
      expect(validLow.llm.maxTokens).toBe(256);

      const validHigh = AppConfigSchema.parse({ llm: { maxTokens: 32768 } });
      expect(validHigh.llm.maxTokens).toBe(32768);
    });

    it('validates retry configuration', () => {
      expect(() => AppConfigSchema.parse({ llm: { retry: { maxRetries: -1 } } })).toThrow();
      expect(() => AppConfigSchema.parse({ llm: { retry: { maxRetries: 15 } } })).toThrow();
      expect(() => AppConfigSchema.parse({ llm: { retry: { baseDelayMs: 50 } } })).toThrow();
      expect(() => AppConfigSchema.parse({ llm: { retry: { baseDelayMs: 50000 } } })).toThrow();

      const valid = AppConfigSchema.parse({
        llm: { retry: { maxRetries: 5, baseDelayMs: 500 } },
      });
      expect(valid.llm.retry.maxRetries).toBe(5);
      expect(valid.llm.retry.baseDelayMs).toBe(500);
    });

    it('validates prompts logging settings', () => {
      expect(() => AppConfigSchema.parse({ logging: { prompts: { baseDir: '' } } })).toThrow();
      expect(() => AppConfigSchema.parse({ logging: { prompts: { fileName: '' } } })).toThrow();

      const valid = AppConfigSchema.parse({
        logging: {
          prompts: {
            enabled: false,
            baseDir: 'tmp/logs',
            fileName: 'my-prompts.jsonl',
          },
        },
      });
      expect(valid.logging.prompts.enabled).toBe(false);
      expect(valid.logging.prompts.baseDir).toBe('tmp/logs');
      expect(valid.logging.prompts.fileName).toBe('my-prompts.jsonl');
    });

    it('validates enum values', () => {
      expect(() =>
        AppConfigSchema.parse({ llm: { promptOptions: { fewShotMode: 'invalid' } } })
      ).toThrow();
      expect(() =>
        AppConfigSchema.parse({ llm: { promptOptions: { choiceGuidance: 'invalid' } } })
      ).toThrow();
      expect(() => AppConfigSchema.parse({ logging: { level: 'invalid' } })).toThrow();

      const valid = AppConfigSchema.parse({
        llm: {
          promptOptions: {
            fewShotMode: 'none',
            choiceGuidance: 'basic',
          },
        },
        logging: { level: 'error' },
      });

      expect(valid.llm.promptOptions.fewShotMode).toBe('none');
      expect(valid.llm.promptOptions.choiceGuidance).toBe('basic');
      expect(valid.logging.level).toBe('error');
    });

    it('requires non-empty strings for model and storiesDir', () => {
      expect(() => AppConfigSchema.parse({ llm: { defaultModel: '' } })).toThrow();
      expect(() => AppConfigSchema.parse({ storage: { storiesDir: '' } })).toThrow();
    });

    it('handles partial nested overrides', () => {
      const input = {
        llm: {
          retry: { maxRetries: 7 },
          promptOptions: { choiceGuidance: 'basic' as const },
        },
      };

      const result = AppConfigSchema.parse(input);

      // Overridden values
      expect(result.llm.retry.maxRetries).toBe(7);
      expect(result.llm.promptOptions.choiceGuidance).toBe('basic');

      // Default values preserved
      expect(result.llm.retry.baseDelayMs).toBe(1000);
      expect(result.llm.promptOptions.fewShotMode).toBe('minimal');
    });

    it('accepts explicit per-stage model overrides including concept stages', () => {
      const result = AppConfigSchema.parse({
        llm: {
          models: {
            conceptIdeator: 'anthropic/claude-sonnet-4.6',
            conceptEvaluator: 'z-ai/glm-5',
            conceptStressTester: 'anthropic/claude-sonnet-4.6',
            writer: 'anthropic/claude-sonnet-4.6',
          },
        },
      });

      expect(result.llm.models?.conceptIdeator).toBe('anthropic/claude-sonnet-4.6');
      expect(result.llm.models?.conceptEvaluator).toBe('z-ai/glm-5');
      expect(result.llm.models?.conceptStressTester).toBe('anthropic/claude-sonnet-4.6');
      expect(result.llm.models?.writer).toBe('anthropic/claude-sonnet-4.6');
    });

    it('rejects unknown llm.models stage keys', () => {
      expect(() =>
        AppConfigSchema.parse({
          llm: {
            models: {
              conceptIdeator: 'anthropic/claude-sonnet-4.6',
              invalidStageName: 'z-ai/glm-5',
            },
          },
        }),
      ).toThrow();
    });
  });
});
