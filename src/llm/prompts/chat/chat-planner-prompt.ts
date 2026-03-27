import type { ChatTurn } from '../../../models/chat/index.js';
import { formatStandaloneCharacterSummary } from '../../../models/standalone-decomposed-character.js';
import type { ChatMessage } from '../../llm-client-types.js';
import { CONTENT_POLICY } from '../../content-policy.js';
import type { ChatPlannerContext } from '../../chat/chat-planner-generation.js';
import {
  formatRecentTurns,
  formatSpeechFingerprint,
  formatStringList,
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

function formatChatBible(chatBible: ChatPlannerContext['chatBible']): string {
  return [
    `Session Premise: ${chatBible.sessionPremise}`,
    'Character Now:',
    `- Objective: ${chatBible.characterNow.currentObjective}`,
    `- Immediate Need: ${chatBible.characterNow.immediateNeedFromConversation}`,
    `- Emotional State: ${chatBible.characterNow.emotionalState}`,
    `- Willingness: ${chatBible.characterNow.willingnessToEngage}`,
    'Topics To Advance:',
    formatStringList(chatBible.characterNow.topicsToAdvance),
    'Topics To Protect:',
    formatStringList(chatBible.characterNow.topicsToProtect),
    'Relationship Now:',
    `- Dynamic: ${chatBible.relationshipNow.dynamic}`,
    `- Valence: ${chatBible.relationshipNow.valence}`,
    `- Tension: ${chatBible.relationshipNow.tension}`,
    `- Leverage: ${chatBible.relationshipNow.leverage}`,
    'Beliefs About Interlocutor:',
    formatStringList(chatBible.relationshipNow.whatCharacterBelievesAboutInterlocutor),
    'Knowledge Now:',
    'Known Facts:',
    formatStringList(chatBible.knowledgeNow.knownFacts),
    'Suspicions:',
    formatStringList(chatBible.knowledgeNow.suspicions),
    'False Beliefs:',
    formatStringList(chatBible.knowledgeNow.falseBeliefs),
    'Secrets Kept:',
    formatStringList(chatBible.knowledgeNow.secretsKept),
    'Knowledge Boundaries:',
    formatStringList(chatBible.knowledgeNow.knowledgeBoundaries),
    'Conversation Now:',
    `Rolling Summary: ${chatBible.conversationNow.rollingSummary ?? 'None'}`,
    'Active Threads:',
    formatStringList(chatBible.conversationNow.activeThreads),
    'Commitments:',
    formatStringList(chatBible.conversationNow.commitments),
    'Sensitive Topics:',
    formatStringList(chatBible.conversationNow.sensitiveTopics),
    `Last Turn Pressure: ${chatBible.conversationNow.lastTurnPressure ?? 'None'}`,
    'Continuity Guardrails:',
    formatStringList(chatBible.continuityGuardrails),
    'Response Constraints:',
    formatStringList(chatBible.responseConstraints),
  ].join('\n');
}

export function buildChatPlannerMessages(context: ChatPlannerContext): ChatMessage[] {
  const userSections = [
    `CHAT BIBLE\n${formatChatBible(context.chatBible)}`,
    `TARGET CHARACTER DECOMPOSITION\n${formatStandaloneCharacterSummary(context.targetCharacter)}`,
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
