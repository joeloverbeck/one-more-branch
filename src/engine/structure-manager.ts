import {
  AccumulatedStructureState,
  BeatProgression,
  StoryAct,
  StoryBeat,
  StoryStructure,
} from '../models/story-arc';

export interface StructureProgressionResult {
  updatedState: AccumulatedStructureState;
  actAdvanced: boolean;
  beatAdvanced: boolean;
  isComplete: boolean;
}

export interface StructureGenerationResult {
  overallTheme: string;
  acts: Array<{
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{
      description: string;
      objective: string;
    }>;
  }>;
  rawResponse: string;
}

function getBeatOrThrow(structure: StoryStructure, actIndex: number, beatIndex: number): StoryBeat {
  const act = structure.acts[actIndex];
  if (!act) {
    throw new Error(`Invalid currentActIndex: ${actIndex}`);
  }

  const beat = act.beats[beatIndex];
  if (!beat) {
    throw new Error(`Invalid currentBeatIndex: ${beatIndex} for act ${act.id}`);
  }

  return beat;
}

function upsertBeatProgression(
  beatProgressions: readonly BeatProgression[],
  nextProgression: BeatProgression,
): BeatProgression[] {
  let found = false;
  const updated = beatProgressions.map(progression => {
    if (progression.beatId !== nextProgression.beatId) {
      return { ...progression };
    }

    found = true;
    return nextProgression;
  });

  if (!found) {
    updated.push(nextProgression);
  }

  return updated;
}

/**
 * Creates StoryStructure from raw generation result.
 * Assigns hierarchical IDs to beats (e.g., "1.1", "1.2", "2.1").
 */
export function createStoryStructure(result: StructureGenerationResult): StoryStructure {
  const acts: StoryAct[] = result.acts.map((actData, actIndex) => {
    const actId = String(actIndex + 1);
    const beats: StoryBeat[] = actData.beats.map((beatData, beatIndex) => ({
      id: `${actId}.${beatIndex + 1}`,
      description: beatData.description,
      objective: beatData.objective,
    }));

    return {
      id: actId,
      name: actData.name,
      objective: actData.objective,
      stakes: actData.stakes,
      entryCondition: actData.entryCondition,
      beats,
    };
  });

  return {
    acts,
    overallTheme: result.overallTheme,
    generatedAt: new Date(),
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
  };
}

/**
 * Advances the structure state when a beat is concluded.
 * Returns immutable updated state.
 */
export function advanceStructureState(
  structure: StoryStructure,
  currentState: AccumulatedStructureState,
  beatResolution: string,
): StructureProgressionResult {
  const resolution = beatResolution.trim();
  if (!resolution) {
    throw new Error('Cannot advance structure without a non-empty beat resolution');
  }

  const currentBeat = getBeatOrThrow(
    structure,
    currentState.currentActIndex,
    currentState.currentBeatIndex,
  );

  const concludedProgressions = upsertBeatProgression(currentState.beatProgressions, {
    beatId: currentBeat.id,
    status: 'concluded',
    resolution,
  });

  const currentAct = structure.acts[currentState.currentActIndex];
  if (!currentAct) {
    throw new Error(`Invalid currentActIndex: ${currentState.currentActIndex}`);
  }

  const isLastBeatOfAct = currentState.currentBeatIndex === currentAct.beats.length - 1;
  const isLastAct = currentState.currentActIndex === structure.acts.length - 1;

  if (isLastBeatOfAct && isLastAct) {
    return {
      updatedState: {
        currentActIndex: currentState.currentActIndex,
        currentBeatIndex: currentState.currentBeatIndex,
        beatProgressions: concludedProgressions,
      },
      actAdvanced: false,
      beatAdvanced: false,
      isComplete: true,
    };
  }

  const nextActIndex = isLastBeatOfAct ? currentState.currentActIndex + 1 : currentState.currentActIndex;
  const nextBeatIndex = isLastBeatOfAct ? 0 : currentState.currentBeatIndex + 1;
  const nextBeat = getBeatOrThrow(structure, nextActIndex, nextBeatIndex);

  const activatedProgressions = upsertBeatProgression(concludedProgressions, {
    beatId: nextBeat.id,
    status: 'active',
  });

  return {
    updatedState: {
      currentActIndex: nextActIndex,
      currentBeatIndex: nextBeatIndex,
      beatProgressions: activatedProgressions,
    },
    actAdvanced: isLastBeatOfAct,
    beatAdvanced: true,
    isComplete: false,
  };
}

/**
 * Applies structure state inheritance (parent -> child page).
 * If beatConcluded, advances the state.
 */
export function applyStructureProgression(
  structure: StoryStructure,
  parentState: AccumulatedStructureState,
  beatConcluded: boolean,
  beatResolution: string,
): AccumulatedStructureState {
  if (!beatConcluded) {
    return parentState;
  }

  const result = advanceStructureState(structure, parentState, beatResolution);
  return result.updatedState;
}
