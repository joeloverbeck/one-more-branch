import type { DecomposedCharacter } from '../../../../models/decomposed-character.js';
import { formatSpeechFingerprintForWriter } from '../../../../models/decomposed-character.js';
import { normalizeForComparison } from '../../../../models/normalize.js';
import type { StoryBible } from '../../../lorekeeper-types.js';

/**
 * Builds a scene character voices section by matching lorekeeper-selected NPCs
 * to their full SpeechFingerprint from decomposedCharacters.
 * Falls back to the lorekeeper's compressed speechPatterns for unmatched NPCs.
 */
export function buildSceneCharacterVoicesSection(
  storyBible: StoryBible,
  protagonistName: string,
  decomposedCharacters?: readonly DecomposedCharacter[]
): string {
  if (storyBible.relevantCharacters.length === 0) {
    return '';
  }

  const normalizedProtagonistName = normalizeForComparison(protagonistName);

  const decomposedMap = new Map<string, DecomposedCharacter>();
  if (decomposedCharacters && decomposedCharacters.length > 0) {
    for (const dc of decomposedCharacters) {
      decomposedMap.set(normalizeForComparison(dc.name), dc);
    }
  }

  const voiceBlocks: string[] = [];

  for (const char of storyBible.relevantCharacters) {
    const normalizedName = normalizeForComparison(char.name);
    if (normalizedName === normalizedProtagonistName) {
      continue;
    }

    const matched = decomposedMap.get(normalizedName);
    if (matched) {
      voiceBlocks.push(
        `[${char.name}] SPEECH FINGERPRINT:\n${formatSpeechFingerprintForWriter(matched.speechFingerprint)}`
      );
    } else if (char.speechPatterns) {
      voiceBlocks.push(`[${char.name}] Speech: ${char.speechPatterns}`);
    }
  }

  if (voiceBlocks.length === 0) {
    return '';
  }

  return `NPC VOICE FINGERPRINTS (use these to write distinct NPC dialogue):\n${voiceBlocks.join('\n\n')}\n\n`;
}
