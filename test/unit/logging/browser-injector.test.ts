import { generateBrowserLogScript } from '../../../src/logging/browser-injector';
import type { LogEntry } from '../../../src/logging/types';

function createEntry(
  level: LogEntry['level'],
  message: string,
  context?: Record<string, unknown>
): LogEntry {
  return {
    level,
    message,
    timestamp: new Date('2024-01-15T10:30:00.000Z'),
    context,
  };
}

describe('generateBrowserLogScript', () => {
  describe('empty entries', () => {
    it('should return empty string for empty array', () => {
      const result = generateBrowserLogScript([]);

      expect(result).toBe('');
    });
  });

  describe('script generation', () => {
    it('should wrap statements in script tag', () => {
      const entries = [createEntry('info', 'Test message')];

      const result = generateBrowserLogScript(entries);

      expect(result).toMatch(/^<script>/);
      expect(result).toMatch(/<\/script>$/);
    });

    it('should include timestamp in output', () => {
      const entries = [createEntry('info', 'Test message')];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('2024-01-15T10:30:00.000Z');
    });

    it('should include message in output', () => {
      const entries = [createEntry('info', 'My test message')];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('My test message');
    });
  });

  describe('log level mapping', () => {
    it('should map debug to console.debug', () => {
      const entries = [createEntry('debug', 'Debug message')];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('console.debug');
    });

    it('should map info to console.info', () => {
      const entries = [createEntry('info', 'Info message')];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('console.info');
    });

    it('should map warn to console.warn', () => {
      const entries = [createEntry('warn', 'Warning message')];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('console.warn');
    });

    it('should map error to console.error', () => {
      const entries = [createEntry('error', 'Error message')];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('console.error');
    });
  });

  describe('content escaping', () => {
    it('should escape single quotes', () => {
      const entries = [createEntry('info', "It's a test")];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain("\\'");
      expect(result).not.toMatch(/[^\\]'/);
    });

    it('should escape double quotes', () => {
      const entries = [createEntry('info', 'He said "hello"')];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('\\"');
    });

    it('should escape newlines', () => {
      const entries = [createEntry('info', 'Line 1\nLine 2')];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('\\n');
      expect(result).not.toContain('\n' + 'Line 2');
    });

    it('should escape HTML tags to prevent XSS', () => {
      const entries = [createEntry('info', '<script>alert("xss")</script>')];

      const result = generateBrowserLogScript(entries);

      expect(result).not.toContain('<script>alert');
      expect(result).toContain('\\x3c');
      expect(result).toContain('\\x3e');
    });

    it('should escape backslashes', () => {
      const entries = [createEntry('info', 'path\\to\\file')];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('\\\\');
    });
  });

  describe('context handling', () => {
    it('should include context as JSON when provided', () => {
      const entries = [createEntry('info', 'Message', { key: 'value' })];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('JSON.parse');
      expect(result).toContain('key');
      expect(result).toContain('value');
    });

    it('should not include JSON.parse when no context', () => {
      const entries = [createEntry('info', 'Message without context')];

      const result = generateBrowserLogScript(entries);

      expect(result).not.toContain('JSON.parse');
    });

    it('should handle complex context objects', () => {
      const entries = [
        createEntry('info', 'Complex', {
          nested: { deep: true },
          array: [1, 2, 3],
        }),
      ];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('nested');
      expect(result).toContain('deep');
      expect(result).toContain('array');
    });
  });

  describe('multiple entries', () => {
    it('should include all entries in output', () => {
      const entries = [
        createEntry('info', 'First'),
        createEntry('warn', 'Second'),
        createEntry('error', 'Third'),
      ];

      const result = generateBrowserLogScript(entries);

      expect(result).toContain('First');
      expect(result).toContain('Second');
      expect(result).toContain('Third');
      expect(result).toContain('console.info');
      expect(result).toContain('console.warn');
      expect(result).toContain('console.error');
    });

    it('should preserve entry order', () => {
      const entries = [
        createEntry('info', 'AAA'),
        createEntry('info', 'BBB'),
        createEntry('info', 'CCC'),
      ];

      const result = generateBrowserLogScript(entries);

      const indexA = result.indexOf('AAA');
      const indexB = result.indexOf('BBB');
      const indexC = result.indexOf('CCC');

      expect(indexA).toBeLessThan(indexB);
      expect(indexB).toBeLessThan(indexC);
    });
  });
});
