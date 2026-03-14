import type {
  GeneratedMilestone,
  MacroArchitectureResult,
} from '../models/structure-generation.js';
import { isGenreObligationTag } from '../models/genre-obligations.js';
import {
  APPROACH_VECTORS,
  CRISIS_TYPES,
  ESCALATION_TYPES,
  GAP_MAGNITUDES,
  MIDPOINT_TYPES,
  MILESTONE_ROLES,
} from '../models/story-arc.js';
import { LLMError } from './llm-client-types.js';

export interface MilestoneGenerationAct {
  actIndex: number;
  milestones: GeneratedMilestone[];
}

export interface MilestoneGenerationResult {
  acts: MilestoneGenerationAct[];
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value as Record<string, unknown>;
}

function parseRequiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(`${label} must be a non-empty string`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value.trim();
}

function parseNullableString(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new LLMError(`${label} must be a string or null`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRole(value: unknown, label: string): GeneratedMilestone['role'] {
  if (typeof value !== 'string' || !(MILESTONE_ROLES as readonly string[]).includes(value)) {
    throw new LLMError(`${label} must be a valid milestone role`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value;
}

function parseNullableEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
): T | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new LLMError(`${label} must be one of ${allowed.join(', ')} or null`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value as T;
}

function parseApproachVectorList(
  value: unknown,
  label: string
): NonNullable<GeneratedMilestone['approachVectors']> | null {
  if (value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    throw new LLMError(`${label} must be an array or null`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const parsed = value.map((entry, index) => {
    if (typeof entry !== 'string' || !APPROACH_VECTORS.includes(entry as (typeof APPROACH_VECTORS)[number])) {
      throw new LLMError(
        `${label}[${index}] must be a valid approach vector`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    return entry as (typeof APPROACH_VECTORS)[number];
  });

  if (new Set(parsed).size !== parsed.length) {
    throw new LLMError(`${label} must not repeat approach vectors`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return parsed;
}

function parseSetpieceIndex(value: unknown, label: string): number | null {
  if (value === null) {
    return null;
  }

  if (!Number.isInteger(value)) {
    throw new LLMError(`${label} must be an integer or null`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value as number;
}

function parseObligatorySceneTag(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string' || !isGenreObligationTag(value)) {
    throw new LLMError(`${label} must be a valid genre obligation tag or null`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value;
}

function validateSetpieceIndex(
  setpieceSourceIndex: number | null,
  verifiedSetpieceCount: number,
  label: string
): void {
  if (setpieceSourceIndex === null) {
    return;
  }

  if (verifiedSetpieceCount === 0) {
    throw new LLMError(
      `${label} cannot be set when no verified setpiece bank exists`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (setpieceSourceIndex < 0 || setpieceSourceIndex >= verifiedSetpieceCount) {
    throw new LLMError(
      `${label} must reference a valid verified setpiece index`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }
}

function parseMilestone(
  value: unknown,
  actIndex: number,
  milestoneIndex: number,
  verifiedSetpieceCount: number
): GeneratedMilestone {
  const label = `acts[${actIndex}].milestones[${milestoneIndex}]`;
  const record = asRecord(value, label);

  const role = parseRole(record['role'], `${label}.role`);
  const escalationType = parseNullableEnum(
    record['escalationType'],
    ESCALATION_TYPES,
    `${label}.escalationType`
  );
  const secondaryEscalationType = parseNullableEnum(
    record['secondaryEscalationType'],
    ESCALATION_TYPES,
    `${label}.secondaryEscalationType`
  );
  const crisisType = parseNullableEnum(record['crisisType'], CRISIS_TYPES, `${label}.crisisType`);
  const expectedGapMagnitude = parseNullableEnum(
    record['expectedGapMagnitude'],
    GAP_MAGNITUDES,
    `${label}.expectedGapMagnitude`
  );
  const isMidpoint = record['isMidpoint'] === true;
  const midpointType = parseNullableEnum(record['midpointType'], MIDPOINT_TYPES, `${label}.midpointType`);
  const uniqueScenarioHook = parseNullableString(record['uniqueScenarioHook'], `${label}.uniqueScenarioHook`);
  const approachVectors = parseApproachVectorList(
    record['approachVectors'],
    `${label}.approachVectors`
  );
  const setpieceSourceIndex = parseSetpieceIndex(record['setpieceSourceIndex'], `${label}.setpieceSourceIndex`);
  const obligatorySceneTag = parseObligatorySceneTag(
    record['obligatorySceneTag'],
    `${label}.obligatorySceneTag`
  );

  if (!isMidpoint && midpointType !== null) {
    throw new LLMError(`${label} has midpointType but isMidpoint is false`, 'STRUCTURE_PARSE_ERROR', true);
  }

  if (isMidpoint && midpointType === null) {
    throw new LLMError(`${label} is midpoint-tagged but missing midpointType`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const requiresEscalationFields = role === 'escalation' || role === 'turning_point';
  if (requiresEscalationFields) {
    if (escalationType === null) {
      throw new LLMError(`${label} must include escalationType`, 'STRUCTURE_PARSE_ERROR', true);
    }
    if (crisisType === null) {
      throw new LLMError(`${label} must include crisisType`, 'STRUCTURE_PARSE_ERROR', true);
    }
    if (expectedGapMagnitude === null) {
      throw new LLMError(`${label} must include expectedGapMagnitude`, 'STRUCTURE_PARSE_ERROR', true);
    }
    if (uniqueScenarioHook === null) {
      throw new LLMError(`${label} must include uniqueScenarioHook`, 'STRUCTURE_PARSE_ERROR', true);
    }
    if (approachVectors === null || approachVectors.length < 2 || approachVectors.length > 3) {
      throw new LLMError(
        `${label} must include 2-3 approachVectors`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }
  } else {
    if (escalationType !== null) {
      throw new LLMError(`${label} must set escalationType to null`, 'STRUCTURE_PARSE_ERROR', true);
    }
    if (secondaryEscalationType !== null) {
      throw new LLMError(
        `${label} must set secondaryEscalationType to null`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }
    if (crisisType !== null) {
      throw new LLMError(`${label} must set crisisType to null`, 'STRUCTURE_PARSE_ERROR', true);
    }
    if (expectedGapMagnitude !== null) {
      throw new LLMError(
        `${label} must set expectedGapMagnitude to null`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }
    if (uniqueScenarioHook !== null) {
      throw new LLMError(
        `${label} must set uniqueScenarioHook to null`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }
    if (approachVectors !== null) {
      throw new LLMError(`${label} must set approachVectors to null`, 'STRUCTURE_PARSE_ERROR', true);
    }
  }

  validateSetpieceIndex(setpieceSourceIndex, verifiedSetpieceCount, `${label}.setpieceSourceIndex`);

  return {
    name: parseRequiredString(record['name'], `${label}.name`),
    description: parseRequiredString(record['description'], `${label}.description`),
    objective: parseRequiredString(record['objective'], `${label}.objective`),
    causalLink: parseRequiredString(record['causalLink'], `${label}.causalLink`),
    exitCondition: parseRequiredString(record['exitCondition'], `${label}.exitCondition`),
    role,
    escalationType,
    secondaryEscalationType,
    crisisType,
    expectedGapMagnitude,
    isMidpoint,
    midpointType,
    uniqueScenarioHook,
    approachVectors,
    setpieceSourceIndex,
    obligatorySceneTag,
  };
}

export function parseMilestoneGenerationResponseObject(
  parsed: unknown,
  macroArchitecture: MacroArchitectureResult,
  options?: { verifiedSetpieceCount?: number }
): MilestoneGenerationResult {
  const data = asRecord(parsed, 'Milestone generation response');
  const actsValue = data['acts'];
  if (!Array.isArray(actsValue)) {
    throw new LLMError('acts must be an array', 'STRUCTURE_PARSE_ERROR', true);
  }

  if (actsValue.length !== macroArchitecture.acts.length) {
    throw new LLMError(
      `Milestone generation must return exactly ${macroArchitecture.acts.length} acts`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  let midpointCount = 0;
  const verifiedSetpieceCount = options?.verifiedSetpieceCount ?? 0;
  const acts = actsValue.map((actValue, actPosition) => {
    const record = asRecord(actValue, `acts[${actPosition}]`);
    const actIndex = record['actIndex'];
    if (!Number.isInteger(actIndex) || actIndex !== actPosition) {
      throw new LLMError(
        `acts[${actPosition}].actIndex must equal ${actPosition}`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const milestonesValue = record['milestones'];
    if (!Array.isArray(milestonesValue) || milestonesValue.length < 2 || milestonesValue.length > 4) {
      throw new LLMError(
        `acts[${actPosition}].milestones must contain 2-4 items`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const milestones = milestonesValue.map((milestoneValue, milestoneIndex) => {
      const milestone = parseMilestone(
        milestoneValue,
        actPosition,
        milestoneIndex,
        verifiedSetpieceCount
      );
      if (milestone.isMidpoint) {
        midpointCount += 1;
        const expectedMidpoint = macroArchitecture.anchorMoments.midpoint;
        if (expectedMidpoint.actIndex !== actPosition || expectedMidpoint.milestoneSlot !== milestoneIndex) {
          throw new LLMError(
            `Midpoint must appear at acts[${expectedMidpoint.actIndex}].milestones[${expectedMidpoint.milestoneSlot}]`,
            'STRUCTURE_PARSE_ERROR',
            true
          );
        }
        if (milestone.midpointType !== expectedMidpoint.midpointType) {
          throw new LLMError(
            `Midpoint type must match ${expectedMidpoint.midpointType}`,
            'STRUCTURE_PARSE_ERROR',
            true
          );
        }
      }

      return milestone;
    });

    return {
      actIndex: actPosition,
      milestones,
    };
  });

  if (midpointCount !== 1) {
    throw new LLMError(
      `Milestone generation must flag exactly one midpoint milestone (received: ${midpointCount})`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return { acts };
}
