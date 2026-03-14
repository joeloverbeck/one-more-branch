import { isGenreObligationTag } from './genre-obligations.js';
import type {
  AnchorMoments,
  ApproachVector,
  CrisisType,
  EscalationType,
  GapMagnitude,
  MidpointType,
  MilestoneRole,
  StoryMilestone,
} from './story-arc.js';
import {
  APPROACH_VECTORS,
  CRISIS_TYPES,
  createDefaultAnchorMoments,
  ESCALATION_TYPES,
  GAP_MAGNITUDES,
  MIDPOINT_TYPES,
  MILESTONE_ROLES,
} from './story-arc.js';

export function parseMilestoneRole(role: unknown): MilestoneRole {
  if (typeof role === 'string' && MILESTONE_ROLES.includes(role as MilestoneRole)) {
    return role as MilestoneRole;
  }
  return 'escalation';
}

export function parseEscalationType(value: unknown): EscalationType | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string' && ESCALATION_TYPES.includes(value as EscalationType)) {
    return value as EscalationType;
  }
  return null;
}

export function parseCrisisType(value: unknown): CrisisType | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string' && CRISIS_TYPES.includes(value as CrisisType)) {
    return value as CrisisType;
  }
  return null;
}

export function parseMidpointType(value: unknown): MidpointType | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string' && MIDPOINT_TYPES.includes(value as MidpointType)) {
    return value as MidpointType;
  }
  return null;
}

export function parseGapMagnitude(value: unknown): GapMagnitude | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'string' && GAP_MAGNITUDES.includes(value as GapMagnitude)) {
    return value as GapMagnitude;
  }
  return null;
}

export function parseApproachVectors(value: unknown): ApproachVector[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const valid = value.filter(
    (entry): entry is string =>
      typeof entry === 'string' && APPROACH_VECTORS.includes(entry as ApproachVector)
  ) as ApproachVector[];
  return valid.length > 0 ? valid : null;
}

export function parseSetpieceSourceIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5) {
    return value;
  }
  return null;
}

export function parseObligatorySceneTag(value: unknown): string | null {
  if (!isGenreObligationTag(value)) {
    return null;
  }

  return value;
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function parseString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseRequiredCausalLink(value: unknown, milestoneId: string, errorPrefix: string): string {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  throw new Error(`${errorPrefix} ${milestoneId} must include a non-empty causalLink`);
}

export function normalizeAnchorMoments(value: unknown, actCount: number): AnchorMoments {
  const defaults = createDefaultAnchorMoments(actCount);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return defaults;
  }

  const data = value as Record<string, unknown>;
  const incitingIncident =
    typeof data['incitingIncident'] === 'object' &&
    data['incitingIncident'] !== null &&
    !Array.isArray(data['incitingIncident'])
      ? (data['incitingIncident'] as Record<string, unknown>)
      : null;
  const midpoint =
    typeof data['midpoint'] === 'object' && data['midpoint'] !== null && !Array.isArray(data['midpoint'])
      ? (data['midpoint'] as Record<string, unknown>)
      : null;
  const climax =
    typeof data['climax'] === 'object' && data['climax'] !== null && !Array.isArray(data['climax'])
      ? (data['climax'] as Record<string, unknown>)
      : null;
  const signatureScenarioPlacement =
    typeof data['signatureScenarioPlacement'] === 'object' &&
    data['signatureScenarioPlacement'] !== null &&
    !Array.isArray(data['signatureScenarioPlacement'])
      ? (data['signatureScenarioPlacement'] as Record<string, unknown>)
      : null;

  return {
    incitingIncident: {
      actIndex:
        typeof incitingIncident?.['actIndex'] === 'number'
          ? incitingIncident['actIndex']
          : defaults.incitingIncident.actIndex,
      description: parseString(
        incitingIncident?.['description'],
        defaults.incitingIncident.description
      ),
    },
    midpoint: {
      actIndex:
        typeof midpoint?.['actIndex'] === 'number'
          ? midpoint['actIndex']
          : defaults.midpoint.actIndex,
      milestoneSlot:
        typeof midpoint?.['milestoneSlot'] === 'number'
          ? midpoint['milestoneSlot']
          : defaults.midpoint.milestoneSlot,
      midpointType: parseMidpointType(midpoint?.['midpointType']) ?? defaults.midpoint.midpointType,
    },
    climax: {
      actIndex:
        typeof climax?.['actIndex'] === 'number' ? climax['actIndex'] : defaults.climax.actIndex,
      description: parseString(climax?.['description'], defaults.climax.description),
    },
    signatureScenarioPlacement: signatureScenarioPlacement
      ? {
          actIndex:
            typeof signatureScenarioPlacement['actIndex'] === 'number'
              ? signatureScenarioPlacement['actIndex']
              : defaults.incitingIncident.actIndex,
          description: parseString(signatureScenarioPlacement['description']),
        }
      : null,
  };
}

export function normalizeStructureActFields(value: {
  actQuestion?: unknown;
  exitReversal?: unknown;
  promiseTargets?: unknown;
  obligationTargets?: unknown;
}): {
  actQuestion: string;
  exitReversal: string;
  promiseTargets: string[];
  obligationTargets: string[];
} {
  return {
    actQuestion: parseString(value.actQuestion),
    exitReversal: parseString(value.exitReversal),
    promiseTargets: parseStringArray(value.promiseTargets),
    obligationTargets: parseStringArray(value.obligationTargets),
  };
}

type NormalizedMilestoneFields = {
  exitCondition: string;
  role: MilestoneRole;
  escalationType: EscalationType | null;
  secondaryEscalationType: EscalationType | null;
  crisisType: CrisisType | null;
  expectedGapMagnitude: GapMagnitude | null;
  isMidpoint: boolean;
  midpointType: MidpointType | null;
  uniqueScenarioHook: string | null;
  approachVectors: ApproachVector[] | null;
  setpieceSourceIndex: number | null;
  obligatorySceneTag: string | null;
};

function normalizeMilestoneFields(
  value: {
    exitCondition?: unknown;
    role?: unknown;
    escalationType?: unknown;
    secondaryEscalationType?: unknown;
    crisisType?: unknown;
    expectedGapMagnitude?: unknown;
    isMidpoint?: unknown;
    midpointType?: unknown;
    uniqueScenarioHook?: unknown;
    approachVectors?: unknown;
    setpieceSourceIndex?: unknown;
    obligatorySceneTag?: unknown;
  },
  milestoneId: string,
  errorPrefix: string
): NormalizedMilestoneFields {
  const midpointType = parseMidpointType(value.midpointType);
  const isMidpoint = value.isMidpoint === true;

  if (isMidpoint && midpointType === null) {
    throw new Error(`${errorPrefix} ${milestoneId} is midpoint-tagged but missing midpointType`);
  }
  if (!isMidpoint && midpointType !== null) {
    throw new Error(`${errorPrefix} ${milestoneId} has midpointType but isMidpoint is false`);
  }

  return {
    exitCondition: parseString(value.exitCondition),
    role: parseMilestoneRole(value.role),
    escalationType: parseEscalationType(value.escalationType),
    secondaryEscalationType: parseEscalationType(value.secondaryEscalationType),
    crisisType: parseCrisisType(value.crisisType),
    expectedGapMagnitude: parseGapMagnitude(value.expectedGapMagnitude),
    isMidpoint,
    midpointType,
    uniqueScenarioHook: typeof value.uniqueScenarioHook === 'string' ? value.uniqueScenarioHook : null,
    approachVectors: parseApproachVectors(value.approachVectors),
    setpieceSourceIndex: parseSetpieceSourceIndex(value.setpieceSourceIndex),
    obligatorySceneTag: parseObligatorySceneTag(value.obligatorySceneTag),
  };
}

export function normalizeGeneratedMilestoneFields(
  value: {
    exitCondition?: unknown;
    role?: unknown;
    escalationType?: unknown;
    secondaryEscalationType?: unknown;
    crisisType?: unknown;
    expectedGapMagnitude?: unknown;
    isMidpoint?: unknown;
    midpointType?: unknown;
    uniqueScenarioHook?: unknown;
    approachVectors?: unknown;
    setpieceSourceIndex?: unknown;
    obligatorySceneTag?: unknown;
  },
  milestoneId: string
): NormalizedMilestoneFields {
  return normalizeMilestoneFields(value, milestoneId, 'Structure milestone');
}

export function materializeStoryMilestone(
  value: {
    id: string;
    name: string;
    description: string;
    objective: string;
    causalLink: unknown;
    exitCondition?: unknown;
    role?: unknown;
    escalationType?: unknown;
    secondaryEscalationType?: unknown;
    crisisType?: unknown;
    expectedGapMagnitude?: unknown;
    isMidpoint?: unknown;
    midpointType?: unknown;
    uniqueScenarioHook?: unknown;
    approachVectors?: unknown;
    setpieceSourceIndex?: unknown;
    obligatorySceneTag?: unknown;
  },
  errorPrefix: string
): StoryMilestone {
  return {
    id: value.id,
    name: value.name,
    description: value.description,
    objective: value.objective,
    causalLink: parseRequiredCausalLink(value.causalLink, value.id, errorPrefix),
    ...normalizeMilestoneFields(value, value.id, errorPrefix),
  };
}
