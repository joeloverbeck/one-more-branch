import type { ContentPacket } from '../../models/content-packet.js';
import type { ConceptEvolverSeederContext, EvaluatedConcept } from '../../models/concept-generator.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildSeederTaxonomyGuidance, SEEDER_QUALITY_ANCHORS } from './concept-prompt-shared.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

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
The following content packets provide concrete imaginative payloads. Each evolved seed MUST engage with at least one packet's wildnessInvariant. Seeds may fuse packet material with parent strengths. Do not sand off the packet's weirdness into generic genre language.

${packetEntries}`;
}

function buildWildnessInvariantsBlock(packets: readonly ContentPacket[]): string {
  const invariants = packets
    .map((p) => `- [${p.contentId}]: ${p.wildnessInvariant}`)
    .join('\n');

  return `WILDNESS INVARIANTS:
The following invariants from content packets MUST be preserved or intensified in evolved seeds. Do not normalize, dilute, or replace them with generic genre equivalents.

${invariants}`;
}

const ROLE_INTRO =
  'You are a concept evolution architect for branching interactive fiction. Recombine proven strengths, mutate weak points, and generate novel seed identities that improve on their parents.';

const MUTATION_STRATEGIES = `MUTATION STRATEGIES:
- recombine: fuse strongest identity elements from different parents into one coherent seed.
- invert: flip a parent assumption so strength becomes vulnerability or vice versa.
- escalate: preserve parent core but intensify the conflict axis or genre tension.
- transplant: move a working conflict identity into a distinct genre frame.
- hybridize: blend two parent identities to create a third play pattern, not a cosmetic mashup.
- radicalize: push one parent differentiator to its logical extreme while preserving playability.
- ghost-deepening: take a parent's implicit backstory wound and make it more specific, more painful, and more directly connected to the seed's conflict identity.
- lie-escalation: take a parent's implicit false belief and escalate it so the belief is more deeply embedded, increasing the cost of transformation.
- irony-sharpening: restructure a parent so the protagonist's greatest strength becomes the mechanism of their potential undoing.`;

const DIVERSITY_CONSTRAINTS = `DIVERSITY CONSTRAINTS:
- Return exactly 6 concept seeds.
- Use at least 3 distinct genreFrame values.
- All offspring MUST use the kernel's conflictAxis.
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
  const genreVibes = normalize(context.genreVibes);
  const moodKeywords = normalize(context.moodKeywords);
  const contentPreferences = normalize(context.contentPreferences);

  const systemSections: string[] = [ROLE_INTRO];

  const toneParts: string[] = [];
  if (genreVibes) toneParts.push(`genre vibes: ${genreVibes}`);
  if (moodKeywords) toneParts.push(`mood keywords: ${moodKeywords}`);
  if (toneParts.length > 0) {
    systemSections.push(buildToneDirective(toneParts.join(' | ')));
  }

  systemSections.push(
    CONTENT_POLICY,
    MUTATION_STRATEGIES,
    buildSeederTaxonomyGuidance(context.excludedGenres),
    SEEDER_QUALITY_ANCHORS,
    DIVERSITY_CONSTRAINTS,
    KERNEL_CONSTRAINTS,
  );

  const userSections: string[] = [
    'Evolve the provided parents into exactly 6 offspring concept seeds.',
    `STORY KERNEL:
- dramaticThesis: ${context.kernel.dramaticThesis}
- antithesis: ${context.kernel.antithesis}
- valueAtStake: ${context.kernel.valueAtStake}
- opposingForce: ${context.kernel.opposingForce}
- directionOfChange: ${context.kernel.directionOfChange}
- conflictAxis: ${context.kernel.conflictAxis}
- dramaticStance: ${context.kernel.dramaticStance}
- thematicQuestion: ${context.kernel.thematicQuestion}
- moralArgument: ${context.kernel.moralArgument}
- valueSpectrum.positive: ${context.kernel.valueSpectrum.positive}
- valueSpectrum.contrary: ${context.kernel.valueSpectrum.contrary}
- valueSpectrum.contradictory: ${context.kernel.valueSpectrum.contradictory}
- valueSpectrum.negationOfNegation: ${context.kernel.valueSpectrum.negationOfNegation}`,
    `PARENT CONCEPTS INPUT:
${buildParentPayload(context.parentConcepts)}`,
  ];

  const protagonistDetails = normalize(context.protagonistDetails);
  if (protagonistDetails) {
    userSections.push(
      `MANDATORY PROTAGONIST (NON-NEGOTIABLE — OFFSPRING MUST RETAIN THIS PROTAGONIST):\n${protagonistDetails}\nEvolution mutates genre, conflict, and mechanics — it NEVER replaces the user's protagonist. Every offspring must center this character.`,
    );
  }

  const mandateParts: string[] = [];
  if (protagonistDetails) mandateParts.push(`Protagonist Details: ${protagonistDetails}`);
  if (genreVibes) mandateParts.push(`Genre Vibes: ${genreVibes}`);
  if (moodKeywords) mandateParts.push(`Mood Keywords: ${moodKeywords}`);
  if (contentPreferences) mandateParts.push(`Content Preferences: ${contentPreferences}`);

  if (mandateParts.length > 0) {
    userSections.push(
      `USER CREATIVE MANDATE (evolved offspring MUST embody ALL of the following):\n${mandateParts.join('\n')}\nMutation changes form, not tonal identity. Every offspring must centrally express all listed qualities.`,
    );
  }

  if (context.contentPackets && context.contentPackets.length > 0) {
    userSections.push(buildContentPacketsBlock(context.contentPackets));
    userSections.push(buildWildnessInvariantsBlock(context.contentPackets));
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "concepts": [ConceptSeed, ...] }.
- concepts array must contain exactly 6 items.
- Every seed must be complete and schema-valid.
- Do not copy any parent unchanged.
- Preserve useful parent strengths while directly addressing parent weaknesses.
- conflictType must be structurally coherent with conflictAxis.`,
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
