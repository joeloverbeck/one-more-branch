import type { ConceptSpec } from '../../models/concept-generator.js';
import type { DecomposedCharacter } from '../../models/decomposed-character.js';
import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import type { DecomposedWorld } from '../../models/decomposed-world.js';
import { formatDecomposedWorldForPrompt } from '../../models/decomposed-world.js';
import type { StorySpine } from '../../models/story-spine.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildStructureSystemPrompt } from './system-prompt.js';
import { buildSpineSection } from './sections/shared/spine-section.js';

export interface StructureContext {
  tone: string;
  startingSituation?: string;
  spine?: StorySpine;
  decomposedCharacters: readonly DecomposedCharacter[];
  decomposedWorld: DecomposedWorld;
  conceptSpec?: ConceptSpec;
}

function buildCharacterSection(context: StructureContext): string {
  if (context.decomposedCharacters.length > 0) {
    const profiles = context.decomposedCharacters
      .map((char) => formatDecomposedCharacterForPrompt(char))
      .join('\n\n');
    return `CHARACTERS (decomposed profiles):\n${profiles}\n\n`;
  }
  return '';
}

function buildWorldSection(context: StructureContext): string {
  if (context.decomposedWorld.facts.length > 0) {
    return `${formatDecomposedWorldForPrompt(context.decomposedWorld)}\n\n`;
  }
  return '';
}

function buildToneFeelSection(context: StructureContext): string {
  const spine = context.spine;
  if (!spine) return '';

  const lines: string[] = [];
  if (spine.toneFeel.length > 0) {
    lines.push(`TONE FEEL (target atmosphere): ${spine.toneFeel.join(', ')}`);
  }
  if (spine.toneAvoid.length > 0) {
    lines.push(`TONE AVOID (must not drift toward): ${spine.toneAvoid.join(', ')}`);
  }
  return lines.length > 0 ? lines.join('\n') + '\n\n' : '';
}

function buildConceptStakesSection(conceptSpec?: ConceptSpec): string {
  if (!conceptSpec) {
    return '';
  }

  return `CONCEPT STAKES (use to ground your per-act stakes):
Personal stakes: ${conceptSpec.stakesPersonal}
Systemic stakes: ${conceptSpec.stakesSystemic}
Pressure source: ${conceptSpec.pressureSource}
Deadline mechanism: ${conceptSpec.deadlineMechanism}

Each act's stakes should escalate FROM these foundations. Act 1 stakes should connect to the personal dimension, Act 2 should compound both personal and systemic, Act 3 should put the systemic stakes at maximum risk.

`;
}

export function buildStructurePrompt(
  context: StructureContext,
  _options?: PromptOptions
): ChatMessage[] {
  const worldSection = buildWorldSection(context);
  const characterSection = buildCharacterSection(context);

  const startingSituationSection = context.startingSituation
    ? `STARTING SITUATION:\n${context.startingSituation}\n\n`
    : '';

  const spineSection = buildSpineSection(context.spine);
  const toneFeelSection = buildToneFeelSection(context);
  const conceptStakesSection = buildConceptStakesSection(context.conceptSpec);

  const userPrompt = `Generate a story structure before the first page.

${worldSection}${characterSection}${startingSituationSection}${spineSection}${toneFeelSection}${conceptStakesSection}TONE/GENRE: ${context.tone}

REQUIREMENTS (follow ALL):
1. Return 3-5 acts following setup, confrontation, and resolution. STRONGLY prefer 3 acts as the default. Only use 4 acts when the narrative complexity genuinely demands a fourth major movement. Use 5 acts only in exceptional cases where the story absolutely requires it.
2. For each act, include 2-4 beats that function as flexible milestones, not rigid gates.
3. Ensure beats are branching-aware so different player choices can still plausibly satisfy them.
4. Reflect the protagonist (first character profile) in the protagonist's journey, conflicts, and opportunities.
5. Use worldbuilding details to shape stakes, pressures, and act entry conditions.
6. Calibrate the entire story architecture to the specified TONE/GENRE:
   - Act names, beat names, and descriptions should reflect the tone (comedic tones get playful names, noir gets terse names, etc.)
   - Stakes and conflicts should match the tone's emotional register (comedic stakes can be absurd, horror stakes visceral)
   - The overall theme should harmonize with the tone, not fight against it
7. Design structure pacing suitable for a 15-50 page interactive story.
8. Design beats with clear dramatic roles:
   - At least one beat in Act 1 should be a "turning_point" representing a point of no return
   - The midpoint of the story (typically late Act 1 or mid Act 2) should include a reveal or reversal that reframes prior events
   - Act 3 should include a "turning_point" beat representing a crisis -- an impossible choice or sacrifice
   - Use "setup" for establishing beats, "escalation" for rising tension, "turning_point" for irreversible changes, "resolution" for denouement
9. Write a premise: a 1-2 sentence hook capturing the core dramatic question the story explores.
10. Set a pacing budget (targetPagesMin and targetPagesMax) appropriate for the story's scope.
11. For each NPC, generate an initial agenda with currentGoal, leverage, fear, and offScreenBehavior. Keep each field to 1 sentence. Align with story tone and act structure. If no NPCs are defined, return an empty array.

OUTPUT SHAPE:
- overallTheme: string
- premise: string (1-2 sentence story hook)
- pacingBudget: { targetPagesMin: number, targetPagesMax: number }
- initialNpcAgendas: array of NPC agendas (empty array if no NPCs)
  - each agenda has:
    - npcName: exact NPC name from definitions
    - currentGoal: 1 sentence
    - leverage: 1 sentence
    - fear: 1 sentence
    - offScreenBehavior: 1 sentence
- acts: 3-5 items
- each act has:
  - name: evocative act title
  - objective: main goal for the act
  - stakes: consequence of failure
  - entryCondition: what triggers transition into this act
  - beats: 2-4 items
    - each beat has:
      - name: short evocative beat title
      - description: what should happen in this beat
      - objective: the protagonist's specific goal for this beat. Write objectives that satisfy ALL of these criteria:
        1. Start with a concrete action verb (decide, secure, survive, negotiate, escape, confront, choose, reveal, infiltrate, convince)
        2. Name the obstacle or constraint that makes success non-trivial
        3. Imply a verifiable outcome — something observable as achieved or failed
        Good objectives:
          "Secure evidence before the tribunal can destroy it" (action: secure, obstacle: tribunal destroying evidence, verifiable: evidence obtained or not)
          "Convince the rival houses to commit support without revealing all leverage" (action: convince, obstacle: protecting leverage, verifiable: support gained or refused)
          "Survive the rigged hearing and force hidden evidence into the open" (action: survive + force, obstacle: rigged hearing, verifiable: survived and evidence exposed or not)
        Bad objectives (DO NOT write these):
          "Deal with the situation" (no specific action, no obstacle, nothing to verify)
          "Move the story forward" (meta-commentary, not a protagonist goal)
          "Experience the consequences" (passive, no action verb, unverifiable)
      - role: "setup" | "escalation" | "turning_point" | "resolution"`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildStructureSystemPrompt(context.tone) },
  ];

  messages.push({ role: 'user', content: userPrompt });
  return messages;
}
