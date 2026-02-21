import { CONFLICT_AXES, GENRE_FRAMES, SETTING_SCALES } from '../../models/concept-generator.js';
import { CONFLICT_TYPE_VALUES } from '../../models/story-spine.js';

function buildEnumGuidance(label: string, values: readonly string[], descriptions: string[]): string {
  const rows = values.map((value, index) => `- ${value}: ${descriptions[index]}`);
  return `${label}:\n${rows.join('\n')}`;
}

export function buildConceptTaxonomyGuidance(): string {
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

${buildEnumGuidance('settingScale', SETTING_SCALES, [
  'Single place or tightly bounded area.',
  'Neighborhood, district, or small town scope.',
  'City, territory, or regional theater.',
  'World-scale or multi-realm implications.',
])}

`;
}

export const CONCEPT_QUALITY_ANCHORS = `QUALITY ANCHORS:
- A concept is a generative engine, not a plot summary.
- oneLineHook must be graspable without proper nouns.
- coreConflictLoop must describe a recurring decision pattern.
- settingAxioms and constraints must be concrete and enforceable by an LLM.
- actionVerbs must imply strategy diversity, not synonyms.
- whatIfQuestion must be a single question ending with '?' that translates the dramatic thesis into a specific, producible situation. The question must contain a built-in tension - not just a scenario but a dilemma where answering it one way forecloses something valuable.
- ironicTwist must be 1-2 sentences describing built-in irony where strength becomes weakness or solution creates the problem.
- playerFantasy must be 1 sentence describing the experiential promise of being the protagonist, not just their actions.
- incitingDisruption must describe the specific event or revelation that shatters the protagonist's status quo. It must answer "why now?" and feel inevitable given the setting and conflict axis.
- escapeValve must describe the structural mechanism that re-engages the conflict loop when the player refuses the obvious path, derails, or stalls. It should be embedded in the world or antagonistic force, not a deus ex machina.`;
