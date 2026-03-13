import { z } from 'zod';
import { LLM_STAGE_KEYS } from './llm-stage-registry.js';

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
  charactersDir: z.string().min(1).default('characters'),
  characterWebsDir: z.string().min(1).default('character-webs'),
  contentPacketsDir: z.string().min(1).default('content-packets'),
  tasteProfilesDir: z.string().min(1).default('taste-profiles'),
  worldbuildingDir: z.string().min(1).default('worldbuilding'),
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
  choiceGuidance: z.enum(['basic', 'strict']).default('strict'),
});

/**
 * LLM configuration schema.
 */
const llmModelsSchemaShape = Object.fromEntries(
  LLM_STAGE_KEYS.map((stage) => [stage, z.string().min(1).optional()]),
) as Record<(typeof LLM_STAGE_KEYS)[number], z.ZodOptional<z.ZodString>>;

const LLMModelsConfigSchema = z.object(llmModelsSchemaShape).strict();

const stageMaxTokensSchemaShape = Object.fromEntries(
  LLM_STAGE_KEYS.map((stage) => [stage, z.number().int().min(256).max(131072).optional()]),
) as Record<(typeof LLM_STAGE_KEYS)[number], z.ZodOptional<z.ZodNumber>>;

const StageMaxTokensConfigSchema = z.object(stageMaxTokensSchemaShape).strict();

const LLMConfigSchema = z.object({
  defaultModel: z.string().min(1).default('anthropic/claude-sonnet-4.5'),
  models: LLMModelsConfigSchema.optional(),
  stageMaxTokens: StageMaxTokensConfigSchema.optional(),
  temperature: z.number().min(0).max(2).default(0.8),
  maxTokens: z.number().int().min(256).max(131072).default(16384),
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
