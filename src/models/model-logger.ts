import type { Logger } from '../logging/types.js';

/**
 * Optional logger for the model layer.
 * Allows the server to inject a logger without creating a hard dependency.
 * When no logger is set, warnings are silently discarded.
 */
let modelLogger: Logger | null = null;

/**
 * Sets the logger to use for model layer warnings.
 * Call this from server initialization to enable logging.
 * Pass null to disable logging.
 */
export function setModelLogger(logger: Logger | null): void {
  modelLogger = logger;
}

/**
 * Gets the currently configured model logger, or null if not set.
 */
export function getModelLogger(): Logger | null {
  return modelLogger;
}

/**
 * Logs a warning message if a logger is configured.
 * Silently no-ops if no logger has been set.
 */
export function modelWarn(message: string, context?: Record<string, unknown>): void {
  if (modelLogger) {
    modelLogger.warn(message, context);
  }
}
