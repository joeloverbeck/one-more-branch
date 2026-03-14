import type { StructureGenerationResult } from '../models/structure-generation.js';
import { createDefaultAnchorMoments } from '../models/story-arc.js';
import { isGenreObligationTag } from '../models/genre-obligations.js';
import { LLMError } from './llm-client-types.js';

function parseMidpointType(value: unknown): 'FALSE_VICTORY' | 'FALSE_DEFEAT' | null {
  if (value === 'FALSE_VICTORY' || value === 'FALSE_DEFEAT') {
    return value;
  }
  return null;
}

function parseSetpieceSourceIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5) {
    return value;
  }
  return null;
}

function parseExpectedGapMagnitude(
  value: unknown
): 'NARROW' | 'MODERATE' | 'WIDE' | 'CHASM' | null {
  if (value === 'NARROW' || value === 'MODERATE' || value === 'WIDE' || value === 'CHASM') {
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

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function parseAnchorMoments(value: unknown, actCount: number): StructureGenerationResult['anchorMoments'] {
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
      description:
        typeof incitingIncident?.['description'] === 'string'
          ? incitingIncident['description']
          : defaults.incitingIncident.description,
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
      description:
        typeof climax?.['description'] === 'string'
          ? climax['description']
          : defaults.climax.description,
    },
    signatureScenarioPlacement: signatureScenarioPlacement
      ? {
          actIndex:
            typeof signatureScenarioPlacement['actIndex'] === 'number'
              ? signatureScenarioPlacement['actIndex']
              : defaults.incitingIncident.actIndex,
          description:
            typeof signatureScenarioPlacement['description'] === 'string'
              ? signatureScenarioPlacement['description']
              : '',
        }
      : null,
  };
}

export function parseStructureResponseObject(
  parsed: unknown
): Omit<StructureGenerationResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Structure response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const data = parsed as Record<string, unknown>;
  if (typeof data['overallTheme'] !== 'string') {
    throw new LLMError('Structure response missing overallTheme', 'STRUCTURE_PARSE_ERROR', true);
  }
  if (typeof data['openingImage'] !== 'string' || data['openingImage'].trim().length === 0) {
    throw new LLMError('Structure response missing openingImage', 'STRUCTURE_PARSE_ERROR', true);
  }
  if (typeof data['closingImage'] !== 'string' || data['closingImage'].trim().length === 0) {
    throw new LLMError('Structure response missing closingImage', 'STRUCTURE_PARSE_ERROR', true);
  }

  if (!Array.isArray(data['acts']) || data['acts'].length < 3 || data['acts'].length > 5) {
    const received = Array.isArray(data['acts']) ? data['acts'].length : typeof data['acts'];
    throw new LLMError(
      `Structure response must include 3-5 acts (received: ${received})`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  let midpointCount = 0;

  const acts = data['acts'].map((act, actIndex) => {
    if (typeof act !== 'object' || act === null || Array.isArray(act)) {
      throw new LLMError(
        `Structure act ${actIndex + 1} must be an object`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const actData = act as Record<string, unknown>;
    if (
      typeof actData['name'] !== 'string' ||
      typeof actData['objective'] !== 'string' ||
      typeof actData['stakes'] !== 'string' ||
      typeof actData['entryCondition'] !== 'string'
    ) {
      throw new LLMError(
        `Structure act ${actIndex + 1} is missing required fields`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    if (
      !Array.isArray(actData['milestones']) ||
      actData['milestones'].length < 2 ||
      actData['milestones'].length > 4
    ) {
      const received = Array.isArray(actData['milestones'])
        ? actData['milestones'].length
        : typeof actData['milestones'];
      throw new LLMError(
        `Structure act ${actIndex + 1} must have 2-4 milestones (received: ${received})`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const milestones = actData['milestones'].map((milestone, milestoneIndex) => {
      if (typeof milestone !== 'object' || milestone === null || Array.isArray(milestone)) {
        throw new LLMError(
          `Structure milestone ${actIndex + 1}.${milestoneIndex + 1} must be an object`,
          'STRUCTURE_PARSE_ERROR',
          true
        );
      }

      const milestoneData = milestone as Record<string, unknown>;
      if (
        typeof milestoneData['name'] !== 'string' ||
        typeof milestoneData['description'] !== 'string' ||
        typeof milestoneData['objective'] !== 'string' ||
        typeof milestoneData['causalLink'] !== 'string'
      ) {
        throw new LLMError(
          `Structure milestone ${actIndex + 1}.${milestoneIndex + 1} is missing required fields`,
          'STRUCTURE_PARSE_ERROR',
          true
        );
      }

      const role = typeof milestoneData['role'] === 'string' ? milestoneData['role'] : 'escalation';
      const escalationType =
        typeof milestoneData['escalationType'] === 'string' ? milestoneData['escalationType'] : null;
      const secondaryEscalationType =
        typeof milestoneData['secondaryEscalationType'] === 'string'
          ? milestoneData['secondaryEscalationType']
          : null;
      const crisisType = typeof milestoneData['crisisType'] === 'string' ? milestoneData['crisisType'] : null;
      const expectedGapMagnitude = parseExpectedGapMagnitude(milestoneData['expectedGapMagnitude']);
      const isMidpoint = milestoneData['isMidpoint'] === true;
      const midpointType = parseMidpointType(milestoneData['midpointType']);
      const uniqueScenarioHook =
        typeof milestoneData['uniqueScenarioHook'] === 'string' ? milestoneData['uniqueScenarioHook'] : null;
      const approachVectors = Array.isArray(milestoneData['approachVectors'])
        ? (milestoneData['approachVectors'] as unknown[]).filter(
            (v): v is string => typeof v === 'string'
          )
        : null;
      const setpieceSourceIndex = parseSetpieceSourceIndex(milestoneData['setpieceSourceIndex']);
      const obligatorySceneTag = parseObligatorySceneTag(milestoneData['obligatorySceneTag']);

      if (isMidpoint) {
        midpointCount += 1;
        if (midpointType === null) {
          throw new LLMError(
            `Structure milestone ${actIndex + 1}.${milestoneIndex + 1} is midpoint-tagged but missing midpointType`,
            'STRUCTURE_PARSE_ERROR',
            true
          );
        }
      } else if (midpointType !== null) {
        throw new LLMError(
          `Structure milestone ${actIndex + 1}.${milestoneIndex + 1} has midpointType but isMidpoint is false`,
          'STRUCTURE_PARSE_ERROR',
          true
        );
      }

      return {
        name: milestoneData['name'],
        description: milestoneData['description'],
        objective: milestoneData['objective'],
        causalLink: milestoneData['causalLink'],
        exitCondition:
          typeof milestoneData['exitCondition'] === 'string' ? milestoneData['exitCondition'] : '',
        role,
        escalationType,
        secondaryEscalationType,
        crisisType,
        expectedGapMagnitude,
        isMidpoint,
        midpointType,
        uniqueScenarioHook,
        approachVectors: approachVectors && approachVectors.length > 0 ? approachVectors : null,
        setpieceSourceIndex,
        obligatorySceneTag,
      };
    });

    return {
      name: actData['name'],
      objective: actData['objective'],
      stakes: actData['stakes'],
      entryCondition: actData['entryCondition'],
      actQuestion: typeof actData['actQuestion'] === 'string' ? actData['actQuestion'] : '',
      exitReversal: typeof actData['exitReversal'] === 'string' ? actData['exitReversal'] : '',
      promiseTargets: parseStringArray(actData['promiseTargets']),
      obligationTargets: parseStringArray(actData['obligationTargets']),
      milestones,
    };
  });

  if (midpointCount !== 1) {
    throw new LLMError(
      `Structure response must flag exactly one midpoint milestone (received: ${midpointCount})`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const premise = typeof data['premise'] === 'string' ? data['premise'] : data['overallTheme'];
  const rawBudget = data['pacingBudget'];
  const pacingBudget =
    typeof rawBudget === 'object' && rawBudget !== null
      ? {
          targetPagesMin:
            typeof (rawBudget as Record<string, unknown>)['targetPagesMin'] === 'number'
              ? ((rawBudget as Record<string, unknown>)['targetPagesMin'] as number)
              : 15,
          targetPagesMax:
            typeof (rawBudget as Record<string, unknown>)['targetPagesMax'] === 'number'
              ? ((rawBudget as Record<string, unknown>)['targetPagesMax'] as number)
              : 50,
        }
      : { targetPagesMin: 15, targetPagesMax: 50 };

  const rawAgendas = data['initialNpcAgendas'];
  const initialNpcAgendas: Array<{
    npcName: string;
    currentGoal: string;
    leverage: string;
    fear: string;
    offScreenBehavior: string;
  }> = [];

  if (Array.isArray(rawAgendas)) {
    for (const agenda of rawAgendas) {
      if (typeof agenda === 'object' && agenda !== null && !Array.isArray(agenda)) {
        const a = agenda as Record<string, unknown>;
        if (
          typeof a['npcName'] === 'string' &&
          typeof a['currentGoal'] === 'string' &&
          typeof a['leverage'] === 'string' &&
          typeof a['fear'] === 'string' &&
          typeof a['offScreenBehavior'] === 'string'
        ) {
          initialNpcAgendas.push({
            npcName: a['npcName'],
            currentGoal: a['currentGoal'],
            leverage: a['leverage'],
            fear: a['fear'],
            offScreenBehavior: a['offScreenBehavior'],
          });
        }
      }
    }
  }

  return {
    overallTheme: data['overallTheme'],
    premise,
    openingImage: data['openingImage'],
    closingImage: data['closingImage'],
    pacingBudget,
    anchorMoments: parseAnchorMoments(data['anchorMoments'], acts.length),
    acts,
    ...(initialNpcAgendas.length > 0 ? { initialNpcAgendas } : {}),
  };
}
