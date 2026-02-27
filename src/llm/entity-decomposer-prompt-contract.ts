export const ENTITY_DECOMPOSER_CORE_PRINCIPLES: readonly string[] = [
  'TRAIT DECOMPOSITION: Extract 3-5 core personality traits as concise labels. These should be the traits that most influence behavior and dialogue.',
  "THEMATIC STANCE: For each character, state how they position relative to the story's thematic argument/value at stake. Capture whether they reinforce, resist, complicate, or evolve against the core thesis.",
  'KNOWLEDGE BOUNDARIES: Explicitly state what each character knows and does NOT know. This prevents information leaking between characters during generation.',
  'FALSE BELIEFS: Identify things each character sincerely believes that are WRONG. These are genuine misconceptions that should influence their reasoning and dialogue. A character who falsely believes the king is alive will act on that belief. Empty array if none.',
  'SECRETS KEPT: Identify things each character knows but actively conceals from others. A character hiding their noble birth will steer conversations away from lineage. Empty array if none.',
  "PROTAGONIST RELATIONSHIP: For each NPC, produce a structured relationship object describing their dynamic with the protagonist: valence (-5 to +5), dynamic label (mentor, rival, ally, etc.), 1-2 sentence history, current tension, and leverage. Set to null for the protagonist's own entry.",
  'PRESERVE NUANCE: Do not flatten complex characters into stereotypes. If the description contains contradictions or complexity, preserve that in the decomposition.',
  "INFER MISSING DETAILS: If the raw description implies speech patterns but doesn't state them explicitly, INFER them from the character's background, personality, and social context. A grizzled sailor speaks differently from a court diplomat.",
];

export const ENTITY_DECOMPOSER_USER_INSTRUCTIONS: readonly string[] = [
  'The FIRST character in the output array MUST be the protagonist (from CHARACTER CONCEPT)',
  'Remaining characters follow in NPC definition order',
  "For speech fingerprints: if the description explicitly describes how someone talks, use that. If not, INFER speech patterns from their personality, background, social class, and the story's tone/genre",
  'For worldbuilding facts: decompose into atomic propositions. If no worldbuilding is provided, return an empty worldFacts array',
  'Every character MUST have a distinct speech fingerprint - no two characters should sound alike',
  'For decision patterns and core beliefs: if not explicit, infer from behavior, background, and relationship dynamics',
  'Core beliefs should read like statements the character would actually think or say',
  "The protagonist's protagonistRelationship MUST be null. Each NPC MUST have a non-null protagonistRelationship describing their relationship with the protagonist",
  'For false beliefs: identify sincere misconceptions from character background and context',
  'For secrets: identify truths the character actively hides from others',
  "Every character MUST include thematicStance as one sentence about their relationship to the story's thematic argument/value at stake",
];
