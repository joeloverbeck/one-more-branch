import type { BeatProgression, StoryBeat, StoryStructure } from '../models/story-arc';

/**
 * Parses beat ID (e.g., "1.2") into act and beat indices.
 * Returns null for invalid formats.
 */
export function parseBeatIndices(beatId: string): { actIndex: number; beatIndex: number } | null {
  const beatIdMatch = /^(\d+)\.(\d+)$/.exec(beatId);
  if (!beatIdMatch) {
    return null;
  }

  const actIndex = Number(beatIdMatch[1]) - 1;
  const beatIndex = Number(beatIdMatch[2]) - 1;

  if (actIndex < 0 || beatIndex < 0) {
    return null;
  }

  return { actIndex, beatIndex };
}

/**
 * Gets a beat from structure, throwing if indices are invalid.
 */
export function getBeatOrThrow(structure: StoryStructure, actIndex: number, beatIndex: number): StoryBeat {
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

/**
 * Updates or inserts a beat progression into a collection.
 * Returns a new array (immutable).
 */
export function upsertBeatProgression(
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
