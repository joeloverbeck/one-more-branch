import { CHOICE_TYPE_VALUES, PRIMARY_DELTA_VALUES } from '../models/choice-enums.js';

export const PAGE_PLANNER_PROMPT_RULES: ReadonlyArray<string> = [
  'You output machine-readable planning intents only.',
  'You do not narrate the scene.',
  "You propose a dramaticQuestion that the scene raises and choiceIntents as a blueprint for the writer's choices.",
  'choiceIntents are suggestions, not final text. The writer may adjust wording and tags if the narrative warrants it.',
  'Keep output deterministic and concise.',
  'Consider NPC agendas when planning scenes. NPCs with active goals may initiate encounters, block the protagonist, or create complications based on their off-screen behavior.',
  'When planning dialogue-heavy scenes, note which characters will speak and consider their distinct voices. The writer will receive full speech fingerprints for scene characters — your writerBrief.mustIncludeBeats can reference specific voice moments.',
];

export const PAGE_PLANNER_TONE_RULE =
  'TONE RULE: Write your sceneIntent, writerBrief.openingLineDirective, mustIncludeBeats, and dramaticQuestion in a voice that reflects the TONE/GENRE. If the tone is comedic, your plan should read as witty and playful. If noir, terse and cynical. The writer will absorb your voice.';

export const PAGE_PLANNER_REQUIRED_FIELDS = [
  'sceneIntent',
  'continuityAnchors',
  'writerBrief',
  'dramaticQuestion',
  'choiceIntents',
] as const;

export const PAGE_PLANNER_WRITER_BRIEF_REQUIRED_FIELDS = [
  'openingLineDirective',
  'mustIncludeBeats',
  'forbiddenRecaps',
] as const;

export const PAGE_PLANNER_CHOICE_INTENT_REQUIRED_FIELDS = [
  'hook',
  'choiceType',
  'primaryDelta',
] as const;

export const PAGE_PLANNER_CHOICE_TYPE_ENUM = [...CHOICE_TYPE_VALUES];
export const PAGE_PLANNER_PRIMARY_DELTA_ENUM = [...PRIMARY_DELTA_VALUES];
