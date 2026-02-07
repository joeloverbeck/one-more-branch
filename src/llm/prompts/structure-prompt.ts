import type { ChatMessage, PromptOptions } from '../types.js';
import { buildStructureSystemPrompt } from './system-prompt.js';

export interface StructureContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
}

const STRUCTURE_FEW_SHOT_USER = `Generate a story structure before the first page.

CHARACTER CONCEPT:
A disgraced city guard seeking redemption

WORLDBUILDING:
A plague-ridden port city ruled by merchant houses and secret tribunals

TONE/GENRE: grim political fantasy`;

const STRUCTURE_FEW_SHOT_ASSISTANT = `{
  "overallTheme": "Redeem a stained name by exposing the city tribunal's crimes",
  "acts": [
    {
      "name": "Ashes of Trust",
      "objective": "Force the protagonist into a dangerous comeback",
      "stakes": "Failure means execution as a convenient scapegoat",
      "entryCondition": "The protagonist is blamed for a public murder",
      "beats": [
        {
          "description": "A former ally offers proof of a frame-up in exchange for protection",
          "objective": "Decide whether to trust an ally tied to the tribunal"
        },
        {
          "description": "The protagonist steals sealed court ledgers from a guarded archive",
          "objective": "Secure evidence before the tribunal can destroy it"
        }
      ]
    },
    {
      "name": "Knives in Council",
      "objective": "Expose the network behind the frame-up while hunted",
      "stakes": "Failure lets the conspirators tighten martial law",
      "entryCondition": "The stolen ledgers reveal a list of compromised officials",
      "beats": [
        {
          "description": "Rival houses demand proof before committing support",
          "objective": "Win backing without revealing all leverage"
        },
        {
          "description": "The protagonist is cornered into a public hearing rigged by enemies",
          "objective": "Survive the hearing and force hidden evidence into the open"
        }
      ]
    },
    {
      "name": "The Broken Seal",
      "objective": "Resolve the conspiracy and define what redemption costs",
      "stakes": "Failure dooms the city to permanent authoritarian rule",
      "entryCondition": "Key conspirators are identified and vulnerable",
      "beats": [
        {
          "description": "A final alliance fractures over how far justice should go",
          "objective": "Choose between revenge and legitimate accountability"
        },
        {
          "description": "The protagonist confronts the tribunal leadership at the old harbor court",
          "objective": "End the conspiracy while preserving a future worth protecting"
        }
      ]
    }
  ]
}`;

export function buildStructurePrompt(
  context: StructureContext,
  options?: PromptOptions,
): ChatMessage[] {
  const worldSection = context.worldbuilding
    ? `WORLDBUILDING:\n${context.worldbuilding}\n\n`
    : '';

  const userPrompt = `Generate a story structure before the first page.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}TONE/GENRE: ${context.tone}

REQUIREMENTS (follow ALL):
1. Return exactly 3 acts following setup, confrontation, and resolution.
2. For each act, include 2-4 beats that function as flexible milestones, not rigid gates.
3. Ensure beats are branching-aware so different player choices can still plausibly satisfy them.
4. Reflect the character concept in the protagonist's journey, conflicts, and opportunities.
5. Use worldbuilding details to shape stakes, pressures, and act entry conditions.
6. Calibrate intensity and storytelling style to the specified tone.
7. Design structure pacing suitable for a 15-50 page interactive story.

OUTPUT SHAPE:
- overallTheme: string
- acts: exactly 3 items
- each act has:
  - name: evocative act title
  - objective: main goal for the act
  - stakes: consequence of failure
  - entryCondition: what triggers transition into this act
  - beats: 2-4 items
    - each beat has:
      - description: what should happen in this beat
      - objective: specific protagonist goal for the beat`;

  const messages: ChatMessage[] = [{ role: 'system', content: buildStructureSystemPrompt(options) }];

  if (options?.fewShotMode && options.fewShotMode !== 'none') {
    messages.push(
      { role: 'user', content: STRUCTURE_FEW_SHOT_USER },
      { role: 'assistant', content: STRUCTURE_FEW_SHOT_ASSISTANT },
    );
  }

  messages.push({ role: 'user', content: userPrompt });
  return messages;
}
