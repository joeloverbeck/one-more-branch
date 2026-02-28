import {
  CONFLICT_AXES,
  GENRE_FRAMES,
  SETTING_SCALES,
  filterGenreFrames,
} from '../../models/concept-generator.js';
import type { GenreFrame } from '../../models/concept-generator.js';
import { CONFLICT_TYPE_VALUES } from '../../models/story-spine.js';

function buildEnumGuidance(label: string, values: readonly string[], descriptions: string[]): string {
  const rows = values.map((value, index) => `- ${value}: ${descriptions[index]}`);
  return `${label}:\n${rows.join('\n')}`;
}

const GENRE_DESCRIPTIONS: readonly string[] = [
  'Physical peril, exotic locations, and protagonist resourcefulness.',
  'Youth protagonist journey from naivete through disillusionment to maturity.',
  'Incomprehensible reality, insignificance of humanity, knowledge as madness.',
  'Daoist-cosmology power progression through tiered cultivation realms and tribulations.',
  'Low-life and high tech; street survival against corporate megastructures.',
  'Gallows humor and absurd irony amid genuinely dire stakes.',
  'Interpersonal and social conflict realism.',
  'Systemic collapse and controlled oppression.',
  'Physical desire as narrative engine; intimacy as character revelation.',
  'Deception, cover identities, and loyalty-versus-mission tension.',
  'Moral allegory with symbolic clarity.',
  'Mythic or magical rule-bound worlds.',
  'Decay, obsession, and oppressive atmosphere.',
  'Moral nihilism where right action is impossible or futile.',
  'Team-assembled scheme with plan-execution-twist structure and competence spectacle.',
  'Real-period settings with era-specific customs, constraints, and dilemmas.',
  'Fear, dread, and destabilization.',
  'Transported protagonist adapting to a new world with outsider knowledge.',
  'Character interiority and social nuance focus.',
  'Mundane world where the impossible is treated as ordinary.',
  'Investigation and hidden truth recovery.',
  'Archetypal struggle and legend-scale stakes.',
  'Moral ambiguity, corruption, and fatalism.',
  'Episodic rogue journey through satirical social exposure.',
  'Collapsed civilization, survival, and rebuilding amid ruins.',
  'Intimacy, attachment, and relational stakes.',
  'Societal critique through exaggeration or irony.',
  'Speculative systems and technological consequences.',
  'Galactic-scale character drama with epic emotional stakes and cosmic spectacle.',
  'Dream-logic, symbolic dislocation, altered reality.',
  'Sustained danger and tightening pressure.',
  'Self-caused downfall through fatal flaw; peripeteia and catharsis.',
  'Frontier law, territory, and legacy conflict.',
  'Martial-arts honor code, jianghu underworld, qi cultivation, and sect politics.',
];

function filterGenreDescriptions(
  excludedGenres?: readonly GenreFrame[],
): { genres: readonly string[]; descriptions: string[] } {
  const allowed = filterGenreFrames(excludedGenres);
  const descriptions = allowed.map((genre) => {
    const index = GENRE_FRAMES.indexOf(genre);
    return GENRE_DESCRIPTIONS[index] as string;
  });
  return { genres: allowed, descriptions };
}

export function buildSeederTaxonomyGuidance(excludedGenres?: readonly GenreFrame[]): string {
  const { genres, descriptions } = filterGenreDescriptions(excludedGenres);
  return `TAXONOMY GUIDANCE:
${buildEnumGuidance('genreFrame', genres, descriptions)}

${buildEnumGuidance('conflictAxis', CONFLICT_AXES, [
  'Personal agency against institutions.',
  'Revealing truth versus preserving order.',
  'Obligation clashing with personal longing.',
  'Autonomy versus protective constraints.',
  'Understanding versus protective ignorance.',
  'Capability gain versus ethical limits.',
  'Commitments versus self-preservation.',
  'Self-definition versus group acceptance.',
  'Righteous fairness versus compassionate forgiveness.',
  'Innovation and change versus preservation and heritage.',
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

`;
}

export function buildArchitectTaxonomyGuidance(): string {
  return `TAXONOMY GUIDANCE:
${buildEnumGuidance('settingScale', SETTING_SCALES, [
  'Single place or tightly bounded area.',
  'Neighborhood, district, or small town scope.',
  'City, territory, or regional theater.',
  'World-scale or multi-realm implications.',
])}

`;
}

export function buildConceptTaxonomyGuidance(excludedGenres?: readonly GenreFrame[]): string {
  const { genres, descriptions } = filterGenreDescriptions(excludedGenres);
  return `TAXONOMY GUIDANCE:
${buildEnumGuidance('genreFrame', genres, descriptions)}

${buildEnumGuidance('conflictAxis', CONFLICT_AXES, [
  'Personal agency against institutions.',
  'Revealing truth versus preserving order.',
  'Obligation clashing with personal longing.',
  'Autonomy versus protective constraints.',
  'Understanding versus protective ignorance.',
  'Capability gain versus ethical limits.',
  'Commitments versus self-preservation.',
  'Self-definition versus group acceptance.',
  'Righteous fairness versus compassionate forgiveness.',
  'Innovation and change versus preservation and heritage.',
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

export const SEEDER_QUALITY_ANCHORS = `QUALITY ANCHORS:
- A concept seed is an identity spark, not a plot summary.
- oneLineHook must be graspable without proper nouns.
- whatIfQuestion must be a single question ending with '?' that translates the dramatic thesis into a specific, producible situation. The question must contain a built-in tension - not just a scenario but a dilemma where answering it one way forecloses something valuable.
- playerFantasy must be 1 sentence describing the experiential promise of being the protagonist, not just their actions.
- genreSubversion must genuinely twist the genre expectation, not merely restate it.`;

export const ARCHITECT_QUALITY_ANCHORS = `QUALITY ANCHORS:
- coreConflictLoop must describe a recurring decision pattern, not a one-time event.
- settingAxioms and constraints must be concrete and enforceable by an LLM.
- actionVerbs must imply strategy diversity, not synonyms. Include at least 6 distinct verbs.
- keyInstitutions must actively produce pressure, not merely exist as backdrop.
- protagonistRole, coreCompetence, and coreFlaw must create a tradeoff that forces real choices.`;

export const ENGINEER_QUALITY_ANCHORS = `QUALITY ANCHORS:
- ironicTwist must be 1-2 sentences describing built-in irony where strength becomes weakness or solution creates the problem.
- incitingDisruption must describe the specific event or revelation that shatters the protagonist's status quo. It must answer "why now?" and feel inevitable given the setting and conflict axis.
- escapeValve must describe the structural mechanism that re-engages the conflict loop when the player refuses the obvious path, derails, or stalls. It should be embedded in the world or antagonistic force, not a deus ex machina.
- elevatorParagraph must synthesize the full concept — identity, character, world, and conflict engine — into a compelling pitch paragraph.
- pressureSource must create escalating external force, not just background threat.
- deadlineMechanism must have teeth — the player must feel the cost of inaction.`;

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
