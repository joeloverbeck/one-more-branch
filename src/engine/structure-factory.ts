import type {
  ApproachVector,
  BeatRole,
  CrisisType,
  EscalationType,
  GapMagnitude,
  MidpointType,
  StoryAct,
  StoryBeat,
  StoryStructure,
} from '../models/story-arc';
import {
  APPROACH_VECTORS,
  BEAT_ROLES,
  CRISIS_TYPES,
  ESCALATION_TYPES,
  GAP_MAGNITUDES,
  MIDPOINT_TYPES,
} from '../models/story-arc';
import type { StructureGenerationResult } from './structure-types';

function parseBeatRole(role: string): BeatRole {
  if (BEAT_ROLES.includes(role as BeatRole)) {
    return role as BeatRole;
  }
  return 'escalation';
}

export function parseEscalationType(value: string | null | undefined): EscalationType | null {
  if (value == null) {
    return null;
  }
  if (ESCALATION_TYPES.includes(value as EscalationType)) {
    return value as EscalationType;
  }
  return null;
}

export function parseCrisisType(value: string | null | undefined): CrisisType | null {
  if (value == null) {
    return null;
  }
  if (CRISIS_TYPES.includes(value as CrisisType)) {
    return value as CrisisType;
  }
  return null;
}

export function parseMidpointType(value: string | null | undefined): MidpointType | null {
  if (value == null) {
    return null;
  }
  if (MIDPOINT_TYPES.includes(value as MidpointType)) {
    return value as MidpointType;
  }
  return null;
}

export function parseGapMagnitude(value: string | null | undefined): GapMagnitude | null {
  if (value == null) {
    return null;
  }
  if (GAP_MAGNITUDES.includes(value as GapMagnitude)) {
    return value as GapMagnitude;
  }
  return null;
}

export function parseApproachVectors(
  value: unknown
): readonly ApproachVector[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const valid = value.filter(
    (v): v is string => typeof v === 'string' && APPROACH_VECTORS.includes(v as ApproachVector)
  ) as ApproachVector[];
  return valid.length > 0 ? valid : null;
}

function parseSetpieceSourceIndex(value: unknown): number | null {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 5
  ) {
    return value;
  }
  return null;
}

function parseCausalLink(value: unknown, beatId: string): string {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  throw new Error(`Structure beat ${beatId} must include a non-empty causalLink`);
}

/**
 * Creates StoryStructure from raw generation result.
 * Assigns hierarchical IDs to beats (e.g., "1.1", "1.2", "2.1").
 */
export function createStoryStructure(result: StructureGenerationResult): StoryStructure {
  const acts: StoryAct[] = result.acts.map((actData, actIndex) => {
    const actId = String(actIndex + 1);
    const beats: StoryBeat[] = actData.beats.map((beatData, beatIndex) => {
      const beatId = `${actId}.${beatIndex + 1}`;
      const midpointType = parseMidpointType(beatData.midpointType);
      const isMidpoint = beatData.isMidpoint === true;

      if (isMidpoint && midpointType === null) {
        throw new Error(`Structure beat ${beatId} is midpoint-tagged but missing midpointType`);
      }
      if (!isMidpoint && midpointType !== null) {
        throw new Error(`Structure beat ${beatId} has midpointType but isMidpoint is false`);
      }

      return {
        id: beatId,
        name: beatData.name,
        description: beatData.description,
        objective: beatData.objective,
        causalLink: parseCausalLink(beatData.causalLink, beatId),
        role: parseBeatRole(beatData.role),
        escalationType: parseEscalationType(beatData.escalationType),
        secondaryEscalationType: parseEscalationType(beatData.secondaryEscalationType),
        crisisType: parseCrisisType(beatData.crisisType),
        expectedGapMagnitude: parseGapMagnitude(beatData.expectedGapMagnitude),
        isMidpoint,
        midpointType,
        uniqueScenarioHook:
          typeof beatData.uniqueScenarioHook === 'string' ? beatData.uniqueScenarioHook : null,
        approachVectors: parseApproachVectors(beatData.approachVectors),
        setpieceSourceIndex: parseSetpieceSourceIndex(beatData.setpieceSourceIndex),
      };
    });

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
    openingImage: result.openingImage,
    closingImage: result.closingImage,
    pacingBudget: result.pacingBudget,
    generatedAt: new Date(),
  };
}
