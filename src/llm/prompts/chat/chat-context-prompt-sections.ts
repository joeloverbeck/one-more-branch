import { formatStandaloneCharacterSummary } from '../../../models/standalone-decomposed-character.js';
import type { ChatSceneContext } from '../../../models/chat/index.js';
import type { StandaloneDecomposedCharacter } from '../../../models/standalone-decomposed-character.js';
import { buildWorldSection } from '../sections/shared/worldbuilding-sections.js';
import type { ChatGenerationContext } from '../../chat/chat-generation-context.js';
import { formatRollingSummaryForPrompt } from './chat-memory-prompt-adapter.js';
import {
  formatChatSceneContext,
  formatRecentTurns,
  formatStringList,
} from './chat-prompt-formatters.js';

function formatCharacterIdentitySummary(
  contextCharacter: ChatGenerationContext['targetCharacter']
): string {
  return [
    `Name: ${contextCharacter.name}`,
    `Core Traits: ${contextCharacter.coreTraits.join(', ') || 'None'}`,
    `Appearance: ${contextCharacter.appearance}`,
  ].join('\n');
}

function formatCharacterPsychologySummary(character: StandaloneDecomposedCharacter): string {
  const lines = [
    `Name: ${character.name}`,
    `Core Traits: ${character.coreTraits.join(', ') || 'None'}`,
  ];

  if (character.superObjective) {
    lines.push(`Super-Objective: ${character.superObjective}`);
  }

  if (character.stakes && character.stakes.length > 0) {
    lines.push('Stakes:');
    lines.push(formatStringList(character.stakes));
  }

  if (character.pressurePoint) {
    lines.push(`Pressure Point: ${character.pressurePoint}`);
  }

  if (character.personalDilemmas && character.personalDilemmas.length > 0) {
    lines.push('Personal Dilemmas:');
    lines.push(formatStringList(character.personalDilemmas));
  }

  if (character.emotionSalience) {
    lines.push(`Emotion Salience: ${character.emotionSalience}`);
  }

  if (character.moralLine) {
    lines.push(`Moral Line: ${character.moralLine}`);
  }

  if (character.worstFear) {
    lines.push(`Worst Fear: ${character.worstFear}`);
  }

  if (character.formativeWound) {
    lines.push(`Formative Wound: ${character.formativeWound}`);
  }

  if (character.misbelief) {
    lines.push(`Misbelief: ${character.misbelief}`);
  }

  if (character.focalizationFilter) {
    lines.push('Focalization Filter:');
    lines.push(`- Notices First: ${character.focalizationFilter.noticesFirst}`);
    lines.push(`- Systematically Misses: ${character.focalizationFilter.systematicallyMisses}`);
    lines.push(`- Misreads As: ${character.focalizationFilter.misreadsAs}`);
  }

  if (character.escalationLadder && character.escalationLadder.length > 0) {
    lines.push('Escalation Ladder:');
    lines.push(formatStringList(character.escalationLadder));
  }

  if (character.stressVariants) {
    lines.push('Stress Variants:');
    lines.push(`- Under Threat: ${character.stressVariants.underThreat}`);
    lines.push(`- In Intimacy: ${character.stressVariants.inIntimacy}`);
    lines.push(`- When Lying: ${character.stressVariants.whenLying}`);
    lines.push(`- When Ashamed: ${character.stressVariants.whenAshamed}`);
    lines.push(`- When Winning: ${character.stressVariants.whenWinning}`);
  }

  lines.push(`Knowledge Boundaries: ${character.knowledgeBoundaries}`);
  lines.push(`Decision Pattern: ${character.decisionPattern}`);
  lines.push(`Conflict Priority: ${character.conflictPriority}`);
  lines.push(`Appearance: ${character.appearance}`);
  lines.push('Core Beliefs:');
  lines.push(formatStringList(character.coreBeliefs));

  if (character.falseBeliefs && character.falseBeliefs.length > 0) {
    lines.push('False Beliefs:');
    lines.push(formatStringList(character.falseBeliefs));
  }

  if (character.secretsKept && character.secretsKept.length > 0) {
    lines.push('Secrets Kept:');
    lines.push(formatStringList(character.secretsKept));
  }

  if (character.immediateObjectives && character.immediateObjectives.length > 0) {
    lines.push(`Immediate Objectives: ${character.immediateObjectives.join('; ')}`);
  }

  if (character.constraints && character.constraints.length > 0) {
    lines.push('Constraints:');
    lines.push(formatStringList(character.constraints));
  }

  if (character.desires && character.desires.length > 0) {
    lines.push('Desires:');
    lines.push(formatStringList(character.desires));
  }

  if (character.currentIntentions && character.currentIntentions.length > 0) {
    lines.push('Current Intentions:');
    lines.push(formatStringList(character.currentIntentions));
  }

  if (character.sociology) {
    lines.push(`Sociology: ${character.sociology}`);
  }

  return lines.join('\n');
}

export function buildTargetCharacterSummarySection(
  context: ChatGenerationContext,
  detailLevel: 'identity' | 'legacyFull' | 'full'
): string {
  const body =
    detailLevel === 'identity'
      ? formatCharacterIdentitySummary(context.targetCharacter)
      : detailLevel === 'legacyFull'
        ? formatStandaloneCharacterSummary(context.targetCharacter)
        : formatCharacterPsychologySummary(context.targetCharacter);

  return `TARGET CHARACTER DECOMPOSITION\n${body}`;
}

export function buildInterlocutorSummarySection(
  context: ChatGenerationContext,
  detailLevel: 'identity' | 'legacyFull' | 'full'
): string {
  const body =
    detailLevel === 'identity'
      ? formatCharacterIdentitySummary(context.interlocutorCharacter)
      : detailLevel === 'legacyFull'
        ? formatStandaloneCharacterSummary(context.interlocutorCharacter)
        : formatCharacterPsychologySummary(context.interlocutorCharacter);

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
