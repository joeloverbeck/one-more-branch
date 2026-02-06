import { logPrompt } from '../../../src/logging/prompt-formatter';
import type { ChatMessage } from '../../../src/llm/types';
import type { Logger } from '../../../src/logging/types';

interface MockLogger extends Logger {
  infoCalls: Array<{ message: string; context?: Record<string, unknown> }>;
  debugCalls: Array<{ message: string; context?: Record<string, unknown> }>;
}

function createMockLogger(): MockLogger {
  const infoCalls: Array<{ message: string; context?: Record<string, unknown> }> = [];
  const debugCalls: Array<{ message: string; context?: Record<string, unknown> }> = [];

  return {
    infoCalls,
    debugCalls,
    debug(message: string, context?: Record<string, unknown>): void {
      debugCalls.push({ message, context });
    },
    info(message: string, context?: Record<string, unknown>): void {
      infoCalls.push({ message, context });
    },
    warn(): void {
      // Not used in prompt formatter tests
    },
    error(): void {
      // Not used in prompt formatter tests
    },
    getEntries(): [] {
      return [];
    },
    clear(): void {
      // Not used in prompt formatter tests
    },
  };
}

describe('logPrompt', () => {
  describe('info level summary', () => {
    it('should log summary at info level', () => {
      const mockLogger = createMockLogger();
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a storyteller.' },
        { role: 'user', content: 'Begin the story.' },
      ];

      logPrompt(mockLogger, 'opening', messages);

      expect(mockLogger.infoCalls).toHaveLength(1);
      expect(mockLogger.infoCalls[0]?.message).toContain('Prompt (opening)');
      expect(mockLogger.infoCalls[0]?.message).toContain('2 messages');
    });

    it('should include message count and previews in context', () => {
      const mockLogger = createMockLogger();
      const messages: ChatMessage[] = [
        { role: 'system', content: 'System content' },
        { role: 'user', content: 'User content' },
      ];

      logPrompt(mockLogger, 'continuation', messages);

      const context = mockLogger.infoCalls[0]?.context;

      expect(context?.promptType).toBe('continuation');
      expect(context?.messageCount).toBe(2);
      expect(context?.previews).toHaveLength(2);
    });
  });

  describe('content truncation', () => {
    it('should truncate long content in previews', () => {
      const mockLogger = createMockLogger();
      const longContent = 'A'.repeat(200);
      const messages: ChatMessage[] = [{ role: 'system', content: longContent }];

      logPrompt(mockLogger, 'opening', messages);

      const previews = mockLogger.infoCalls[0]?.context?.previews as string[];

      expect(previews[0]).toContain('...');
      expect(previews[0]?.length).toBeLessThan(longContent.length);
    });

    it('should not truncate short content', () => {
      const mockLogger = createMockLogger();
      const shortContent = 'Short message';
      const messages: ChatMessage[] = [{ role: 'user', content: shortContent }];

      logPrompt(mockLogger, 'opening', messages);

      const previews = mockLogger.infoCalls[0]?.context?.previews as string[];

      expect(previews[0]).not.toContain('...');
      expect(previews[0]).toContain(shortContent);
    });
  });

  describe('debug level details', () => {
    it('should log full content at debug level', () => {
      const mockLogger = createMockLogger();
      const fullContent = 'This is the complete message content.';
      const messages: ChatMessage[] = [{ role: 'assistant', content: fullContent }];

      logPrompt(mockLogger, 'opening', messages);

      expect(mockLogger.debugCalls).toHaveLength(1);
      expect(mockLogger.debugCalls[0]?.message).toContain(fullContent);
    });

    it('should log each message separately at debug level', () => {
      const mockLogger = createMockLogger();
      const messages: ChatMessage[] = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'User' },
        { role: 'assistant', content: 'Assistant' },
      ];

      logPrompt(mockLogger, 'continuation', messages);

      expect(mockLogger.debugCalls).toHaveLength(3);
      expect(mockLogger.debugCalls[0]?.message).toContain('[system]');
      expect(mockLogger.debugCalls[1]?.message).toContain('[user]');
      expect(mockLogger.debugCalls[2]?.message).toContain('[assistant]');
    });

    it('should include role in debug context', () => {
      const mockLogger = createMockLogger();
      const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }];

      logPrompt(mockLogger, 'opening', messages);

      expect(mockLogger.debugCalls[0]?.context?.role).toBe('user');
      expect(mockLogger.debugCalls[0]?.context?.promptType).toBe('opening');
    });
  });

  describe('prompt types', () => {
    it('should handle opening prompt type', () => {
      const mockLogger = createMockLogger();
      const messages: ChatMessage[] = [{ role: 'system', content: 'Test' }];

      logPrompt(mockLogger, 'opening', messages);

      expect(mockLogger.infoCalls[0]?.message).toContain('opening');
      expect(mockLogger.infoCalls[0]?.context?.promptType).toBe('opening');
    });

    it('should handle continuation prompt type', () => {
      const mockLogger = createMockLogger();
      const messages: ChatMessage[] = [{ role: 'system', content: 'Test' }];

      logPrompt(mockLogger, 'continuation', messages);

      expect(mockLogger.infoCalls[0]?.message).toContain('continuation');
      expect(mockLogger.infoCalls[0]?.context?.promptType).toBe('continuation');
    });
  });

  describe('empty messages', () => {
    it('should handle empty message array', () => {
      const mockLogger = createMockLogger();

      logPrompt(mockLogger, 'opening', []);

      expect(mockLogger.infoCalls).toHaveLength(1);
      expect(mockLogger.infoCalls[0]?.context?.messageCount).toBe(0);
      expect(mockLogger.debugCalls).toHaveLength(0);
    });
  });
});
