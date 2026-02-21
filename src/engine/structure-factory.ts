import type {
  BeatRole,
  EscalationType,
  StoryAct,
  StoryBeat,
  StoryStructure,
} from '../models/story-arc';
import type { StructureGenerationResult } from './structure-types';

const VALID_BEAT_ROLES: readonly string[] = ['setup', 'escalation', 'turning_point', 'resolution'];

const VALID_ESCALATION_TYPES: readonly string[] = [
  'THREAT_ESCALATION',
  'REVELATION_SHIFT',
  'REVERSAL_OF_FORTUNE',
  'BETRAYAL_OR_ALLIANCE_SHIFT',
  'RESOURCE_OR_CAPABILITY_LOSS',
  'MORAL_OR_ETHICAL_PRESSURE',
  'TEMPORAL_OR_ENVIRONMENTAL_PRESSURE',
  'COMPLICATION_CASCADE',
  'COMPETENCE_DEMAND_SPIKE',
];

function parseBeatRole(role: string): BeatRole {
  if (VALID_BEAT_ROLES.includes(role)) {
    return role as BeatRole;
  }
  return 'escalation';
}

export function parseEscalationType(value: string | null | undefined): EscalationType | null {
  if (value == null) {
    return null;
  }
  if (VALID_ESCALATION_TYPES.includes(value)) {
    return value as EscalationType;
  }
  return null;
}

/**
 * Creates StoryStructure from raw generation result.
 * Assigns hierarchical IDs to beats (e.g., "1.1", "1.2", "2.1").
 */
export function createStoryStructure(result: StructureGenerationResult): StoryStructure {
  const acts: StoryAct[] = result.acts.map((actData, actIndex) => {
    const actId = String(actIndex + 1);
    const beats: StoryBeat[] = actData.beats.map((beatData, beatIndex) => ({
      id: `${actId}.${beatIndex + 1}`,
      name: beatData.name,
      description: beatData.description,
      objective: beatData.objective,
      role: parseBeatRole(beatData.role),
      escalationType: parseEscalationType(beatData.escalationType),
      uniqueScenarioHook:
        typeof beatData.uniqueScenarioHook === 'string' ? beatData.uniqueScenarioHook : null,
    }));

    return {
      id: actId,
      name: actData.name,
      objective: actData.objective,
      stakes: actData.stakes,
      entryCondition: actData.entryCondition,
      beats,
    };
  });

  return {
    acts,
    overallTheme: result.overallTheme,
    premise: result.premise,
    pacingBudget: result.pacingBudget,
    generatedAt: new Date(),
  };
}
