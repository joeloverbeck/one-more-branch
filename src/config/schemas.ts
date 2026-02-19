import { z } from 'zod';

/**
 * Server configuration schema.
 */
const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3000),
});

/**
 * Storage configuration schema.
 */
const StorageConfigSchema = z.object({
  storiesDir: z.string().min(1).default('stories'),
  conceptsDir: z.string().min(1).default('concepts'),
  kernelsDir: z.string().min(1).default('kernels'),
});

/**
 * Retry configuration schema for LLM calls.
 */
const RetryConfigSchema = z.object({
  maxRetries: z.number().int().min(0).max(10).default(3),
  baseDelayMs: z.number().int().min(100).max(30000).default(1000),
});

/**
 * Prompt options configuration schema.
 */
const PromptOptionsConfigSchema = z.object({
  fewShotMode: z.enum(['none', 'minimal', 'standard']).default('minimal'),
  choiceGuidance: z.enum(['basic', 'strict']).default('strict'),
});

/**
 * LLM configuration schema.
 */
const LLMModelsConfigSchema = z
  .object({
    kernelIdeator: z.string().min(1).optional(),
    kernelEvaluator: z.string().min(1).optional(),
    conceptIdeator: z.string().min(1).optional(),
    conceptEvaluator: z.string().min(1).optional(),
    conceptStressTester: z.string().min(1).optional(),
    spine: z.string().min(1).optional(),
    entityDecomposer: z.string().min(1).optional(),
    structure: z.string().min(1).optional(),
    planner: z.string().min(1).optional(),
    accountant: z.string().min(1).optional(),
    lorekeeper: z.string().min(1).optional(),
    writer: z.string().min(1).optional(),
    analyst: z.string().min(1).optional(),
    agendaResolver: z.string().min(1).optional(),
  })
  .strict();

const LLMConfigSchema = z.object({
  defaultModel: z.string().min(1).default('anthropic/claude-sonnet-4.5'),
  models: LLMModelsConfigSchema.optional(),
  temperature: z.number().min(0).max(2).default(0.8),
  maxTokens: z.number().int().min(256).max(32768).default(8192),
  retry: RetryConfigSchema.optional().transform((val) => val ?? RetryConfigSchema.parse({})),
  promptOptions: PromptOptionsConfigSchema.optional().transform(
    (val) => val ?? PromptOptionsConfigSchema.parse({})
  ),
});

/**
 * Logging configuration schema.
 */
const PromptLoggingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  baseDir: z.string().min(1).default('logs'),
  fileName: z.string().min(1).default('prompts.jsonl'),
});

const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  prompts: PromptLoggingConfigSchema.optional().transform(
    (val) => val ?? PromptLoggingConfigSchema.parse({})
  ),
});

/**
 * Root application configuration schema.
 * All fields are optional with sensible defaults.
 */
export const AppConfigSchema = z.object({
  server: ServerConfigSchema.optional().transform((val) => val ?? ServerConfigSchema.parse({})),
  storage: StorageConfigSchema.optional().transform((val) => val ?? StorageConfigSchema.parse({})),
  llm: LLMConfigSchema.optional().transform((val) => val ?? LLMConfigSchema.parse({})),
  logging: LoggingConfigSchema.optional().transform((val) => val ?? LoggingConfigSchema.parse({})),
});

/**
 * Inferred TypeScript type for the full application configuration.
 */
export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Inferred TypeScript types for individual config sections.
 */
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type RetryConfig = z.infer<typeof RetryConfigSchema>;
export type PromptOptionsConfig = z.infer<typeof PromptOptionsConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
