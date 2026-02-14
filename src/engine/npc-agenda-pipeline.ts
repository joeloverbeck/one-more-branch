import { generateAgendaResolver } from '../llm';
import type { AgendaResolverResult } from '../llm';
import type { DecomposedCharacter } from '../models/decomposed-character';
import type { ActiveState } from '../models/state/active-state';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { StoryStructure } from '../models/story-arc';
import type { Npc } from '../models/npc';
import type { VersionedStoryStructure } from '../models/structure-version';
import { logger } from '../logging/index.js';
import { emitGenerationStage } from './generation-pipeline-helpers.js';
import type { GenerationStageCallback } from './types';

export interface NpcAgendaContext {
  readonly npcs: readonly Npc[] | undefined;
  readonly decomposedCharacters?: readonly DecomposedCharacter[];
  readonly writerNarrative: string;
  readonly writerSceneSummary: string;
  readonly parentAccumulatedNpcAgendas: AccumulatedNpcAgendas;
  readonly currentStructureVersion: VersionedStoryStructure | null;
  readonly storyStructure: StoryStructure | null;
  readonly parentActiveState: ActiveState;
  readonly tone?: string;
  readonly toneKeywords?: readonly string[];
  readonly toneAntiKeywords?: readonly string[];
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export async function resolveNpcAgendas(
  context: NpcAgendaContext
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
        decomposedCharacters: context.decomposedCharacters,
        currentAgendas: context.parentAccumulatedNpcAgendas,
        structure:
          context.currentStructureVersion?.structure ?? context.storyStructure ?? undefined,
        activeState: context.parentActiveState,
        tone: context.tone,
        toneKeywords: context.toneKeywords,
        toneAntiKeywords: context.toneAntiKeywords,
      },
      context.npcs,
      { apiKey: context.apiKey }
    );
    emitGenerationStage(context.onGenerationStage, 'RESOLVING_AGENDAS', 'completed', 1);
    return result;
  } catch (error) {
    logger.warn('Agenda resolver failed, continuing without agenda updates', { error });
    return null;
  }
}
