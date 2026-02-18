import type { ChatMessage } from '../llm/llm-client-types.js';
import { createPromptFileSinkFromConfig, type PromptSink } from './prompt-file-sink.js';
import type { Logger } from './types.js';

export type PromptType =
  | 'conceptIdeator'
  | 'opening'
  | 'writer'
  | 'analyst'
  | 'planner'
  | 'accountant'
  | 'lorekeeper'
  | 'structure'
  | 'structure-rewrite'
  | 'spine'
  | 'spine-rewrite'
  | 'agenda-resolver'
  | 'entity-decomposer';

const NOOP_PROMPT_SINK: PromptSink = {
  appendPrompt: () => Promise.resolve(),
};

let promptSink: PromptSink | undefined;

function getPromptSink(): PromptSink {
  if (promptSink) {
    return promptSink;
  }

  try {
    promptSink = createPromptFileSinkFromConfig();
  } catch {
    promptSink = NOOP_PROMPT_SINK;
  }

  return promptSink;
}

/**
 * Swaps the prompt sink for tests.
 */
export function setPromptSinkForTesting(sink: PromptSink): void {
  promptSink = sink;
}

/**
 * Restores the default config-backed prompt sink.
 */
export function resetPromptSinkForTesting(): void {
  promptSink = undefined;
}

/**
 * Logs a prompt to the configured prompt sink.
 * Prompt payload is never emitted to application logger output.
 */
export function logPrompt(logger: Logger, promptType: PromptType, messages: ChatMessage[]): void {
  void getPromptSink()
    .appendPrompt({ promptType, messages })
    .catch((error: unknown) => {
      const safeErrorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('Prompt logging failed', {
        promptType,
        messageCount: messages.length,
        error: safeErrorMessage,
      });
    });
}
