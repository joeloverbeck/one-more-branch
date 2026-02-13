import type { Npc } from '../../models/npc.js';
import { formatNpcsForPrompt } from '../../models/npc.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildStructureSystemPrompt } from './system-prompt.js';
import { buildToneReminder } from './sections/shared/tone-block.js';

export interface StructureContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  npcs?: readonly Npc[];
  startingSituation?: string;
}

const STRUCTURE_FEW_SHOT_USER = `Generate a story structure before the first page.

CHARACTER CONCEPT:
A disgraced city guard seeking redemption

WORLDBUILDING:
A plague-ridden port city ruled by merchant houses and secret tribunals

TONE/GENRE: grim political fantasy`;

const STRUCTURE_FEW_SHOT_ASSISTANT = `{
  "overallTheme": "Redeem a stained name by exposing the city tribunal's crimes",
  "premise": "A disgraced guard must infiltrate the tribunal that framed her to uncover proof of their corruption before they execute her as a scapegoat.",
  "pacingBudget": { "targetPagesMin": 20, "targetPagesMax": 40 },
  "acts": [
    {
      "name": "Ashes of Trust",
      "objective": "Force the protagonist into a dangerous comeback",
      "stakes": "Failure means execution as a convenient scapegoat",
      "entryCondition": "The protagonist is blamed for a public murder",
      "beats": [
        {
          "name": "A Bargain in Smoke",
          "description": "A former ally offers proof of a frame-up in exchange for protection",
          "objective": "Decide whether to trust an ally tied to the tribunal",
          "role": "setup"
        },
        {
          "name": "Ledgers in the Dark",
          "description": "The protagonist steals sealed court ledgers from a guarded archive",
          "objective": "Secure evidence before the tribunal can destroy it",
          "role": "turning_point"
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
          "name": "Proof for the Faithless",
          "description": "Rival houses demand proof before committing support",
          "objective": "Win backing without revealing all leverage",
          "role": "escalation"
        },
        {
          "name": "The Rigged Hearing",
          "description": "The protagonist is cornered into a public hearing rigged by enemies",
          "objective": "Survive the hearing and force hidden evidence into the open",
          "role": "turning_point"
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
          "name": "Fractured Oaths",
          "description": "A final alliance fractures over how far justice should go",
          "objective": "Choose between revenge and legitimate accountability",
          "role": "turning_point"
        },
        {
          "name": "Harbor Court Reckoning",
          "description": "The protagonist confronts the tribunal leadership at the old harbor court",
          "objective": "End the conspiracy while preserving a future worth protecting",
          "role": "resolution"
        }
      ]
    }
  ]
}`;

export function buildStructurePrompt(
  context: StructureContext,
  options?: PromptOptions
): ChatMessage[] {
  const worldSection = context.worldbuilding ? `WORLDBUILDING:\n${context.worldbuilding}\n\n` : '';

  const npcsSection =
    context.npcs && context.npcs.length > 0
      ? `NPCS (Available Characters):\n${formatNpcsForPrompt(context.npcs)}\n\n`
      : '';

  const startingSituationSection = context.startingSituation
    ? `STARTING SITUATION:\n${context.startingSituation}\n\n`
    : '';

  const userPrompt = `Generate a story structure before the first page.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}${startingSituationSection}TONE/GENRE: ${context.tone}

REQUIREMENTS (follow ALL):
1. Return exactly 3 acts following setup, confrontation, and resolution.
2. For each act, include 2-4 beats that function as flexible milestones, not rigid gates.
3. Ensure beats are branching-aware so different player choices can still plausibly satisfy them.
4. Reflect the character concept in the protagonist's journey, conflicts, and opportunities.
5. Use worldbuilding details to shape stakes, pressures, and act entry conditions.
6. Calibrate the entire story architecture to the specified TONE/GENRE:
   - Act names, beat names, and descriptions should reflect the tone (comedic tones get playful names, noir gets terse names, etc.)
   - Stakes and conflicts should match the tone's emotional register (comedic stakes can be absurd, horror stakes visceral)
   - The overall theme should harmonize with the tone, not fight against it
7. Generate toneKeywords (3-5 words capturing the target feel) and toneAntiKeywords (3-5 words the tone should avoid).
8. Design structure pacing suitable for a 15-50 page interactive story.
9. Design beats with clear dramatic roles:
   - At least one beat in Act 1 should be a "turning_point" representing a point of no return
   - The midpoint of the story (typically late Act 1 or mid Act 2) should include a reveal or reversal that reframes prior events
   - Act 3 should include a "turning_point" beat representing a crisis -- an impossible choice or sacrifice
   - Use "setup" for establishing beats, "escalation" for rising tension, "turning_point" for irreversible changes, "resolution" for denouement
10. Write a premise: a 1-2 sentence hook capturing the core dramatic question the story explores.
11. Set a pacing budget (targetPagesMin and targetPagesMax) appropriate for the story's scope.
12. For each NPC, generate an initial agenda with currentGoal, leverage, fear, and offScreenBehavior. Keep each field to 1 sentence. Align with story tone and act structure. If no NPCs are defined, return an empty array.

${buildToneReminder(context.tone)}

OUTPUT SHAPE:
- overallTheme: string
- premise: string (1-2 sentence story hook)
- pacingBudget: { targetPagesMin: number, targetPagesMax: number }
- toneKeywords: array of 3-5 strings (words capturing the target feel)
- toneAntiKeywords: array of 3-5 strings (words the tone should avoid)
- initialNpcAgendas: array of NPC agendas (empty array if no NPCs)
  - each agenda has:
    - npcName: exact NPC name from definitions
    - currentGoal: 1 sentence
    - leverage: 1 sentence
    - fear: 1 sentence
    - offScreenBehavior: 1 sentence
- acts: exactly 3 items
- each act has:
  - name: evocative act title
  - objective: main goal for the act
  - stakes: consequence of failure
  - entryCondition: what triggers transition into this act
  - beats: 2-4 items
    - each beat has:
      - name: short evocative beat title
      - description: what should happen in this beat
      - objective: specific protagonist goal for the beat
      - role: "setup" | "escalation" | "turning_point" | "resolution"`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildStructureSystemPrompt(context.tone) },
  ];

  if (options?.fewShotMode && options.fewShotMode !== 'none') {
    messages.push(
      { role: 'user', content: STRUCTURE_FEW_SHOT_USER },
      { role: 'assistant', content: STRUCTURE_FEW_SHOT_ASSISTANT }
    );
  }

  messages.push({ role: 'user', content: userPrompt });
  return messages;
}
