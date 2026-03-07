import {
  generateStructureEvaluation,
  generatePromiseTracking,
  generateProseQualityEvaluation,
  generateNpcIntelligenceEvaluation,
} from '../llm/client.js';
import type { AnalystResult } from '../llm/analyst-types.js';
import type { StructureEvaluatorResult } from '../llm/structure-evaluator-types.js';
import type { PromiseTrackerResult } from '../llm/promise-tracker-types.js';
import type { ProseQualityResult } from '../llm/prose-quality-types.js';
import type { NpcIntelligenceResult } from '../llm/npc-intelligence-types.js';
import type { StageDegradation } from '../llm/generation-pipeline-types.js';
import { LLMError } from '../llm/llm-client-types.js';
import { logger } from '../logging/index.js';
import type {
  AccumulatedStructureState,
  ActiveState,
  StoryStructure,
  TrackedPromise,
} from '../models';
import { getCurrentBeat } from '../models';
import type { GenreFrame } from '../models/concept-generator';
import type { StorySpine } from '../models/story-spine';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { AccumulatedNpcRelationships } from '../models/state/npc-relationship';
import type { DelayedConsequence } from '../models/state/delayed-consequence';
import { emitGenerationStage } from './generation-pipeline-helpers';
import type { GenerationStageCallback } from './types';

export interface AnalystEvaluationContext {
  readonly writerNarrative: string;
  readonly writerSceneSummary: string;
  readonly activeStructure: StoryStructure;
  readonly parentStructureState: AccumulatedStructureState;
  readonly parentActiveState: ActiveState;
  readonly threadsResolved: readonly string[];
  readonly threadAges: Readonly<Record<string, number>>;
  readonly activeTrackedPromises: readonly TrackedPromise[];
  readonly delayedConsequencesEligible: readonly DelayedConsequence[];
  readonly accumulatedNpcAgendas?: AccumulatedNpcAgendas;
  readonly accumulatedNpcRelationships?: AccumulatedNpcRelationships;
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly thematicQuestion: string;
  readonly antithesis: string;
  readonly premisePromises: readonly string[];
  readonly fulfilledPremisePromises: readonly string[];
  readonly spine?: StorySpine;
  readonly genreFrame?: GenreFrame;
  readonly protagonistName: string;
  readonly apiKey: string;
  readonly logContext: Record<string, unknown>;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface AnalystEvaluationResult {
  readonly result: AnalystResult | null;
  readonly durationMs: number;
  readonly degradation?: StageDegradation;
}

function mergeEvaluatorResults(
  structureResult: (StructureEvaluatorResult & { rawResponse: string }) | null,
  promiseResult: (PromiseTrackerResult & { rawResponse: string }) | null,
  proseResult: (ProseQualityResult & { rawResponse: string }) | null,
  npcResult: (NpcIntelligenceResult & { rawResponse: string }) | null
): AnalystResult | null {
  if (!structureResult && !promiseResult && !proseResult && !npcResult) {
    return null;
  }

  const rawParts: string[] = [];
  if (structureResult?.rawResponse) rawParts.push(structureResult.rawResponse);
  if (promiseResult?.rawResponse) rawParts.push(promiseResult.rawResponse);
  if (proseResult?.rawResponse) rawParts.push(proseResult.rawResponse);
  if (npcResult?.rawResponse) rawParts.push(npcResult.rawResponse);

  const defaultStructure: StructureEvaluatorResult = {
    beatConcluded: false,
    beatResolution: '',
    sceneMomentum: 'STASIS',
    objectiveEvidenceStrength: 'NONE',
    commitmentStrength: 'NONE',
    structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
    entryConditionReadiness: 'NOT_READY',
    objectiveAnchors: [],
    anchorEvidence: [],
    completionGateSatisfied: false,
    completionGateFailureReason: 'Structure evaluator failed',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [],
    spineDeviationDetected: false,
    spineDeviationReason: '',
    spineInvalidatedElement: null,
    alignedBeatId: null,
    beatAlignmentConfidence: 'LOW',
    beatAlignmentReason: '',
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    pacingDirective: '',
    narrativeSummary: '',
  };

  const defaultPromise: PromiseTrackerResult = {
    promisesDetected: [],
    promisesResolved: [],
    promisePayoffAssessments: [],
    threadPayoffAssessments: [],
    premisePromiseFulfilled: null,
    obligatorySceneFulfilled: null,
    delayedConsequencesTriggered: [],
    delayedConsequencesCreated: [],
  };

  const defaultProse: ProseQualityResult = {
    toneAdherent: true,
    toneDriftDescription: '',
    thematicCharge: 'AMBIGUOUS',
    thematicChargeDescription: '',
    narrativeFocus: 'BALANCED',
  };

  const defaultNpc: NpcIntelligenceResult = {
    npcCoherenceAdherent: true,
    npcCoherenceIssues: '',
    relationshipShiftsDetected: [],
    knowledgeAsymmetryDetected: [],
    dramaticIronyOpportunities: [],
  };

  const { rawResponse: _sr, ...structureFields } = structureResult ?? { rawResponse: '' }; // eslint-disable-line @typescript-eslint/no-unused-vars
  const { rawResponse: _pr, ...promiseFields } = promiseResult ?? { rawResponse: '' }; // eslint-disable-line @typescript-eslint/no-unused-vars
  const { rawResponse: _pqr, ...proseFields } = proseResult ?? { rawResponse: '' }; // eslint-disable-line @typescript-eslint/no-unused-vars
  const { rawResponse: _nr, ...npcFields } = npcResult ?? { rawResponse: '' }; // eslint-disable-line @typescript-eslint/no-unused-vars

  return {
    ...(structureResult ? structureFields : defaultStructure),
    ...(promiseResult ? promiseFields : defaultPromise),
    ...(proseResult ? proseFields : defaultProse),
    ...(npcResult ? npcFields : defaultNpc),
    rawResponse: rawParts.join('\n---\n'),
  } as AnalystResult;
}

function extractErrorContext(error: unknown): Record<string, unknown> {
  if (error instanceof LLMError) {
    return { errorCode: error.code, errorMessage: error.message, errorContext: error.context };
  }
  return { errorMessage: error instanceof Error ? error.message : String(error) };
}

export async function runAnalystEvaluation(
  context: AnalystEvaluationContext
): Promise<AnalystEvaluationResult> {
  const analystStructureState: AccumulatedStructureState = {
    ...context.parentStructureState,
    pagesInCurrentBeat: context.parentStructureState.pagesInCurrentBeat + 1,
  };

  const activeBeat = getCurrentBeat(context.activeStructure, context.parentStructureState);
  const activeBeatObligationTag = activeBeat?.obligatorySceneTag ?? undefined;

  logger.info('Generation stage started', {
    ...context.logContext,
    stage: 'analyst-parallel',
  });
  const analystStart = Date.now();

  const apiOptions = { apiKey: context.apiKey };

  // Build the 4 focused contexts
  const structureCtx = {
    narrative: context.writerNarrative,
    structure: context.activeStructure,
    accumulatedStructureState: analystStructureState,
    activeState: context.parentActiveState,
    threadsResolved: context.threadsResolved,
    threadAges: context.threadAges,
    spine: context.spine,
  };

  const promiseCtx = {
    narrative: context.writerNarrative,
    sceneSummary: context.writerSceneSummary,
    activeTrackedPromises: context.activeTrackedPromises,
    threadsResolved: context.threadsResolved,
    threadAges: context.threadAges,
    openThreads: context.parentActiveState.openThreads.map((t) => ({
      id: t.id,
      text: t.text,
    })),
    premisePromises: context.premisePromises,
    fulfilledPremisePromises: context.fulfilledPremisePromises,
    delayedConsequencesEligible: context.delayedConsequencesEligible,
    activeBeatObligationTag,
  };

  const proseCtx = {
    narrative: context.writerNarrative,
    tone: context.tone,
    toneFeel: context.toneFeel,
    toneAvoid: context.toneAvoid,
    thematicQuestion: context.thematicQuestion,
    antithesis: context.antithesis,
    spine: context.spine,
    genreFrame: context.genreFrame,
  };

  const npcCtx = {
    narrative: context.writerNarrative,
    protagonistName: context.protagonistName,
    accumulatedNpcAgendas: context.accumulatedNpcAgendas,
    accumulatedNpcRelationships: context.accumulatedNpcRelationships,
    spine: context.spine,
    genreFrame: context.genreFrame,
  };

  // Run all 4 evaluators in parallel
  const stageNames = [
    'EVALUATING_STRUCTURE',
    'TRACKING_PROMISES',
    'ASSESSING_PROSE',
    'EVALUATING_NPC_INTELLIGENCE',
  ] as const;
  for (const stage of stageNames) {
    emitGenerationStage(context.onGenerationStage, stage, 'started', 1);
  }

  const [structureSettled, promiseSettled, proseSettled, npcSettled] = await Promise.allSettled([
    generateStructureEvaluation(structureCtx, apiOptions),
    generatePromiseTracking(promiseCtx, apiOptions),
    generateProseQualityEvaluation(proseCtx, apiOptions),
    generateNpcIntelligenceEvaluation(npcCtx, apiOptions),
  ]);

  const durationMs = Date.now() - analystStart;

  // Extract results, logging failures
  const structureResult =
    structureSettled.status === 'fulfilled' ? structureSettled.value : null;
  const promiseResult =
    promiseSettled.status === 'fulfilled' ? promiseSettled.value : null;
  const proseResult =
    proseSettled.status === 'fulfilled' ? proseSettled.value : null;
  const npcResult =
    npcSettled.status === 'fulfilled' ? npcSettled.value : null;

  // Emit completion/failure for each stage
  if (structureSettled.status === 'fulfilled') {
    emitGenerationStage(context.onGenerationStage, 'EVALUATING_STRUCTURE', 'completed', 1, durationMs);
  } else {
    logger.warn('Structure evaluator failed', {
      ...context.logContext,
      ...extractErrorContext(structureSettled.reason),
    });
  }

  if (promiseSettled.status === 'fulfilled') {
    emitGenerationStage(context.onGenerationStage, 'TRACKING_PROMISES', 'completed', 1, durationMs);
  } else {
    logger.warn('Promise tracker failed', {
      ...context.logContext,
      ...extractErrorContext(promiseSettled.reason),
    });
  }

  if (proseSettled.status === 'fulfilled') {
    emitGenerationStage(context.onGenerationStage, 'ASSESSING_PROSE', 'completed', 1, durationMs);
  } else {
    logger.warn('Prose quality evaluator failed', {
      ...context.logContext,
      ...extractErrorContext(proseSettled.reason),
    });
  }

  if (npcSettled.status === 'fulfilled') {
    emitGenerationStage(context.onGenerationStage, 'EVALUATING_NPC_INTELLIGENCE', 'completed', 1, durationMs);
  } else {
    logger.warn('NPC intelligence evaluator failed', {
      ...context.logContext,
      ...extractErrorContext(npcSettled.reason),
    });
  }

  const merged = mergeEvaluatorResults(structureResult, promiseResult, proseResult, npcResult);

  if (merged) {
    logger.info('Generation stage completed', {
      ...context.logContext,
      stage: 'analyst-parallel',
      durationMs,
      structureOk: structureSettled.status === 'fulfilled',
      promiseOk: promiseSettled.status === 'fulfilled',
      proseOk: proseSettled.status === 'fulfilled',
      npcOk: npcSettled.status === 'fulfilled',
    });
    return { result: merged, durationMs };
  }

  // All 4 failed
  logger.warn('All analyst evaluators failed, continuing with defaults', {
    ...context.logContext,
    durationMs,
  });

  const failures = [
    structureSettled.status === 'rejected' ? structureSettled.reason : null,
    promiseSettled.status === 'rejected' ? promiseSettled.reason : null,
    proseSettled.status === 'rejected' ? proseSettled.reason : null,
    npcSettled.status === 'rejected' ? npcSettled.reason : null,
  ].filter(Boolean);

  const errorMessage = failures
    .map((e) => (e instanceof Error ? e.message : String(e)))
    .join('; ');

  return {
    result: null,
    durationMs,
    degradation: {
      stage: 'analyst',
      errorCode: 'LLM_FAILURE',
      message: errorMessage,
      durationMs,
    },
  };
}
