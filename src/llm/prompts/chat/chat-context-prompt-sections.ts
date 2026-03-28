import type { ChatSceneContext } from '../../../models/chat/index.js';
import { formatStandaloneCharacterPromptSummary } from '../../../models/standalone-decomposed-character.js';
import { buildWorldSection } from '../sections/shared/worldbuilding-sections.js';
import type { ChatGenerationContext } from '../../chat/chat-generation-context.js';
import { formatRollingSummaryForPrompt } from './chat-memory-prompt-adapter.js';
import { formatChatSceneContext, formatRecentTurns, formatStringList } from './chat-prompt-formatters.js';

export function buildTargetCharacterSummarySection(
  context: ChatGenerationContext,
  detailLevel: 'identity' | 'legacyFull' | 'full'
): string {
  const body =
    detailLevel === 'identity'
      ? formatStandaloneCharacterPromptSummary(context.targetCharacter, 'identity')
      : detailLevel === 'legacyFull'
        ? formatStandaloneCharacterPromptSummary(context.targetCharacter, 'standalone')
        : formatStandaloneCharacterPromptSummary(context.targetCharacter, 'psychology');

  return `TARGET CHARACTER DECOMPOSITION\n${body}`;
}

export function buildInterlocutorSummarySection(
  context: ChatGenerationContext,
  detailLevel: 'identity' | 'legacyFull' | 'full'
): string {
  const body =
    detailLevel === 'identity'
      ? formatStandaloneCharacterPromptSummary(context.interlocutorCharacter, 'identity')
      : detailLevel === 'legacyFull'
        ? formatStandaloneCharacterPromptSummary(context.interlocutorCharacter, 'standalone')
        : formatStandaloneCharacterPromptSummary(context.interlocutorCharacter, 'psychology');

  return `INTERLOCUTOR CHARACTER PROFILE\n${body}`;
}

export function buildWorldbuildingSection(context: ChatGenerationContext): string {
  return context.decomposedWorld.facts.length > 0
    ? buildWorldSection(context.decomposedWorld, 'CHAT')
    : 'WORLDBUILDING:\n(none provided)';
}

export function buildRelationshipSection(context: ChatGenerationContext): string {
  const { relationshipState } = context;

  return [
    'RELATIONSHIP STATE',
    `Dynamic: ${relationshipState.dynamic}`,
    `Valence: ${relationshipState.valence}`,
    `Tension: ${relationshipState.tension}`,
    `Leverage: ${relationshipState.leverage}`,
  ].join('\n');
}

export function buildKnowledgeSection(context: ChatGenerationContext): string {
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

export function buildPhysicalContextSection(context: ChatGenerationContext): string {
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

export function buildLeadInSection(context: ChatGenerationContext): string {
  const { leadInContext } = context;

  return [
    'PRE-CHAT LEAD-IN',
    `Lead-In Summary: ${leadInContext.leadInSummary}`,
    'Recent Events:',
    formatStringList(leadInContext.recentEvents),
    `Why Now: ${leadInContext.whyNow}`,
  ].join('\n');
}

export function buildOlderChatSummarySection(context: ChatGenerationContext): string {
  return `OLDER CHAT SUMMARY\n${formatRollingSummaryForPrompt(context.rollingSummary)}`;
}

export function buildRecentTurnsSection(context: ChatGenerationContext): string {
  return `RECENT CHAT TURNS\n${formatRecentTurns(context.recentTurns)}`;
}

export function buildEstablishedSceneContextSection(sceneContext: ChatSceneContext): string {
  return `ESTABLISHED SCENE CONTEXT\n${formatChatSceneContext(sceneContext)}`;
}
