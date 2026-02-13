import { generateAgendaResolver } from '../llm';
import type { AgendaResolverResult } from '../llm';
import type { ActiveState } from '../models/state/active-state';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { AccumulatedStructureState, StoryStructure } from '../models/story-arc';
import type { Npc } from '../models/npc';
import type { VersionedStoryStructure } from '../models/structure-version';
import { logger } from '../logging/index.js';
import { emitGenerationStage } from './generation-pipeline-helpers.js';
import type { GenerationStageCallback } from './types';

export interface NpcAgendaContext {
  readonly npcs: readonly Npc[] | undefined;
  readonly writerNarrative: string;
  readonly writerSceneSummary: string;
  readonly parentAccumulatedNpcAgendas: AccumulatedNpcAgendas;
  readonly currentStructureVersion: VersionedStoryStructure | null;
  readonly storyStructure: StoryStructure | null;
  readonly parentStructureState: AccumulatedStructureState;
  readonly parentActiveState: ActiveState;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export async function resolveNpcAgendas(
  context: NpcAgendaContext,
): Promise<AgendaResolverResult | null> {
  if (!context.npcs || context.npcs.length === 0) {
    return null;
  }

  try {
    emitGenerationStage(context.onGenerationStage, 'RESOLVING_AGENDAS', 'started', 1);
    const result = await generateAgendaResolver(
      {
        narrative: context.writerNarrative,
        sceneSummary: context.writerSceneSummary,
        npcs: context.npcs,
        currentAgendas: context.parentAccumulatedNpcAgendas,
        structure:
          context.currentStructureVersion?.structure ?? context.storyStructure ?? undefined,
        accumulatedStructureState: context.parentStructureState,
        activeState: context.parentActiveState,
      },
      context.npcs,
      { apiKey: context.apiKey },
    );
    emitGenerationStage(context.onGenerationStage, 'RESOLVING_AGENDAS', 'completed', 1);
    return result;
  } catch (error) {
    logger.warn('Agenda resolver failed, continuing without agenda updates', { error });
    return null;
  }
}
