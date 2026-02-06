import { getConfig } from '../config/index.js';
import type { ChatMessage } from '../llm/types.js';
import type { Logger } from './types.js';

export type PromptType = 'opening' | 'continuation';

/**
 * Truncates text to a maximum length, adding ellipsis if needed.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Logs a prompt's messages to the provided logger.
 * Logs summary at 'info' level and full content at 'debug' level.
 */
export function logPrompt(logger: Logger, promptType: PromptType, messages: ChatMessage[]): void {
  const previewLength = getConfig().logging.promptPreviewLength;
  const messageCount = messages.length;
  const previews = messages.map(m => `[${m.role}] ${truncate(m.content, previewLength)}`);

  logger.info(`Prompt (${promptType}): ${messageCount} messages`, {
    promptType,
    messageCount,
    previews,
  });

  for (const message of messages) {
    logger.debug(`[${message.role}] ${message.content}`, {
      promptType,
      role: message.role,
    });
  }
}
