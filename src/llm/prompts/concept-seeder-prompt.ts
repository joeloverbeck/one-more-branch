import type { ContentPacket } from '../../models/content-packet.js';
import type { ConceptSeederContext } from '../../models/concept-generator.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildSeederTaxonomyGuidance, SEEDER_QUALITY_ANCHORS } from './concept-prompt-shared.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

const ROLE_INTRO =
  'You are a concept ideation specialist for branching interactive fiction. Generate diverse, high-concept seeds that define identity, genre, conflict axis, and player fantasy — not full world or character designs.';

const DIVERSITY_CONSTRAINTS = `DIVERSITY CONSTRAINTS:
- Return 6-8 concept seeds.
- Use at least 3 distinct genreFrame values.
- The seed's conflictAxis MUST match the kernel's conflictAxis.
- Each seed should feel materially different in play, not cosmetic variants.
- CRITICAL: Diversity means different genres and play textures. It does NOT mean distributing user vibes across concepts. Every concept must centrally embody ALL user-specified vibes, moods, and content preferences.`;

function buildContentPacketsBlock(packets: readonly ContentPacket[]): string {
  const packetEntries = packets
    .map(
      (p) =>
        `- [${p.contentId}] coreAnomaly: ${p.coreAnomaly}
  wildnessInvariant: ${p.wildnessInvariant}
  socialEngine: ${p.socialEngine}
  signatureImage: ${p.signatureImage}`,
    )
    .join('\n');

  return `CONTENT PACKETS:
The following content packets provide concrete imaginative payloads. Each concept seed MUST use exactly 1 primaryContentId from these packets. Each seed may optionally fuse 1 secondaryContentId. The concept MUST preserve the packet's wildnessInvariant — do not sand it off or normalize it into generic genre language. The seed must carry forward a signatureImageHook derived from the packet's signatureImage.

${packetEntries}`;
}

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
  const protagonistDetails = normalize(context.protagonistDetails);
  if (protagonistDetails) {
    systemSections.push(
      `PROTAGONIST IDENTITY CONSTRAINT (ABSOLUTE — OVERRIDES ALL OTHER CONSIDERATIONS):
The user has specified their protagonist. Every concept seed MUST feature a protagonist that matches the user's description. You may NOT substitute, replace, or override the user's protagonist with a different character you find more interesting. The user's protagonist IS the protagonist — period. Creativity applies to the world, conflict, and genre around them, never to replacing who they are.`,
    );
  }
  systemSections.push(DIVERSITY_CONSTRAINTS);

  const userSections: string[] = [
    'Generate 6-8 concept seeds that satisfy the taxonomy and diversity constraints.',
  ];

  if (protagonistDetails) {
    userSections.push(
      `MANDATORY PROTAGONIST (NON-NEGOTIABLE — DO NOT REPLACE OR OVERRIDE):\n${protagonistDetails}\nEvery concept seed's playerFantasy and oneLineHook MUST center this protagonist. Generating concepts about a different character is a hard failure.`,
    );
  }

  const mandateParts: string[] = [];
  if (protagonistDetails) mandateParts.push(`Protagonist Details: ${protagonistDetails}`);
  if (genreVibes) mandateParts.push(`Genre Vibes: ${genreVibes}`);
  if (moodKeywords) mandateParts.push(`Mood Keywords: ${moodKeywords}`);
  if (contentPreferences) mandateParts.push(`Content Preferences: ${contentPreferences}`);

  if (mandateParts.length > 0) {
    userSections.push(
      `USER CREATIVE MANDATE (every concept MUST embody ALL of the following):\n${mandateParts.join('\n')}\nThese are non-negotiable. Each concept must centrally express every listed quality, though HOW each manifests may differ creatively across concepts.`,
    );
  }
  if (context.contentPackets && context.contentPackets.length > 0) {
    userSections.push(buildContentPacketsBlock(context.contentPackets));
  }

  if (kernel) {
    const kernelLines = [
      `SELECTED STORY KERNEL:`,
      `- dramaticThesis: ${kernel.dramaticThesis}`,
      `- antithesis: ${kernel.antithesis}`,
      `- valueAtStake: ${kernel.valueAtStake}`,
      `- opposingForce: ${kernel.opposingForce}`,
      `- directionOfChange: ${kernel.directionOfChange}`,
      `- conflictAxis: ${kernel.conflictAxis}`,
      `- dramaticStance: ${kernel.dramaticStance}`,
      `- thematicQuestion: ${kernel.thematicQuestion}`,
      `- moralArgument: ${kernel.moralArgument}`,
      `- valueSpectrum.positive: ${kernel.valueSpectrum.positive}`,
      `- valueSpectrum.contrary: ${kernel.valueSpectrum.contrary}`,
      `- valueSpectrum.contradictory: ${kernel.valueSpectrum.contradictory}`,
      `- valueSpectrum.negationOfNegation: ${kernel.valueSpectrum.negationOfNegation}`,
    ];
    userSections.push(kernelLines.join('\n'));
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
