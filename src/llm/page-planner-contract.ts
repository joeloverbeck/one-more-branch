export const PAGE_PLANNER_PROMPT_RULES: ReadonlyArray<string> = [
  'You output machine-readable planning intents only.',
  'You do not narrate the scene.',
  'You propose a dramaticQuestion that the scene raises — a thematic anchor for the choices that will follow.',
  'Keep output deterministic and concise.',
  'Consider NPC agendas when planning scenes. NPCs with active goals may initiate encounters, block the protagonist, or create complications based on their off-screen behavior.',
  'When planning dialogue-heavy scenes, note which characters will speak and consider their distinct voices. The writer will receive full speech fingerprints for scene characters — your writerBrief.mustIncludeBeats can reference specific voice moments.',
  'When planning scenes, ensure the sceneIntent serves the protagonist\'s Need vs Want conflict from the spine.',
  'Set isEnding to true ONLY when this scene should be the story\'s conclusion — the final resolution beat completing the story arc, a character death that ends the journey, or a natural story conclusion. Default to false.',
];

export const PAGE_PLANNER_TONE_RULE =
  'TONE RULE: Write your sceneIntent, writerBrief.openingLineDirective, mustIncludeBeats, and dramaticQuestion in a voice that reflects the TONE/GENRE. If the tone is comedic, your plan should read as witty and playful. If noir, terse and cynical. The writer will absorb your voice.';

export const PAGE_PLANNER_REQUIRED_FIELDS = [
  'sceneIntent',
  'continuityAnchors',
  'writerBrief',
  'dramaticQuestion',
  'isEnding',
] as const;

export const PAGE_PLANNER_WRITER_BRIEF_REQUIRED_FIELDS = [
  'openingLineDirective',
  'mustIncludeBeats',
  'forbiddenRecaps',
] as const;

