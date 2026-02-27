import type { StructureGenerationResult } from '../models/structure-generation.js';
import { LLMError } from './llm-client-types.js';

function parseMidpointType(value: unknown): 'FALSE_VICTORY' | 'FALSE_DEFEAT' | null {
  if (value === 'FALSE_VICTORY' || value === 'FALSE_DEFEAT') {
    return value;
  }
  return null;
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

function parseExpectedGapMagnitude(value: unknown): 'NARROW' | 'MODERATE' | 'WIDE' | 'CHASM' | null {
  if (value === 'NARROW' || value === 'MODERATE' || value === 'WIDE' || value === 'CHASM') {
    return value;
  }
  return null;
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
      !Array.isArray(actData['beats']) ||
      actData['beats'].length < 2 ||
      actData['beats'].length > 4
    ) {
      const received = Array.isArray(actData['beats'])
        ? actData['beats'].length
        : typeof actData['beats'];
      throw new LLMError(
        `Structure act ${actIndex + 1} must have 2-4 beats (received: ${received})`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }

    const beats = actData['beats'].map((beat, beatIndex) => {
      if (typeof beat !== 'object' || beat === null || Array.isArray(beat)) {
        throw new LLMError(
          `Structure beat ${actIndex + 1}.${beatIndex + 1} must be an object`,
          'STRUCTURE_PARSE_ERROR',
          true
        );
      }

      const beatData = beat as Record<string, unknown>;
      if (
        typeof beatData['name'] !== 'string' ||
        typeof beatData['description'] !== 'string' ||
        typeof beatData['objective'] !== 'string' ||
        typeof beatData['causalLink'] !== 'string'
      ) {
        throw new LLMError(
          `Structure beat ${actIndex + 1}.${beatIndex + 1} is missing required fields`,
          'STRUCTURE_PARSE_ERROR',
          true
        );
      }

      const role = typeof beatData['role'] === 'string' ? beatData['role'] : 'escalation';
      const escalationType =
        typeof beatData['escalationType'] === 'string' ? beatData['escalationType'] : null;
      const secondaryEscalationType =
        typeof beatData['secondaryEscalationType'] === 'string'
          ? beatData['secondaryEscalationType']
          : null;
      const crisisType = typeof beatData['crisisType'] === 'string' ? beatData['crisisType'] : null;
      const expectedGapMagnitude = parseExpectedGapMagnitude(beatData['expectedGapMagnitude']);
      const isMidpoint = beatData['isMidpoint'] === true;
      const midpointType = parseMidpointType(beatData['midpointType']);
      const uniqueScenarioHook =
        typeof beatData['uniqueScenarioHook'] === 'string' ? beatData['uniqueScenarioHook'] : null;
      const approachVectors = Array.isArray(beatData['approachVectors'])
        ? (beatData['approachVectors'] as unknown[]).filter(
            (v): v is string => typeof v === 'string'
          )
        : null;
      const setpieceSourceIndex = parseSetpieceSourceIndex(beatData['setpieceSourceIndex']);

      if (isMidpoint) {
        midpointCount += 1;
        if (midpointType === null) {
          throw new LLMError(
            `Structure beat ${actIndex + 1}.${beatIndex + 1} is midpoint-tagged but missing midpointType`,
            'STRUCTURE_PARSE_ERROR',
            true
          );
        }
      } else if (midpointType !== null) {
        throw new LLMError(
          `Structure beat ${actIndex + 1}.${beatIndex + 1} has midpointType but isMidpoint is false`,
          'STRUCTURE_PARSE_ERROR',
          true
        );
      }

      return {
        name: beatData['name'],
        description: beatData['description'],
        objective: beatData['objective'],
        causalLink: beatData['causalLink'],
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
      };
    });

    return {
      name: actData['name'],
      objective: actData['objective'],
      stakes: actData['stakes'],
      entryCondition: actData['entryCondition'],
      beats,
    };
  });

  if (midpointCount !== 1) {
    throw new LLMError(
      `Structure response must flag exactly one midpoint beat (received: ${midpointCount})`,
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
    acts,
    ...(initialNpcAgendas.length > 0 ? { initialNpcAgendas } : {}),
  };
}
