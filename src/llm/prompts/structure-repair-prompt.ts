import { getGenreObligationTags } from '../../models/genre-obligations.js';
import type { StructureGenerationResult } from '../../models/structure-generation.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { ValidationResult } from '../structure-validator.js';
import type { StructureContext } from './milestone-generation-prompt.js';
import { buildStructureSystemPrompt } from './system-prompt.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import {
  buildStructureGenerationConceptStakesSection,
  buildStructureGenerationGenreObligationsSection,
  buildStructureGenerationPremisePromiseSection,
  buildStructureGenerationToneSection,
} from './sections/structure-generation/shared-context.js';

export interface StructureRepairPromptInput {
  readonly result: Omit<StructureGenerationResult, 'rawResponse'>;
  readonly diagnostics: readonly ValidationResult[];
  readonly targetActIndices: readonly number[];
}

function buildSetpieceBankSection(context: StructureContext): string {
  const setpieces = context.conceptVerification?.escalatingSetpieces ?? [];
  if (setpieces.length === 0) {
    return '';
  }

  return `VERIFIED SETPIECE BANK (zero-based indices):
${setpieces.map((setpiece, index) => `${index}. ${setpiece}`).join('\n')}

`;
}

function buildDiagnosticsSection(diagnostics: readonly ValidationResult[]): string {
  return diagnostics
    .filter((diagnostic) => !diagnostic.passed)
    .map((diagnostic) => {
      const acts =
        diagnostic.affectedActIndices && diagnostic.affectedActIndices.length > 0
          ? `acts=${diagnostic.affectedActIndices.join(',')}`
          : 'acts=unknown';
      const milestones =
        diagnostic.affectedMilestoneIndices && diagnostic.affectedMilestoneIndices.length > 0
          ? ` milestones=${diagnostic.affectedMilestoneIndices
              .map(({ actIndex, milestoneIndex }) => `${actIndex}.${milestoneIndex}`)
              .join(',')}`
          : '';
      const details = diagnostic.details ? ` details=${diagnostic.details}` : '';
      return `- ${diagnostic.check}: ${acts}${milestones}${details}`;
    })
    .join('\n');
}

export function buildStructureRepairPrompt(
  context: StructureContext,
  input: StructureRepairPromptInput,
  _options?: PromptOptions
): ChatMessage[] {
  const toneSection = buildStructureGenerationToneSection(context.spine);
  const spineSection = buildSpineSection(context.spine);
  const conceptStakesSection = buildStructureGenerationConceptStakesSection(
    context.conceptSpec,
    'Use these stakes to repair only the failing acts while preserving the existing story-wide dramatic line.'
  );
  const premisePromiseSection = buildStructureGenerationPremisePromiseSection(
    context.conceptVerification,
    'Ensure repaired acts still deliver these premise promises concretely.'
  );
  const genreObligationsSection = buildStructureGenerationGenreObligationsSection(context.conceptSpec);
  const setpieceBankSection = buildSetpieceBankSection(context);
  const allObligations = context.conceptSpec
    ? getGenreObligationTags(context.conceptSpec.genreFrame).map((entry) => entry.tag)
    : [];

  const userPrompt = `Repair failing acts in an already-generated story structure.

Only rewrite the acts listed below. Do not regenerate the whole structure.

TONE/GENRE: ${context.tone}
${toneSection}${spineSection}${conceptStakesSection}${premisePromiseSection}${genreObligationsSection}${setpieceBankSection}TARGET ACT INDICES:
${input.targetActIndices.join(', ')}

FAILED VALIDATION CHECKS:
${buildDiagnosticsSection(input.diagnostics)}

CURRENT MERGED STRUCTURE:
${JSON.stringify(input.result, null, 2)}

CANONICAL EXPECTATIONS:
- Keep all non-target acts unchanged by omission. Return only repaired acts.
- Each repaired act must include: name, objective, stakes, entryCondition, actQuestion, exitReversal, promiseTargets, obligationTargets, milestones.
- Each repaired act must still contain 2-4 milestones.
- Every milestone must include: name, description, objective, causalLink, exitCondition, role, escalationType, secondaryEscalationType, crisisType, expectedGapMagnitude, isMidpoint, midpointType, uniqueScenarioHook, approachVectors, setpieceSourceIndex, obligatorySceneTag.
- Exactly one milestone in the full structure must remain midpoint-tagged after repair.
- Non-final acts must end with a non-empty exitReversal. The final act must use an empty exitReversal.
- actQuestion values must remain distinct across acts.
- promiseTargets across all acts must cover every premise promise.
- obligationTargets across all acts must cover every genre obligation.
- milestone obligatorySceneTag coverage must satisfy the genre obligation contract.
- When verified setpieces exist, maintain at least 4 unique traced setpieces across the full structure.
- For escalation and turning_point milestones, escalationType must be non-null.
- Keep the repaired output tightly aligned to the existing architecture instead of inventing a new macro plan.

REFERENCE LISTS:
- Premise promises: ${JSON.stringify(context.conceptVerification?.premisePromises ?? [])}
- Genre obligations: ${JSON.stringify(allObligations)}

Return valid JSON only in this shape:
{
  "repairedActs": [
    {
      "actIndex": 1,
      "act": {
        "name": "...",
        "objective": "...",
        "stakes": "...",
        "entryCondition": "...",
        "actQuestion": "...",
        "exitReversal": "...",
        "promiseTargets": ["..."],
        "obligationTargets": ["..."],
        "milestones": [
          {
            "name": "...",
            "description": "...",
            "objective": "...",
            "causalLink": "...",
            "exitCondition": "...",
            "role": "setup",
            "escalationType": null,
            "secondaryEscalationType": null,
            "crisisType": null,
            "expectedGapMagnitude": null,
            "isMidpoint": false,
            "midpointType": null,
            "uniqueScenarioHook": null,
            "approachVectors": null,
            "setpieceSourceIndex": null,
            "obligatorySceneTag": null
          }
        ]
      }
    }
  ]
}`;

  return [
    { role: 'system', content: buildStructureSystemPrompt(context.tone) },
    { role: 'user', content: userPrompt },
  ];
}
