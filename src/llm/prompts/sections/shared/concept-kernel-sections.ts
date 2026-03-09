import type { ConceptSpec } from '../../../../models/concept-generator.js';
import type { StoryKernel } from '../../../../models/story-kernel.js';

export function buildConceptAnalysisSection(conceptSpec?: ConceptSpec): string {
  if (!conceptSpec) {
    return '';
  }

  const lines: string[] = [
    'CONCEPT ANALYSIS (use to ground character decomposition):',
    '',
    'NARRATIVE IDENTITY:',
    `One-line hook: ${conceptSpec.oneLineHook}`,
    `Elevator pitch: ${conceptSpec.elevatorParagraph}`,
    `Player fantasy: ${conceptSpec.playerFantasy}`,
    `What-if question: ${conceptSpec.whatIfQuestion}`,
    `Ironic twist: ${conceptSpec.ironicTwist}`,
    '',
    'GENRE FRAME:',
    `Genre: ${conceptSpec.genreFrame} (Subversion: ${conceptSpec.genreSubversion})`,
    '',
    'PROTAGONIST:',
    `Role: ${conceptSpec.protagonistRole}`,
    `Core competence: ${conceptSpec.coreCompetence}`,
    `Core flaw: ${conceptSpec.coreFlaw}`,
    `Action verbs: ${conceptSpec.actionVerbs.join(', ')}`,
    '',
    'PROTAGONIST ARC (Weiland):',
    `Protagonist Lie: ${conceptSpec.protagonistLie}`,
    `Protagonist Truth: ${conceptSpec.protagonistTruth}`,
    `Protagonist Ghost: ${conceptSpec.protagonistGhost}`,
    `Want–Need Collision Sketch: ${conceptSpec.wantNeedCollisionSketch}`,
    '',
    'CONFLICT ENGINE:',
    `Core conflict loop: ${conceptSpec.coreConflictLoop}`,
    `Thematic tension axis: ${conceptSpec.conflictAxis}`,
    `Structural opposition: ${conceptSpec.conflictType}`,
    `Pressure source: ${conceptSpec.pressureSource}`,
    `Personal stakes: ${conceptSpec.stakesPersonal}`,
    `Systemic stakes: ${conceptSpec.stakesSystemic}`,
    `Deadline mechanism: ${conceptSpec.deadlineMechanism}`,
    `Inciting disruption: ${conceptSpec.incitingDisruption}`,
    `Escape valve: ${conceptSpec.escapeValve}`,
    '',
    'WORLD ARCHITECTURE:',
    `Setting axioms: ${conceptSpec.settingAxioms.join('; ')}`,
    `Constraints: ${conceptSpec.constraintSet.join('; ')}`,
    `Key institutions: ${conceptSpec.keyInstitutions.join('; ')}`,
    `Setting scale: ${conceptSpec.settingScale}`,
  ];

  return '\n\n' + lines.join('\n');
}

export function buildKernelGroundingSection(storyKernel?: StoryKernel): string {
  if (!storyKernel) {
    return '';
  }

  const lines: string[] = [
    'THEMATIC KERNEL (philosophical foundation — let it shape character depth):',
    `Dramatic thesis: ${storyKernel.dramaticThesis}`,
    `Value at stake: ${storyKernel.valueAtStake}`,
    `Opposing force: ${storyKernel.opposingForce}`,
    `Direction of change: ${storyKernel.directionOfChange}`,
    `Conflict axis: ${storyKernel.conflictAxis}`,
    `Dramatic stance: ${storyKernel.dramaticStance}`,
    `Thematic question: ${storyKernel.thematicQuestion}`,
    `Moral argument: ${storyKernel.moralArgument}`,
    '',
    'VALUE SPECTRUM (McKee):',
    `Positive: ${storyKernel.valueSpectrum.positive}`,
    `Contrary: ${storyKernel.valueSpectrum.contrary}`,
    `Contradictory: ${storyKernel.valueSpectrum.contradictory}`,
    `Negation of negation: ${storyKernel.valueSpectrum.negationOfNegation}`,
  ];

  return '\n\n' + lines.join('\n');
}
