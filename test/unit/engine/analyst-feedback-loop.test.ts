/**
 * Tests for the analyst-to-planner feedback loop:
 * - AnalystResult stored on Page
 * - Serialization round-trip
 * - Pacing cluster extraction into continuation context
 * - Momentum trajectory collection
 * - Pacing briefing rendering in planner prompt
 * - Pacing directive removed from writer prompt
 */
import {
  createChoice,
  createEmptyAccumulatedStructureState,
  createEmptyActiveState,
  createPage,
  parsePageId,
} from '@/models';
import type { MomentumTrajectory } from '@/llm/generation-pipeline-types';
import { serializePage, deserializePage } from '@/persistence/page-serializer';
import { buildContinuationPage, ContinuationPageBuildContext } from '@/engine/page-builder';
import { buildPlannerContinuationContextSection } from '@/llm/prompts/sections/planner/continuation-context';
import { countConsecutiveFromEnd } from '@/llm/prompts/sections/planner/continuation-context';
import type { ContinuationPagePlanContext } from '@/llm/context-types';
import {
  createMockAnalystResult,
  createMockFinalResult,
} from '../../fixtures/llm-results';

function makeBasePlannerContext(
  overrides: Partial<ContinuationPagePlanContext> = {}
): ContinuationPagePlanContext {
  return {
    mode: 'continuation',
    characterConcept: 'A rogue agent',
    worldbuilding: 'Dark cyberpunk city',
    tone: 'gritty',
    globalCanon: [],
    globalCharacterCanon: {},
    previousNarrative: 'The alley was dark.',
    selectedChoice: 'Run',
    accumulatedInventory: [],
    accumulatedHealth: [],
    accumulatedCharacterState: {},
    activeState: createEmptyActiveState(),
    grandparentNarrative: null,
    ancestorSummaries: [],
    ...overrides,
  };
}

describe('Analyst-to-Planner Feedback Loop', () => {
  describe('Phase 1: AnalystResult storage on Page', () => {
    it('createPage defaults analystResult to null', () => {
      const page = createPage({
        id: parsePageId(1),
        narrativeText: 'Test.',
        sceneSummary: 'Test summary.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      expect(page.analystResult).toBeNull();
    });

    it('createPage stores provided analystResult', () => {
      const ar = createMockAnalystResult();
      const page = createPage({
        id: parsePageId(1),
        narrativeText: 'Test.',
        sceneSummary: 'Test summary.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        analystResult: ar,
      });
      expect(page.analystResult).toBe(ar);
    });

    it('serializes and deserializes analystResult round-trip', () => {
      const ar = createMockAnalystResult({
        sceneMomentum: 'STASIS',
        objectiveAnchors: ['Find the hidden cache'],
        pacingIssueDetected: true,
        pacingIssueReason: 'Beat 1.1 stalled for 4 pages without advancing objective.',
      });
      const page = createPage({
        id: parsePageId(1),
        narrativeText: 'Test.',
        sceneSummary: 'Test summary.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        analystResult: ar,
      });

      const serialized = serializePage(page);
      expect(serialized.analystResult).not.toBeNull();
      expect(serialized.analystResult?.sceneMomentum).toBe('STASIS');
      expect(serialized.analystResult?.objectiveAnchors).toEqual(['Find the hidden cache']);

      const deserialized = deserializePage(serialized);
      expect(deserialized.analystResult).not.toBeNull();
      expect(deserialized.analystResult?.sceneMomentum).toBe('STASIS');
      expect(deserialized.analystResult?.objectiveEvidenceStrength).toBe('WEAK_IMPLICIT');
      expect(deserialized.analystResult?.pacingIssueReason).toBe(
        'Beat 1.1 stalled for 4 pages without advancing objective.'
      );
      // rawResponse is excluded during serialization
      expect(deserialized.analystResult?.rawResponse).toBe('');
    });

    it('serializes null analystResult', () => {
      const page = createPage({
        id: parsePageId(1),
        narrativeText: 'Test.',
        sceneSummary: 'Test summary.',
        choices: [createChoice('A'), createChoice('B')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const serialized = serializePage(page);
      expect(serialized.analystResult).toBeNull();
    });
  });

  describe('Phase 1: buildContinuationPage passes analystResult', () => {
    it('passes analystResult to created page', () => {
      const ar = createMockAnalystResult();
      const result = createMockFinalResult();
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: createEmptyActiveState(),
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
        storyBible: null,
        analystResult: ar,
        parentThreadAges: {},
        parentAccumulatedPromises: [],
        analystPromisesDetected: [],
        analystPromisesResolved: [],
      };

      const page = buildContinuationPage(result, context);
      expect(page.analystResult).toBe(ar);
    });

    it('passes null analystResult when not provided', () => {
      const result = createMockFinalResult();
      const context: ContinuationPageBuildContext = {
        pageId: parsePageId(2),
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: createEmptyActiveState(),
        parentAccumulatedInventory: [],
        parentAccumulatedHealth: [],
        parentAccumulatedCharacterState: {},
        structureState: createEmptyAccumulatedStructureState(),
        structureVersionId: null,
        storyBible: null,
        analystResult: null,
        parentThreadAges: {},
        parentAccumulatedPromises: [],
        analystPromisesDetected: [],
        analystPromisesResolved: [],
      };

      const page = buildContinuationPage(result, context);
      expect(page.analystResult).toBeNull();
    });
  });

  describe('Phase 2: Pacing briefing in planner prompt', () => {
    it('renders PACING BRIEFING with directive and nudge', () => {
      const context = makeBasePlannerContext({
        parentPacingDirective: 'The next scene should deliver a direct confrontation.',
        parentPacingNudge: 'Beat stalled for 4 pages.',
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('=== PACING BRIEFING (from story analyst) ===');
      expect(result).toContain('The next scene should deliver a direct confrontation.');
      expect(result).toContain('URGENT: Beat stalled for 4 pages.');
    });

    it('renders PACING BRIEFING with directive alone', () => {
      const context = makeBasePlannerContext({
        parentPacingDirective: 'After this tense revelation, a brief character moment is acceptable.',
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('=== PACING BRIEFING (from story analyst) ===');
      expect(result).toContain('After this tense revelation, a brief character moment is acceptable.');
      expect(result).not.toContain('URGENT:');
    });

    it('omits PACING BRIEFING when no directive, nudge, or trajectory warnings', () => {
      const context = makeBasePlannerContext();
      const result = buildPlannerContinuationContextSection(context);
      expect(result).not.toContain('PACING BRIEFING');
    });

    it('omits PACING BRIEFING when only raw momentum/evidence present (no directive)', () => {
      const context = makeBasePlannerContext({
        parentSceneMomentum: 'STASIS',
        parentObjectiveEvidenceStrength: 'NONE',
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).not.toContain('PACING BRIEFING');
      expect(result).not.toContain('Scene momentum:');
      expect(result).not.toContain('Objective evidence strength:');
    });

    it('renders directive together with trajectory warnings', () => {
      const trajectory: MomentumTrajectory = [
        { pageId: parsePageId(1), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
        { pageId: parsePageId(2), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
      ];

      const context = makeBasePlannerContext({
        parentPacingDirective: 'Accelerate toward the beat objective.',
        momentumTrajectory: trajectory,
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('Accelerate toward the beat objective.');
      expect(result).toContain('WARNING: The last 2 scenes showed no meaningful narrative progress.');
    });
  });

  describe('Phase 4: Momentum trajectory warnings in planner prompt', () => {
    it('does not render trajectory trend lines (raw enums removed)', () => {
      const trajectory: MomentumTrajectory = [
        { pageId: parsePageId(1), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
        {
          pageId: parsePageId(2),
          sceneMomentum: 'INCREMENTAL_PROGRESS',
          objectiveEvidenceStrength: 'WEAK_IMPLICIT',
        },
      ];

      const context = makeBasePlannerContext({
        parentPacingDirective: 'Continue steadily.',
        momentumTrajectory: trajectory,
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).not.toContain('Momentum trend');
      expect(result).not.toContain('Objective evidence trend');
    });

    it('omits trajectory warnings when fewer than 2 entries', () => {
      const trajectory: MomentumTrajectory = [
        { pageId: parsePageId(1), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
      ];

      const context = makeBasePlannerContext({
        parentPacingDirective: 'Keep moving.',
        momentumTrajectory: trajectory,
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).not.toContain('WARNING:');
    });

    it('emits STASIS warning at 2+ consecutive', () => {
      const trajectory: MomentumTrajectory = [
        {
          pageId: parsePageId(1),
          sceneMomentum: 'INCREMENTAL_PROGRESS',
          objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
        },
        { pageId: parsePageId(2), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
        {
          pageId: parsePageId(3),
          sceneMomentum: 'STASIS',
          objectiveEvidenceStrength: 'WEAK_IMPLICIT',
        },
      ];

      const context = makeBasePlannerContext({
        momentumTrajectory: trajectory,
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('WARNING: The last 2 scenes showed no meaningful narrative progress.');
      expect(result).toContain('major advancement');
    });

    it('emits weak evidence warning at 3+ consecutive', () => {
      const trajectory: MomentumTrajectory = [
        { pageId: parsePageId(1), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
        {
          pageId: parsePageId(2),
          sceneMomentum: 'STASIS',
          objectiveEvidenceStrength: 'WEAK_IMPLICIT',
        },
        {
          pageId: parsePageId(3),
          sceneMomentum: 'INCREMENTAL_PROGRESS',
          objectiveEvidenceStrength: 'NONE',
        },
      ];

      const context = makeBasePlannerContext({
        momentumTrajectory: trajectory,
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('WARNING: The last 3 scenes produced no clear evidence of beat objective progress.');
      expect(result).toContain('direct progress toward the current beat objective');
    });

    it('does not emit weak evidence warning when evidence is strong at end', () => {
      const trajectory: MomentumTrajectory = [
        { pageId: parsePageId(1), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
        { pageId: parsePageId(2), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
        {
          pageId: parsePageId(3),
          sceneMomentum: 'MAJOR_PROGRESS',
          objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
        },
      ];

      const context = makeBasePlannerContext({
        momentumTrajectory: trajectory,
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).not.toContain('WARNING:');
    });
  });

  describe('countConsecutiveFromEnd', () => {
    it('counts consecutive matching items from end', () => {
      expect(countConsecutiveFromEnd([1, 2, 3, 3, 3], (x) => x === 3)).toBe(3);
    });

    it('returns 0 when last item does not match', () => {
      expect(countConsecutiveFromEnd([3, 3, 1], (x) => x === 3)).toBe(0);
    });

    it('handles empty array', () => {
      expect(countConsecutiveFromEnd([], () => true)).toBe(0);
    });

    it('counts all when all match', () => {
      expect(countConsecutiveFromEnd([1, 1, 1], (x) => x === 1)).toBe(3);
    });

    it('counts 1 when only last matches', () => {
      expect(countConsecutiveFromEnd([2, 2, 1], (x) => x === 1)).toBe(1);
    });
  });
});
