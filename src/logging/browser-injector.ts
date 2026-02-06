import type { LogEntry, LogLevel } from './types.js';

/**
 * Maps log levels to browser console methods.
 */
const CONSOLE_METHODS: Record<LogLevel, string> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

/**
 * Escapes a string for safe inclusion in JavaScript.
 * Handles quotes, newlines, and other special characters.
 */
function escapeForJs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/</g, '\\x3c')
    .replace(/>/g, '\\x3e');
}

/**
 * Formats a log entry as a console statement.
 */
function formatEntry(entry: LogEntry): string {
  const method = CONSOLE_METHODS[entry.level];
  const timestamp = entry.timestamp.toISOString();
  const escapedMessage = escapeForJs(entry.message);

  if (entry.context) {
    const contextJson = JSON.stringify(entry.context);
    const escapedContext = escapeForJs(contextJson);
    return `console.${method}("[${timestamp}] ${escapedMessage}", JSON.parse("${escapedContext}"));`;
  }

  return `console.${method}("[${timestamp}] ${escapedMessage}");`;
}

/**
 * Generates a script tag containing console statements for all log entries.
 * Returns empty string if no entries.
 */
export function generateBrowserLogScript(entries: LogEntry[]): string {
  if (entries.length === 0) {
    return '';
  }

  const statements = entries.map(formatEntry).join('\n  ');

  return `<script>
  ${statements}
</script>`;
}
