import type { ConceptSeederContext } from '../../models/concept-generator.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildSeederTaxonomyGuidance, SEEDER_QUALITY_ANCHORS } from './concept-prompt-shared.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

const ROLE_INTRO =
  'You are a concept ideation specialist for branching interactive fiction. Generate diverse, high-concept seeds that define identity, genre, conflict axis, and player fantasy — not full world or character designs.';

const DIVERSITY_CONSTRAINTS = `DIVERSITY CONSTRAINTS:
- Return 6-8 concept seeds.
- No two seeds may share the same pair of genreFrame + conflictAxis.
- Use at least 3 distinct genreFrame values.
- Use at least 3 distinct conflictAxis values.
- Each seed should feel materially different in play, not cosmetic variants.`;

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function buildKernelConstraintBlock(kernel: ConceptSeederContext['kernel']): string | null {
  if (!kernel) {
    return null;
  }

  return `KERNEL CONSTRAINTS:
- The seed MUST operationalize the provided story kernel's dramatic thesis.
- The kernel's valueAtStake and opposingForce must anchor the seed's conflict axis.
- Preserve the kernel's thematic direction while still producing a distinct seed.`;
}

export function buildConceptSeederPrompt(context: ConceptSeederContext): ChatMessage[] {
  const genreVibes = normalize(context.genreVibes);
  const moodKeywords = normalize(context.moodKeywords);
  const contentPreferences = normalize(context.contentPreferences);
  const kernel = context.kernel;

  const systemSections: string[] = [ROLE_INTRO];

  const toneParts: string[] = [];
  if (genreVibes) {
    toneParts.push(`genre vibes: ${genreVibes}`);
  }
  if (moodKeywords) {
    toneParts.push(`mood keywords: ${moodKeywords}`);
  }
  if (toneParts.length > 0) {
    systemSections.push(buildToneDirective(toneParts.join(' | ')));
  }

  systemSections.push(CONTENT_POLICY);
  systemSections.push(buildSeederTaxonomyGuidance(context.excludedGenres));
  const kernelConstraintBlock = buildKernelConstraintBlock(kernel);
  if (kernelConstraintBlock) {
    systemSections.push(kernelConstraintBlock);
  }
  systemSections.push(SEEDER_QUALITY_ANCHORS);
  systemSections.push(DIVERSITY_CONSTRAINTS);

  const userSections: string[] = [
    'Generate 6-8 concept seeds that satisfy the taxonomy and diversity constraints.',
  ];

  if (genreVibes) {
    userSections.push(`GENRE VIBES:\n${genreVibes}`);
  }
  if (moodKeywords) {
    userSections.push(`MOOD KEYWORDS:\n${moodKeywords}`);
  }
  if (contentPreferences) {
    userSections.push(`CONTENT PREFERENCES:\n${contentPreferences}`);
  }
  if (kernel) {
    userSections.push(
      `SELECTED STORY KERNEL:
- dramaticThesis: ${kernel.dramaticThesis}
- antithesis: ${kernel.antithesis}
- valueAtStake: ${kernel.valueAtStake}
- opposingForce: ${kernel.opposingForce}
- directionOfChange: ${kernel.directionOfChange}
- thematicQuestion: ${kernel.thematicQuestion}`,
    );
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "concepts": [ConceptSeed, ...] }.
- Populate every required field for each seed.
- conflictType must be structurally coherent with conflictAxis (e.g., INDIVIDUAL_VS_SYSTEM pairs naturally with PERSON_VS_SOCIETY).`,
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
