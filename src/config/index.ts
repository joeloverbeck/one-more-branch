import * as fs from 'fs';
import * as path from 'path';
import { AppConfigSchema, type AppConfig } from './schemas.js';

/**
 * Singleton config instance. Undefined until loadConfig() is called.
 */
let configInstance: Readonly<AppConfig> | undefined;

/**
 * Deep merges two objects. Source values override target values.
 * Arrays are replaced, not merged.
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Reads and parses a JSON config file.
 * Returns undefined if file doesn't exist.
 * Throws on parse errors.
 */
function readConfigFile(filePath: string): Record<string, unknown> | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    throw new Error(`Failed to parse config file ${filePath}: ${message}`);
  }
}

/**
 * Resolves the configs directory path.
 * Uses CONFIG_PATH env var if set, otherwise defaults to 'configs' in project root.
 */
function getConfigsDir(): string {
  const envPath = process.env['CONFIG_PATH'];
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath);
  }
  return path.join(process.cwd(), 'configs');
}

/**
 * Loads configuration from JSON files and validates with Zod schema.
 *
 * Load order:
 * 1. configs/default.json (required for production, optional for tests)
 * 2. configs/local.json (optional overrides)
 *
 * The resulting config is validated, frozen, and stored as a singleton.
 *
 * @throws Error if default.json exists but is invalid
 * @throws Error if local.json exists but is invalid
 * @throws Error if merged config fails Zod validation
 */
export function loadConfig(): Readonly<AppConfig> {
  const configsDir = getConfigsDir();
  const defaultPath = path.join(configsDir, 'default.json');
  const localPath = path.join(configsDir, 'local.json');

  // Load default config (may not exist in test environments)
  const defaultConfig = readConfigFile(defaultPath) ?? {};

  // Load local overrides (optional)
  const localConfig = readConfigFile(localPath) ?? {};

  // Deep merge: local overrides default
  const mergedConfig = deepMerge(defaultConfig, localConfig);

  // Validate and apply Zod defaults
  const parseResult = AppConfigSchema.safeParse(mergedConfig);

  if (!parseResult.success) {
    const issues = parseResult.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }

  // Freeze deeply to ensure immutability
  const frozenConfig = deepFreeze(parseResult.data);
  configInstance = frozenConfig;

  return frozenConfig;
}

/**
 * Returns the loaded configuration singleton.
 *
 * @throws Error if loadConfig() hasn't been called
 */
export function getConfig(): Readonly<AppConfig> {
  if (!configInstance) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return configInstance;
}

/**
 * Resets the config singleton. For testing purposes only.
 */
export function resetConfig(): void {
  configInstance = undefined;
}

/**
 * Recursively freezes an object and all nested objects.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  Object.freeze(obj);

  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (value !== null && typeof value === 'object') {
      deepFreeze(value);
    }
  }

  return obj as Readonly<T>;
}

// Re-export types for convenience
export type { AppConfig, ServerConfig, StorageConfig, LLMConfig, LoggingConfig } from './schemas.js';
