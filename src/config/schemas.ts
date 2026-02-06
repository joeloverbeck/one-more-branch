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
  enableChainOfThought: z.boolean().default(true),
  choiceGuidance: z.enum(['basic', 'strict']).default('strict'),
});

/**
 * LLM configuration schema.
 */
const LLMConfigSchema = z.object({
  defaultModel: z.string().min(1).default('anthropic/claude-sonnet-4.5'),
  temperature: z.number().min(0).max(2).default(0.8),
  maxTokens: z.number().int().min(256).max(32768).default(8192),
  retry: RetryConfigSchema.optional().transform((val) => val ?? RetryConfigSchema.parse({})),
  promptOptions: PromptOptionsConfigSchema.optional().transform((val) => val ?? PromptOptionsConfigSchema.parse({})),
});

/**
 * Logging configuration schema.
 */
const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  promptPreviewLength: z.number().int().min(10).max(1000).default(100),
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
