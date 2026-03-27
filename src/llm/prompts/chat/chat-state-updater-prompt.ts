import type { ChatTurn } from '../../../models/chat/index.js';
import type { ChatMessage } from '../../llm-client-types.js';
import { CONTENT_POLICY } from '../../content-policy.js';
import type { ChatStateUpdaterContext } from '../../chat/chat-state-updater-generation.js';
import {
  formatChatBible,
  formatChatWriterTurn,
  formatRecentTurns,
  formatTurnPlan,
} from './chat-prompt-formatters.js';

const SYSTEM_PROMPT = `Extract only state changes that actually occurred.
Track relationship shifts only when meaningful.
Track knowledge asymmetry: what changed in who knows what, what false beliefs remain, and what secrets moved.
Track commitments, threats, opened questions, and resolved questions.
Track physical changes only if they are visible in the written turn.
Use the planner to distinguish intent from what was actually revealed on the page.
Signal when the chat bible should be refreshed.
Signal when a rolling summary should be generated.
Do not invent state changes unsupported by the provided turn.`;

function formatLatestUserTurn(turn: ChatTurn): string {
  return formatRecentTurns([turn]);
}

export function buildChatStateUpdaterMessages(context: ChatStateUpdaterContext): ChatMessage[] {
  const userSections = [
    `PRE-TURN CHAT BIBLE\n${formatChatBible(context.chatBible)}`,
    `LATEST USER TURN\n${formatLatestUserTurn(context.latestUserTurn)}`,
    `TURN PLAN\n${formatTurnPlan(context.turnPlan)}`,
    `FINAL WRITTEN TURN\n${formatChatWriterTurn(context.writerTurn)}`,
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
