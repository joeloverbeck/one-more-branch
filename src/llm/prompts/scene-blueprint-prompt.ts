import { CONTENT_POLICY } from '../content-policy.js';
import type { SceneBlueprintContext } from '../scene-blueprint-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildToneDirective } from './sections/shared/tone-block.js';
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';

const BLUEPRINT_ROLE_INTRO = `You are a Scene Architect for an interactive branching story. Your role is to design the internal paragraph-level structure of a scene BEFORE the writer composes prose.

You work from Dwight Swain's Scene-Sequel model:
- SCENE units follow Goal \u2192 Conflict \u2192 Disaster
- SEQUEL units follow Reaction \u2192 Dilemma \u2192 Decision
- Not every scene uses all six; pick what serves THIS scene

Each unit you produce maps to a Motivation-Reaction Unit (MRU):
- MOTIVATION: An external event/stimulus the protagonist perceives
- REACTION: The protagonist's internal response (feeling \u2192 reflex \u2192 action \u2192 speech)
- MIXED: Rapid exchanges where motivation and reaction interleave (dialogue, combat)`;

const STRUCTURAL_RULES = `STRUCTURAL RULES:
- Produce 4-8 units for a normal scene, 2-4 for an ending scene
- Each unit specifies a concrete sensory anchor (dominant sense + specific image)
- Emotional register MUST vary across units \u2014 no monotone scenes
- No more than 2 consecutive units at the same intensity level
- Every sceneMandates entry MUST appear in exactly one unit's mandateMapping
- The emotionalArc should show a clear trajectory, not a flat line
- paragraphWeight across all units should sum to 6-12 for normal scenes, 4-8 for endings
- Do NOT write prose. Output structured planning only
- The blueprint must create internal scene movement \u2014 setup, complication, shift \u2014 not a flat sequence at the same emotional pitch`;

const SCENE_ARCHITECTURE_RULES = `SCENE ARCHITECTURE RULES:
- At least one unit must produce a material, player-legible change (not atmospheric intensification alone)
- Each escalation unit must be tied to a concrete observable change
- Assign speaking characters to specific units when dialogue is planned
- Honor forbiddenRecaps \u2014 no unit should re-describe forbidden content`;

const CONTINUATION_ARCHITECTURE_RULES = `- Unit 1 must address the player's choice directly and immediately
- Final unit must create a concrete choiceable situation (unless isEnding)
- Inherited mood from previous scene may appear as a brief element in unit 1, not a full unit`;

const OPENING_ARCHITECTURE_RULES = `- Units 1-2 must establish orientation (where the protagonist is, what is happening, what immediate pressure is active)
- One unit must introduce the protagonist through action, reaction, or behavior \u2014 not descriptive exposition
- Final unit must create a concrete choiceable situation
- If an opening image contract is provided, assign it to a specific unit's sensory anchor`;

function buildBlueprintSystemPrompt(
  tone?: string,
  toneFeel?: readonly string[],
  toneAvoid?: readonly string[]
): string {
  const sections: string[] = [BLUEPRINT_ROLE_INTRO];

  if (tone) {
    sections.push(buildToneDirective(tone, toneFeel, toneAvoid));
  }

  sections.push(CONTENT_POLICY, STRUCTURAL_RULES, SCENE_ARCHITECTURE_RULES);
  return sections.join('\n\n');
}

function formatMandatesSection(mandates: readonly string[]): string {
  if (mandates.length === 0) return 'Scene Mandates: (none)';
  return `Scene Mandates (each MUST appear in exactly one unit's mandateMapping):
${mandates.map((m) => `- ${m}`).join('\n')}`;
}

function formatForbiddenRecapsSection(recaps: readonly string[]): string {
  if (recaps.length === 0) return '';
  return `\nForbidden Recaps (no unit may re-describe these):
${recaps.map((r) => `- ${r}`).join('\n')}`;
}

export function buildSceneBlueprintPrompt(context: SceneBlueprintContext): ChatMessage[] {
  const systemPrompt = buildBlueprintSystemPrompt(
    context.tone,
    context.toneFeel,
    context.toneAvoid
  );

  const plan = context.pagePlan;
  const spineSection = buildSpineSection(context.spine);
  const genreSection = buildGenreConventionsSection(context.genreFrame);

  const modeRules = context.isOpening
    ? OPENING_ARCHITECTURE_RULES
    : CONTINUATION_ARCHITECTURE_RULES;

  const storyBibleSection = context.storyBible
    ? `\n=== STORY BIBLE (curated for this scene) ===
Scene World Context: ${context.storyBible.sceneWorldContext}
Scene Characters:
${context.storyBible.relevantCharacters.map((c) => `- ${c.name} (${c.role}): ${c.relevantProfile}`).join('\n')}
`
    : '';

  const previousNarrativeSection = context.previousNarrative
    ? `\nPREVIOUS SCENE (for emotional register continuity):
${context.previousNarrative.slice(-1500)}
`
    : '';

  const choiceSection = context.selectedChoice
    ? `\nPLAYER'S CHOICE: "${context.selectedChoice}"\n`
    : '';

  const openingImageSection =
    context.isOpening && context.openingImage
      ? `\nOPENING IMAGE CONTRACT: ${context.openingImage}\n`
      : '';

  const userPrompt = `Design the paragraph-level structure for this scene.

${spineSection}${genreSection}
=== PLANNER OUTPUT ===
Scene Intent: ${plan.sceneIntent}
Dramatic Question: ${plan.dramaticQuestion}
Is Ending: ${plan.isEnding}
${formatMandatesSection(plan.sceneMandates)}${formatForbiddenRecapsSection(plan.forbiddenRecaps)}
${storyBibleSection}${previousNarrativeSection}${choiceSection}${openingImageSection}
=== MODE-SPECIFIC RULES ===
${modeRules}

Return JSON only.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}
