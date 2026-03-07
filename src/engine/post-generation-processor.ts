import { generateChoices, mergePageWriterAndReconciledStateWithAnalystResults } from '../llm';
import type { ChoiceGeneratorResult } from '../llm/choice-generator-types';
import type { PostGenerationMetrics, StageDegradation } from '../llm/generation-pipeline-types';
import type { StoryBible } from '../llm/lorekeeper-types';
import type { PageWriterResult } from '../llm/writer-types';
import { getDefaultPromptOptions } from '../llm/options.js';
import {
  createBeatDeviation,
  createEmptyAccumulatedStructureState,
  generatePageId,
  getLatestStructureVersion,
  isDeviation,
  parsePageId,
} from '../models';
import type {
  Page,
  Story,
  VersionedStoryStructure,
} from '../models';
import { createInitialStructureState } from '../models/story-arc';
import type { NpcAgenda } from '../models/state/npc-agenda';
import type { NpcRelationship, AccumulatedNpcRelationships } from '../models/state/npc-relationship';
import { createEmptyAccumulatedNpcRelationships } from '../models/state/npc-relationship';
import { withPromiseAge } from '../models/state/index.js';
import type { StateReconciliationResult } from './state-reconciler-types';
import { updateStoryWithAllCanon } from './canon-manager';
import { runAnalystEvaluation } from './analyst-evaluation';
import { resolveActiveBeat } from './beat-utils';
import { resolveBeatAlignmentSkip } from './beat-alignment';
import { resolveBeatConclusion } from './beat-conclusion';
import { handleDeviationIfDetected } from './deviation-processing';
import { applyPacingResponse } from './pacing-response';
import {
  handleSpineDeviationIfDetected,
  collectRemainingBeatIds,
} from './spine-deviation-processing';
import { resolveStructureProgression } from './structure-state';
import { resolveNpcAgendas } from './npc-agenda-pipeline';
import { buildPage } from './page-builder';
import type { CollectedParentState } from './parent-state-collector';
import {
  getTriggerEligibleDelayedConsequences,
  incrementDelayedConsequenceAges,
} from './consequence-lifecycle';
import { emitGenerationStage } from './generation-pipeline-helpers';
import type { DeviationInfo, GenerationStageCallback } from './types';

export interface PostGenerationContext {
  readonly mode: 'opening' | 'continuation';
  readonly story: Story;
  readonly apiKey: string;
  readonly logContext: Record<string, unknown>;
  readonly parentPage: Page | undefined;
  readonly parentState: CollectedParentState | null;
  readonly currentStructureVersion: VersionedStoryStructure | null;
  readonly writerResult: PageWriterResult;
  readonly reconciliation: StateReconciliationResult;
  readonly getLastStoryBible: () => StoryBible | null;
  readonly isEnding: boolean;
  readonly dramaticQuestion?: string;
  readonly maxPageId: number | null;
  readonly choiceIndex: number | undefined;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface PostGenerationResult {
  readonly page: Page;
  readonly updatedStory: Story;
  readonly deviationInfo?: DeviationInfo;
  readonly postMetrics: PostGenerationMetrics;
}

function buildInitialNpcAgendaRecord(
  initialNpcAgendas: readonly NpcAgenda[] | undefined
): Record<string, NpcAgenda> {
  const agendas = initialNpcAgendas ?? [];
  const record: Record<string, NpcAgenda> = {};
  for (const agenda of agendas) {
    record[agenda.npcName] = agenda;
  }
  return record;
}

function buildInitialNpcRelationshipRecord(
  initialNpcRelationships: readonly NpcRelationship[] | undefined
): AccumulatedNpcRelationships {
  if (!initialNpcRelationships || initialNpcRelationships.length === 0) {
    return createEmptyAccumulatedNpcRelationships();
  }
  const record: Record<string, NpcRelationship> = {};
  for (const rel of initialNpcRelationships) {
    record[rel.npcName] = rel;
  }
  return record;
}

export async function processPostGeneration(
  context: PostGenerationContext
): Promise<PostGenerationResult> {
  const {
    mode,
    story,
    apiKey,
    logContext,
    parentPage,
    parentState,
    currentStructureVersion,
    writerResult,
    reconciliation,
    getLastStoryBible,
    dramaticQuestion,
    maxPageId,
    choiceIndex,
    onGenerationStage,
  } = context;

  const isOpening = mode === 'opening';

  // --- NPC agendas (computed early for analyst context) ---
  const parentAccumulatedNpcAgendas = isOpening
    ? buildInitialNpcAgendaRecord(story.initialNpcAgendas)
    : parentState!.accumulatedNpcAgendas;

  // --- NPC relationships (computed early for analyst context) ---
  const parentAccumulatedNpcRelationships: AccumulatedNpcRelationships = isOpening
    ? buildInitialNpcRelationshipRecord(story.initialNpcRelationships)
    : parentState!.accumulatedNpcRelationships;

  const degradedStages: StageDegradation[] = [];

  // --- Run choice generator (skip for endings) ---
  let choiceGeneratorDurationMs: number | null = null;
  let generatedChoices: ChoiceGeneratorResult['choices'] | null = null;
  if (!context.isEnding && dramaticQuestion) {
    emitGenerationStage(onGenerationStage, 'GENERATING_CHOICES', 'started', 1);
    const choiceGenStart = Date.now();
    const choiceResult = await generateChoices(
      {
        narrative: writerResult.narrative,
        sceneSummary: writerResult.sceneSummary,
        protagonistAffect: writerResult.protagonistAffect,
        dramaticQuestion,
        spine: story.spine,
        activeState: isOpening
          ? {
              currentLocation: '',
              activeThreats: [],
              activeConstraints: [],
              openThreads: [],
            }
          : parentState!.accumulatedActiveState,
        structure: currentStructureVersion?.structure ?? story.structure ?? undefined,
        accumulatedStructureState: isOpening
          ? (story.structure
              ? createInitialStructureState(story.structure)
              : createEmptyAccumulatedStructureState())
          : parentState!.structureState,
        storyBible: getLastStoryBible() ?? undefined,
        tone: story.tone,
        toneFeel: story.toneFeel,
        toneAvoid: story.toneAvoid,
        genreFrame: story.conceptSpec?.genreFrame,
        decomposedCharacters: story.decomposedCharacters ?? [],
        choiceGuidance: getDefaultPromptOptions().choiceGuidance ?? 'strict',
      },
      { apiKey }
    );
    choiceGeneratorDurationMs = Date.now() - choiceGenStart;
    generatedChoices = choiceResult.choices;
    emitGenerationStage(
      onGenerationStage,
      'GENERATING_CHOICES',
      'completed',
      1,
      choiceGeneratorDurationMs
    );
  }

  // --- Run analyst evaluation ---
  const parentStructureState = isOpening
    ? (story.structure
        ? createInitialStructureState(story.structure)
        : createEmptyAccumulatedStructureState())
    : parentState!.structureState;

  const activeStructureForAnalyst = currentStructureVersion?.structure ?? story.structure;
  const delayedConsequencesEligible = isOpening
    ? []
    : getTriggerEligibleDelayedConsequences(
        incrementDelayedConsequenceAges(parentPage?.accumulatedDelayedConsequences ?? [])
      );
  const analystEval =
    activeStructureForAnalyst && parentStructureState
      ? await runAnalystEvaluation({
          writerNarrative: writerResult.narrative,
          writerSceneSummary: writerResult.sceneSummary,
          activeStructure: activeStructureForAnalyst,
          parentStructureState,
          parentActiveState: isOpening
            ? {
                currentLocation: '',
                activeThreats: [],
                activeConstraints: [],
                openThreads: [],
              }
            : parentState!.accumulatedActiveState,
          threadsResolved: reconciliation.threadsResolved,
          threadAges: parentPage?.threadAges ?? {},
          activeTrackedPromises: withPromiseAge(
            parentPage?.accumulatedPromises ?? [],
            parentPage?.promiseAgeEpoch ?? 0
          ),
          delayedConsequencesEligible,
          accumulatedNpcAgendas: parentAccumulatedNpcAgendas,
          accumulatedNpcRelationships: parentAccumulatedNpcRelationships,
          tone: story.tone,
          toneFeel: story.toneFeel,
          toneAvoid: story.toneAvoid,
          thematicQuestion: story.storyKernel?.thematicQuestion ?? '',
          antithesis: story.storyKernel?.antithesis ?? '',
          premisePromises: story.premisePromises,
          fulfilledPremisePromises: parentPage?.accumulatedFulfilledPremisePromises ?? [],
          spine: story.spine,
          genreFrame: story.conceptSpec?.genreFrame,
          protagonistName: story.decomposedCharacters?.[0]?.name ?? '',
          apiKey,
          logContext,
          onGenerationStage,
        })
      : null;
  const analystResult = analystEval?.result ?? null;
  const agendaResolverAnalystSignals = analystResult
    ? {
        npcCoherenceIssues: analystResult.npcCoherenceIssues,
        relationshipShiftsDetected: analystResult.relationshipShiftsDetected,
        knowledgeAsymmetryDetected: analystResult.knowledgeAsymmetryDetected,
      }
    : undefined;
  const analystDurationMs = analystEval?.durationMs ?? null;
  if (analystEval?.degradation) {
    degradedStages.push(analystEval.degradation);
  }

  // --- Merge results ---
  let result = mergePageWriterAndReconciledStateWithAnalystResults(
    writerResult,
    reconciliation,
    analystResult,
    generatedChoices ?? [],
    context.isEnding
  );

  // --- Handle spine deviation (two-tier: spine then beats) ---
  const spineDeviationResult = await handleSpineDeviationIfDetected({
    analystResult,
    sceneSummary: writerResult.sceneSummary,
    story,
    apiKey,
    logContext,
  });
  const storyAfterSpine = spineDeviationResult.updatedStory;
  const spineRewriteDurationMs = spineDeviationResult.durationMs;
  if (spineDeviationResult.degradation) {
    degradedStages.push(spineDeviationResult.degradation);
  }

  // If spine was rewritten but no beat deviation was detected, force a
  // structure rewrite by injecting a synthetic deviation with all remaining
  // beat IDs invalidated.
  if (
    spineDeviationResult.spineRewritten &&
    !isDeviation(result.deviation) &&
    currentStructureVersion &&
    parentStructureState
  ) {
    const remainingBeatIds = collectRemainingBeatIds(
      currentStructureVersion.structure,
      parentStructureState
    );
    if (remainingBeatIds.length > 0) {
      result = {
        ...result,
        deviation: createBeatDeviation(
          `Spine rewritten (${spineDeviationResult.spineInvalidatedElement ?? 'unknown'} invalidated) — all remaining beats need restructuring`,
          remainingBeatIds,
          writerResult.sceneSummary
        ),
      };
    }
  }

  // --- Handle deviation ---
  const newPageId = isOpening ? parsePageId(1) : generatePageId(maxPageId!);

  const {
    storyForPage,
    activeStructureVersion,
    deviationInfo: rawDeviationInfo,
    structureRewriteDurationMs,
  } = await handleDeviationIfDetected({
      result,
      story: storyAfterSpine,
      currentStructureVersion,
      parentStructureState,
      newPageId,
      apiKey,
      logContext,
      onGenerationStage,
    });

  // Enrich deviation info with spine rewrite metadata
  const deviationInfo: DeviationInfo | undefined = rawDeviationInfo
    ? {
        ...rawDeviationInfo,
        spineRewritten: spineDeviationResult.spineRewritten || undefined,
        spineInvalidatedElement: spineDeviationResult.spineInvalidatedElement,
      }
    : spineDeviationResult.spineRewritten
      ? {
          detected: true,
          reason: `Spine rewritten: ${spineDeviationResult.spineInvalidatedElement ?? 'unknown'} invalidated`,
          beatsInvalidated: 0,
          spineRewritten: true,
          spineInvalidatedElement: spineDeviationResult.spineInvalidatedElement,
        }
      : undefined;

  // --- Resolve beat conclusion ---
  const activeBeat = resolveActiveBeat(
    activeStructureVersion,
    story.structure,
    parentStructureState
  );
  const { beatConcluded, beatResolution } = resolveBeatConclusion({
    result,
    activeBeat,
    analystResult,
    storyId: story.id,
    parentPageId: parentPage?.id ?? parsePageId(1),
  });

  // --- Beat alignment skip ---
  const alignmentSkip = resolveBeatAlignmentSkip(
    analystResult,
    beatConcluded,
    parentStructureState
  );

  // --- Structure progression ---
  const progressedState = resolveStructureProgression({
    activeStructureVersion,
    storyStructure: story.structure,
    parentStructureState,
    beatConcluded,
    beatResolution,
    alignmentSkip,
  });

  // --- Pacing response ---
  const newStructureState = applyPacingResponse({
    deviationInfo,
    structureState: progressedState,
    recommendedAction: result.recommendedAction ?? 'none',
    pacingIssueReason: result.pacingIssueReason ?? '',
  });

  // --- NPC agenda resolver ---
  const agendaResolverOutcome = await resolveNpcAgendas({
    decomposedCharacters: story.decomposedCharacters!,
    writerNarrative: writerResult.narrative,
    writerSceneSummary: writerResult.sceneSummary,
    parentAccumulatedNpcAgendas,
    currentStructureVersion: activeStructureVersion ?? currentStructureVersion,
    storyStructure: story.structure,
    spine: story.spine,
    parentActiveState: isOpening
      ? {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        }
      : parentState!.accumulatedActiveState,
    analystSignals: agendaResolverAnalystSignals,
    parentAccumulatedNpcRelationships,
    deviationContext:
      deviationInfo?.detected && activeStructureVersion
        ? {
            reason: deviationInfo.reason,
            newBeats: activeStructureVersion.structure.acts.flatMap((act) =>
              act.beats.map((beat) => ({
                name: beat.name,
                objective: beat.objective,
                role: beat.role,
              }))
            ),
          }
        : undefined,
    tone: story.tone,
    toneFeel: story.toneFeel,
    toneAvoid: story.toneAvoid,
    apiKey,
    onGenerationStage,
  });
  const agendaResolverResult = agendaResolverOutcome.result;
  const agendaResolverDurationMs = agendaResolverOutcome.durationMs;
  if (agendaResolverOutcome.degradation) {
    degradedStages.push(agendaResolverOutcome.degradation);
  }

  // --- Build page ---
  const pageBuildStart = Date.now();
  const latestVersion = getLatestStructureVersion(storyForPage);

  const page = buildPage(result, {
    pageId: newPageId,
    parentPageId: parentPage?.id ?? null,
    parentChoiceIndex: choiceIndex ?? null,
    parentAccumulatedActiveState: isOpening
      ? {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        }
      : parentState!.accumulatedActiveState,
    parentAccumulatedInventory: isOpening ? [] : parentState!.accumulatedInventory,
    parentAccumulatedHealth: isOpening ? [] : parentState!.accumulatedHealth,
    parentAccumulatedCharacterState: isOpening ? {} : parentState!.accumulatedCharacterState,
    structureState: newStructureState,
    structureVersionId: activeStructureVersion?.id ?? latestVersion?.id ?? null,
    storyBible: getLastStoryBible(),
    analystResult,
    parentThreadAges: parentPage?.threadAges ?? {},
    parentPromiseAgeEpoch: parentPage?.promiseAgeEpoch ?? 0,
    parentAccumulatedPromises: parentPage?.accumulatedPromises ?? [],
    parentAccumulatedDelayedConsequences: parentPage?.accumulatedDelayedConsequences ?? [],
    parentAccumulatedKnowledgeState: parentPage?.accumulatedKnowledgeState ?? [],
    parentAccumulatedFulfilledPremisePromises:
      parentPage?.accumulatedFulfilledPremisePromises ?? [],
    analystPromisesDetected: analystResult?.promisesDetected ?? [],
    analystPromisesResolved: analystResult?.promisesResolved ?? [],
    analystPremisePromiseFulfilled: analystResult?.premisePromiseFulfilled ?? null,
    storyPremisePromises: story.premisePromises ?? [],
    parentAccumulatedNpcAgendas,
    npcAgendaUpdates: agendaResolverResult?.updatedAgendas,
    parentAccumulatedNpcRelationships,
    npcRelationshipUpdates: agendaResolverResult?.updatedRelationships,
    pageActIndex: parentStructureState.currentActIndex,
    pageBeatIndex: parentStructureState.currentBeatIndex,
  });

  const pageBuildDurationMs = Date.now() - pageBuildStart;

  // --- Update canon ---
  const updatedStory = updateStoryWithAllCanon(
    storyForPage,
    result.newCanonFacts,
    result.newCharacterCanonFacts
  );

  const postMetrics: PostGenerationMetrics = {
    choiceGeneratorDurationMs,
    analystDurationMs,
    spineRewriteDurationMs,
    structureRewriteDurationMs,
    agendaResolverDurationMs,
    pageBuildDurationMs,
    degradedStages,
  };

  return { page, updatedStory, deviationInfo, postMetrics };
}
