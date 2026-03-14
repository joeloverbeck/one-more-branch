import type { MacroArchitectureResult } from '../../models/structure-generation.js';
import type { ConceptVerification } from '../../models/concept-generator.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildStructureSystemPrompt } from './system-prompt.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
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
    .map((setpiece, index) => `${index}. ${setpiece}`)
    .join('\n');

  return `VERIFIED SETPIECE BANK (zero-based indices):
${numbered}

For escalation and turning_point milestones, prefer tracing to a verified setpiece. When a milestone traces to one, set setpieceSourceIndex to the exact index above. If a milestone does not trace to one, uniqueScenarioHook must still prove concept-specificity.

`;
}

function buildMacroArchitectureSection(macroArchitecture: MacroArchitectureResult): string {
  return `LOCKED MACRO ARCHITECTURE (immutable; do not rewrite):
${JSON.stringify(
    {
      overallTheme: macroArchitecture.overallTheme,
      premise: macroArchitecture.premise,
      openingImage: macroArchitecture.openingImage,
      closingImage: macroArchitecture.closingImage,
      pacingBudget: macroArchitecture.pacingBudget,
      anchorMoments: macroArchitecture.anchorMoments,
      acts: macroArchitecture.acts,
    },
    null,
    2
  )}

`;
}

export function buildMilestoneGenerationPrompt(
  context: StructureContext,
  macroArchitecture: MacroArchitectureResult,
  _options?: PromptOptions
): ChatMessage[] {
  const worldSection = buildStructureGenerationWorldSection(context);
  const characterSection = buildStructureGenerationCharacterSection(context);
  const startingSituationSection = buildStructureGenerationStartingSituationSection(context);
  const spineSection = buildSpineSection(context.spine);
  const toneSection = buildStructureGenerationToneSection(context.spine);
  const conceptStakesSection = buildStructureGenerationConceptStakesSection(
    context.conceptSpec,
    'Use these stakes to make each milestone concretely harder than the last while staying inside the locked macro act frame.'
  );
  const premisePromiseSection = buildStructureGenerationPremisePromiseSection(
    context.conceptVerification,
    'Milestones must deliver these promises through concrete situations, not abstract summaries.'
  );
  const genreObligationsSection = buildStructureGenerationGenreObligationsSection(context.conceptSpec);
  const kernelSection = buildStructureGenerationKernelSection(context.storyKernel, {
    guidanceText:
      'Use the kernel to sharpen milestone-level reversals, crises, and value pressure rather than re-planning the macro act sequence.',
  });
  const setpieceBankSection = buildSetpieceBankSection(context.conceptVerification);
  const macroArchitectureSection = buildMacroArchitectureSection(macroArchitecture);

  const userPrompt = `Generate milestones for a locked macro architecture.

${worldSection}${characterSection}${startingSituationSection}${spineSection}${toneSection}${conceptStakesSection}${premisePromiseSection}${genreObligationsSection}${kernelSection}${setpieceBankSection}${macroArchitectureSection}TONE/GENRE: ${context.tone}

REQUIREMENTS (follow ALL):
1. Generate milestones only. Do not rewrite, reinterpret, rename, reorder, add, or remove acts from the macro architecture.
2. Return one output act per macro act, in the same order, each identified by its zero-based actIndex.
3. Generate 2-4 milestones per act.
4. Every milestone must include: name, description, objective, causalLink, exitCondition, role, escalationType, secondaryEscalationType, crisisType, expectedGapMagnitude, isMidpoint, midpointType, uniqueScenarioHook, approachVectors, setpieceSourceIndex, obligatorySceneTag.
5. Every milestone must have a concrete non-empty exitCondition that makes completion observable in play.
6. Every milestone must have a non-empty causalLink using explicit cause-and-effect logic.
7. Exactly one milestone across the full output must have isMidpoint: true.
8. The midpoint must appear exactly at anchorMoments.midpoint.actIndex and anchorMoments.midpoint.milestoneSlot from the locked macro architecture, and midpointType must match anchorMoments.midpoint.midpointType.
9. For escalation and turning_point milestones:
   - escalationType must be non-null
   - crisisType must be non-null
   - expectedGapMagnitude must be non-null
   - uniqueScenarioHook must be non-null and story-specific
   - approachVectors must contain 2-3 distinct values
10. For setup, reflection, and resolution milestones:
   - escalationType must be null
   - secondaryEscalationType must be null unless a dual-axis escalation is genuinely present, which should only happen on escalation/turning_point milestones
   - crisisType must be null
   - expectedGapMagnitude must be null
   - uniqueScenarioHook must be null
   - approachVectors must be null
11. Every escalation or turning_point milestone must either trace to a verified setpiece via setpieceSourceIndex or prove concept-specificity through uniqueScenarioHook. If no setpiece bank is available, use setpieceSourceIndex: null and make uniqueScenarioHook especially concrete.
12. Keep milestones branching-aware: they should describe dramatic destinations, not a single mandatory scene choreography.
13. Respect act-level fields from the macro architecture as immutable constraints:
   - objective
   - stakes
   - entryCondition
   - actQuestion
   - exitReversal
   - promiseTargets
   - obligationTargets
14. Use obligatorySceneTag only when a milestone concretely fulfills a listed genre obligation; otherwise set it to null.
15. ${buildDirectionalGuidanceSection(context.storyKernel)}

OUTPUT SHAPE:
- acts: one item per macro act, in the same order
  - actIndex: integer (zero-based index matching the macro act)
  - milestones: 2-4 items
    - name: short evocative milestone title
    - description: what should happen in this milestone
    - objective: protagonist-facing goal with a verifiable outcome
    - causalLink: one sentence explaining why this milestone happens now
    - exitCondition: concrete observable condition that concludes the milestone
    - role: "setup" | "escalation" | "turning_point" | "reflection" | "resolution"
    - escalationType: one of the escalation enums, or null
    - secondaryEscalationType: one of the escalation enums, or null
    - crisisType: BEST_BAD_CHOICE | IRRECONCILABLE_GOODS | null
    - expectedGapMagnitude: NARROW | MODERATE | WIDE | CHASM | null
    - isMidpoint: boolean
    - midpointType: FALSE_VICTORY | FALSE_DEFEAT | null
    - uniqueScenarioHook: story-specific hook, or null
    - approachVectors: 2-3 approach vector enums, or null
    - setpieceSourceIndex: integer index into the verified setpiece bank, or null
    - obligatorySceneTag: genre obligation tag, or null

Return valid JSON only.`;

  return [
    { role: 'system', content: buildStructureSystemPrompt(context.tone) },
    { role: 'user', content: userPrompt },
  ];
}

export type { StructureContext };
