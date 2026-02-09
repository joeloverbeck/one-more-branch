import { formatNpcsForPrompt } from '../../models/npc.js';
import { buildFewShotMessages } from '../examples.js';
import type { ChatMessage, OpeningContext, PromptOptions } from '../types.js';
import { buildOpeningSystemPrompt, composeOpeningDataRules } from './system-prompt.js';

export function buildOpeningPrompt(
  context: OpeningContext,
  options?: PromptOptions,
): ChatMessage[] {
  const firstAct = context.structure?.acts[0];
  const firstBeat = firstAct?.beats[0];

  const dataRules = composeOpeningDataRules(options);

  const worldSection = context.worldbuilding
    ? `WORLDBUILDING:
${context.worldbuilding}

`
    : '';

  const npcsSection = context.npcs && context.npcs.length > 0
    ? `NPCS (Available Characters):
${formatNpcsForPrompt(context.npcs)}

These characters are available for use in the story. Introduce them when narratively appropriate - you don't need to include all of them, and you don't need to introduce them all in the opening.

`
    : '';

  const startingSituationSection = context.startingSituation
    ? `STARTING SITUATION:
${context.startingSituation}

Begin the story with this situation. This takes precedence over your creative decisions about how to open the narrative. Incorporate the specified scene, circumstances, or events exactly as described.

`
    : '';

  const structureSection =
    context.structure && firstAct && firstBeat
      ? `=== STORY STRUCTURE ===
Overall Theme: ${context.structure.overallTheme}

CURRENT ACT: ${firstAct.name}
Objective: ${firstAct.objective}
Stakes: ${firstAct.stakes}

CURRENT BEAT: ${firstBeat.description}
Beat Objective: ${firstBeat.objective}

Your task: Write the opening scene working toward this beat's objective.

`
      : '';

  const userPrompt = `Create the opening scene for a new interactive story.

=== DATA & STATE RULES ===
${dataRules}

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}${startingSituationSection}TONE/GENRE: ${context.tone}

${structureSection}REQUIREMENTS (follow all):
1. Introduce the protagonist in a compelling scene that reveals their personality through action
2. Establish the world and atmosphere matching the specified tone
3. Present an initial situation with immediate tension or intrigue that draws the player in
4. Provide 3 meaningful choices leading to genuinely DIFFERENT story directions (add a 4th only when the situation truly warrants another distinct path)
5. Establish starting inventory based on the character concept (use inventoryAdded for items they would logically possess)
6. If the character concept implies any starting physical conditions (old injuries, chronic ailments, exhaustion), use healthAdded to establish them
7. Capture the protagonist's emotional state at the END of this scene in protagonistAffect (what they feel, why, and what they want)
8. Set the initial LOCATION clearly (currentLocation field - where the protagonist is at the END of this opening scene)
9. Establish any starting THREATS using threatsAdded (dangers present at story start, format: "THREAT_ID: description")
10. Establish any starting CONSTRAINTS using constraintsAdded (limitations the protagonist faces, format: "CONSTRAINT_ID: description")
11. Plant narrative THREADS using threadsAdded (mysteries, questions, hooks for later, format: "THREAD_ID: description")

OPENING PAGE STATE:
Since this is the first page, you are ESTABLISHING the initial state, not modifying previous state:
- threatsRemoved, constraintsRemoved, threadsResolved should all be EMPTY arrays
- currentLocation should be set to wherever the scene ends
- Use the PREFIX_ID: description format for all added entries (e.g., "THREAT_BANDITS: Bandits spotted on the road")

Example opening state:
{
  "currentLocation": "Village marketplace at midday",
  "threatsAdded": [],
  "constraintsAdded": ["CONSTRAINT_DEADLINE: Must deliver the package by nightfall"],
  "threadsAdded": ["THREAD_PACKAGE: The package's contents are unknown"],
  "threatsRemoved": [],
  "constraintsRemoved": [],
  "threadsResolved": []
}

REMINDER: Each choice must be something this specific character would genuinely consider. Starting inventory should reflect the character's background and profession. Starting health conditions should only be added if the character concept explicitly mentions them. protagonistAffect should reflect how the scene leaves the protagonist feeling - this is a snapshot, not accumulated state.`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildOpeningSystemPrompt() },
  ];

  // Add few-shot examples if requested
  if (options?.fewShotMode && options.fewShotMode !== 'none') {
    messages.push(...buildFewShotMessages('opening', options.fewShotMode));
  }

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}
