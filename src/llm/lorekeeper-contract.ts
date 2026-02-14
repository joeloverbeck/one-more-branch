export const LOREKEEPER_REQUIRED_FIELDS = [
  'sceneWorldContext',
  'relevantCharacters',
  'relevantCanonFacts',
  'relevantHistory',
] as const;

export const LOREKEEPER_CHARACTER_REQUIRED_FIELDS = [
  'name',
  'role',
  'relevantProfile',
  'speechPatterns',
  'protagonistRelationship',
  'interCharacterDynamics',
  'currentState',
] as const;

export const LOREKEEPER_CURATION_PRINCIPLES: ReadonlyArray<string> = [
  "SELECTIVE INCLUSION: Only include characters, facts, history, and world details relevant to the planner's scene intent, continuity anchors, and dramatic question. The whole point is curation, not regurgitation.",
  'SPEECH PATTERN EXTRACTION: For each relevant character, synthesize HOW they speak. When structured character profiles with speech fingerprints are provided, use those as your primary source for voice data (catchphrases, vocabulary, verbal tics, sentence patterns, dialogue samples). Enrich with character canon facts AND actual dialogue found in recent narrative text. When only raw NPC definitions are available, extract speech patterns from personality descriptions and backstory. This must be thorough - idiosyncratic speech is critical for voice consistency.',
  "NARRATIVE CHRONOLOGY: The relevantHistory field must preserve causality chains and temporal ordering from ancestor summaries. Don't extract disconnected facts - build a narrative thread that shows how events led to the current moment.",
  'RELATIONSHIP DYNAMICS: Capture trust levels, power dynamics, emotional tensions, and unresolved interpersonal history between characters and the protagonist.',
  'INTER-CHARACTER DYNAMICS: When multiple characters share a scene, describe how they relate to EACH OTHER, not just to the protagonist.',
  "CURRENT STATE: Each character's emotional state and situation as they enter the scene, derived from accumulated character state entries and recent narrative.",
  'WORLD CONTEXT: When domain-tagged world facts are provided, use them as your primary worldbuilding source - they are pre-decomposed for efficient filtering by domain (geography, magic, society, etc.). Supplement with any runtime canon facts. When only raw worldbuilding text is available, extract relevant details manually. Include only what is physically, culturally, or socially relevant to THIS scene\'s location and events.',
  'NPC AGENDAS: For each relevant character, incorporate their current agenda (goal, leverage, fear, off-screen behavior) into the character profile. This informs how NPCs will act in the scene.',
  'TWO-SOURCE SYNTHESIS: You may receive two sources of truth: (a) structured character/world profiles (initial decomposition from story creation) and (b) runtime canon facts (discovered during gameplay). Prefer structured profiles for speech patterns, traits, relationships, and world rules. Use canon facts for runtime discoveries that supplement the initial decomposition.',
];
