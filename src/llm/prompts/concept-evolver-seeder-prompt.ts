import type { ConceptEvolverSeederContext, EvaluatedConcept } from '../../models/concept-generator.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildSeederTaxonomyGuidance, SEEDER_QUALITY_ANCHORS } from './concept-prompt-shared.js';

const ROLE_INTRO =
  'You are a concept evolution architect for branching interactive fiction. Recombine proven strengths, mutate weak points, and generate novel seed identities that improve on their parents.';

const MUTATION_STRATEGIES = `MUTATION STRATEGIES:
- recombine: fuse strongest identity elements from different parents into one coherent seed.
- invert: flip a parent assumption so strength becomes vulnerability or vice versa.
- escalate: preserve parent core but intensify the conflict axis or genre tension.
- transplant: move a working conflict identity into a distinct genre frame.
- hybridize: blend two parent identities to create a third play pattern, not a cosmetic mashup.
- radicalize: push one parent differentiator to its logical extreme while preserving playability.`;

const DIVERSITY_CONSTRAINTS = `DIVERSITY CONSTRAINTS:
- Return exactly 6 concept seeds.
- No two seeds may share the same pair of genreFrame + conflictAxis.
- Use at least 3 distinct genreFrame values.
- Use at least 3 distinct conflictAxis values.
- Avoid superficial variants. Every seed must imply a different decision texture in play.`;

const KERNEL_CONSTRAINTS = `KERNEL CONSTRAINTS:
- The offspring MUST operationalize the provided story kernel's dramatic thesis.
- valueAtStake and opposingForce must remain structurally visible in each seed's conflict axis.
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

export function buildConceptEvolverSeederPrompt(
  context: ConceptEvolverSeederContext,
): ChatMessage[] {
  const systemSections: string[] = [
    ROLE_INTRO,
    CONTENT_POLICY,
    MUTATION_STRATEGIES,
    buildSeederTaxonomyGuidance(context.excludedGenres),
    SEEDER_QUALITY_ANCHORS,
    DIVERSITY_CONSTRAINTS,
    KERNEL_CONSTRAINTS,
  ];

  const userSections: string[] = [
    'Evolve the provided parents into exactly 6 offspring concept seeds.',
    `STORY KERNEL:
- dramaticThesis: ${context.kernel.dramaticThesis}
- antithesis: ${context.kernel.antithesis}
- valueAtStake: ${context.kernel.valueAtStake}
- opposingForce: ${context.kernel.opposingForce}
- directionOfChange: ${context.kernel.directionOfChange}
- thematicQuestion: ${context.kernel.thematicQuestion}`,
    `PARENT CONCEPTS INPUT:
${buildParentPayload(context.parentConcepts)}`,
    `OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "concepts": [ConceptSeed, ...] }.
- concepts array must contain exactly 6 items.
- Every seed must be complete and schema-valid.
- Do not copy any parent unchanged.
- Preserve useful parent strengths while directly addressing parent weaknesses.
- conflictType must be structurally coherent with conflictAxis.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
