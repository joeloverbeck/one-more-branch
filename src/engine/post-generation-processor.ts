import { mergePageWriterAndReconciledStateWithAnalystResults } from '../llm';
import type { AnalystResult } from '../llm/analyst-types';
import type { StoryBible } from '../llm/lorekeeper-types';
import type { PageWriterResult } from '../llm/writer-types';
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
import type { StateReconciliationResult } from './state-reconciler-types';
import { updateStoryWithAllCanon } from './canon-manager';
import {
  runAnalystEvaluation,
  handleDeviationIfDetected,
  handleSpineDeviationIfDetected,
  collectRemainingBeatIds,
  resolveBeatConclusion,
  applyPacingResponse,
  resolveStructureProgression,
  resolveActiveBeat,
} from './continuation-post-processing';
import { resolveNpcAgendas } from './npc-agenda-pipeline';
import { buildPage } from './page-builder';
import type { CollectedParentState } from './parent-state-collector';
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
  readonly maxPageId: number | null;
  readonly choiceIndex: number | undefined;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface PostGenerationResult {
  readonly page: Page;
  readonly updatedStory: Story;
  readonly deviationInfo?: DeviationInfo;
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

  // --- Run analyst evaluation ---
  const parentStructureState = isOpening
    ? (story.structure
        ? createInitialStructureState(story.structure)
        : createEmptyAccumulatedStructureState())
    : parentState!.structureState;

  const activeStructureForAnalyst = currentStructureVersion?.structure ?? story.structure;
  const analystResult: AnalystResult | null =
    activeStructureForAnalyst && parentStructureState
      ? await runAnalystEvaluation({
          writerNarrative: writerResult.narrative,
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
          activeTrackedPromises: parentPage?.accumulatedPromises ?? [],
          accumulatedNpcAgendas: parentAccumulatedNpcAgendas,
          accumulatedNpcRelationships: parentAccumulatedNpcRelationships,
          tone: story.tone,
          toneFeel: story.toneFeel,
          toneAvoid: story.toneAvoid,
          spine: story.spine,
          apiKey,
          logContext,
          onGenerationStage,
        })
      : null;

  // --- Merge results ---
  let result = mergePageWriterAndReconciledStateWithAnalystResults(
    writerResult,
    reconciliation,
    analystResult
  );

  // --- Handle spine deviation (two-tier: spine then beats) ---
  const spineDeviationResult = await handleSpineDeviationIfDetected({
    analystResult,
    story,
    apiKey,
    logContext,
  });
  const storyAfterSpine = spineDeviationResult.updatedStory;

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
          analystResult?.narrativeSummary ?? ''
        ),
      };
    }
  }

  // --- Handle deviation ---
  const newPageId = isOpening ? parsePageId(1) : generatePageId(maxPageId!);

  const { storyForPage, activeStructureVersion, deviationInfo: rawDeviationInfo } =
    await handleDeviationIfDetected({
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

  // --- Structure progression ---
  const progressedState = resolveStructureProgression({
    activeStructureVersion,
    storyStructure: story.structure,
    parentStructureState,
    beatConcluded,
    beatResolution,
  });

  // --- Pacing response ---
  const newStructureState = applyPacingResponse({
    deviationInfo,
    structureState: progressedState,
    recommendedAction: result.recommendedAction ?? 'none',
    pacingIssueReason: result.pacingIssueReason ?? '',
  });

  // --- NPC agenda resolver ---
  const agendaResolverResult = await resolveNpcAgendas({
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
    analystNpcCoherenceIssues: analystResult?.npcCoherenceIssues,
    parentAccumulatedNpcRelationships,
    analystRelationshipShifts: analystResult?.relationshipShiftsDetected,
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

  // --- Build page ---
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
    parentAccumulatedPromises: parentPage?.accumulatedPromises ?? [],
    analystPromisesDetected: analystResult?.promisesDetected ?? [],
    analystPromisesResolved: analystResult?.promisesResolved ?? [],
    parentAccumulatedNpcAgendas,
    npcAgendaUpdates: agendaResolverResult?.updatedAgendas,
    parentAccumulatedNpcRelationships,
    npcRelationshipUpdates: agendaResolverResult?.updatedRelationships,
    pageActIndex: parentStructureState.currentActIndex,
    pageBeatIndex: parentStructureState.currentBeatIndex,
  });

  // --- Update canon ---
  const updatedStory = updateStoryWithAllCanon(
    storyForPage,
    result.newCanonFacts,
    result.newCharacterCanonFacts
  );

  return { page, updatedStory, deviationInfo };
}
