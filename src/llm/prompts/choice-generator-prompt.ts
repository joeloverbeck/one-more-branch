import type { GenreFrame } from '../../models/concept-generator.js';
import type { DecomposedCharacter } from '../../models/decomposed-character.js';
import type { ProtagonistAffect } from '../../models/protagonist-affect.js';
import type { ActiveState } from '../../models/state/index.js';
import type { AccumulatedStructureState, StoryStructure } from '../../models/story-arc.js';
import type { StorySpine } from '../../models/story-spine.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { StoryBible } from '../lorekeeper-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { STRICT_CHOICE_GUIDELINES } from './sections/shared/choice-guidelines.js';
import { buildSpineSection } from './sections/shared/spine-section.js';
import {
  buildLocationSection,
  buildThreatsSection,
  buildConstraintsSection,
  buildThreadsSection,
} from './continuation/active-state-sections.js';

export interface ChoiceGeneratorContext {
  readonly narrative: string;
  readonly sceneSummary: string;
  readonly protagonistAffect: ProtagonistAffect;
  readonly dramaticQuestion: string;
  readonly spine?: StorySpine;
  readonly activeState: ActiveState;
  readonly structure?: StoryStructure;
  readonly accumulatedStructureState?: AccumulatedStructureState;
  readonly storyBible?: StoryBible;
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly genreFrame?: GenreFrame;
  readonly decomposedCharacters: readonly DecomposedCharacter[];
  readonly choiceGuidance: 'basic' | 'strict';
}

function buildBeatObjectiveSection(
  structure?: StoryStructure,
  accumulatedStructureState?: AccumulatedStructureState
): string {
  if (!structure || !accumulatedStructureState) {
    return '';
  }

  const { currentActIndex, currentBeatIndex } = accumulatedStructureState;
  const act = structure.acts[currentActIndex];
  if (!act) {
    return '';
  }

  const beat = act.beats[currentBeatIndex];
  if (!beat) {
    return '';
  }

  return `CURRENT BEAT: "${beat.name}" (${beat.role})
Beat Objective: ${beat.objective}
Act Objective: ${act.objective}

`;
}

function buildProtagonistSection(
  decomposedCharacters: readonly DecomposedCharacter[]
): string {
  const protagonist = decomposedCharacters[0];
  if (!protagonist) {
    return '';
  }

  return `PROTAGONIST: ${protagonist.name}
Core Traits: ${protagonist.coreTraits.join(', ')}

`;
}

function buildAffectSection(affect: ProtagonistAffect): string {
  return `PROTAGONIST EMOTIONAL STATE (end of scene):
Primary: ${affect.primaryEmotion} (${affect.primaryIntensity}) - ${affect.primaryCause}
Motivation: ${affect.dominantMotivation}

`;
}

function buildDramaticQuestionSection(dramaticQuestion: string): string {
  return `DRAMATIC QUESTION: ${dramaticQuestion}

`;
}

function buildStoryBibleContextSection(storyBible: StoryBible): string {
  if (!storyBible.relevantHistory) {
    return '';
  }

  return `RELEVANT HISTORY:\n${storyBible.relevantHistory}\n\n`;
}

const CHOICE_GENERATOR_SYSTEM = `You are a choice architect for interactive fiction. Your sole focus is crafting meaningful, divergent player choices that emerge naturally from the scene just written.

You do NOT write narrative prose. You ONLY generate structured choice objects.

${CONTENT_POLICY}`;

export function buildChoiceGeneratorPrompt(
  context: ChoiceGeneratorContext
): ChatMessage[] {
  const spineSection = buildSpineSection(context.spine);
  const locationSection = buildLocationSection(context.activeState);
  const threatsSection = buildThreatsSection(context.activeState);
  const constraintsSection = buildConstraintsSection(context.activeState);
  const threadsSection = buildThreadsSection(context.activeState);
  const beatSection = buildBeatObjectiveSection(
    context.structure,
    context.accumulatedStructureState
  );
  const protagonistSection = buildProtagonistSection(context.decomposedCharacters);
  const affectSection = buildAffectSection(context.protagonistAffect);
  const dramaticQuestionSection = buildDramaticQuestionSection(
    context.dramaticQuestion
  );
  const bibleSection = context.storyBible
    ? buildStoryBibleContextSection(context.storyBible)
    : '';
  const guidelinesSection = context.choiceGuidance === 'strict'
    ? STRICT_CHOICE_GUIDELINES + '\n\n'
    : '';

  const userPrompt = `Generate structured choices for the following scene.

=== WRITTEN SCENE ===
${context.narrative}

=== SCENE SUMMARY ===
${context.sceneSummary}

${spineSection}${beatSection}${dramaticQuestionSection}${protagonistSection}${affectSection}${bibleSection}${locationSection}${threatsSection}${constraintsSection}${threadsSection}${guidelinesSection}NEED VS WANT RULE: At least one choice should force the protagonist to choose between pursuing their Want and addressing their true Need from the spine. This tension creates the most compelling dramatic choices.

REQUIREMENTS:
1. Generate 2-4 structured choice objects (typically 3; add a 4th only when the situation truly warrants another distinct path)
2. Each choice MUST have a different choiceType OR primaryDelta from all other choices
3. Choices must flow from the scene's final dramatic beat - reference specific moments from the narrative
4. Start each choice text with a clear action verb (e.g., "Demand", "Flee", "Accept")
5. Do NOT offer a choice that repeats what already happened in the scene
6. Do NOT offer choices that prematurely close off open narrative threads unless dramatically appropriate
7. Each choice should present a meaningfully different path that changes the story's direction
8. Choices must be in-character for the protagonist given their personality and emotional state

WHEN IN CONFLICT, PRIORITIZE:
1. Choices answer the dramatic question with divergent tags
2. Choices are natural responses to the scene's final moment
3. Each choice changes a different dimension of the story`;

  return [
    { role: 'system', content: CHOICE_GENERATOR_SYSTEM },
    { role: 'user', content: userPrompt },
  ];
}
