import type { ConceptVerification } from '../../models/concept-generator.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildStructureSystemPrompt } from './system-prompt.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';
import {
  buildDirectionalGuidanceSection,
  buildStructureGenerationCharacterSection,
  buildStructureGenerationConceptStakesSection,
  buildStructureGenerationGenreObligationsSection,
  buildStructureGenerationKernelSection,
  buildStructureGenerationPremisePromiseSection,
  buildStructureGenerationStartingSituationSection,
  buildStructureGenerationToneSection,
  buildStructureGenerationWorldSection,
  type StructureContext,
} from './sections/structure-generation/shared-context.js';

function buildSetpieceBankSection(verification?: ConceptVerification): string {
  if (!verification || verification.escalatingSetpieces.length === 0) {
    return '';
  }

  const numbered = verification.escalatingSetpieces
    .map((setpiece, i) => `${i + 1}. ${setpiece}`)
    .join('\n');

  return `CONCEPT-UNIQUE SETPIECE BANK (from upstream verification — use as milestone seeds):
${numbered}

CONSTRAINT: When writing uniqueScenarioHook for escalation and turning_point milestones,
draw from or build upon these verified setpieces. You may adapt, combine, or extend
them, but at least 4 of your milestone hooks MUST trace back to a setpiece above.
When a milestone traces to a setpiece, set setpieceSourceIndex to that setpiece's zero-based
index in this list (first item = 0, last item = 5). If a milestone does not trace to a
setpiece, set setpieceSourceIndex to null.

`;
}

export function buildStructurePrompt(
  context: StructureContext,
  _options?: PromptOptions
): ChatMessage[] {
  const worldSection = buildStructureGenerationWorldSection(context);
  const characterSection = buildStructureGenerationCharacterSection(context);
  const startingSituationSection = buildStructureGenerationStartingSituationSection(context);
  const spineSection = buildSpineSection(context.spine);
  const toneFeelSection = buildStructureGenerationToneSection(context.spine);
  const conceptStakesSection = buildStructureGenerationConceptStakesSection(
    context.conceptSpec,
    "Each act's stakes should escalate FROM these foundations. Act 1 stakes should connect to the personal dimension, Act 2 should compound both personal and systemic, Act 3 should put the systemic stakes at maximum risk.",
    'CONCEPT STAKES (use to ground your per-act stakes):'
  );
  const setpieceBankSection = buildSetpieceBankSection(context.conceptVerification);
  const premisePromiseSection = buildStructureGenerationPremisePromiseSection(
    context.conceptVerification,
    'CONSTRAINT: Design act stakes and escalation/turning_point milestone objectives so the story can credibly deliver these audience expectations over time.\nAvoid generic escalation that ignores the concept\'s promised experience.',
    'PREMISE PROMISE CONTRACT (from upstream concept verification):'
  );
  const genreConventionsSection = buildGenreConventionsSection(context.conceptSpec?.genreFrame);
  const genreObligationsSection = buildStructureGenerationGenreObligationsSection(
    context.conceptSpec
  );
  const kernelSection = buildStructureGenerationKernelSection(context.storyKernel, {
    valueSpectrumHeading: 'VALUE SPECTRUM (McKee — use to calibrate per-act value charge):',
    guidanceText:
      'Use this thesis/antithesis tension to shape escalating conflicts and turning-point choices. Design act stakes so the value charge progresses through the spectrum: early acts should operate near positive/contrary, middle acts should push toward contradictory, and the climax should risk the negation of negation.',
  });

  const userPrompt = `Generate a story structure before the first page.

${worldSection}${characterSection}${startingSituationSection}${spineSection}${toneFeelSection}${conceptStakesSection}${setpieceBankSection}${premisePromiseSection}${genreConventionsSection}${genreObligationsSection}${kernelSection}TONE/GENRE: ${context.tone}

REQUIREMENTS (follow ALL):
1. Return 3-5 acts following setup, confrontation, and resolution. STRONGLY prefer 3 acts as the default. Only use 4 acts when the narrative complexity genuinely demands a fourth major movement. Use 5 acts only in exceptional cases where the story absolutely requires it.
2. For each act, include 2-4 milestones that function as flexible milestones, not rigid gates.
3. Ensure milestones are branching-aware so different player choices can still plausibly satisfy them.
4. Reflect the protagonist (first character profile) in the protagonist's journey, conflicts, and opportunities.
5. Use worldbuilding details to shape stakes, pressures, and act entry conditions.
6. Calibrate the entire story architecture to the specified TONE/GENRE:
   - Act names, milestone names, and descriptions should reflect the tone (comedic tones get playful names, noir gets terse names, etc.)
   - Stakes and conflicts should match the tone's emotional register (comedic stakes can be absurd, horror stakes visceral)
   - The overall theme should harmonize with the tone, not fight against it
7. Design structure pacing suitable for a 15-50 page interactive story.
8. Design milestones with clear dramatic roles:
   - At least one milestone in Act 1 should be a "turning_point" representing a point of no return
   - The midpoint of the story (typically late Act 1 or mid Act 2) should include a reveal or reversal that reframes prior events
   - ${buildDirectionalGuidanceSection(context.storyKernel)}
   - Use "setup" for establishing milestones, "escalation" for rising tension, "turning_point" for irreversible changes, "reflection" for thematic/internal deepening without forced escalation, "resolution" for denouement
9. When designing milestone descriptions and objectives, connect them to the protagonist's Need (inner transformation) vs Want (outer goal) from the spine. Setup milestones should establish the need/want gap. Escalation milestones should widen it — making the Want harder to achieve or the Need more urgent. Turning points should force the protagonist to confront the gap directly. Resolution milestones should resolve or transform the tension.
10. Write a premise: a 1-2 sentence hook capturing the core dramatic question the story explores.
11. Write openingImage and closingImage as concrete visuals that mirror or contrast to show protagonist/story transformation across the arc.
12. Set a pacing budget (targetPagesMin and targetPagesMax) appropriate for the story's scope.
13. For each NPC, generate an initial agenda with currentGoal, leverage, fear, and offScreenBehavior. Keep each field to 1 sentence. Align with story tone and act structure. If no NPCs are defined, return an empty array.
14. For every milestone, write a causalLink sentence describing what directly causes this milestone's situation. Use explicit "because of" logic; avoid "and then" sequencing. For first milestones in an act that have no prior milestone in that act, reference the initiating condition (inciting incident, carry-over pressure, or prior-act consequence).
15. For each milestone with role "escalation" or "turning_point", assign an escalationType describing HOW stakes rise. Choose from:
   - THREAT_ESCALATION: Opposition magnitude increases — enemies grow stronger, more numerous, or more resourceful
   - REVELATION_SHIFT: Hidden truth recontextualizes everything — what seemed safe is dangerous, what seemed true is false
   - REVERSAL_OF_FORTUNE: Progress inverts into setback — a victory becomes a trap, an ally's help becomes a liability
   - BETRAYAL_OR_ALLIANCE_SHIFT: Social topology changes — a trusted bond fractures or an enemy becomes necessary
   - RESOURCE_OR_CAPABILITY_LOSS: Protagonist loses a dependency — a tool, ally, safe haven, or ability is stripped away
   - MORAL_OR_ETHICAL_PRESSURE: Every available option requires compromising a value the protagonist holds dear
   - TEMPORAL_OR_ENVIRONMENTAL_PRESSURE: External conditions constrict — a deadline tightens, an environment becomes hostile, escape routes close
   - COMPLICATION_CASCADE: Consequences of earlier choices compound into simultaneous crises that cannot all be addressed
   - COMPETENCE_DEMAND_SPIKE: The challenge now exceeds the protagonist's demonstrated capability, forcing growth or improvisation
   For "setup", "reflection", and "resolution" milestones, set escalationType to null.
   When choosing escalation types, consider how the antagonistic force's pressure mechanism would manifest at increasing intensity across the story. Not every escalation milestone must be directly antagonist-driven, but the overall arc of escalation should feel connected to the central opposition defined in the spine.
16. For each milestone with role "escalation" or "turning_point", assign a crisisType describing the dilemma shape. Choose from:
   - BEST_BAD_CHOICE: all available options carry meaningful cost; the protagonist chooses the least damaging path
   - IRRECONCILABLE_GOODS: the protagonist must choose between two genuinely valuable outcomes that cannot both be preserved
   For "setup", "reflection", and "resolution" milestones, set crisisType to null.
17. For each milestone with role "escalation" or "turning_point", you MAY assign a secondaryEscalationType when the milestone escalates on two axes simultaneously. Use the same enum as escalationType. If single-axis escalation is sufficient, set secondaryEscalationType to null. For "setup", "reflection", and "resolution" milestones, set secondaryEscalationType to null.
18. For each milestone with role "escalation" or "turning_point", assign expectedGapMagnitude to indicate expected expectation-vs-result divergence. Choose from:
   - NARROW: outcome is close to expectation with modest divergence
   - MODERATE: outcome diverges in a meaningful but manageable way
   - WIDE: outcome sharply diverges, creating major strategic/emotional dislocation
   - CHASM: outcome radically diverges, fundamentally re-framing stakes or trajectory
   Magnitudes should generally increase over the story's escalation path. For "setup", "reflection", and "resolution" milestones, set expectedGapMagnitude to null.
19. Flag exactly one milestone across the full structure as isMidpoint: true. This milestone should sit near the structural center and deliver a major reveal or reversal. For that milestone, set midpointType to:
   - FALSE_VICTORY: the protagonist appears to win, but the win is unstable, misleading, or carries hidden cost
   - FALSE_DEFEAT: the protagonist appears to lose, but the loss plants the seed of eventual success
   For all non-midpoint milestones, set isMidpoint to false and midpointType to null.
20. For each milestone with role "escalation" or "turning_point", write a uniqueScenarioHook: one sentence describing what makes this milestone's conflict unique to THIS specific story's concept, characters, and world. Not a generic description — a hook grounded in the particular setting, relationships, and dramatic question. For "setup", "reflection", and "resolution" milestones, set uniqueScenarioHook to null.
21. For each milestone with role "escalation" or "turning_point", assign 2-3 approachVectors suggesting HOW the protagonist could tackle this milestone. Choose from:
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
   For "setup", "reflection", and "resolution" milestones, set approachVectors to null.
   Select vectors that create meaningful diversity — avoid repeating the same combination across milestones. The planner will use these as suggestions when designing player choices.
22. If a genre obligation contract is provided, first use act-level obligationTargets to decide which obligations this structure is actively allocating. Then assign obligatorySceneTag on milestones that fulfill those allocated obligations. Use one of the listed obligation tags verbatim. Each allocated obligation should be covered by at least one milestone. For milestones that do not fulfill an obligation, set obligatorySceneTag to null.

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
  - milestones: 2-4 items
    - each milestone has:
      - name: short evocative milestone title
      - description: what should happen in this milestone
      - objective: the protagonist's specific goal for this milestone. Write objectives that satisfy ALL of these criteria:
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
      - causalLink: one sentence explaining the cause of this milestone's situation
      - role: "setup" | "escalation" | "turning_point" | "reflection" | "resolution"
      - escalationType: one of the 9 escalation types above, or null for setup/reflection/resolution milestones
      - secondaryEscalationType: one of the 9 escalation types above when dual-axis escalation is present, else null
      - crisisType: BEST_BAD_CHOICE | IRRECONCILABLE_GOODS | null (null for setup/reflection/resolution milestones)
      - expectedGapMagnitude: NARROW | MODERATE | WIDE | CHASM | null (null for setup/reflection/resolution milestones)
      - isMidpoint: boolean (true for exactly one milestone in the full structure)
      - midpointType: FALSE_VICTORY | FALSE_DEFEAT | null (non-null only when isMidpoint is true)
      - uniqueScenarioHook: one sentence grounded in THIS story's specifics, or null for setup/reflection/resolution milestones
      - approachVectors: 2-3 approach vector enums from the list above, or null for setup/reflection/resolution milestones
      - setpieceSourceIndex: integer 0-5 when the milestone traces to a verified setpiece, else null
      - obligatorySceneTag: genre obligation tag when this milestone fulfills one, else null`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildStructureSystemPrompt(context.tone) },
  ];

  messages.push({ role: 'user', content: userPrompt });
  return messages;
}

export { buildDirectionalGuidanceSection, type StructureContext };
