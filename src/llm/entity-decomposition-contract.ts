import type { DecomposedCharacter, SpeechFingerprint } from '../models/decomposed-character.js';

interface StringFieldSchemaDefinition {
  readonly type: 'string';
  readonly description: string;
}

interface StringArrayFieldSchemaDefinition {
  readonly type: 'array';
  readonly description: string;
}

interface NullableObjectFieldSchemaDefinition {
  readonly type: 'nullable_object';
  readonly description: string;
}

interface NullableEnumFieldSchemaDefinition {
  readonly type: 'nullable_enum';
  readonly description: string;
  readonly values: readonly string[];
}

type FieldSchemaDefinition =
  | StringFieldSchemaDefinition
  | StringArrayFieldSchemaDefinition
  | NullableObjectFieldSchemaDefinition
  | NullableEnumFieldSchemaDefinition;

type SchemaFieldMap<TKey extends string> = Record<TKey, FieldSchemaDefinition>;

export const SPEECH_SCHEMA_FIELDS: SchemaFieldMap<
  Exclude<keyof SpeechFingerprint, symbol | number>
> = {
  catchphrases: {
    type: 'array',
    description:
      'Signature phrases this character would repeat. ' +
      'Infer from personality, background, and speech style. 1-4 phrases.',
  },
  vocabularyProfile: {
    type: 'string',
    description:
      'Formality level, word preferences, jargon. ' +
      'E.g. "Formal and archaic, favors multi-syllable words, avoids contractions."',
  },
  sentencePatterns: {
    type: 'string',
    description:
      'Typical sentence structure. ' +
      'E.g. "Short, clipped sentences. Rarely uses questions. Favors imperative mood."',
  },
  verbalTics: {
    type: 'array',
    description:
      'Filler words, interjections, habitual speech markers. ' +
      'E.g. ["well,", "y\'see", "hmm"]. 0-4 items.',
  },
  dialogueSamples: {
    type: 'array',
    description:
      'Write 5-10 example lines this character would say, showing their unique voice in action. ' +
      'These can be invented or extracted from provided character descriptions/dialogue.',
  },
  metaphorFrames: {
    type: 'string',
    description:
      'Conceptual metaphors this character uses to understand the world. ' +
      'E.g. "Sees relationships as transactions: loyalty has a price, betrayal is theft. ' +
      'Treats problems like sieges: patient preparation, then overwhelming force." 1-2 sentences.',
  },
  antiExamples: {
    type: 'array',
    description:
      'Write 2-3 example lines showing how this character does NOT sound. ' +
      'These are voice boundary markers that define the edge of the voice.',
  },
  discourseMarkers: {
    type: 'array',
    description:
      'Conversational management patterns used to open turns, shift topics, self-correct, or close. ' +
      'Distinct from verbal tics. E.g. ["Look,", "Here is the thing-", "Bottom line:"]. 0-5 items.',
  },
  registerShifts: {
    type: 'string',
    description:
      'How this character\'s speech changes across context (stress, formality, intimacy). ' +
      'E.g. "Formal in public, clipped and profane under stress." 1-2 sentences.',
  },
};

export const CHARACTER_SCHEMA_FIELDS: SchemaFieldMap<
  Exclude<keyof Omit<DecomposedCharacter, 'speechFingerprint' | 'rawDescription'>, symbol | number>
> = {
  name: {
    type: 'string',
    description: 'Character name. For the protagonist, use the name from the character concept.',
  },
  coreTraits: {
    type: 'array',
    description: '3-5 defining personality traits. E.g. ["stubborn", "loyal", "sarcastic"].',
  },
  superObjective: {
    type: 'string',
    description:
      'The character\'s overarching dramatic goal — the single deepest drive that shapes all their actions. ' +
      'E.g. "To prove she deserves to exist on her own terms." 1 sentence.',
  },
  stakes: {
    type: 'array',
    description:
      'What this character stands to lose or gain. 2-4 concrete items. ' +
      'E.g. ["Her freedom if the pact is discovered", "The only family she has left"].',
  },
  pressurePoint: {
    type: 'string',
    description:
      'The vulnerability that could force this character to act against their own self-interest. ' +
      'E.g. "Threatening her daughter is the one thing that overrides her survival instinct." 1 sentence.',
  },
  personalDilemmas: {
    type: 'array',
    description:
      'Competing loyalties or values that create internal conflict. 1-3 items. ' +
      'E.g. ["Loyalty to her crew vs. duty to the crown", "Desire for revenge vs. promise to her mother"].',
  },
  emotionSalience: {
    type: 'nullable_enum',
    description:
      'How emotionally expressive this character is. LOW = stoic/guarded, MEDIUM = situationally expressive, HIGH = emotionally driven.',
    values: ['LOW', 'MEDIUM', 'HIGH'],
  },
  storyFunction: {
    type: 'nullable_enum',
    description:
      'This character\'s structural role in the story. ' +
      'ANTAGONIST: primary opposition. RIVAL: competing for same goal. ALLY: active support. ' +
      'MENTOR: guidance/wisdom. CATALYST: triggers change. OBSTACLE: blocks progress. ' +
      'FOIL: contrasts protagonist. TRICKSTER: disrupts order. INNOCENT: represents stakes.',
    values: [
      'ANTAGONIST', 'RIVAL', 'ALLY', 'MENTOR', 'CATALYST',
      'OBSTACLE', 'FOIL', 'TRICKSTER', 'INNOCENT',
    ],
  },
  narrativeRole: {
    type: 'string',
    description:
      'What this character DOES in the story — their functional contribution to the narrative. ' +
      'E.g. "Provides the protagonist access to the underworld" or "Forces the protagonist to confront their past." 1 sentence.',
  },
  thematicStance: {
    type: 'string',
    description:
      'How this character positions relative to the story thematic argument/value at stake. ' +
      '1 sentence expressing support, tension, contradiction, or transformation potential.',
  },
  protagonistRelationship: {
    type: 'nullable_object',
    description:
      'This NPC\'s relationship with the protagonist. null for the protagonist\'s own entry. ' +
      'For NPCs, describe the relationship with valence (-5 to +5), dynamic label, history, tension, and leverage.',
  },
  knowledgeBoundaries: {
    type: 'string',
    description:
      'What this character knows and does NOT know. Important for preventing ' +
      'information leaks between characters. 1-2 sentences.',
  },
  appearance: {
    type: 'string',
    description: 'Brief physical description. 1-2 sentences.',
  },
  decisionPattern: {
    type: 'string',
    description:
      'How this character approaches decisions and what they prioritize under pressure. 1-2 sentences.',
  },
  coreBeliefs: {
    type: 'array',
    description:
      '2-3 fundamental beliefs that drive this character\'s behavior. ' +
      'These should sound like things the character would think or say.',
  },
  conflictPriority: {
    type: 'string',
    description: 'When this character\'s goals conflict, what wins? One sentence.',
  },
  falseBeliefs: {
    type: 'array',
    description:
      'Things this character sincerely believes that are WRONG. Misconceptions, not lies. ' +
      'E.g. ["Believes the king is still alive", "Thinks magic is superstition"]. ' +
      'Empty array if no notable false beliefs.',
  },
  secretsKept: {
    type: 'array',
    description:
      'Things this character knows but actively conceals from others. ' +
      'E.g. ["Hiding their noble birth", "Knows the rebel hideout location"]. ' +
      'Empty array if no notable secrets.',
  },
  moralLine: {
    type: 'string',
    description:
      'The line this character will not cross. 1 sentence. ' +
      'E.g. "Will never harm a child, regardless of the stakes."',
  },
  worstFear: {
    type: 'string',
    description:
      'What would psychologically destroy this character. 1 sentence. ' +
      'E.g. "Being publicly revealed as the fraud she secretly believes herself to be."',
  },
  formativeWound: {
    type: 'string',
    description:
      'The defining early experience that shaped this character\'s defenses. 1-2 sentences. ' +
      'E.g. "Abandoned by her father at age seven, she learned that depending on others means getting hurt."',
  },
  misbelief: {
    type: 'string',
    description:
      'The false conclusion the character drew from their wound that distorts their worldview. 1 sentence. ' +
      'E.g. "Believes that showing vulnerability is always exploited."',
  },
  stressVariants: {
    type: 'nullable_object',
    description:
      'How voice changes under pressure — underThreat, inIntimacy, whenLying, whenAshamed, whenWinning. ' +
      'null if not yet determined.',
  },
  focalizationFilter: {
    type: 'nullable_object',
    description:
      'What this character notices first, systematically misses, and misreads. ' +
      'null if not yet determined.',
  },
  escalationLadder: {
    type: 'array',
    description:
      '3-5 ordered steps showing how this character escalates when blocked, from mildest to most extreme. ' +
      'Empty array if not yet determined.',
  },
  ruptureTriggers: {
    type: 'array',
    description:
      '1-3 specific events or revelations that would shatter the protagonist relationship. ' +
      'Empty array if not applicable.',
  },
  repairMoves: {
    type: 'array',
    description:
      '1-3 specific actions that could mend the protagonist relationship after damage. ' +
      'Empty array if not applicable.',
  },
};

export const SPEECH_REQUIRED_FIELDS = Object.keys(SPEECH_SCHEMA_FIELDS) as ReadonlyArray<
  keyof SpeechFingerprint
>;

export const CHARACTER_REQUIRED_FIELDS: ReadonlyArray<
  keyof Omit<DecomposedCharacter, 'speechFingerprint' | 'rawDescription'>
> = [
  'name',
  'coreTraits',
  'superObjective',
  'thematicStance',
  'protagonistRelationship',
  'knowledgeBoundaries',
  'appearance',
  'decisionPattern',
  'coreBeliefs',
  'conflictPriority',
  'falseBeliefs',
  'secretsKept',
  'stakes',
  'pressurePoint',
  'personalDilemmas',
  'emotionSalience',
  'storyFunction',
  'narrativeRole',
  'moralLine',
  'worstFear',
  'formativeWound',
  'misbelief',
  'stressVariants',
  'focalizationFilter',
  'escalationLadder',
  'ruptureTriggers',
  'repairMoves',
];

export const SPEECH_STRING_FIELDS: ReadonlyArray<keyof SpeechFingerprint> = [
  'vocabularyProfile',
  'sentencePatterns',
  'metaphorFrames',
  'registerShifts',
];

export const SPEECH_ARRAY_FIELDS: ReadonlyArray<keyof SpeechFingerprint> = [
  'catchphrases',
  'verbalTics',
  'dialogueSamples',
  'antiExamples',
  'discourseMarkers',
];

export const CHARACTER_STRING_FIELDS: ReadonlyArray<
  keyof Omit<
    DecomposedCharacter,
    'speechFingerprint' | 'rawDescription' | 'name' | 'protagonistRelationship'
  >
> = [
  'superObjective',
  'thematicStance',
  'knowledgeBoundaries',
  'appearance',
  'decisionPattern',
  'conflictPriority',
  'pressurePoint',
  'narrativeRole',
  'moralLine',
  'worstFear',
  'formativeWound',
  'misbelief',
];

export const CHARACTER_ARRAY_FIELDS: ReadonlyArray<
  keyof Omit<
    DecomposedCharacter,
    'speechFingerprint' | 'rawDescription' | 'name' | 'protagonistRelationship'
  >
> = [
  'coreTraits',
  'coreBeliefs',
  'falseBeliefs',
  'secretsKept',
  'stakes',
  'personalDilemmas',
  'escalationLadder',
  'ruptureTriggers',
  'repairMoves',
];

export const SPEECH_EXTRACTION_BULLETS: readonly string[] = [
  'Catchphrases: Signature phrases they would repeat based on personality and background',
  'Vocabulary profile: Formality level, word preferences, jargon usage, archaic vs modern',
  'Sentence patterns: Short/terse vs ornate, questions vs declarations, imperative vs passive',
  'Verbal tics: Filler words, interjections, habitual speech markers',
  'Dialogue samples: Write 5-10 example lines showing their unique voice in action (invented or extracted from provided descriptions/dialogue)',
  'Metaphor frames: Conceptual metaphors that shape how they describe the world (e.g. life as war, relationships as investments)',
  'Anti-examples: Write 2-3 lines showing how this character does NOT sound to enforce voice boundaries',
  'Discourse markers: Turn openers, topic shifts, self-corrections, and closers (distinct from filler tics)',
  'Register shifts: How speech changes under stress, formality, or intimacy',
];

export const AGENCY_PRINCIPLES: readonly string[] = [
  'DECISION PATTERN: Capture how each character makes choices under uncertainty and pressure. Identify whether they are impulsive, methodical, avoidant, or decisive, and what they optimize for.',
  'CORE BELIEFS: Extract 2-3 operational beliefs that this character truly acts on. These should be practical internal axioms, not abstract virtue labels.',
  'CONFLICT PRIORITY: State what wins when this character\'s goals conflict (for example loyalty vs survival, ambition vs duty).',
];
