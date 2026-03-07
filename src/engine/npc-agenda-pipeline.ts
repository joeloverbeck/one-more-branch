import { getStageModel } from '../config/stage-model.js';
import { generateAgendaResolver } from '../llm';
import type { AgendaResolverResult } from '../llm';
import type { StageDegradation } from '../llm/generation-pipeline-types';
import { withModelFallback } from '../llm/model-fallback.js';
import type { DecomposedCharacter } from '../models/decomposed-character';
import type { ActiveState } from '../models/state/active-state';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { AccumulatedNpcRelationships } from '../models/state/npc-relationship';
import type { AgendaResolverAnalystSignals } from '../llm/npc-intelligence-types';
import type { StoryStructure } from '../models/story-arc';
import type { StorySpine } from '../models/story-spine';
import type { VersionedStoryStructure } from '../models/structure-version';
import { logger } from '../logging/index.js';
import { emitGenerationStage } from './generation-pipeline-helpers.js';
import type { GenerationStageCallback } from './types';

export interface DeviationContextForAgendas {
  readonly reason: string;
  readonly newBeats: readonly {
    readonly name: string;
    readonly objective: string;
    readonly role: string;
  }[];
}

export interface NpcAgendaContext {
  readonly decomposedCharacters: readonly DecomposedCharacter[];
  readonly writerNarrative: string;
  readonly writerSceneSummary: string;
  readonly parentAccumulatedNpcAgendas: AccumulatedNpcAgendas;
  readonly currentStructureVersion: VersionedStoryStructure | null;
  readonly storyStructure: StoryStructure | null;
  readonly spine?: StorySpine;
  readonly parentActiveState: ActiveState;
  readonly analystSignals?: AgendaResolverAnalystSignals;
  readonly parentAccumulatedNpcRelationships?: AccumulatedNpcRelationships;
  readonly deviationContext?: DeviationContextForAgendas;
  readonly tone?: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface NpcAgendaResolverResult {
  readonly result: AgendaResolverResult | null;
  readonly durationMs: number | null;
  readonly degradation?: StageDegradation;
}

export async function resolveNpcAgendas(
  context: NpcAgendaContext
): Promise<NpcAgendaResolverResult> {
  if (context.decomposedCharacters.length <= 1) {
    return { result: null, durationMs: null }; // Only protagonist, no NPCs to resolve agendas for
  }

  const agendaStart = Date.now();
  try {
    emitGenerationStage(context.onGenerationStage, 'RESOLVING_AGENDAS', 'started', 1);
    const promptContext = {
      narrative: context.writerNarrative,
      sceneSummary: context.writerSceneSummary,
      decomposedCharacters: context.decomposedCharacters,
      currentAgendas: context.parentAccumulatedNpcAgendas,
      structure:
        context.currentStructureVersion?.structure ?? context.storyStructure ?? undefined,
      spine: context.spine,
      activeState: context.parentActiveState,
      analystSignals: context.analystSignals,
      currentRelationships: context.parentAccumulatedNpcRelationships,
      deviationContext: context.deviationContext,
      tone: context.tone,
      toneFeel: context.toneFeel,
      toneAvoid: context.toneAvoid,
    };
    const primaryModel = getStageModel('agendaResolver');
    const result = await withModelFallback(
      (m) =>
        generateAgendaResolver(promptContext, context.decomposedCharacters, {
          apiKey: context.apiKey,
          model: m,
        }),
      primaryModel,
      'agendaResolver',
    );
    const durationMs = Date.now() - agendaStart;
    emitGenerationStage(
      context.onGenerationStage,
      'RESOLVING_AGENDAS',
      'completed',
      1,
      durationMs
    );
    return { result, durationMs };
  } catch (error) {
    const durationMs = Date.now() - agendaStart;
    logger.warn('Agenda resolver failed, continuing without agenda updates', {
      error,
      durationMs,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      result: null,
      durationMs,
      degradation: {
        stage: 'agendaResolver',
        errorCode: 'LLM_FAILURE',
        message: errorMessage,
        durationMs,
      },
    };
  }
}
