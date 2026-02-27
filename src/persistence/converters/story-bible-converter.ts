/**
 * Converts StoryBible between domain model and file format.
 */

import type { StoryBible } from '../../llm/lorekeeper-types';
import type { StoryBibleFileData } from '../page-serializer-types';

export function storyBibleToFileData(storyBible: StoryBible | null): StoryBibleFileData | null {
  if (!storyBible) {
    return null;
  }
  return {
    sceneWorldContext: storyBible.sceneWorldContext,
    relevantCharacters: storyBible.relevantCharacters.map((c) => ({
      name: c.name,
      role: c.role,
      relevantProfile: c.relevantProfile,
      speechPatterns: c.speechPatterns,
      protagonistRelationship: c.protagonistRelationship,
      ...(c.interCharacterDynamics !== undefined
        ? { interCharacterDynamics: c.interCharacterDynamics }
        : {}),
      currentState: c.currentState,
    })),
    relevantCanonFacts: [...storyBible.relevantCanonFacts],
    relevantHistory: storyBible.relevantHistory,
  };
}

export function fileDataToStoryBible(data: StoryBibleFileData | null): StoryBible | null {
  if (!data) {
    return null;
  }
  return {
    sceneWorldContext: data.sceneWorldContext,
    relevantCharacters: data.relevantCharacters.map((c) => ({
      name: c.name,
      role: c.role,
      relevantProfile: c.relevantProfile,
      speechPatterns: c.speechPatterns,
      protagonistRelationship: c.protagonistRelationship,
      ...(c.interCharacterDynamics !== undefined
        ? { interCharacterDynamics: c.interCharacterDynamics }
        : {}),
      currentState: c.currentState,
    })),
    relevantCanonFacts: [...data.relevantCanonFacts],
    relevantHistory: data.relevantHistory,
  };
}
