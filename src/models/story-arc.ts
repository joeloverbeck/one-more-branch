export type BeatStatus = 'pending' | 'active' | 'concluded';

export type BeatRole = 'setup' | 'escalation' | 'turning_point' | 'resolution';

export type EscalationType =
  | 'THREAT_ESCALATION'
  | 'REVELATION_SHIFT'
  | 'REVERSAL_OF_FORTUNE'
  | 'BETRAYAL_OR_ALLIANCE_SHIFT'
  | 'RESOURCE_OR_CAPABILITY_LOSS'
  | 'MORAL_OR_ETHICAL_PRESSURE'
  | 'TEMPORAL_OR_ENVIRONMENTAL_PRESSURE'
  | 'COMPLICATION_CASCADE'
  | 'COMPETENCE_DEMAND_SPIKE';

export type ApproachVector =
  | 'DIRECT_FORCE'
  | 'SWIFT_ACTION'
  | 'STEALTH_SUBTERFUGE'
  | 'ANALYTICAL_REASONING'
  | 'CAREFUL_OBSERVATION'
  | 'INTUITIVE_LEAP'
  | 'PERSUASION_INFLUENCE'
  | 'EMPATHIC_CONNECTION'
  | 'ENDURANCE_RESILIENCE'
  | 'SELF_EXPRESSION';

export interface StoryBeat {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly objective: string;
  readonly role: BeatRole;
  readonly escalationType: EscalationType | null;
  readonly uniqueScenarioHook: string | null;
  readonly approachVectors: readonly ApproachVector[] | null;
}

export interface StoryAct {
  readonly id: string;
  readonly name: string;
  readonly objective: string;
  readonly stakes: string;
  readonly entryCondition: string;
  readonly beats: readonly StoryBeat[];
}

export interface PacingBudget {
  readonly targetPagesMin: number;
  readonly targetPagesMax: number;
}

export interface StoryStructure {
  readonly acts: readonly StoryAct[];
  readonly overallTheme: string;
  readonly premise: string;
  readonly pacingBudget: PacingBudget;
  readonly generatedAt: Date;
}

export interface BeatProgression {
  readonly beatId: string;
  readonly status: BeatStatus;
  readonly resolution?: string;
}

export interface AccumulatedStructureState {
  readonly currentActIndex: number;
  readonly currentBeatIndex: number;
  readonly beatProgressions: readonly BeatProgression[];
  readonly pagesInCurrentBeat: number;
  readonly pacingNudge: string | null;
}

export function createEmptyAccumulatedStructureState(): AccumulatedStructureState {
  return {
    currentActIndex: 0,
    currentBeatIndex: 0,
    beatProgressions: [],
    pagesInCurrentBeat: 0,
    pacingNudge: null,
  };
}

/**
 * Creates initial AccumulatedStructureState for first page.
 * Sets first beat of first act as 'active', all others 'pending'.
 */
export function createInitialStructureState(structure: StoryStructure): AccumulatedStructureState {
  const beatProgressions: BeatProgression[] = [];

  structure.acts.forEach((act, actIdx) => {
    act.beats.forEach((beat, beatIdx) => {
      const isFirst = actIdx === 0 && beatIdx === 0;
      beatProgressions.push({
        beatId: beat.id,
        status: isFirst ? 'active' : 'pending',
      });
    });
  });

  return {
    currentActIndex: 0,
    currentBeatIndex: 0,
    beatProgressions,
    pagesInCurrentBeat: 0,
    pacingNudge: null,
  };
}

export function getCurrentAct(
  structure: StoryStructure,
  state: AccumulatedStructureState
): StoryAct | undefined {
  return structure.acts[state.currentActIndex];
}

export function getCurrentBeat(
  structure: StoryStructure,
  state: AccumulatedStructureState
): StoryBeat | undefined {
  return getCurrentAct(structure, state)?.beats[state.currentBeatIndex];
}

export function getBeatProgression(
  state: AccumulatedStructureState,
  beatId: string
): BeatProgression | undefined {
  return state.beatProgressions.find((beatProgression) => beatProgression.beatId === beatId);
}

export function isLastBeatOfAct(
  structure: StoryStructure,
  state: AccumulatedStructureState
): boolean {
  const currentAct = getCurrentAct(structure, state);
  if (!currentAct || currentAct.beats.length === 0) {
    return false;
  }

  return state.currentBeatIndex === currentAct.beats.length - 1;
}

export function isLastAct(structure: StoryStructure, state: AccumulatedStructureState): boolean {
  if (structure.acts.length === 0) {
    return false;
  }

  return state.currentActIndex === structure.acts.length - 1;
}

export interface BeatDeviation {
  readonly detected: true;
  readonly reason: string;
  readonly invalidatedBeatIds: readonly string[];
  readonly narrativeSummary: string;
}

export interface NoDeviation {
  readonly detected: false;
}

export type DeviationResult = BeatDeviation | NoDeviation;

export function isDeviation(result: DeviationResult): result is BeatDeviation {
  return result.detected === true;
}

export function isNoDeviation(result: DeviationResult): result is NoDeviation {
  return result.detected === false;
}

export function createBeatDeviation(
  reason: string,
  invalidatedBeatIds: readonly string[],
  narrativeSummary: string
): BeatDeviation {
  if (invalidatedBeatIds.length === 0) {
    throw new Error('BeatDeviation must have at least one invalidated beat ID');
  }

  return {
    detected: true,
    reason,
    invalidatedBeatIds,
    narrativeSummary,
  };
}

export function createNoDeviation(): NoDeviation {
  return { detected: false };
}

export function validateDeviationTargets(
  deviation: BeatDeviation,
  structureState: AccumulatedStructureState
): boolean {
  const concludedIds = new Set(
    structureState.beatProgressions
      .filter((beatProgression) => beatProgression.status === 'concluded')
      .map((beatProgression) => beatProgression.beatId)
  );

  return deviation.invalidatedBeatIds.every((beatId) => !concludedIds.has(beatId));
}
