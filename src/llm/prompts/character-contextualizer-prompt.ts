import type { ConceptSpec } from '../../models/concept-generator.js';
import type { StandaloneDecomposedCharacter } from '../../models/standalone-decomposed-character.js';
import { formatStandaloneCharacterSummary } from '../../models/standalone-decomposed-character.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { StorySpine } from '../../models/story-spine.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import {
  buildConceptAnalysisSection,
  buildKernelGroundingSection,
} from './sections/shared/concept-kernel-sections.js';

export interface CharacterContextualizerContext {
  readonly characters: readonly StandaloneDecomposedCharacter[];
  readonly protagonistIndex: number;
  readonly spine: StorySpine;
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly startingSituation?: string;
  readonly conceptSpec?: ConceptSpec;
  readonly storyKernel?: StoryKernel;
}

const CONTEXTUALIZER_SYSTEM_PROMPT = `You are a Character Contextualizer for an interactive branching story engine. You receive pre-analyzed character profiles and story context. Your job is to determine each character's thematic stance and relationship to the protagonist.

${CONTENT_POLICY}

CONTEXTUALIZATION PRINCIPLES:

1. THEMATIC STANCE: For each character, state how they position relative to the story's thematic argument/value at stake. Capture whether they reinforce, resist, complicate, or evolve against the core thesis. One sentence.

2. PROTAGONIST RELATIONSHIP: For each NPC, produce a structured relationship object describing their dynamic with the protagonist: valence (-5 to +5), dynamic label (mentor, rival, ally, etc.), 1-2 sentence history, current tension, and leverage. Set to null for the protagonist's own entry.

3. USE EXISTING PROFILES: The character profiles have already been decomposed with speech fingerprints, traits, beliefs, etc. Do NOT re-analyze those. Focus ONLY on thematic stance and protagonist relationship.

4. STORY CONTEXT ALIGNMENT: Ground thematic stances in the spine's dramatic question and the kernel's value at stake. NPC relationships should create friction with or support for the antagonistic force.`;

function formatCharacterForContextualization(
  char: StandaloneDecomposedCharacter,
  isProtagonist: boolean
): string {
  const label = isProtagonist ? ' (PROTAGONIST)' : ' (NPC)';
  return formatStandaloneCharacterSummary(char) + label;
}

function buildSpineSection(spine: StorySpine): string {
  const lines: string[] = [
    'STORY SPINE:',
    `Central dramatic question: ${spine.centralDramaticQuestion}`,
    `Protagonist need: ${spine.protagonistNeedVsWant.need}`,
    `Protagonist want: ${spine.protagonistNeedVsWant.want}`,
    `Need-want dynamic: ${spine.protagonistNeedVsWant.dynamic}`,
    `Antagonistic force: ${spine.primaryAntagonisticForce.description}`,
    `Pressure mechanism: ${spine.primaryAntagonisticForce.pressureMechanism}`,
    `Character arc type: ${spine.characterArcType}`,
  ];
  return lines.join('\n');
}

export function buildCharacterContextualizerPrompt(
  context: CharacterContextualizerContext
): ChatMessage[] {
  const characterSections = context.characters
    .map((char, i) => formatCharacterForContextualization(char, i === context.protagonistIndex))
    .join('\n\n');

  const spineSection = buildSpineSection(context.spine);
  const conceptSection = buildConceptAnalysisSection(context.conceptSpec);
  const kernelSection = buildKernelGroundingSection(context.storyKernel);

  const startingSituationSection = context.startingSituation
    ? `\n\nSTARTING SITUATION:\n${context.startingSituation}`
    : '';

  const userPrompt = `Determine the thematic stance and protagonist relationships for the following characters in the context of this story.

CHARACTER PROFILES:
${characterSections}

${spineSection}${conceptSection ? `\n\n${conceptSection}` : ''}${kernelSection ? `\n\n${kernelSection}` : ''}${startingSituationSection}

INSTRUCTIONS:
1. Return characters in the SAME ORDER as provided above
2. The protagonist's protagonistRelationship MUST be null
3. Each NPC MUST have a non-null protagonistRelationship
4. Thematic stances should reflect each character's relationship to the story's central dramatic question and value at stake
5. NPC relationships should create productive narrative tension — not every NPC is an ally or enemy`;

  return [
    { role: 'system', content: CONTEXTUALIZER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
