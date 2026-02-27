import type { ConceptSpec, ConceptVerification } from '../../models/concept-generator.js';
import { getGenreObligationTags } from '../../models/genre-obligations.js';
import type { DecomposedCharacter } from '../../models/decomposed-character.js';
import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import type { DecomposedWorld } from '../../models/decomposed-world.js';
import { formatDecomposedWorldForPrompt } from '../../models/decomposed-world.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { StorySpine } from '../../models/story-spine.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildStructureSystemPrompt } from './system-prompt.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';

export interface StructureContext {
  tone: string;
  startingSituation?: string;
  spine?: StorySpine;
  decomposedCharacters: readonly DecomposedCharacter[];
  decomposedWorld: DecomposedWorld;
  conceptSpec?: ConceptSpec;
  storyKernel?: StoryKernel;
  conceptVerification?: ConceptVerification;
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

function buildSetpieceBankSection(verification?: ConceptVerification): string {
  if (!verification || verification.escalatingSetpieces.length === 0) {
    return '';
  }

  const numbered = verification.escalatingSetpieces
    .map((setpiece, i) => `${i + 1}. ${setpiece}`)
    .join('\n');

  return `CONCEPT-UNIQUE SETPIECE BANK (from upstream verification — use as beat seeds):
${numbered}

CONSTRAINT: When writing uniqueScenarioHook for escalation and turning_point beats,
draw from or build upon these verified setpieces. You may adapt, combine, or extend
them, but at least 4 of your beat hooks MUST trace back to a setpiece above.
When a beat traces to a setpiece, set setpieceSourceIndex to that setpiece's zero-based
index in this list (first item = 0, last item = 5). If a beat does not trace to a
setpiece, set setpieceSourceIndex to null.

`;
}

function buildPremisePromiseSection(verification?: ConceptVerification): string {
  const premisePromises = verification?.premisePromises ?? [];
  if (premisePromises.length === 0) {
    return '';
  }

  const listed = premisePromises.map((promise) => `- ${promise}`).join('\n');
  return `PREMISE PROMISE CONTRACT (from upstream concept verification):
${listed}

CONSTRAINT: Design act stakes and escalation/turning_point beat objectives so the story can credibly deliver these audience expectations over time.
Avoid generic escalation that ignores the concept's promised experience.

`;
}

function buildKernelSection(storyKernel?: StoryKernel): string {
  if (!storyKernel) {
    return '';
  }

  return `THEMATIC KERNEL:
Dramatic thesis: ${storyKernel.dramaticThesis}
Antithesis: ${storyKernel.antithesis}
Thematic question: ${storyKernel.thematicQuestion}

Use this thesis/antithesis tension to shape escalating conflicts and turning-point choices.

`;
}

export function buildGenreObligationsSection(conceptSpec?: ConceptSpec): string {
  if (!conceptSpec) {
    return '';
  }

  const obligations = getGenreObligationTags(conceptSpec.genreFrame);
  if (obligations.length === 0) {
    return '';
  }

  const listed = obligations.map((entry) => `- ${entry.tag}: ${entry.gloss}`).join('\n');
  return `GENRE OBLIGATION CONTRACT (for ${conceptSpec.genreFrame}):
${listed}

CONSTRAINT: At least one beat must be tagged with each obligation above using obligatorySceneTag.
If a beat does not fulfill any obligation, set obligatorySceneTag to null.

`;
}

export function buildDirectionalGuidanceSection(storyKernel?: StoryKernel): string {
  if (!storyKernel) {
    return 'Act 3 should include a "turning_point" beat representing a crisis -- an impossible choice or sacrifice';
  }

  const direction = storyKernel.directionOfChange;

  switch (direction) {
    case 'POSITIVE':
      return (
        'Act 3 should include a "turning_point" beat representing a crisis -- a supreme test of who the protagonist has become. ' +
        'Beat architecture should allow triumph through sacrifice or growth; the crisis is the crucible where inner transformation ' +
        'proves its worth. The resolution beat should consummate the victory, showing the new equilibrium earned through change'
      );
    case 'NEGATIVE':
      return (
        'Act 3 should include a "turning_point" beat representing a crisis -- a trap that seals the protagonist\'s loss. ' +
        'Every option the protagonist faces should lead to compromise or defeat; the crisis confirms that the fatal flaw ' +
        'or opposing force was insurmountable. The resolution beat should consummate the fall, showing the cost of failure or refusal to change'
      );
    case 'IRONIC':
      return (
        'Act 3 should include a "turning_point" beat representing a crisis -- a Pyrrhic crossroads where victory costs something essential. ' +
        'The protagonist may achieve the outer goal but lose something irreplaceable, or gain wisdom too late to use it. ' +
        'The resolution beat should feel hollow or bittersweet, showing that the answer to the dramatic question is more complex than expected'
      );
    case 'AMBIGUOUS':
      return (
        'Act 3 should include a "turning_point" beat representing a crisis -- an open question where outcomes are genuinely uncertain. ' +
        'The crisis should resist clean resolution; multiple interpretations of success and failure coexist. ' +
        'The resolution beat should leave the dramatic question resonating rather than answered, inviting the reader to decide what the story means'
      );
  }
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
  const setpieceBankSection = buildSetpieceBankSection(context.conceptVerification);
  const premisePromiseSection = buildPremisePromiseSection(context.conceptVerification);
  const genreConventionsSection = buildGenreConventionsSection(context.conceptSpec?.genreFrame);
  const genreObligationsSection = buildGenreObligationsSection(context.conceptSpec);
  const kernelSection = buildKernelSection(context.storyKernel);

  const userPrompt = `Generate a story structure before the first page.

${worldSection}${characterSection}${startingSituationSection}${spineSection}${toneFeelSection}${conceptStakesSection}${setpieceBankSection}${premisePromiseSection}${genreConventionsSection}${genreObligationsSection}${kernelSection}TONE/GENRE: ${context.tone}

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
   - ${buildDirectionalGuidanceSection(context.storyKernel)}
   - Use "setup" for establishing beats, "escalation" for rising tension, "turning_point" for irreversible changes, "reflection" for thematic/internal deepening without forced escalation, "resolution" for denouement
9. When designing beat descriptions and objectives, connect them to the protagonist's Need (inner transformation) vs Want (outer goal) from the spine. Setup beats should establish the need/want gap. Escalation beats should widen it — making the Want harder to achieve or the Need more urgent. Turning points should force the protagonist to confront the gap directly. Resolution beats should resolve or transform the tension.
10. Write a premise: a 1-2 sentence hook capturing the core dramatic question the story explores.
11. Write openingImage and closingImage as concrete visuals that mirror or contrast to show protagonist/story transformation across the arc.
12. Set a pacing budget (targetPagesMin and targetPagesMax) appropriate for the story's scope.
13. For each NPC, generate an initial agenda with currentGoal, leverage, fear, and offScreenBehavior. Keep each field to 1 sentence. Align with story tone and act structure. If no NPCs are defined, return an empty array.
14. For every beat, write a causalLink sentence describing what directly causes this beat's situation. Use explicit "because of" logic; avoid "and then" sequencing. For first beats in an act that have no prior beat in that act, reference the initiating condition (inciting incident, carry-over pressure, or prior-act consequence).
15. For each beat with role "escalation" or "turning_point", assign an escalationType describing HOW stakes rise. Choose from:
   - THREAT_ESCALATION: Opposition magnitude increases — enemies grow stronger, more numerous, or more resourceful
   - REVELATION_SHIFT: Hidden truth recontextualizes everything — what seemed safe is dangerous, what seemed true is false
   - REVERSAL_OF_FORTUNE: Progress inverts into setback — a victory becomes a trap, an ally's help becomes a liability
   - BETRAYAL_OR_ALLIANCE_SHIFT: Social topology changes — a trusted bond fractures or an enemy becomes necessary
   - RESOURCE_OR_CAPABILITY_LOSS: Protagonist loses a dependency — a tool, ally, safe haven, or ability is stripped away
   - MORAL_OR_ETHICAL_PRESSURE: Every available option requires compromising a value the protagonist holds dear
   - TEMPORAL_OR_ENVIRONMENTAL_PRESSURE: External conditions constrict — a deadline tightens, an environment becomes hostile, escape routes close
   - COMPLICATION_CASCADE: Consequences of earlier choices compound into simultaneous crises that cannot all be addressed
   - COMPETENCE_DEMAND_SPIKE: The challenge now exceeds the protagonist's demonstrated capability, forcing growth or improvisation
   For "setup", "reflection", and "resolution" beats, set escalationType to null.
   When choosing escalation types, consider how the antagonistic force's pressure mechanism would manifest at increasing intensity across the story. Not every escalation beat must be directly antagonist-driven, but the overall arc of escalation should feel connected to the central opposition defined in the spine.
16. For each beat with role "escalation" or "turning_point", assign a crisisType describing the dilemma shape. Choose from:
   - BEST_BAD_CHOICE: all available options carry meaningful cost; the protagonist chooses the least damaging path
   - IRRECONCILABLE_GOODS: the protagonist must choose between two genuinely valuable outcomes that cannot both be preserved
   For "setup", "reflection", and "resolution" beats, set crisisType to null.
17. For each beat with role "escalation" or "turning_point", you MAY assign a secondaryEscalationType when the beat escalates on two axes simultaneously. Use the same enum as escalationType. If single-axis escalation is sufficient, set secondaryEscalationType to null. For "setup", "reflection", and "resolution" beats, set secondaryEscalationType to null.
18. For each beat with role "escalation" or "turning_point", assign expectedGapMagnitude to indicate expected expectation-vs-result divergence. Choose from:
   - NARROW: outcome is close to expectation with modest divergence
   - MODERATE: outcome diverges in a meaningful but manageable way
   - WIDE: outcome sharply diverges, creating major strategic/emotional dislocation
   - CHASM: outcome radically diverges, fundamentally re-framing stakes or trajectory
   Magnitudes should generally increase over the story's escalation path. For "setup", "reflection", and "resolution" beats, set expectedGapMagnitude to null.
19. Flag exactly one beat across the full structure as isMidpoint: true. This beat should sit near the structural center and deliver a major reveal or reversal. For that beat, set midpointType to:
   - FALSE_VICTORY: the protagonist appears to win, but the win is unstable, misleading, or carries hidden cost
   - FALSE_DEFEAT: the protagonist appears to lose, but the loss plants the seed of eventual success
   For all non-midpoint beats, set isMidpoint to false and midpointType to null.
20. For each beat with role "escalation" or "turning_point", write a uniqueScenarioHook: one sentence describing what makes this beat's conflict unique to THIS specific story's concept, characters, and world. Not a generic description — a hook grounded in the particular setting, relationships, and dramatic question. For "setup", "reflection", and "resolution" beats, set uniqueScenarioHook to null.
21. For each beat with role "escalation" or "turning_point", assign 2-3 approachVectors suggesting HOW the protagonist could tackle this beat. Choose from:
   - DIRECT_FORCE: Confronting head-on with power, aggression, or physical dominance
   - SWIFT_ACTION: Speed, reflexes, seizing initiative before others react
   - STEALTH_SUBTERFUGE: Deception, misdirection, stealth, operating under false pretenses
   - ANALYTICAL_REASONING: Logic, deduction, strategy, thinking through the problem
   - CAREFUL_OBSERVATION: Patience, attention to detail, gathering information before acting
   - INTUITIVE_LEAP: Non-rational insight, gut instinct, lateral thinking, creative epiphany
   - PERSUASION_INFLUENCE: Convincing through charm, argument, emotional appeal, or leverage
   - EMPATHIC_CONNECTION: Understanding through emotional resonance, compassion, vulnerability
   - ENDURANCE_RESILIENCE: Gritting through pain, waiting out adversity, resisting temptation
   - SELF_EXPRESSION: Defining identity through the act itself; the approach IS the message
   For "setup", "reflection", and "resolution" beats, set approachVectors to null.
   Select vectors that create meaningful diversity — avoid repeating the same combination across beats. The planner will use these as suggestions when designing player choices.
22. If a genre obligation contract is provided, assign obligatorySceneTag on beats that fulfill those obligations. Use one of the listed obligation tags verbatim. At least one beat must cover each listed obligation. For beats that do not fulfill an obligation, set obligatorySceneTag to null.

OUTPUT SHAPE:
- overallTheme: string
- premise: string (1-2 sentence story hook)
- openingImage: string
- closingImage: string
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
      - causalLink: one sentence explaining the cause of this beat's situation
      - role: "setup" | "escalation" | "turning_point" | "reflection" | "resolution"
      - escalationType: one of the 9 escalation types above, or null for setup/reflection/resolution beats
      - secondaryEscalationType: one of the 9 escalation types above when dual-axis escalation is present, else null
      - crisisType: BEST_BAD_CHOICE | IRRECONCILABLE_GOODS | null (null for setup/reflection/resolution beats)
      - expectedGapMagnitude: NARROW | MODERATE | WIDE | CHASM | null (null for setup/reflection/resolution beats)
      - isMidpoint: boolean (true for exactly one beat in the full structure)
      - midpointType: FALSE_VICTORY | FALSE_DEFEAT | null (non-null only when isMidpoint is true)
      - uniqueScenarioHook: one sentence grounded in THIS story's specifics, or null for setup/reflection/resolution beats
      - approachVectors: 2-3 approach vector enums from the list above, or null for setup/reflection/resolution beats
      - setpieceSourceIndex: integer 0-5 when the beat traces to a verified setpiece, else null
      - obligatorySceneTag: genre obligation tag when this beat fulfills one, else null`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildStructureSystemPrompt(context.tone) },
  ];

  messages.push({ role: 'user', content: userPrompt });
  return messages;
}
