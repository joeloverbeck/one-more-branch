import type { LogEntry, LogLevel, Logger } from './types.js';

/**
 * Detects if running in test environment.
 * Checks for Jest worker ID (set automatically by Jest) or NODE_ENV=test.
 */
function isTestEnvironment(): boolean {
  return Boolean(process.env['JEST_WORKER_ID'] ?? process.env['NODE_ENV'] === 'test');
}

/**
 * Console logger decorator that wraps another Logger instance.
 * Optionally outputs to console while preserving all underlying logger functionality.
 * Console output is automatically disabled in test environments.
 */
export class ConsoleLogger implements Logger {
  private readonly wrapped: Logger;
  private consoleEnabled: boolean;

  constructor(wrapped: Logger, enableConsole?: boolean) {
    this.wrapped = wrapped;
    // Auto-detect: disable console in test environment unless explicitly enabled
    this.consoleEnabled = enableConsole ?? !isTestEnvironment();
  }

  /**
   * Enables or disables console output.
   */
  setConsoleEnabled(enabled: boolean): void {
    this.consoleEnabled = enabled;
  }

  /**
   * Returns whether console output is currently enabled.
   */
  isConsoleEnabled(): boolean {
    return this.consoleEnabled;
  }

  private logToConsole(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.consoleEnabled) {
      return;
    }

    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const fullMessage = `${message}${contextStr}`;

    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(fullMessage);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(fullMessage);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(fullMessage);
        break;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(fullMessage);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.wrapped.debug(message, context);
    this.logToConsole('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.wrapped.info(message, context);
    this.logToConsole('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.wrapped.warn(message, context);
    this.logToConsole('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.wrapped.error(message, context);
    this.logToConsole('error', message, context);
  }

  getEntries(): LogEntry[] {
    return this.wrapped.getEntries();
  }

  clear(): void {
    this.wrapped.clear();
  }

  /**
   * Updates the minimum log level for future entries (if supported by wrapped logger).
   */
  setMinLevel(level: LogLevel): void {
    if ('setMinLevel' in this.wrapped && typeof this.wrapped.setMinLevel === 'function') {
      (this.wrapped as { setMinLevel: (level: LogLevel) => void }).setMinLevel(level);
    }
  }
}
