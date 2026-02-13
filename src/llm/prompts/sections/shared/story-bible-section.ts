import type { StoryBible } from '../../../lorekeeper-types.js';

export function formatStoryBibleSection(bible: StoryBible): string {
  let result = '=== STORY BIBLE (curated for this scene) ===\n\n';

  if (bible.sceneWorldContext) {
    result += `SCENE WORLD CONTEXT:\n${bible.sceneWorldContext}\n\n`;
  }

  if (bible.relevantCharacters.length > 0) {
    result += 'SCENE CHARACTERS:\n';
    for (const char of bible.relevantCharacters) {
      result += `[${char.name}] (${char.role})\n`;
      result += `  Profile: ${char.relevantProfile}\n`;
      result += `  Speech: ${char.speechPatterns}\n`;
      result += `  Relationship to protagonist: ${char.protagonistRelationship}\n`;
      if (char.interCharacterDynamics) {
        result += `  Inter-character dynamics: ${char.interCharacterDynamics}\n`;
      }
      result += `  Current state: ${char.currentState}\n\n`;
    }
  }

  if (bible.relevantCanonFacts.length > 0) {
    result += `RELEVANT CANON FACTS:\n${bible.relevantCanonFacts.map((f) => `- ${f}`).join('\n')}\n\n`;
  }

  if (bible.relevantHistory) {
    result += `RELEVANT HISTORY:\n${bible.relevantHistory}\n\n`;
  }

  return result;
}
