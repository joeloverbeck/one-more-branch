import type { ConceptEvolverContext, EvaluatedConcept } from '../../models/concept-generator.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildConceptTaxonomyGuidance, CONCEPT_QUALITY_ANCHORS } from './concept-prompt-shared.js';

const ROLE_INTRO =
  'You are a concept evolution architect for branching interactive fiction. Recombine proven strengths, mutate weak points, and generate novel but producible concept engines.';

const MUTATION_STRATEGIES = `MUTATION STRATEGIES:
- recombine: fuse strongest mechanics from different parents into one coherent loop.
- invert: flip a parent assumption so strength becomes vulnerability or vice versa.
- escalate: preserve parent core but intensify stakes, pressure source, or clock mechanism.
- transplant: move a working conflict loop into a distinct genre frame or institution topology.
- hybridize: blend two parent identities to create a third play pattern, not a cosmetic mashup.
- radicalize: push one parent differentiator to its logical extreme while preserving playability.`;

const DIVERSITY_CONSTRAINTS = `DIVERSITY CONSTRAINTS:
- Return exactly 6 concepts.
- No two concepts may share the same pair of genreFrame + conflictAxis.
- Use at least 3 distinct genreFrame values.
- Use at least 3 distinct conflictAxis values.
- Avoid superficial variants. Every concept must imply a different decision texture in play.`;

const KERNEL_CONSTRAINTS = `KERNEL CONSTRAINTS:
- The offspring MUST operationalize the provided story kernel's dramatic thesis.
- valueAtStake and opposingForce must remain structurally visible in each concept's conflict engine.
- Offspring can mutate form, but must stay thematically coherent with the kernel.`;

function buildParentPayload(parentConcepts: readonly EvaluatedConcept[]): string {
  const payload = parentConcepts.map((parent, index) => ({
    parentId: `parent_${index + 1}`,
    overallScore: parent.overallScore,
    passes: parent.passes,
    scores: parent.scores,
    strengths: parent.strengths,
    weaknesses: parent.weaknesses,
    tradeoffSummary: parent.tradeoffSummary,
    concept: parent.concept,
  }));

  return JSON.stringify(payload, null, 2);
}

export function buildConceptEvolverPrompt(context: ConceptEvolverContext): ChatMessage[] {
  const systemSections: string[] = [
    ROLE_INTRO,
    CONTENT_POLICY,
    MUTATION_STRATEGIES,
    buildConceptTaxonomyGuidance(),
    CONCEPT_QUALITY_ANCHORS,
    DIVERSITY_CONSTRAINTS,
    KERNEL_CONSTRAINTS,
  ];

  const userSections: string[] = [
    'Evolve the provided parents into exactly 6 offspring concepts.',
    `STORY KERNEL:
- dramaticThesis: ${context.kernel.dramaticThesis}
- valueAtStake: ${context.kernel.valueAtStake}
- opposingForce: ${context.kernel.opposingForce}
- directionOfChange: ${context.kernel.directionOfChange}
- thematicQuestion: ${context.kernel.thematicQuestion}`,
    `PARENT CONCEPTS INPUT:
${buildParentPayload(context.parentConcepts)}`,
    `OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "concepts": [ConceptSpec, ...] }.
- concepts array must contain exactly 6 items.
- Every concept must be complete and schema-valid.
- Do not copy any parent unchanged.
- Preserve useful parent strengths while directly addressing parent weaknesses.
- actionVerbs must contain at least 6 concise, distinct verbs.
- conflictType must be structurally coherent with conflictAxis.
- settingAxioms must contain 2-5 enforceable rules.
- constraintSet must contain 3-5 meaningful limits.
- keyInstitutions must contain 2-4 pressure-producing institutions.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
