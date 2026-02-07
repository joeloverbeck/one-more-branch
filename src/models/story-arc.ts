export type BeatStatus = 'pending' | 'active' | 'concluded';

export interface StoryBeat {
  readonly id: string;
  readonly description: string;
  readonly objective: string;
}

export interface StoryAct {
  readonly id: string;
  readonly name: string;
  readonly objective: string;
  readonly stakes: string;
  readonly entryCondition: string;
  readonly beats: readonly StoryBeat[];
}

export interface StoryStructure {
  readonly acts: readonly StoryAct[];
  readonly overallTheme: string;
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
}

export function createEmptyAccumulatedStructureState(): AccumulatedStructureState {
  return {
    currentActIndex: 0,
    currentBeatIndex: 0,
    beatProgressions: [],
  };
}

export function getCurrentAct(
  structure: StoryStructure,
  state: AccumulatedStructureState,
): StoryAct | undefined {
  return structure.acts[state.currentActIndex];
}

export function getCurrentBeat(
  structure: StoryStructure,
  state: AccumulatedStructureState,
): StoryBeat | undefined {
  return getCurrentAct(structure, state)?.beats[state.currentBeatIndex];
}

export function getBeatProgression(
  state: AccumulatedStructureState,
  beatId: string,
): BeatProgression | undefined {
  return state.beatProgressions.find(beatProgression => beatProgression.beatId === beatId);
}

export function isLastBeatOfAct(structure: StoryStructure, state: AccumulatedStructureState): boolean {
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
