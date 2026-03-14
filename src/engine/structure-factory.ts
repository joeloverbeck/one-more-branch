import type {
  ApproachVector,
  MilestoneRole,
  CrisisType,
  EscalationType,
  GapMagnitude,
  MidpointType,
  StoryAct,
  StoryMilestone,
  StoryStructure,
} from '../models/story-arc';
import {
  APPROACH_VECTORS,
  MILESTONE_ROLES,
  CRISIS_TYPES,
  ESCALATION_TYPES,
  GAP_MAGNITUDES,
  MIDPOINT_TYPES,
} from '../models/story-arc';
import { isGenreObligationTag } from '../models/genre-obligations';
import type { StructureGenerationResult } from './structure-types';

function parseMilestoneRole(role: string): MilestoneRole {
  if (MILESTONE_ROLES.includes(role as MilestoneRole)) {
    return role as MilestoneRole;
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

export function parseApproachVectors(value: unknown): readonly ApproachVector[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const valid = value.filter(
    (v): v is string => typeof v === 'string' && APPROACH_VECTORS.includes(v as ApproachVector)
  ) as ApproachVector[];
  return valid.length > 0 ? valid : null;
}

function parseSetpieceSourceIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5) {
    return value;
  }
  return null;
}

function parseObligatorySceneTag(value: unknown): string | null {
  if (!isGenreObligationTag(value)) {
    return null;
  }

  return value;
}

function parseCausalLink(value: unknown, milestoneId: string): string {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  throw new Error(`Structure milestone ${milestoneId} must include a non-empty causalLink`);
}

/**
 * Creates StoryStructure from raw generation result.
 * Assigns hierarchical IDs to milestones (e.g., "1.1", "1.2", "2.1").
 */
export function createStoryStructure(result: StructureGenerationResult): StoryStructure {
  const acts: StoryAct[] = result.acts.map((actData, actIndex) => {
    const actId = String(actIndex + 1);
    const milestones: StoryMilestone[] = actData.milestones.map((milestoneData, milestoneIndex) => {
      const milestoneId = `${actId}.${milestoneIndex + 1}`;
      const midpointType = parseMidpointType(milestoneData.midpointType);
      const isMidpoint = milestoneData.isMidpoint === true;

      if (isMidpoint && midpointType === null) {
        throw new Error(`Structure milestone ${milestoneId} is midpoint-tagged but missing midpointType`);
      }
      if (!isMidpoint && midpointType !== null) {
        throw new Error(`Structure milestone ${milestoneId} has midpointType but isMidpoint is false`);
      }

      return {
        id: milestoneId,
        name: milestoneData.name,
        description: milestoneData.description,
        objective: milestoneData.objective,
        causalLink: parseCausalLink(milestoneData.causalLink, milestoneId),
        role: parseMilestoneRole(milestoneData.role),
        escalationType: parseEscalationType(milestoneData.escalationType),
        secondaryEscalationType: parseEscalationType(milestoneData.secondaryEscalationType),
        crisisType: parseCrisisType(milestoneData.crisisType),
        expectedGapMagnitude: parseGapMagnitude(milestoneData.expectedGapMagnitude),
        isMidpoint,
        midpointType,
        uniqueScenarioHook:
          typeof milestoneData.uniqueScenarioHook === 'string' ? milestoneData.uniqueScenarioHook : null,
        approachVectors: parseApproachVectors(milestoneData.approachVectors),
        setpieceSourceIndex: parseSetpieceSourceIndex(milestoneData.setpieceSourceIndex),
        obligatorySceneTag: parseObligatorySceneTag(milestoneData.obligatorySceneTag),
      };
    });

    return {
      id: actId,
      name: actData.name,
      objective: actData.objective,
      stakes: actData.stakes,
      entryCondition: actData.entryCondition,
      milestones,
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
