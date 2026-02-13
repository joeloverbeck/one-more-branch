import { GlobalCanon, Story, mergeCanonFacts } from '../models';
import { mergeCharacterCanonFacts } from './character-canon-manager';

const NEGATION_PATTERNS = ['is not', 'does not', 'never', 'no longer', 'was destroyed', 'died'];

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'that',
  'the',
  'their',
  'to',
  'was',
  'were',
  'with',
]);

function hasNegationPattern(fact: string): boolean {
  return NEGATION_PATTERNS.some((pattern) => fact.includes(pattern));
}

function extractEntityTokens(fact: string): Set<string> {
  const normalized = fact.toLowerCase();
  const tokens = normalized.match(/[a-z0-9']+/g) ?? [];

  return new Set(tokens.filter((token) => token.length > 3 && !STOP_WORDS.has(token)));
}

export function updateStoryWithNewCanon(story: Story, newFacts: readonly string[]): Story {
  if (newFacts.length === 0) {
    return story;
  }

  const updatedCanon = mergeCanonFacts(story.globalCanon, [...newFacts]);
  if (updatedCanon === story.globalCanon) {
    return story;
  }

  return {
    ...story,
    globalCanon: updatedCanon,
    updatedAt: new Date(),
  };
}

/**
 * Updates story with new character canon facts from LLM response.
 * Character canon facts are keyed by character name and contain permanent facts about each character.
 */
export function updateStoryWithNewCharacterCanon(
  story: Story,
  newCharacterFacts: Record<string, readonly string[]>
): Story {
  if (Object.keys(newCharacterFacts).length === 0) {
    return story;
  }

  const updatedCharacterCanon = mergeCharacterCanonFacts(
    story.globalCharacterCanon,
    newCharacterFacts
  );

  if (updatedCharacterCanon === story.globalCharacterCanon) {
    return story;
  }

  return {
    ...story,
    globalCharacterCanon: updatedCharacterCanon,
    updatedAt: new Date(),
  };
}

/**
 * Updates story with both world canon and character canon facts from LLM response.
 * This is the primary function to use when processing generation results.
 */
export function updateStoryWithAllCanon(
  story: Story,
  worldFacts: readonly string[],
  characterFacts: Record<string, readonly string[]>
): Story {
  let updatedStory = updateStoryWithNewCanon(story, worldFacts);
  updatedStory = updateStoryWithNewCharacterCanon(updatedStory, characterFacts);
  return updatedStory;
}

export function formatCanonForPrompt(canon: GlobalCanon): string {
  if (canon.length === 0) {
    return '';
  }

  return canon.map((fact) => `• ${fact}`).join('\n');
}

export function mightContradictCanon(existingCanon: GlobalCanon, newFact: string): boolean {
  const normalizedNewFact = newFact.toLowerCase();
  const newFactHasNegation = hasNegationPattern(normalizedNewFact);
  const newFactTokens = extractEntityTokens(normalizedNewFact);

  for (const existingFact of existingCanon) {
    const normalizedExistingFact = existingFact.toLowerCase();
    const existingFactHasNegation = hasNegationPattern(normalizedExistingFact);

    if (existingFactHasNegation === newFactHasNegation) {
      continue;
    }

    const existingFactTokens = extractEntityTokens(normalizedExistingFact);
    const hasSharedContext = [...newFactTokens].some((token) => existingFactTokens.has(token));

    if (hasSharedContext) {
      return true;
    }
  }

  return false;
}

export function validateNewFacts(
  existingCanon: GlobalCanon,
  newFacts: readonly string[]
): string[] {
  return newFacts.filter((fact) => mightContradictCanon(existingCanon, fact));
}
