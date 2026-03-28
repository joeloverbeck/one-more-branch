import type { ChatMessage } from '../../llm-client-types.js';
import { CONTENT_POLICY } from '../../content-policy.js';
import type { ChatWriterContext } from '../../chat/chat-writer-generation.js';
import {
  formatChatBible,
  formatRecentTurns,
  formatSpeechFingerprint,
  formatTurnPlan,
} from './chat-prompt-formatters.js';
import { formatRollingSummaryForPrompt } from './chat-memory-prompt-adapter.js';

const SYSTEM_PROMPT = `Write exactly one in-world turn for the target character.
This is chat, not page prose.
ACTION is concise, visible, and non-omniscient.
SPEECH carries the character voice.
Follow the planner's honesty mode, subtext, and action plan.
Respect physical reality, knowledge boundaries, and secrets.
Do not narrate the interlocutor's inner thoughts.
Keep the turn bounded and reply-shaped.
Maximum 2 action blocks; maximum 3 speech blocks.
Allow controlled imperfections in speech: self-corrections, hesitations, and false starts only when they serve characterization.
Match the planner's ordered block plan exactly.`;

export function buildChatWriterMessages(context: ChatWriterContext): ChatMessage[] {
  const speakerNames = {
    target: context.targetCharacter.name,
    interlocutor: context.interlocutorCharacterName,
  };
  const userSections = [
    `TARGET CHARACTER NAME\n${context.targetCharacter.name}`,
    `FULL SPEECH FINGERPRINT\n${formatSpeechFingerprint(context.targetCharacter.speechFingerprint)}`,
    `CHAT BIBLE\n${formatChatBible(context.chatBible)}`,
    `OLDER CHAT SUMMARY\n${formatRollingSummaryForPrompt(context.rollingSummary)}`,
    `TURN PLAN\n${formatTurnPlan(context.turnPlan)}`,
    `RECENT CHAT TURNS\n${formatRecentTurns(context.recentTurns, speakerNames)}`,
    `LATEST USER TURN\n${formatRecentTurns([context.latestUserTurn], speakerNames)}`,
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
