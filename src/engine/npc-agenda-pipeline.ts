import { generateAgendaResolver } from '../llm';
import type { AgendaResolverResult } from '../llm';
import type { DecomposedCharacter } from '../models/decomposed-character';
import type { ActiveState } from '../models/state/active-state';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { AccumulatedNpcRelationships } from '../models/state/npc-relationship';
import type { DetectedRelationshipShift } from '../llm/analyst-types';
import type { StoryStructure } from '../models/story-arc';
import type { Npc } from '../models/npc';
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
  readonly npcs: readonly Npc[] | undefined;
  readonly decomposedCharacters?: readonly DecomposedCharacter[];
  readonly writerNarrative: string;
  readonly writerSceneSummary: string;
  readonly parentAccumulatedNpcAgendas: AccumulatedNpcAgendas;
  readonly currentStructureVersion: VersionedStoryStructure | null;
  readonly storyStructure: StoryStructure | null;
  readonly parentActiveState: ActiveState;
  readonly analystNpcCoherenceIssues?: string;
  readonly parentAccumulatedNpcRelationships?: AccumulatedNpcRelationships;
  readonly analystRelationshipShifts?: readonly DetectedRelationshipShift[];
  readonly deviationContext?: DeviationContextForAgendas;
  readonly tone?: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
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
        analystNpcCoherenceIssues: context.analystNpcCoherenceIssues,
        currentRelationships: context.parentAccumulatedNpcRelationships,
        analystRelationshipShifts: context.analystRelationshipShifts,
        deviationContext: context.deviationContext,
        tone: context.tone,
        toneFeel: context.toneFeel,
        toneAvoid: context.toneAvoid,
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
