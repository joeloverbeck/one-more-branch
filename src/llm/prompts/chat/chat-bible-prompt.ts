import { formatStandaloneCharacterSummary } from '../../../models/standalone-decomposed-character.js';
import type { ChatMessage } from '../../llm-client-types.js';
import { CONTENT_POLICY } from '../../content-policy.js';
import type { ChatBibleContext } from '../../chat/chat-bible-generation.js';
import { buildWorldSection } from '../sections/shared/worldbuilding-sections.js';
import { formatRollingSummaryForPrompt } from './chat-memory-prompt-adapter.js';
import { formatRecentTurns, formatStringList } from './chat-prompt-formatters.js';

const SYSTEM_PROMPT = `You are curating an authoritative brief for a one-on-one in-world chat.
Physical context is mandatory and authoritative.
Separate permanent profile, current state, and conversation memory.
Preserve knowledge boundaries, false beliefs, and secrets.
State why this conversation is happening now.
Surface what the character wants, what they fear, what they will protect, and what pressure is active.
Compress aggressively for the next 1-3 turns only.
Do not write dialogue.`;

function buildRelationshipSection(context: ChatBibleContext): string {
  const { relationshipState } = context;

  return [
    'RELATIONSHIP STATE',
    `Dynamic: ${relationshipState.dynamic}`,
    `Valence: ${relationshipState.valence}`,
    `Tension: ${relationshipState.tension}`,
    `Leverage: ${relationshipState.leverage}`,
  ].join('\n');
}

function buildKnowledgeSection(context: ChatBibleContext): string {
  const { knowledgeState } = context;

  return [
    'KNOWLEDGE STATE',
    'Known Facts:',
    formatStringList(knowledgeState.knownFacts),
    'Suspicions:',
    formatStringList(knowledgeState.suspicions),
    'False Beliefs:',
    formatStringList(knowledgeState.falseBeliefs),
    'Secrets Revealed:',
    formatStringList(knowledgeState.secretsRevealed),
  ].join('\n');
}

function buildPhysicalContextSection(context: ChatBibleContext): string {
  const { physicalContext } = context;

  return [
    'PHYSICAL CONTEXT',
    `Location: ${physicalContext.location}`,
    `Micro-Location: ${physicalContext.microLocation}`,
    `Time of Day: ${physicalContext.timeOfDay}`,
    `Privacy: ${physicalContext.privacy}`,
    `Distance Band: ${physicalContext.distanceBand}`,
    `Character Activity: ${physicalContext.characterActivity}`,
    'Interactable Objects:',
    formatStringList(physicalContext.interactableObjects),
    'Ambient Conditions:',
    formatStringList(physicalContext.ambientConditions),
  ].join('\n');
}

function buildLeadInSection(context: ChatBibleContext): string {
  const { leadInContext } = context;

  return [
    'PRE-CHAT LEAD-IN',
    `Lead-In Summary: ${leadInContext.leadInSummary}`,
    'Recent Events:',
    formatStringList(leadInContext.recentEvents),
    `Why Now: ${leadInContext.whyNow}`,
  ].join('\n');
}

export function buildChatBibleMessages(context: ChatBibleContext): ChatMessage[] {
  const userSections = [
    `TARGET CHARACTER DECOMPOSITION\n${formatStandaloneCharacterSummary(context.targetCharacter)}`,
    `INTERLOCUTOR CHARACTER PROFILE\n${formatStandaloneCharacterSummary(context.interlocutorCharacter)}`,
    context.decomposedWorld.facts.length > 0
      ? buildWorldSection(context.decomposedWorld, 'CHAT')
      : 'WORLDBUILDING:\n(none provided)',
    buildRelationshipSection(context),
    buildKnowledgeSection(context),
    buildPhysicalContextSection(context),
    buildLeadInSection(context),
    `OLDER CHAT SUMMARY\n${formatRollingSummaryForPrompt(context.rollingSummary)}`,
    `RECENT CHAT TURNS\n${formatRecentTurns(context.recentTurns)}`,
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
