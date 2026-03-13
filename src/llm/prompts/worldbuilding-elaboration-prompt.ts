import type { WorldSeed } from '../../models/world-seed.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

export interface WorldElaborationPromptContext {
  readonly worldSeed: WorldSeed;
  readonly userNotes?: string;
  readonly tone?: string;
}

const ELABORATION_SYSTEM_PROMPT = `You are a World Elaboration Engine for an interactive branching story engine. Your job is to take a World Seed (deep logic, pressures, invariants) and expand it into a writer-usable and engine-usable world asset.

${CONTENT_POLICY}

ELABORATION PRINCIPLES:

1. Expand only domains with dramatic utility. Not every domain needs facts.
2. Every fact must do at least one of: constrain action, create opportunity, shape perception, define status/power, generate mystery, or support a likely choice.
3. Facts must use stable IDs (wf-1, wf-2, etc.).
4. Facts must include narrativeWeight (HIGH/MEDIUM/LOW).
5. Facts should include storyFunctions (EPIC/EPISTEMIC/DRAMATIC/ATMOSPHERIC/THEMATIC).
6. Facts should include sceneAffordances whenever a detail can drive an actual page choice.
7. Distinguish: public truth (LAW/NORM), contested belief (BELIEF/DISPUTED), hearsay (RUMOR), hidden pressure (MYSTERY), daily practice (PRACTICE), social prohibition (TABOO).
8. Keep some openQuestions on purpose — areas the world intentionally leaves unresolved.
9. Produce author-facing markdown sections, not just JSON.
10. Use tensionWithIds and implicationOfIds to connect facts into a web of tension and implication.

REQUIRED MARKDOWN STRUCTURE for rawWorldMarkdown:
1. World Logline
2. What Is Always True Here
3. What Daily Life Feels Like
4. Power, Hierarchy, and Enforcement
5. Anchor Locations
6. Public Beliefs, Rumors, and Taboos
7. Hidden Pressures and Misread Truths
8. Story Vectors / Choice Pressures
9. Naming, Idiom, and Surface Texture
10. Open Questions`;

function formatSeedForPrompt(seed: WorldSeed): string {
  const sections: string[] = ['WORLD SEED:'];

  sections.push('\nSIGNATURE ELEMENTS:');
  seed.signatureElements.forEach((e) => sections.push(`- ${e}`));

  sections.push('\nINVARIANTS:');
  seed.invariants.forEach((inv) => {
    sections.push(`- ${inv.invariant}`);
    sections.push(`  Consequence: ${inv.consequence}`);
    sections.push(`  Human cost: ${inv.humanCost}`);
  });

  sections.push('\nPOWER STRUCTURES:');
  seed.powerStructures.forEach((ps) => {
    sections.push(`- ${ps.holder}: ${ps.mechanism} (vulnerability: ${ps.vulnerability})`);
  });

  sections.push('\nCULTURAL FAULT LINES:');
  seed.culturalFaultLines.forEach((cfl) => {
    sections.push(`- ${cfl.tension} (groups: ${cfl.groups.join(', ')})`);
    sections.push(`  Narrative potential: ${cfl.narrativePotential}`);
  });

  sections.push('\nPRESSURES:');
  seed.pressures.forEach((p) => {
    sections.push(`- [${p.storyFunction}] ${p.pressure}`);
    sections.push(`  Affected: ${p.affectedGroups.join(', ')}`);
    sections.push(`  Escalation: ${p.escalationPath}`);
  });

  sections.push('\nANCHOR LOCATIONS:');
  seed.anchorLocations.forEach((loc) => {
    sections.push(`- ${loc.name}: ${loc.publicFace}`);
    sections.push(`  Hidden pressure: ${loc.hiddenPressure}`);
    sections.push(`  Sensory: ${loc.sensorySignature}`);
    sections.push(`  Scene use: ${loc.likelySceneUse}`);
  });

  sections.push('\nEVERYDAY PRACTICES:');
  seed.everydayPractices.forEach((ep) => {
    sections.push(`- ${ep.practice} (${ep.whoPerformsIt})`);
    sections.push(`  Meaning: ${ep.socialMeaning}`);
    sections.push(`  Refusal cost: ${ep.costOfRefusal}`);
    sections.push(`  Sensory: ${ep.sensoryCue}`);
  });

  sections.push('\nPUBLIC MYSTERIES:');
  seed.publicMysteries.forEach((pm) => {
    sections.push(`- ${pm.mystery}`);
    sections.push(`  Common explanation: ${pm.commonExplanation}`);
    sections.push(`  Hidden truth hint: ${pm.hiddenTruthHint}`);
  });

  sections.push('\nNAMING LEXICON:');
  sections.push(`Person names: ${seed.namingLexicon.personNameStyle}`);
  sections.push(`Place names: ${seed.namingLexicon.placeNameStyle}`);
  sections.push(`Titles: ${seed.namingLexicon.titles.join(', ')}`);
  sections.push(`Idioms: ${seed.namingLexicon.idioms.join(', ')}`);
  sections.push(`Taboo terms: ${seed.namingLexicon.tabooTerms.join(', ')}`);

  sections.push('\nSTORY VECTORS:');
  seed.storyVectors.forEach((sv) => {
    sections.push(`- [${sv.type}] ${sv.vector}`);
    sections.push(`  Question: ${sv.centralQuestion}`);
    sections.push(`  Stakes: ${sv.stakes}`);
    sections.push(`  Opposition: ${sv.likelyOpposition}`);
  });

  sections.push('\nSENSORY PALETTE:');
  sections.push(`Textures: ${seed.sensoryPalette.textures.join(', ')}`);
  sections.push(`Sounds: ${seed.sensoryPalette.sounds.join(', ')}`);
  sections.push(`Smells: ${seed.sensoryPalette.smells.join(', ')}`);
  sections.push(`Colors: ${seed.sensoryPalette.colors.join(', ')}`);

  return sections.join('\n');
}

export function buildWorldElaborationPrompt(context: WorldElaborationPromptContext): ChatMessage[] {
  const systemSections: string[] = [ELABORATION_SYSTEM_PROMPT];

  if (context.tone) {
    systemSections.push(buildToneDirective(context.tone));
  }

  const parts: string[] = [
    'Elaborate the following World Seed into a full world asset.\n',
    formatSeedForPrompt(context.worldSeed),
  ];

  if (context.userNotes) {
    parts.push(`\nUSER NOTES:\n${context.userNotes}`);
  }

  parts.push(`\nINSTRUCTIONS:
1. Expand only domains with dramatic utility.
2. Use stable IDs (wf-1, wf-2, ...) for all worldFacts.
3. Every fact must include narrativeWeight and at least one storyFunction.
4. Include sceneAffordances for facts that can drive page-level choices.
5. Use tensionWithIds/implicationOfIds to link related facts.
6. rawWorldMarkdown must follow the required 10-section structure.
7. worldLogline must be 1-2 sentences capturing the world's core logic and pressure.
8. Leave genuinely unresolved areas in openQuestions.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: parts.join('\n') },
  ];
}
