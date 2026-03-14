import type { MacroArchitectureResult } from '../models/structure-generation.js';
import { LLMError } from './llm-client-types.js';

const MAX_MACRO_ACTS = 5;
const MIN_MACRO_ACTS = 3;
const MAX_MILESTONE_SLOT = 3;

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

  return value;
}

function parseStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new LLMError(`${label} must be an array of strings`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value as string[];
}

function parseActIndex(value: unknown, label: string, actCount: number): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) >= actCount) {
    throw new LLMError(
      `${label} must reference a valid act index between 0 and ${actCount - 1}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return value as number;
}

function parseNpcAgendas(value: unknown): NonNullable<MacroArchitectureResult['initialNpcAgendas']> {
  if (!Array.isArray(value)) {
    throw new LLMError('initialNpcAgendas must be an array', 'STRUCTURE_PARSE_ERROR', true);
  }

  return value.map((agenda, index) => {
    const record = asRecord(agenda, `initialNpcAgendas[${index}]`);
    return {
      npcName: parseRequiredString(record['npcName'], `initialNpcAgendas[${index}].npcName`),
      currentGoal: parseRequiredString(record['currentGoal'], `initialNpcAgendas[${index}].currentGoal`),
      leverage: parseRequiredString(record['leverage'], `initialNpcAgendas[${index}].leverage`),
      fear: parseRequiredString(record['fear'], `initialNpcAgendas[${index}].fear`),
      offScreenBehavior: parseRequiredString(
        record['offScreenBehavior'],
        `initialNpcAgendas[${index}].offScreenBehavior`
      ),
    };
  });
}

function parseAnchorMoments(value: unknown, actCount: number): MacroArchitectureResult['anchorMoments'] {
  const record = asRecord(value, 'anchorMoments');
  const incitingIncident = asRecord(record['incitingIncident'], 'anchorMoments.incitingIncident');
  const midpoint = asRecord(record['midpoint'], 'anchorMoments.midpoint');
  const climax = asRecord(record['climax'], 'anchorMoments.climax');

  const signatureScenarioPlacement =
    record['signatureScenarioPlacement'] === null
      ? null
      : asRecord(record['signatureScenarioPlacement'], 'anchorMoments.signatureScenarioPlacement');

  const midpointType = midpoint['midpointType'];
  if (midpointType !== 'FALSE_VICTORY' && midpointType !== 'FALSE_DEFEAT') {
    throw new LLMError(
      'anchorMoments.midpoint.midpointType must be FALSE_VICTORY or FALSE_DEFEAT',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const milestoneSlot = midpoint['milestoneSlot'];
  if (!Number.isInteger(milestoneSlot) || (milestoneSlot as number) < 0 || (milestoneSlot as number) > MAX_MILESTONE_SLOT) {
    throw new LLMError(
      `anchorMoments.midpoint.milestoneSlot must be an integer between 0 and ${MAX_MILESTONE_SLOT}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const parsedMilestoneSlot = milestoneSlot as number;

  return {
    incitingIncident: {
      actIndex: parseActIndex(
        incitingIncident['actIndex'],
        'anchorMoments.incitingIncident.actIndex',
        actCount
      ),
      description: parseRequiredString(
        incitingIncident['description'],
        'anchorMoments.incitingIncident.description'
      ),
    },
    midpoint: {
      actIndex: parseActIndex(midpoint['actIndex'], 'anchorMoments.midpoint.actIndex', actCount),
      milestoneSlot: parsedMilestoneSlot,
      midpointType,
    },
    climax: {
      actIndex: parseActIndex(climax['actIndex'], 'anchorMoments.climax.actIndex', actCount),
      description: parseRequiredString(climax['description'], 'anchorMoments.climax.description'),
    },
    signatureScenarioPlacement: signatureScenarioPlacement
      ? {
          actIndex: parseActIndex(
            signatureScenarioPlacement['actIndex'],
            'anchorMoments.signatureScenarioPlacement.actIndex',
            actCount
          ),
          description: parseRequiredString(
            signatureScenarioPlacement['description'],
            'anchorMoments.signatureScenarioPlacement.description'
          ),
        }
      : null,
  };
}

export function parseMacroArchitectureResponseObject(
  parsed: unknown
): Omit<MacroArchitectureResult, 'rawResponse'> {
  const data = asRecord(parsed, 'Macro architecture response');

  const actsValue = data['acts'];
  if (!Array.isArray(actsValue) || actsValue.length < MIN_MACRO_ACTS || actsValue.length > MAX_MACRO_ACTS) {
    const received = Array.isArray(actsValue) ? actsValue.length : typeof actsValue;
    throw new LLMError(
      `Macro architecture response must include ${MIN_MACRO_ACTS}-${MAX_MACRO_ACTS} acts (received: ${received})`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const acts = actsValue.map((act, actIndex) => {
    const record = asRecord(act, `acts[${actIndex}]`);
    let exitReversal: string;

    if (actIndex < actsValue.length - 1) {
      exitReversal = parseRequiredString(record['exitReversal'], `acts[${actIndex}].exitReversal`);
    } else if (typeof record['exitReversal'] !== 'string') {
      throw new LLMError('acts[last].exitReversal must be a string', 'STRUCTURE_PARSE_ERROR', true);
    } else if (record['exitReversal'].trim().length > 0) {
      throw new LLMError(
        'Final macro act must use an empty exitReversal',
        'STRUCTURE_PARSE_ERROR',
        true
      );
    } else {
      exitReversal = record['exitReversal'];
    }

    return {
      name: parseRequiredString(record['name'], `acts[${actIndex}].name`),
      objective: parseRequiredString(record['objective'], `acts[${actIndex}].objective`),
      stakes: parseRequiredString(record['stakes'], `acts[${actIndex}].stakes`),
      entryCondition: parseRequiredString(record['entryCondition'], `acts[${actIndex}].entryCondition`),
      actQuestion: parseRequiredString(record['actQuestion'], `acts[${actIndex}].actQuestion`),
      exitReversal,
      promiseTargets: parseStringArray(record['promiseTargets'], `acts[${actIndex}].promiseTargets`),
      obligationTargets: parseStringArray(
        record['obligationTargets'],
        `acts[${actIndex}].obligationTargets`
      ),
    };
  });

  return {
    overallTheme: parseRequiredString(data['overallTheme'], 'overallTheme'),
    premise: parseRequiredString(data['premise'], 'premise'),
    openingImage: parseRequiredString(data['openingImage'], 'openingImage'),
    closingImage: parseRequiredString(data['closingImage'], 'closingImage'),
    pacingBudget: parsePacingBudget(data['pacingBudget']),
    anchorMoments: parseAnchorMoments(data['anchorMoments'], acts.length),
    initialNpcAgendas: parseNpcAgendas(data['initialNpcAgendas']),
    acts,
  };
}

function parsePacingBudget(value: unknown): MacroArchitectureResult['pacingBudget'] {
  const record = asRecord(value, 'pacingBudget');
  if (typeof record['targetPagesMin'] !== 'number' || typeof record['targetPagesMax'] !== 'number') {
    throw new LLMError(
      'pacingBudget.targetPagesMin and pacingBudget.targetPagesMax must be numbers',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return {
    targetPagesMin: record['targetPagesMin'],
    targetPagesMax: record['targetPagesMax'],
  };
}
