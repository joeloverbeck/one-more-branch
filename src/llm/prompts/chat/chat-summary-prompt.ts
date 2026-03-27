import type { ChatMessage } from '../../llm-client-types.js';
import { CONTENT_POLICY } from '../../content-policy.js';
import type { ChatSummaryContext } from '../../chat/chat-summary-generation.js';
import { formatRollingSummaryForPrompt } from './chat-memory-prompt-adapter.js';
import { formatRecentTurns } from './chat-prompt-formatters.js';

const SYSTEM_PROMPT = `Compress older one-on-one chat turns into durable continuity memory.
Preserve only facts that matter for future turns: commitments, leverage, disclosures, lies exposed, confessions, unresolved questions, and continuity-critical changes.
Write from observable conversation reality, not vibes or literary interpretation.
Do not invent motives, events, or internal states unsupported by the provided turns.
Keep the summary additive and continuity-safe: merge any existing rolling summary with the new turns into one updated memory object.
The emotional trajectory must stay factual and externally grounded, not sentimental.`;

export function buildChatSummaryMessages(context: ChatSummaryContext): ChatMessage[] {
  const userSections = [
    `EXISTING ROLLING SUMMARY\n${formatRollingSummaryForPrompt(context.existingSummary)}`,
    `TURNS TO COMPRESS\n${formatRecentTurns(context.turnsToCompress)}`,
  ];

  return [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n${CONTENT_POLICY}`,
    },
    {
      role: 'user',
      content: userSections.join('\n\n'),
    },
  ];
}
