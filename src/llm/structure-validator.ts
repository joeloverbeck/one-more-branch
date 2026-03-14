import { getStageMaxTokens, getStageModel } from '../config/stage-model.js';
import { logger, logPrompt, logResponse } from '../logging/index.js';
import { getGenreObligationTags, isGenreObligationTag } from '../models/genre-obligations.js';
import type {
  GeneratedAct,
  GeneratedMilestone,
  StructureGenerationResult,
} from '../models/structure-generation.js';
import {
  APPROACH_VECTORS,
  CRISIS_TYPES,
  ESCALATION_TYPES,
  GAP_MAGNITUDES,
  MIDPOINT_TYPES,
  MILESTONE_ROLES,
} from '../models/story-arc.js';
import { OPENROUTER_API_URL, extractResponseContent, parseMessageJsonContent, readErrorDetails, readJsonResponse } from './http-client.js';
import type { GenerationOptions, PromptOptions } from './generation-pipeline-types.js';
import type { JsonSchema } from './llm-client-types.js';
import { LLMError, type ChatMessage } from './llm-client-types.js';
import { withModelFallback } from './model-fallback.js';
import { resolvePromptOptions } from './options.js';
import { buildStructureRepairPrompt } from './prompts/structure-repair-prompt.js';
import type { StructureContext } from './prompts/milestone-generation-prompt.js';
import { STRUCTURE_REPAIR_SCHEMA } from './schemas/structure-repair-schema.js';
import { withRetry } from './retry.js';

const MIN_UNIQUE_TRACED_SETPIECES = 4;

export interface ValidationResult {
  readonly passed: boolean;
  readonly check: string;
  readonly details?: string;
  readonly affectedActIndices?: number[];
  readonly affectedMilestoneIndices?: Array<{ actIndex: number; milestoneIndex: number }>;
}

interface StructureRepairResult {
  readonly repairedActs: Array<{
    actIndex: number;
    act: GeneratedAct;
  }>;
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LLMError(`${label} must be a non-empty string`, 'STRUCTURE_PARSE_ERROR', true);
  }
  return value.trim();
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new LLMError(`${label} must be a string or null`, 'STRUCTURE_PARSE_ERROR', true);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new LLMError(`${label} must be an array`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return value.map((entry, index) => nonEmptyString(entry, `${label}[${index}]`));
}

function nullableEnum<T extends string>(
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

function parseApproachVectors(value: unknown, label: string): string[] | null {
  if (value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    throw new LLMError(`${label} must be an array or null`, 'STRUCTURE_PARSE_ERROR', true);
  }
  const vectors = value.map((entry, index) =>
    nonEmptyString(entry, `${label}[${index}]`)
  );
  for (const vector of vectors) {
    if (!APPROACH_VECTORS.includes(vector as (typeof APPROACH_VECTORS)[number])) {
      throw new LLMError(`${label} contains invalid approach vector`, 'STRUCTURE_PARSE_ERROR', true);
    }
  }
  if (new Set(vectors).size !== vectors.length) {
    throw new LLMError(`${label} must not repeat approach vectors`, 'STRUCTURE_PARSE_ERROR', true);
  }
  return vectors;
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

function parseGeneratedMilestone(
  value: unknown,
  label: string,
  verifiedSetpieceCount: number
): GeneratedMilestone {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const record = value as Record<string, unknown>;
  const role = nonEmptyString(record['role'], `${label}.role`);
  if (!MILESTONE_ROLES.includes(role as (typeof MILESTONE_ROLES)[number])) {
    throw new LLMError(`${label}.role must be a valid milestone role`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const escalationType = nullableEnum(record['escalationType'], ESCALATION_TYPES, `${label}.escalationType`);
  const secondaryEscalationType = nullableEnum(
    record['secondaryEscalationType'],
    ESCALATION_TYPES,
    `${label}.secondaryEscalationType`
  );
  const crisisType = nullableEnum(record['crisisType'], CRISIS_TYPES, `${label}.crisisType`);
  const expectedGapMagnitude = nullableEnum(
    record['expectedGapMagnitude'],
    GAP_MAGNITUDES,
    `${label}.expectedGapMagnitude`
  );
  const midpointType = nullableEnum(record['midpointType'], MIDPOINT_TYPES, `${label}.midpointType`);
  const isMidpoint = record['isMidpoint'] === true;
  const uniqueScenarioHook = nullableString(record['uniqueScenarioHook'], `${label}.uniqueScenarioHook`);
  const approachVectors = parseApproachVectors(record['approachVectors'], `${label}.approachVectors`);
  const setpieceSourceIndex = parseSetpieceIndex(record['setpieceSourceIndex'], `${label}.setpieceSourceIndex`);
  const obligatorySceneTag = nullableString(record['obligatorySceneTag'], `${label}.obligatorySceneTag`);

  if (obligatorySceneTag !== null && !isGenreObligationTag(obligatorySceneTag)) {
    throw new LLMError(`${label}.obligatorySceneTag must be a valid genre obligation tag`, 'STRUCTURE_PARSE_ERROR', true);
  }
  if (setpieceSourceIndex !== null && (setpieceSourceIndex < 0 || setpieceSourceIndex >= verifiedSetpieceCount)) {
    throw new LLMError(`${label}.setpieceSourceIndex must reference a valid verified setpiece index`, 'STRUCTURE_PARSE_ERROR', true);
  }
  if (isMidpoint && midpointType === null) {
    throw new LLMError(`${label} is midpoint-tagged but missing midpointType`, 'STRUCTURE_PARSE_ERROR', true);
  }
  if (!isMidpoint && midpointType !== null) {
    throw new LLMError(`${label} has midpointType but isMidpoint is false`, 'STRUCTURE_PARSE_ERROR', true);
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
      throw new LLMError(`${label} must include 2-3 approachVectors`, 'STRUCTURE_PARSE_ERROR', true);
    }
  } else {
    if (
      escalationType !== null ||
      secondaryEscalationType !== null ||
      crisisType !== null ||
      expectedGapMagnitude !== null ||
      uniqueScenarioHook !== null ||
      approachVectors !== null
    ) {
      throw new LLMError(`${label} has escalation-only fields populated for a non-escalation milestone`, 'STRUCTURE_PARSE_ERROR', true);
    }
  }

  return {
    name: nonEmptyString(record['name'], `${label}.name`),
    description: nonEmptyString(record['description'], `${label}.description`),
    objective: nonEmptyString(record['objective'], `${label}.objective`),
    causalLink: nonEmptyString(record['causalLink'], `${label}.causalLink`),
    exitCondition: nonEmptyString(record['exitCondition'], `${label}.exitCondition`),
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

function parseGeneratedAct(
  value: unknown,
  label: string,
  verifiedSetpieceCount: number
): GeneratedAct {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LLMError(`${label} must be an object`, 'STRUCTURE_PARSE_ERROR', true);
  }

  const record = value as Record<string, unknown>;
  const milestonesValue = record['milestones'];
  if (!Array.isArray(milestonesValue) || milestonesValue.length < 2 || milestonesValue.length > 4) {
    throw new LLMError(`${label}.milestones must contain 2-4 items`, 'STRUCTURE_PARSE_ERROR', true);
  }
  const exitReversalValue = record['exitReversal'];
  if (typeof exitReversalValue !== 'string') {
    throw new LLMError(`${label}.exitReversal must be a string`, 'STRUCTURE_PARSE_ERROR', true);
  }

  return {
    name: nonEmptyString(record['name'], `${label}.name`),
    objective: nonEmptyString(record['objective'], `${label}.objective`),
    stakes: nonEmptyString(record['stakes'], `${label}.stakes`),
    entryCondition: nonEmptyString(record['entryCondition'], `${label}.entryCondition`),
    actQuestion: nonEmptyString(record['actQuestion'], `${label}.actQuestion`),
    exitReversal: exitReversalValue.trim(),
    promiseTargets: stringArray(record['promiseTargets'], `${label}.promiseTargets`),
    obligationTargets: stringArray(record['obligationTargets'], `${label}.obligationTargets`),
    milestones: milestonesValue.map((milestone, milestoneIndex) =>
      parseGeneratedMilestone(milestone, `${label}.milestones[${milestoneIndex}]`, verifiedSetpieceCount)
    ),
  };
}

function parseStructureRepairResponseObject(
  parsed: unknown,
  actCount: number,
  verifiedSetpieceCount: number
): StructureRepairResult {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError('Structure repair response must be an object', 'STRUCTURE_PARSE_ERROR', true);
  }

  const record = parsed as Record<string, unknown>;
  const repairedActsValue = record['repairedActs'];
  if (!Array.isArray(repairedActsValue)) {
    throw new LLMError('repairedActs must be an array', 'STRUCTURE_PARSE_ERROR', true);
  }

  const seen = new Set<number>();
  const repairedActs = repairedActsValue.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new LLMError(`repairedActs[${index}] must be an object`, 'STRUCTURE_PARSE_ERROR', true);
    }
    const item = entry as Record<string, unknown>;
    const rawActIndex = item['actIndex'];
    if (
      typeof rawActIndex !== 'number' ||
      !Number.isInteger(rawActIndex) ||
      rawActIndex < 0 ||
      rawActIndex >= actCount
    ) {
      throw new LLMError(`repairedActs[${index}].actIndex must reference a valid act`, 'STRUCTURE_PARSE_ERROR', true);
    }
    const actIndex = rawActIndex as number;
    if (seen.has(actIndex)) {
      throw new LLMError(`repairedActs contains duplicate actIndex ${actIndex}`, 'STRUCTURE_PARSE_ERROR', true);
    }
    seen.add(actIndex);

    return {
      actIndex,
      act: parseGeneratedAct(item['act'], `repairedActs[${index}].act`, verifiedSetpieceCount),
    };
  });

  return { repairedActs };
}

export function countUniqueSetpieceIndices(
  result: Omit<StructureGenerationResult, 'rawResponse'>
): number {
  const unique = new Set<number>();
  for (const act of result.acts) {
    for (const milestone of act.milestones) {
      if (typeof milestone.setpieceSourceIndex === 'number') {
        unique.add(milestone.setpieceSourceIndex);
      }
    }
  }
  return unique.size;
}

export function collectTaggedObligations(
  result: Omit<StructureGenerationResult, 'rawResponse'>
): Set<string> {
  const tagged = new Set<string>();
  for (const act of result.acts) {
    for (const milestone of act.milestones) {
      if (typeof milestone.obligatorySceneTag === 'string') {
        tagged.add(milestone.obligatorySceneTag);
      }
    }
  }
  return tagged;
}

function flattenMilestones(
  result: Omit<StructureGenerationResult, 'rawResponse'>
): Array<{ actIndex: number; milestoneIndex: number; milestone: GeneratedMilestone }> {
  return result.acts.flatMap((act, actIndex) =>
    act.milestones.map((milestone, milestoneIndex) => ({ actIndex, milestoneIndex, milestone }))
  );
}

function buildPassingResult(check: string): ValidationResult {
  return { passed: true, check };
}

export function validateStructureSemantics(
  result: Omit<StructureGenerationResult, 'rawResponse'>,
  context: StructureContext
): ValidationResult[] {
  const validations: ValidationResult[] = [];
  const flatMilestones = flattenMilestones(result);

  const midpointMilestones = flatMilestones
    .filter(({ milestone }) => milestone.isMidpoint)
    .map(({ actIndex, milestoneIndex }) => ({ actIndex, milestoneIndex }));
  validations.push(
    midpointMilestones.length === 1
      ? buildPassingResult('midpoint-uniqueness')
      : {
          passed: false,
          check: 'midpoint-uniqueness',
          details: `Expected exactly 1 midpoint, received ${midpointMilestones.length}`,
          affectedMilestoneIndices: midpointMilestones,
        }
  );

  const milestoneCountFailures = result.acts
    .map((act, actIndex) => ({ actIndex, count: act.milestones.length }))
    .filter(({ count }) => count < 2 || count > 4);
  validations.push(
    milestoneCountFailures.length === 0
      ? buildPassingResult('milestone-count')
      : {
          passed: false,
          check: 'milestone-count',
          details: milestoneCountFailures.map(({ actIndex, count }) => `act ${actIndex} has ${count}`).join('; '),
          affectedActIndices: milestoneCountFailures.map(({ actIndex }) => actIndex),
        }
  );

  const escalationTypeFailures = flatMilestones
    .filter(({ milestone }) =>
      (milestone.role === 'escalation' || milestone.role === 'turning_point') &&
      milestone.escalationType === null
    )
    .map(({ actIndex, milestoneIndex }) => ({ actIndex, milestoneIndex }));
  validations.push(
    escalationTypeFailures.length === 0
      ? buildPassingResult('escalation-type-required')
      : {
          passed: false,
          check: 'escalation-type-required',
          details: 'Escalation and turning-point milestones require escalationType',
          affectedMilestoneIndices: escalationTypeFailures,
          affectedActIndices: [...new Set(escalationTypeFailures.map(({ actIndex }) => actIndex))],
        }
  );

  const verifiedSetpieces = context.conceptVerification?.escalatingSetpieces ?? [];
  if (verifiedSetpieces.length > 0) {
    const uniqueSetpieces = countUniqueSetpieceIndices(result);
    const actsMissingTrace = result.acts
      .map((act, actIndex) => ({
        actIndex,
        hasTrace: act.milestones.some((milestone) => typeof milestone.setpieceSourceIndex === 'number'),
      }))
      .filter(({ hasTrace }) => !hasTrace)
      .map(({ actIndex }) => actIndex);
    validations.push(
      uniqueSetpieces >= MIN_UNIQUE_TRACED_SETPIECES
        ? buildPassingResult('setpiece-coverage')
        : {
            passed: false,
            check: 'setpiece-coverage',
            details: `Expected at least ${MIN_UNIQUE_TRACED_SETPIECES} unique traced setpieces, received ${uniqueSetpieces}`,
            affectedActIndices: actsMissingTrace.length > 0 ? actsMissingTrace : result.acts.map((_, index) => index),
          }
    );
  } else {
    validations.push(buildPassingResult('setpiece-coverage'));
  }

  const expectedObligations = context.conceptSpec
    ? getGenreObligationTags(context.conceptSpec.genreFrame).map((entry) => entry.tag)
    : [];
  if (expectedObligations.length > 0) {
    const tagged = collectTaggedObligations(result);
    const missing = expectedObligations.filter((tag) => !tagged.has(tag));
    validations.push(
      missing.length === 0
        ? buildPassingResult('genre-obligation-coverage')
        : {
            passed: false,
            check: 'genre-obligation-coverage',
            details: `Missing milestone obligation tags: ${missing.join(', ')}`,
            affectedActIndices: result.acts
              .map((act, actIndex) => ({
                actIndex,
                intersects: act.obligationTargets.some((tag) => missing.includes(tag)),
              }))
              .filter(({ intersects }) => intersects)
              .map(({ actIndex }) => actIndex),
          }
    );
  } else {
    validations.push(buildPassingResult('genre-obligation-coverage'));
  }

  const exitConditionFailures = flatMilestones
    .filter(({ milestone }) => milestone.exitCondition.trim().length === 0)
    .map(({ actIndex, milestoneIndex }) => ({ actIndex, milestoneIndex }));
  validations.push(
    exitConditionFailures.length === 0
      ? buildPassingResult('exit-condition-non-empty')
      : {
          passed: false,
          check: 'exit-condition-non-empty',
          details: 'Every milestone requires a non-empty exitCondition',
          affectedMilestoneIndices: exitConditionFailures,
          affectedActIndices: [...new Set(exitConditionFailures.map(({ actIndex }) => actIndex))],
        }
  );

  const questionMap = new Map<string, number[]>();
  result.acts.forEach((act, actIndex) => {
    const normalized = act.actQuestion.trim().toLowerCase();
    const indices = questionMap.get(normalized) ?? [];
    indices.push(actIndex);
    questionMap.set(normalized, indices);
  });
  const duplicateQuestionActs = [...questionMap.entries()]
    .filter(([question, indices]) => question.length === 0 || indices.length > 1)
    .flatMap(([, indices]) => indices);
  validations.push(
    duplicateQuestionActs.length === 0
      ? buildPassingResult('act-question-distinct')
      : {
          passed: false,
          check: 'act-question-distinct',
          details: 'Each act must have a distinct non-empty actQuestion',
          affectedActIndices: [...new Set(duplicateQuestionActs)],
        }
  );

  const exitReversalFailures = result.acts
    .map((act, actIndex) => ({ actIndex, exitReversal: act.exitReversal }))
    .filter(({ actIndex, exitReversal }) => actIndex < result.acts.length - 1 && exitReversal.trim().length === 0)
    .map(({ actIndex }) => actIndex);
  validations.push(
    exitReversalFailures.length === 0
      ? buildPassingResult('exit-reversal-present')
      : {
          passed: false,
          check: 'exit-reversal-present',
          details: 'All non-final acts require a non-empty exitReversal',
          affectedActIndices: exitReversalFailures,
        }
  );

  const premisePromises = context.conceptVerification?.premisePromises ?? [];
  const promiseCoverage = new Set(result.acts.flatMap((act) => act.promiseTargets));
  const missingPromises = premisePromises.filter((promise) => !promiseCoverage.has(promise));
  validations.push(
    missingPromises.length === 0
      ? buildPassingResult('promise-target-coverage')
      : {
          passed: false,
          check: 'promise-target-coverage',
          details: `Missing premise promise targets: ${missingPromises.join(', ')}`,
          affectedActIndices: result.acts.map((_, index) => index),
        }
  );

  const obligationCoverage = new Set(result.acts.flatMap((act) => act.obligationTargets));
  const missingObligationTargets = expectedObligations.filter((tag) => !obligationCoverage.has(tag));
  validations.push(
    missingObligationTargets.length === 0
      ? buildPassingResult('obligation-target-coverage')
      : {
          passed: false,
          check: 'obligation-target-coverage',
          details: `Missing obligation targets: ${missingObligationTargets.join(', ')}`,
          affectedActIndices: result.acts.map((_, index) => index),
        }
  );

  return validations;
}

function failingDiagnostics(diagnostics: readonly ValidationResult[]): ValidationResult[] {
  return diagnostics.filter((diagnostic) => !diagnostic.passed);
}

function targetActIndicesForDiagnostics(
  diagnostics: readonly ValidationResult[],
  actCount: number
): number[] {
  const acts = new Set<number>();
  for (const diagnostic of diagnostics) {
    for (const actIndex of diagnostic.affectedActIndices ?? []) {
      acts.add(actIndex);
    }
    for (const milestone of diagnostic.affectedMilestoneIndices ?? []) {
      acts.add(milestone.actIndex);
    }
  }
  if (acts.size === 0) {
    const allActIndices: number[] = [];
    for (let index = 0; index < actCount; index += 1) {
      allActIndices.push(index);
    }
    return allActIndices;
  }
  return [...acts].sort((a, b) => a - b);
}

function mergeRepairedActs(
  result: StructureGenerationResult,
  repair: StructureRepairResult
): StructureGenerationResult {
  const acts = result.acts.map((act, actIndex) => {
    const repaired = repair.repairedActs.find((entry) => entry.actIndex === actIndex);
    return repaired ? repaired.act : act;
  });
  return {
    ...result,
    acts,
  };
}

async function callStructuredRepairStage<T>(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  schema: JsonSchema,
  temperature: number,
  maxTokens: number,
  parse: (parsed: unknown, rawText: string) => T
): Promise<T> {
  logPrompt(logger, 'structureRepair', messages);

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'One More Branch',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: schema,
    }),
  });

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response);
    const retryable = response.status === 429 || response.status >= 500;
    throw new LLMError(errorDetails.message, `HTTP_${response.status}`, retryable, {
      httpStatus: response.status,
      model,
      rawErrorBody: errorDetails.rawBody,
      parsedError: errorDetails.parsedError,
    });
  }

  const data = await readJsonResponse(response);
  const content = extractResponseContent(data, 'structureRepair', model, maxTokens);
  const parsedMessage = parseMessageJsonContent(content);
  const responseText = parsedMessage.rawText;
  logResponse(logger, 'structureRepair', responseText);

  try {
    return parse(parsedMessage.parsed, responseText);
  } catch (error) {
    if (error instanceof LLMError) {
      throw new LLMError(error.message, error.code, error.retryable, {
        rawContent: responseText,
      });
    }
    throw error;
  }
}

export async function validateAndRepairStructure(
  result: StructureGenerationResult,
  context: StructureContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<{ result: StructureGenerationResult; repaired: boolean; diagnostics: ValidationResult[] }> {
  const initialDiagnostics = validateStructureSemantics(result, context);
  const failures = failingDiagnostics(initialDiagnostics);
  if (failures.length === 0) {
    return { result, repaired: false, diagnostics: initialDiagnostics };
  }

  const promptOptions: PromptOptions = resolvePromptOptions({ apiKey, ...options });
  const maxTokens = options?.maxTokens ?? getStageMaxTokens('structureRepair');
  const temperature = options?.temperature ?? 0.2;
  const targetActIndices = targetActIndicesForDiagnostics(failures, result.acts.length);
  const verifiedSetpieceCount = context.conceptVerification?.escalatingSetpieces.length ?? 0;
  const resultWithoutRawResponse: Omit<StructureGenerationResult, 'rawResponse'> = {
    overallTheme: result.overallTheme,
    premise: result.premise,
    openingImage: result.openingImage,
    closingImage: result.closingImage,
    pacingBudget: result.pacingBudget,
    anchorMoments: result.anchorMoments,
    acts: result.acts,
    ...(result.initialNpcAgendas ? { initialNpcAgendas: result.initialNpcAgendas } : {}),
  };
  const repairMessages = buildStructureRepairPrompt(
    context,
    {
      result: resultWithoutRawResponse,
      diagnostics: failures,
      targetActIndices,
    },
    promptOptions
  );

  const repair = await withRetry(() =>
    withModelFallback(
      (model) =>
        callStructuredRepairStage(
          apiKey,
          model,
          repairMessages,
          STRUCTURE_REPAIR_SCHEMA,
          temperature,
          maxTokens,
          (parsed, rawText) => ({
            parsed: parseStructureRepairResponseObject(
              parsed,
              result.acts.length,
              verifiedSetpieceCount
            ),
            rawResponse: rawText,
          })
        ),
      options?.model ?? getStageModel('structureRepair'),
      'structureRepair'
    )
  );

  const merged = mergeRepairedActs(result, repair.parsed);
  const repairedRawResponse = `${result.rawResponse}\n\n[structureRepair]\n${repair.rawResponse}`;
  const mergedWithRaw = { ...merged, rawResponse: repairedRawResponse };
  const finalDiagnostics = validateStructureSemantics(mergedWithRaw, context);
  const remainingFailures = failingDiagnostics(finalDiagnostics);

  if (remainingFailures.length > 0) {
    for (const failure of remainingFailures) {
      logger.warn(`Structure validation still failing after repair [${failure.check}]: ${failure.details ?? 'no details'}`);
    }
  }

  return {
    result: mergedWithRaw,
    repaired: true,
    diagnostics: finalDiagnostics,
  };
}
