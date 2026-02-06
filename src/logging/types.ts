/**
 * Log severity levels, ordered from most to least verbose.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * A single log entry with timestamp and optional context.
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

/**
 * Logger interface for dependency injection and testing.
 */
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;

  /**
   * Returns a copy of all accumulated log entries.
   */
  getEntries(): LogEntry[];

  /**
   * Clears all accumulated log entries.
   */
  clear(): void;
}

/**
 * Log level priority for filtering.
 * Higher number = more severe = always shown.
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
