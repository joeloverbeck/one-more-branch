import { LOG_LEVEL_PRIORITY, type LogEntry, type LogLevel, type Logger } from './types.js';

/**
 * In-memory logger that accumulates entries for later injection into browser.
 * Supports configurable minimum log level filtering.
 */
export class PromptLogger implements Logger {
  private entries: LogEntry[] = [];
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'debug') {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    this.entries.push({
      level,
      message,
      timestamp: new Date(),
      context,
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }

  /**
   * Updates the minimum log level for future entries.
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

/**
 * Singleton logger instance for application-wide use.
 * Use dependency injection in tests by mocking this export.
 */
export const logger = new PromptLogger();
