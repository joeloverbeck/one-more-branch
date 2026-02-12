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
import type { AnalystResult, MomentumTrajectory } from '@/llm/types';
import { serializePage, deserializePage } from '@/persistence/page-serializer';
import { buildContinuationPage, ContinuationPageBuildContext } from '@/engine/page-builder';
import { buildPlannerContinuationContextSection } from '@/llm/prompts/sections/planner/continuation-context';
import { countConsecutiveFromEnd } from '@/llm/prompts/sections/planner/continuation-context';
import type { ContinuationPagePlanContext } from '@/llm/types';
import type { FinalPageGenerationResult } from '@/llm/types';

function buildFullAnalystResult(overrides: Partial<AnalystResult> = {}): AnalystResult {
  return {
    beatConcluded: false,
    beatResolution: '',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [],
    narrativeSummary: 'The protagonist explored the market.',
    pacingIssueDetected: true,
    pacingIssueReason: 'Beat 1.1 stalled for 4 pages without advancing objective.',
    recommendedAction: 'nudge',
    sceneMomentum: 'STASIS',
    objectiveEvidenceStrength: 'WEAK_IMPLICIT',
    commitmentStrength: 'TENTATIVE',
    structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
    entryConditionReadiness: 'NOT_READY',
    objectiveAnchors: ['Find the hidden cache'],
    anchorEvidence: ['The merchant mentioned a cache'],
    completionGateSatisfied: false,
    completionGateFailureReason: 'Insufficient evidence of beat objective progress.',
    narrativePromises: [],
    threadPayoffAssessments: [],
    rawResponse: '{"some":"raw"}',
    ...overrides,
  };
}

function buildMockResult(overrides: Partial<FinalPageGenerationResult> = {}): FinalPageGenerationResult {
  return {
    narrative: 'You step into the corridor.',
    choices: [
      { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      { text: 'Go right', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ],
    currentLocation: 'Corridor',
    threatsAdded: [],
    threatsRemoved: [],
    constraintsAdded: [],
    constraintsRemoved: [],
    threadsAdded: [],
    threadsResolved: [],
    newCanonFacts: [],
    newCharacterCanonFacts: {},
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    protagonistAffect: {
      primaryEmotion: 'curiosity',
      primaryIntensity: 'moderate',
      primaryCause: 'Exploring unknown',
      secondaryEmotions: [],
      dominantMotivation: 'Discover secrets',
    },
    isEnding: false,
    sceneSummary: 'Explored the corridor.',
    rawResponse: 'raw',
    reconciliationDiagnostics: [],
    ...overrides,
  };
}

function makeBasePlannerContext(overrides: Partial<ContinuationPagePlanContext> = {}): ContinuationPagePlanContext {
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
      const ar = buildFullAnalystResult();
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
      const ar = buildFullAnalystResult();
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
        'Beat 1.1 stalled for 4 pages without advancing objective.',
      );
      // rawResponse is excluded during serialization
      expect(deserialized.analystResult?.rawResponse).toBe('');
    });

    it('backward compat: old page JSON without analystResult deserializes to null', () => {
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
      // Simulate old page JSON without the field
      delete (serialized as Record<string, unknown>)['analystResult'];

      const deserialized = deserializePage(serialized);
      expect(deserialized.analystResult).toBeNull();
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
      const ar = buildFullAnalystResult();
      const result = buildMockResult();
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
        parentInheritedNarrativePromises: [],
        parentAnalystNarrativePromises: [],
      };

      const page = buildContinuationPage(result, context);
      expect(page.analystResult).toBe(ar);
    });

    it('passes null analystResult when not provided', () => {
      const result = buildMockResult();
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
        parentInheritedNarrativePromises: [],
        parentAnalystNarrativePromises: [],
      };

      const page = buildContinuationPage(result, context);
      expect(page.analystResult).toBeNull();
    });
  });

  describe('Phase 2: Pacing briefing in planner prompt', () => {
    it('renders PACING BRIEFING when pacing data present', () => {
      const context = makeBasePlannerContext({
        parentPacingNudge: 'Beat stalled for 4 pages.',
        parentPacingIssueReason: 'No objective progress.',
        parentSceneMomentum: 'STASIS',
        parentObjectiveEvidenceStrength: 'NONE',
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('=== PACING BRIEFING (from story analyst) ===');
      expect(result).toContain('Pacing nudge: Beat stalled for 4 pages.');
      expect(result).toContain('Pacing issue reason: No objective progress.');
      expect(result).toContain('Scene momentum: STASIS');
      expect(result).toContain('Objective evidence strength: NONE');
    });

    it('includes CRITICAL rule for STASIS + weak evidence', () => {
      const context = makeBasePlannerContext({
        parentSceneMomentum: 'STASIS',
        parentObjectiveEvidenceStrength: 'WEAK_IMPLICIT',
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('CRITICAL: Previous scene showed STASIS');
      expect(result).toContain('Plan MUST advance beat objective directly');
    });

    it('includes breathing scene rule for MAJOR_PROGRESS', () => {
      const context = makeBasePlannerContext({
        parentSceneMomentum: 'MAJOR_PROGRESS',
        parentObjectiveEvidenceStrength: 'CLEAR_EXPLICIT',
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('breathing scene is acceptable');
    });

    it('omits PACING BRIEFING when no pacing data', () => {
      const context = makeBasePlannerContext();
      const result = buildPlannerContinuationContextSection(context);
      expect(result).not.toContain('PACING BRIEFING');
    });

    it('renders partial data correctly', () => {
      const context = makeBasePlannerContext({
        parentSceneMomentum: 'INCREMENTAL_PROGRESS',
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('=== PACING BRIEFING (from story analyst) ===');
      expect(result).toContain('Scene momentum: INCREMENTAL_PROGRESS');
      expect(result).not.toContain('Pacing nudge:');
    });
  });

  describe('Phase 4: Momentum trajectory in planner prompt', () => {
    it('renders trajectory when 2+ entries present', () => {
      const trajectory: MomentumTrajectory = [
        { pageId: parsePageId(1), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
        { pageId: parsePageId(2), sceneMomentum: 'INCREMENTAL_PROGRESS', objectiveEvidenceStrength: 'WEAK_IMPLICIT' },
      ];

      const context = makeBasePlannerContext({
        parentSceneMomentum: 'INCREMENTAL_PROGRESS',
        parentObjectiveEvidenceStrength: 'WEAK_IMPLICIT',
        momentumTrajectory: trajectory,
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('Momentum trend (last 2 pages): STASIS -> INCREMENTAL_PROGRESS');
      expect(result).toContain('Objective evidence trend: NONE -> WEAK_IMPLICIT');
    });

    it('omits trajectory when fewer than 2 entries', () => {
      const trajectory: MomentumTrajectory = [
        { pageId: parsePageId(1), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
      ];

      const context = makeBasePlannerContext({
        parentSceneMomentum: 'STASIS',
        momentumTrajectory: trajectory,
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).not.toContain('Momentum trend');
    });

    it('emits STASIS warning at 2+ consecutive', () => {
      const trajectory: MomentumTrajectory = [
        { pageId: parsePageId(1), sceneMomentum: 'INCREMENTAL_PROGRESS', objectiveEvidenceStrength: 'CLEAR_EXPLICIT' },
        { pageId: parsePageId(2), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
        { pageId: parsePageId(3), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'WEAK_IMPLICIT' },
      ];

      const context = makeBasePlannerContext({
        parentSceneMomentum: 'STASIS',
        momentumTrajectory: trajectory,
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('WARNING: 2 consecutive pages with STASIS momentum');
      expect(result).toContain('major narrative advancement');
    });

    it('emits weak evidence warning at 3+ consecutive', () => {
      const trajectory: MomentumTrajectory = [
        { pageId: parsePageId(1), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
        { pageId: parsePageId(2), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'WEAK_IMPLICIT' },
        { pageId: parsePageId(3), sceneMomentum: 'INCREMENTAL_PROGRESS', objectiveEvidenceStrength: 'NONE' },
      ];

      const context = makeBasePlannerContext({
        parentSceneMomentum: 'INCREMENTAL_PROGRESS',
        momentumTrajectory: trajectory,
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).toContain('WARNING: 3 consecutive pages with weak/no objective evidence');
      expect(result).toContain('direct progress toward the current beat objective');
    });

    it('does not emit weak evidence warning when evidence is strong at end', () => {
      const trajectory: MomentumTrajectory = [
        { pageId: parsePageId(1), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
        { pageId: parsePageId(2), sceneMomentum: 'STASIS', objectiveEvidenceStrength: 'NONE' },
        { pageId: parsePageId(3), sceneMomentum: 'MAJOR_PROGRESS', objectiveEvidenceStrength: 'CLEAR_EXPLICIT' },
      ];

      const context = makeBasePlannerContext({
        parentSceneMomentum: 'MAJOR_PROGRESS',
        parentObjectiveEvidenceStrength: 'CLEAR_EXPLICIT',
        momentumTrajectory: trajectory,
      });

      const result = buildPlannerContinuationContextSection(context);
      expect(result).not.toContain('WARNING: 3 consecutive');
    });
  });

  describe('countConsecutiveFromEnd', () => {
    it('counts consecutive matching items from end', () => {
      expect(countConsecutiveFromEnd([1, 2, 3, 3, 3], x => x === 3)).toBe(3);
    });

    it('returns 0 when last item does not match', () => {
      expect(countConsecutiveFromEnd([3, 3, 1], x => x === 3)).toBe(0);
    });

    it('handles empty array', () => {
      expect(countConsecutiveFromEnd([], () => true)).toBe(0);
    });

    it('counts all when all match', () => {
      expect(countConsecutiveFromEnd([1, 1, 1], x => x === 1)).toBe(3);
    });

    it('counts 1 when only last matches', () => {
      expect(countConsecutiveFromEnd([2, 2, 1], x => x === 1)).toBe(1);
    });
  });
});
