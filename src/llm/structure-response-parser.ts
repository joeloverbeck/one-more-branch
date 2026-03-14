import type { StructureGenerationResult } from '../models/structure-generation.js';
import {
  normalizeAnchorMoments,
  normalizeGeneratedMilestoneFields,
  normalizeStructureActFields,
} from '../models/story-structure-normalization.js';
import { LLMError } from './llm-client-types.js';

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

      if (milestoneData['isMidpoint'] === true) {
        midpointCount += 1;
      }

      let normalizedMilestoneFields;
      try {
        normalizedMilestoneFields = normalizeGeneratedMilestoneFields(
          milestoneData,
          `${actIndex + 1}.${milestoneIndex + 1}`
        );
      } catch (error) {
        throw new LLMError(
          error instanceof Error ? error.message : 'Failed to normalize structure milestone',
          'STRUCTURE_PARSE_ERROR',
          true
        );
      }

      return {
        name: milestoneData['name'],
        description: milestoneData['description'],
        objective: milestoneData['objective'],
        causalLink: milestoneData['causalLink'],
        ...normalizedMilestoneFields,
      };
    });
    const actFields = normalizeStructureActFields(actData);

    return {
      name: actData['name'],
      objective: actData['objective'],
      stakes: actData['stakes'],
      entryCondition: actData['entryCondition'],
      ...actFields,
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
    anchorMoments: normalizeAnchorMoments(data['anchorMoments'], acts.length),
    acts,
    ...(initialNpcAgendas.length > 0 ? { initialNpcAgendas } : {}),
  };
}
