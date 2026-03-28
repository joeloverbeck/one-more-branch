import type { ChatTurn } from '../../../models/chat/index.js';
import { formatStandaloneCharacterPromptSummary } from '../../../models/standalone-decomposed-character.js';
import type { ChatMessage } from '../../llm-client-types.js';
import { CONTENT_POLICY } from '../../content-policy.js';
import type { ChatPlannerContext } from '../../chat/chat-planner-generation.js';
import {
  formatChatBible,
  formatRecentTurns,
  formatSpeechFingerprint,
} from './chat-prompt-formatters.js';

const SYSTEM_PROMPT = `You are planning exactly one in-character reply turn for a one-on-one chat.
Produce a hidden response plan, not visible prose.
Treat the chat bible as authoritative for current reality, pressures, and continuity.
Treat physical reality, knowledge boundaries, false beliefs, and secrets as hard constraints.
Plan from motivation, leverage, and subtext first; use speech fingerprint to shape delivery second.
Do not invent knowledge, off-screen events, or state changes unsupported by the provided context.
Keep the plan specific enough for a downstream writer to execute without improvising intent.`;

function formatLatestUserTurn(turn: ChatTurn): string {
  return formatRecentTurns([turn]);
}

export function buildChatPlannerMessages(context: ChatPlannerContext): ChatMessage[] {
  const userSections = [
    `CHAT BIBLE\n${formatChatBible(context.chatBible)}`,
    `TARGET CHARACTER DECOMPOSITION\n${formatStandaloneCharacterPromptSummary(context.targetCharacter, 'standalone')}`,
    `TARGET CHARACTER SPEECH FINGERPRINT\n${formatSpeechFingerprint(context.targetCharacter.speechFingerprint)}`,
    `RECENT CHAT TURNS\n${formatRecentTurns(context.recentTurns)}`,
    `LATEST USER TURN\n${formatLatestUserTurn(context.latestUserTurn)}`,
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
