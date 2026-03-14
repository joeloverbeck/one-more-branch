import { runLlmStage } from '../llm/llm-stage-runner';
import { buildStructureRewritePrompt } from '../llm/prompts/structure-rewrite-prompt';
import { STRUCTURE_GENERATION_SCHEMA } from '../llm/schemas/structure-schema';
import { ChatMessage } from '../llm/llm-client-types';
import { parseStructureResponseObject } from '../llm/structure-response-parser';
import type {
  CompletedBeat,
  StructureRewriteContext,
  StructureRewriteResult,
} from '../llm/structure-rewrite-types';
import { StoryAct, StoryMilestone, StoryStructure } from '../models/story-arc';
import {
  materializeStoryMilestone,
  normalizeStructureActFields,
} from '../models/story-structure-normalization';
import {
  createStoryStructure,
} from './structure-factory';
import type { StructureGenerationResult } from './structure-types';

export interface StructureRewriter {
  rewriteStructure(
    context: StructureRewriteContext,
    apiKey: string
  ): Promise<StructureRewriteResult>;
}

export type StructureRewriteGenerator = (
  messages: ChatMessage[],
  apiKey: string
) => Promise<StructureGenerationResult>;

function parseMilestoneNumber(milestoneId: string, actIndex: number): number | null {
  const match = /^(\d+)\.(\d+)$/.exec(milestoneId);
  if (!match) {
    return null;
  }

  const parsedAct = Number(match[1]);
  const parsedBeat = Number(match[2]);
  if (
    !Number.isInteger(parsedAct) ||
    !Number.isInteger(parsedBeat) ||
    parsedAct !== actIndex + 1 ||
    parsedBeat <= 0
  ) {
    return null;
  }

  return parsedBeat;
}

function milestoneSignature(description: string, objective: string): string {
  const normalizedDesc = description.trim().replace(/\s+/g, ' ');
  const normalizedObj = objective.trim().replace(/\s+/g, ' ');
  return `${normalizedDesc}\n${normalizedObj}`;
}

export function createStructureRewriter(
  generator: StructureRewriteGenerator = generateRewrittenStructure
): StructureRewriter {
  return {
    async rewriteStructure(
      context: StructureRewriteContext,
      apiKey: string
    ): Promise<StructureRewriteResult> {
      const messages = buildStructureRewritePrompt(context);
      const regenerated = await generator(messages, apiKey);
      const regeneratedStructure = createStoryStructure(regenerated);
      const structure = mergePreservedWithRegenerated(
        context.completedBeats,
        regeneratedStructure,
        context.originalTheme,
        context.originalOpeningImage
      );

      return {
        structure,
        preservedMilestoneIds: context.completedBeats.map((milestone) => milestone.milestoneId),
        rawResponse: regenerated.rawResponse,
      };
    },
  };
}

export function mergePreservedWithRegenerated(
  preservedBeats: readonly CompletedBeat[],
  regeneratedStructure: StoryStructure,
  originalTheme: string,
  originalOpeningImage: string
): StoryStructure {
  const preservedByAct = new Map<number, CompletedBeat[]>();
  for (const milestone of preservedBeats) {
    const milestonesInAct = preservedByAct.get(milestone.actIndex) ?? [];
    milestonesInAct.push(milestone);
    preservedByAct.set(milestone.actIndex, milestonesInAct);
  }

  const mergedActs: StoryAct[] = [];

  for (let actIndex = 0; actIndex < regeneratedStructure.acts.length; actIndex += 1) {
    const regeneratedAct = regeneratedStructure.acts[actIndex];
    const preservedInAct = (preservedByAct.get(actIndex) ?? []).slice().sort((a, b) => {
      return a.milestoneIndex - b.milestoneIndex;
    });

    const mergedMilestones: StoryMilestone[] = preservedInAct.map((milestone) =>
      materializeStoryMilestone(
        {
          id: milestone.milestoneId,
          name: milestone.name,
          description: milestone.description,
          objective: milestone.objective,
          causalLink: milestone.causalLink,
          exitCondition: milestone.exitCondition,
          role: milestone.role,
          escalationType: milestone.escalationType,
          secondaryEscalationType: milestone.secondaryEscalationType,
          crisisType: milestone.crisisType,
          expectedGapMagnitude: milestone.expectedGapMagnitude,
          isMidpoint: milestone.isMidpoint,
          midpointType: milestone.midpointType,
          uniqueScenarioHook: milestone.uniqueScenarioHook,
          approachVectors: milestone.approachVectors,
          setpieceSourceIndex: milestone.setpieceSourceIndex,
          obligatorySceneTag: milestone.obligatorySceneTag,
        },
        'Preserved milestone'
      )
    );

    let nextMilestoneNumber = mergedMilestones.reduce((max, milestone) => {
      const milestoneNumber = parseMilestoneNumber(milestone.id, actIndex);
      if (milestoneNumber === null) {
        return max;
      }
      return Math.max(max, milestoneNumber);
    }, 0);

    const seenMilestoneSignature = new Set(
      mergedMilestones.map((milestone) => milestoneSignature(milestone.description, milestone.objective))
    );

    for (const milestone of regeneratedAct?.milestones ?? []) {
      const signature = milestoneSignature(milestone.description, milestone.objective);
      if (seenMilestoneSignature.has(signature)) {
        continue;
      }

      mergedMilestones.push({
        id: `${actIndex + 1}.${nextMilestoneNumber + 1}`,
        name: milestone.name,
        description: milestone.description,
        objective: milestone.objective,
        causalLink: milestone.causalLink,
        exitCondition: milestone.exitCondition,
        role: milestone.role,
        escalationType: milestone.escalationType,
        secondaryEscalationType: milestone.secondaryEscalationType,
        crisisType: milestone.crisisType,
        expectedGapMagnitude: milestone.expectedGapMagnitude,
        isMidpoint: milestone.isMidpoint,
        midpointType: milestone.midpointType,
        uniqueScenarioHook: milestone.uniqueScenarioHook,
        approachVectors: milestone.approachVectors ?? null,
        setpieceSourceIndex: milestone.setpieceSourceIndex ?? null,
        obligatorySceneTag: milestone.obligatorySceneTag ?? null,
      });
      nextMilestoneNumber += 1;
      seenMilestoneSignature.add(signature);
    }

    if (mergedMilestones.length === 0) {
      throw new Error(`Merged structure is missing milestones for act ${actIndex + 1}`);
    }

    const actMidpoints = mergedMilestones.filter((milestone) => milestone.isMidpoint).length;
    if (actMidpoints > 1) {
      throw new Error(`Merged act ${actIndex + 1} has multiple midpoint milestones`);
    }

    const actFields = normalizeStructureActFields({
      actQuestion: regeneratedAct?.actQuestion,
      exitReversal: regeneratedAct?.exitReversal,
      promiseTargets: regeneratedAct?.promiseTargets,
      obligationTargets: regeneratedAct?.obligationTargets,
    });

    mergedActs.push({
      id: String(actIndex + 1),
      name: regeneratedAct?.name ?? `Act ${actIndex + 1}`,
      objective: regeneratedAct?.objective ?? '',
      stakes: regeneratedAct?.stakes ?? '',
      entryCondition: regeneratedAct?.entryCondition ?? 'Continuing from prior act',
      ...actFields,
      milestones: mergedMilestones,
    });
  }

  const totalMidpoints = mergedActs.reduce(
    (sum, act) => sum + act.milestones.filter((milestone) => milestone.isMidpoint).length,
    0
  );
  if (totalMidpoints > 1) {
    throw new Error(
      `Merged structure contains multiple midpoint milestones (received: ${totalMidpoints})`
    );
  }

  return {
    acts: mergedActs,
    overallTheme: originalTheme,
    premise: regeneratedStructure.premise,
    openingImage: originalOpeningImage,
    closingImage: regeneratedStructure.closingImage,
    pacingBudget: regeneratedStructure.pacingBudget,
    anchorMoments: regeneratedStructure.anchorMoments,
    generatedAt: new Date(),
  };
}

async function generateRewrittenStructure(
  messages: ChatMessage[],
  apiKey: string
): Promise<StructureGenerationResult> {
  const result = await runLlmStage({
    stageModel: 'structureRewrite',
    promptType: 'structureRewrite',
    apiKey,
    schema: STRUCTURE_GENERATION_SCHEMA,
    messages,
    parseResponse: (parsed) => parseStructureResponseObject(parsed),
  });

  return {
    ...result.parsed,
    rawResponse: result.rawResponse,
  };
}
