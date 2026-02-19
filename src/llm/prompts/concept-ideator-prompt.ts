import {
  BRANCHING_POSTURES,
  CONFLICT_AXES,
  GENRE_FRAMES,
  SETTING_SCALES,
  STATE_COMPLEXITIES,
  type ConceptIdeatorContext,
} from '../../models/concept-generator.js';
import { CONFLICT_TYPE_VALUES } from '../../models/story-spine.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

const ROLE_INTRO =
  'You are a narrative concept architect for branching interactive fiction. Generate concept engines that create repeatable player-facing decision pressure, not linear plot outlines.';

const QUALITY_ANCHORS = `QUALITY ANCHORS:
- A concept is a generative engine, not a plot summary.
- oneLineHook must be graspable without proper nouns.
- coreConflictLoop must describe a recurring decision pattern.
- settingAxioms and constraints must be concrete and enforceable by an LLM.
- actionVerbs must imply strategy diversity, not synonyms.
- whatIfQuestion must be a single question ending with '?' that translates the dramatic thesis into a specific, producible situation.
- ironicTwist must be 1-2 sentences describing built-in irony where strength becomes weakness or solution creates the problem.
- playerFantasy must be 1 sentence describing the experiential promise of being the protagonist, not just their actions.`;

const DIVERSITY_CONSTRAINTS = `DIVERSITY CONSTRAINTS:
- Return 6-8 concepts.
- No two concepts may share the same pair of genreFrame + conflictAxis.
- Use at least 3 distinct genreFrame values.
- Use at least 3 distinct conflictAxis values.
- Each concept should feel materially different in play, not cosmetic variants.`;

function buildEnumGuidance(label: string, values: readonly string[], descriptions: string[]): string {
  const rows = values.map((value, index) => `- ${value}: ${descriptions[index]}`);
  return `${label}:\n${rows.join('\n')}`;
}

function buildTaxonomyGuidance(): string {
  return `TAXONOMY GUIDANCE:
${buildEnumGuidance('genreFrame', GENRE_FRAMES, [
  'Fear, dread, and destabilization.',
  'Sustained danger and tightening pressure.',
  'Investigation and hidden truth recovery.',
  'Mythic or magical rule-bound worlds.',
  'Speculative systems and technological consequences.',
  'Character interiority and social nuance focus.',
  'Intimacy, attachment, and relational stakes.',
  'Interpersonal and social conflict realism.',
  'Frontier law, territory, and legacy conflict.',
  'Moral ambiguity, corruption, and fatalism.',
  'Societal critique through exaggeration or irony.',
  'Moral allegory with symbolic clarity.',
  'Decay, obsession, and oppressive atmosphere.',
  'Dream-logic, symbolic dislocation, altered reality.',
  'Systemic collapse and controlled oppression.',
  'Archetypal struggle and legend-scale stakes.',
])}

${buildEnumGuidance('conflictAxis', CONFLICT_AXES, [
  'Personal agency against institutions.',
  'Revealing truth versus preserving order.',
  'Obligation clashing with personal longing.',
  'Autonomy versus protective constraints.',
  'Understanding versus protective ignorance.',
  'Capability gain versus ethical limits.',
  'Commitments versus self-preservation.',
  'Self-definition versus group acceptance.',
])}

${buildEnumGuidance('conflictType', CONFLICT_TYPE_VALUES, [
  'Direct human antagonist opposition.',
  'Internal psychological struggle.',
  'Individual against societal structures.',
  'Environmental or natural forces opposition.',
  'Technology-driven opposition or consequence.',
  'Otherworldly or inexplicable forces.',
  'Destiny, prophecy, or inevitable forces.',
])}

${buildEnumGuidance('branchingPosture', BRANCHING_POSTURES, [
  'Pure branch divergence with no reconvergence.',
  'Branches split but meet at major junctions.',
  'Modular episodes gated by world state.',
  'Central base with radial branch excursions.',
])}

${buildEnumGuidance('settingScale', SETTING_SCALES, [
  'Single place or tightly bounded area.',
  'Neighborhood, district, or small town scope.',
  'City, territory, or regional theater.',
  'World-scale or multi-realm implications.',
])}

${buildEnumGuidance('stateComplexity', STATE_COMPLEXITIES, [
  '5-8 core variables; light state load.',
  '9-14 core variables; moderate coordination.',
  '15-20 core variables; heavy state coupling.',
])}`;
}

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function buildConceptIdeatorPrompt(context: ConceptIdeatorContext): ChatMessage[] {
  const genreVibes = normalize(context.genreVibes);
  const moodKeywords = normalize(context.moodKeywords);
  const contentPreferences = normalize(context.contentPreferences);
  const thematicInterests = normalize(context.thematicInterests);
  const sparkLine = normalize(context.sparkLine);

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
  systemSections.push(buildTaxonomyGuidance());
  systemSections.push(QUALITY_ANCHORS);
  systemSections.push(DIVERSITY_CONSTRAINTS);

  const userSections: string[] = [
    'Generate 6-8 concept candidates that satisfy the taxonomy and diversity constraints.',
  ];

  if (genreVibes) {
    userSections.push(`GENRE VIBES:\n${genreVibes}`);
  }
  if (moodKeywords) {
    userSections.push(`MOOD KEYWORDS:\n${moodKeywords}`);
  }
  if (thematicInterests) {
    userSections.push(`THEMATIC INTERESTS:\n${thematicInterests}`);
  }
  if (sparkLine) {
    userSections.push(`SPARK LINE:\n${sparkLine}`);
  }
  if (contentPreferences) {
    userSections.push(`CONTENT PREFERENCES:\n${contentPreferences}`);
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "concepts": [ConceptSpec, ...] }.
- Populate every required field for each concept.
- actionVerbs must contain at least 6 concise, distinct verbs.
- conflictType must be structurally coherent with conflictAxis (e.g., INDIVIDUAL_VS_SYSTEM pairs naturally with PERSON_VS_SOCIETY).
- settingAxioms must contain 2-5 enforceable rules.
- constraintSet must contain 3-5 meaningful limits.
- keyInstitutions must contain 2-4 pressure-producing institutions.`
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
