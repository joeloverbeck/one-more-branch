import { PromptLogger } from '../../../src/logging/logger';
import type { LogLevel } from '../../../src/logging/types';

describe('PromptLogger', () => {
  let logger: PromptLogger;

  beforeEach(() => {
    logger = new PromptLogger();
  });

  describe('entry accumulation', () => {
    it('should accumulate log entries', () => {
      logger.info('first message');
      logger.info('second message');

      const entries = logger.getEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0]?.message).toBe('first message');
      expect(entries[1]?.message).toBe('second message');
    });

    it('should include timestamp on entries', () => {
      const before = new Date();
      logger.info('test message');
      const after = new Date();

      const entries = logger.getEntries();
      const timestamp = entries[0]?.timestamp;

      expect(timestamp).toBeDefined();
      expect(timestamp!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should include context when provided', () => {
      logger.info('test message', { key: 'value' });

      const entries = logger.getEntries();

      expect(entries[0]?.context).toEqual({ key: 'value' });
    });

    it('should set correct log level on entries', () => {
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      const entries = logger.getEntries();

      expect(entries[0]?.level).toBe('debug');
      expect(entries[1]?.level).toBe('info');
      expect(entries[2]?.level).toBe('warn');
      expect(entries[3]?.level).toBe('error');
    });
  });

  describe('log level filtering', () => {
    it('should filter entries below minimum level', () => {
      const infoLogger = new PromptLogger('info');

      infoLogger.debug('debug message');
      infoLogger.info('info message');
      infoLogger.warn('warn message');

      const entries = infoLogger.getEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0]?.level).toBe('info');
      expect(entries[1]?.level).toBe('warn');
    });

    it('should allow changing minimum level', () => {
      logger.debug('before change');
      logger.setMinLevel('warn');
      logger.info('after change');
      logger.warn('warning');

      const entries = logger.getEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0]?.level).toBe('debug');
      expect(entries[1]?.level).toBe('warn');
    });

    it('should respect level priority order', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

      for (const minLevel of levels) {
        const testLogger = new PromptLogger(minLevel);

        testLogger.debug('d');
        testLogger.info('i');
        testLogger.warn('w');
        testLogger.error('e');

        const entries = testLogger.getEntries();
        const minIndex = levels.indexOf(minLevel);

        expect(entries).toHaveLength(levels.length - minIndex);

        for (const entry of entries) {
          expect(levels.indexOf(entry.level)).toBeGreaterThanOrEqual(minIndex);
        }
      }
    });
  });

  describe('clear functionality', () => {
    it('should clear all entries', () => {
      logger.info('first');
      logger.info('second');

      expect(logger.getEntries()).toHaveLength(2);

      logger.clear();

      expect(logger.getEntries()).toHaveLength(0);
    });

    it('should allow new entries after clear', () => {
      logger.info('before');
      logger.clear();
      logger.info('after');

      const entries = logger.getEntries();

      expect(entries).toHaveLength(1);
      expect(entries[0]?.message).toBe('after');
    });
  });

  describe('getEntries immutability', () => {
    it('should return a copy of entries', () => {
      logger.info('test');

      const entries1 = logger.getEntries();
      const entries2 = logger.getEntries();

      expect(entries1).not.toBe(entries2);
      expect(entries1).toEqual(entries2);
    });

    it('should not allow external mutation of internal state', () => {
      logger.info('original');

      const entries = logger.getEntries();
      entries.push({
        level: 'info',
        message: 'injected',
        timestamp: new Date(),
      });

      expect(logger.getEntries()).toHaveLength(1);
    });
  });
});
