import { createStoryStructure } from '../../../src/engine/structure-factory';
import {
  buildPacingRewriteContext,
  buildRewriteContext,
  extractCompletedBeats,
  extractPlannedBeats,
  getPreservedMilestoneIds,
  validatePreservedBeats,
} from '../../../src/engine/structure-rewrite-support';
import type { StructureGenerationResult } from '../../../src/engine/structure-types';
import { createStory } from '../../../src/models/story';
import { createInitialVersionedStructure } from '../../../src/models/structure-version';
import { createMilestoneDeviation, createInitialStructureState } from '../../../src/models/story-arc';
import type { AccumulatedStructureState, StoryStructure } from '../../../src/models/story-arc';
import {
  buildMinimalDecomposedCharacter,
  MINIMAL_DECOMPOSED_WORLD,
} from '../../fixtures/decomposed';

function createGenerationResult(): StructureGenerationResult {
  return {
    overallTheme: 'Restore the broken kingdom',
    premise:
      'A reluctant hero must leave home to save a crumbling kingdom before it falls to ruin.',
    openingImage: 'A courier arriving at dawn through storm-broken gates.',
    closingImage: 'A restored banner over the capital at sunrise.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
    anchorMoments: {
      incitingIncident: { actIndex: 0, description: 'A courier breaches the walls at dawn.' },
      midpoint: { actIndex: 1, milestoneSlot: 0, midpointType: 'FALSE_DEFEAT' },
      climax: { actIndex: 1, description: 'The kingdom either rallies or falls.' },
      signatureScenarioPlacement: null,
    },
    acts: [
      {
        name: 'Act One',
        objective: 'Accept the quest',
        stakes: 'Home is at risk',
        entryCondition: 'A messenger arrives',
        actQuestion: 'Will the reluctant hero answer the call?',
        exitReversal: 'The hero can no longer remain at home.',
        promiseTargets: ['The kingdom can still be saved'],
        obligationTargets: ['call_to_adventure'],
        milestones: [
          {
            name: 'Messenger arrives',
            description: 'A warning arrives',
            objective: 'Hear the warning',
            causalLink: 'Because a courier breaches the city walls at dawn.',
            exitCondition: 'The warning is fully understood.',
            role: 'setup',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
          {
            name: 'Choose departure',
            description: 'A difficult choice',
            objective: 'Leave home',
            causalLink: 'Because the warning confirms the kingdom is collapsing.',
            exitCondition: 'The hero commits to departure.',
            role: 'turning_point',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
        ],
      },
      {
        name: 'Act Two',
        objective: 'Survive the campaign',
        stakes: 'The kingdom may fall',
        entryCondition: 'The journey begins',
        actQuestion: 'Can the hero survive the campaign?',
        exitReversal: '',
        promiseTargets: ['The kingdom can still be saved'],
        obligationTargets: ['final_confrontation'],
        milestones: [
          {
            name: 'First setback',
            description: 'First major setback',
            objective: 'Recover from loss',
            causalLink: 'Because the rushed departure leaves the hero underprepared.',
            exitCondition: 'The hero regains a path forward.',
            role: 'escalation',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
        ],
      },
    ],
    rawResponse: '{"mock":true}',
  };
}

function createStructure(): StoryStructure {
  return createStoryStructure(createGenerationResult());
}

describe('structure-rewrite-support', () => {
  describe('extractCompletedBeats', () => {
    it('returns empty array when no milestones are concluded', () => {
      const structure = createStructure();
      const state = createInitialStructureState(structure);

      const completed = extractCompletedBeats(structure, state);

      expect(completed).toEqual([]);
    });

    it('returns concluded milestones with indices, milestone IDs, and resolutions in milestone order', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentMilestoneIndex: 0,
        milestoneProgressions: [
          { milestoneId: '2.1', status: 'concluded', resolution: 'Recovered from loss.' },
          { milestoneId: '1.2', status: 'concluded', resolution: 'Left home.' },
          { milestoneId: '1.1', status: 'concluded', resolution: 'Heard the warning.' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const completed = extractCompletedBeats(structure, state);

      expect(completed).toEqual([
        {
          actIndex: 0,
          milestoneIndex: 0,
          milestoneId: '1.1',
          name: 'Messenger arrives',
          description: 'A warning arrives',
          objective: 'Hear the warning',
          causalLink: 'Because a courier breaches the city walls at dawn.',
          exitCondition: 'The warning is fully understood.',
          role: 'setup',
          escalationType: null,
          secondaryEscalationType: null,
          crisisType: null,
          expectedGapMagnitude: null,
          isMidpoint: false,
          midpointType: null,
          uniqueScenarioHook: null,
          approachVectors: null,
          setpieceSourceIndex: null,
          obligatorySceneTag: null,
          resolution: 'Heard the warning.',
        },
        {
          actIndex: 0,
          milestoneIndex: 1,
          milestoneId: '1.2',
          name: 'Choose departure',
          description: 'A difficult choice',
          objective: 'Leave home',
          causalLink: 'Because the warning confirms the kingdom is collapsing.',
          exitCondition: 'The hero commits to departure.',
          role: 'turning_point',
          escalationType: null,
          secondaryEscalationType: null,
          crisisType: null,
          expectedGapMagnitude: null,
          isMidpoint: false,
          midpointType: null,
          uniqueScenarioHook: null,
          approachVectors: null,
          setpieceSourceIndex: null,
          obligatorySceneTag: null,
          resolution: 'Left home.',
        },
        {
          actIndex: 1,
          milestoneIndex: 0,
          milestoneId: '2.1',
          name: 'First setback',
          description: 'First major setback',
          objective: 'Recover from loss',
          causalLink: 'Because the rushed departure leaves the hero underprepared.',
          exitCondition: 'The hero regains a path forward.',
          role: 'escalation',
          escalationType: null,
          secondaryEscalationType: null,
          crisisType: null,
          expectedGapMagnitude: null,
          isMidpoint: false,
          midpointType: null,
          uniqueScenarioHook: null,
          approachVectors: null,
          setpieceSourceIndex: null,
          obligatorySceneTag: null,
          resolution: 'Recovered from loss.',
        },
      ]);
    });

    it('skips missing milestones and warns without throwing', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Resolved first milestone.' },
          { milestoneId: '9.9', status: 'concluded', resolution: 'Invalid milestone reference.' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      const completed = extractCompletedBeats(structure, state);

      expect(completed).toHaveLength(1);
      expect(completed[0]?.milestoneId).toBe('1.1');
      expect(warnSpy).toHaveBeenCalledWith('Milestone 9.9 not found in structure');

      warnSpy.mockRestore();
    });

    it('excludes pending and active milestones', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Resolved first milestone.' },
          { milestoneId: '1.2', status: 'active' },
          { milestoneId: '2.1', status: 'pending' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const completed = extractCompletedBeats(structure, state);

      expect(completed).toHaveLength(1);
      expect(completed[0]?.milestoneId).toBe('1.1');
    });
  });

  describe('extractPlannedBeats', () => {
    it('returns empty array when all milestones are concluded', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentMilestoneIndex: 0,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '1.2', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '2.1', status: 'concluded', resolution: 'Done.' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      expect(planned).toEqual([]);
    });

    it('returns milestones that come after the deviation point', () => {
      const structure = createStructure();
      // Deviation at Act 1, Milestone 2 (index 0, 1) — milestone 2.1 should be planned
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '1.2', status: 'active' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      expect(planned).toEqual([
        {
          actIndex: 1,
          milestoneIndex: 0,
          milestoneId: '2.1',
          name: 'First setback',
          description: 'First major setback',
          objective: 'Recover from loss',
          causalLink: 'Because the rushed departure leaves the hero underprepared.',
          exitCondition: 'The hero regains a path forward.',
          role: 'escalation',
          escalationType: null,
          secondaryEscalationType: null,
          crisisType: null,
          expectedGapMagnitude: null,
          isMidpoint: false,
          midpointType: null,
          uniqueScenarioHook: null,
          approachVectors: null,
          setpieceSourceIndex: null,
          obligatorySceneTag: null,
        },
      ]);
    });

    it('excludes concluded milestones', () => {
      const structure = createStructure();
      // Milestone 1.1 concluded, deviation at 1.2, 2.1 is planned
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '1.2', status: 'active' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      // 1.1 is concluded, 1.2 is current (excluded), only 2.1 remains
      expect(planned).toHaveLength(1);
      expect(planned[0]?.milestoneId).toBe('2.1');
    });

    it('excludes the currently active milestone', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      // 1.1 is current (excluded), 1.2 and 2.1 are planned
      expect(planned).toHaveLength(2);
      expect(planned[0]?.milestoneId).toBe('1.2');
      expect(planned[1]?.milestoneId).toBe('2.1');
    });

    it('sorts by act/milestone index', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      // Should be sorted: 1.2 before 2.1
      expect(planned[0]?.actIndex).toBe(0);
      expect(planned[0]?.milestoneIndex).toBe(1);
      expect(planned[1]?.actIndex).toBe(1);
      expect(planned[1]?.milestoneIndex).toBe(0);
    });

    it('returns empty array when deviation is at the very last milestone', () => {
      const structure = createStructure();
      // Deviation at the last milestone (Act 2, Milestone 1 = index 1, 0)
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentMilestoneIndex: 0,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '1.2', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '2.1', status: 'active' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      expect(planned).toEqual([]);
    });
  });

  describe('buildRewriteContext', () => {
    it('includes story fields, completed milestones, deviation fields, and structure state positions', () => {
      const structure = createStructure();
      const structureVersion = createInitialVersionedStructure(structure);
      const story = {
        ...createStory({
          title: 'Rewrite Story',
          characterConcept: 'A reluctant knight',
          worldbuilding: 'A fractured kingdom',
          tone: 'grim fantasy',
        }),
        decomposedCharacters: [buildMinimalDecomposedCharacter('A reluctant knight')],
        decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Accepted the call.' },
          { milestoneId: '1.2', status: 'active' },
          { milestoneId: '2.1', status: 'pending' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };
      const deviation = createMilestoneDeviation(
        'The protagonist switched allegiance.',
        ['1.2', '2.1'],
        'Now aligned with the rival faction.'
      );

      const context = buildRewriteContext(story, structureVersion, state, deviation);

      expect(context.decomposedCharacters).toEqual([
        buildMinimalDecomposedCharacter('A reluctant knight'),
      ]);
      expect(context.decomposedWorld).toEqual(MINIMAL_DECOMPOSED_WORLD);
      expect(context.tone).toBe('grim fantasy');
      expect(context.originalTheme).toBe('Restore the broken kingdom');
      expect(context.sceneSummary).toBe('Now aligned with the rival faction.');
      expect(context.deviationReason).toBe('The protagonist switched allegiance.');
      expect(context.currentActIndex).toBe(0);
      expect(context.currentMilestoneIndex).toBe(1);
      expect(context.completedBeats).toEqual([
        {
          actIndex: 0,
          milestoneIndex: 0,
          milestoneId: '1.1',
          name: 'Messenger arrives',
          description: 'A warning arrives',
          objective: 'Hear the warning',
          causalLink: 'Because a courier breaches the city walls at dawn.',
          exitCondition: 'The warning is fully understood.',
          role: 'setup',
          escalationType: null,
          secondaryEscalationType: null,
          crisisType: null,
          expectedGapMagnitude: null,
          isMidpoint: false,
          midpointType: null,
          uniqueScenarioHook: null,
          approachVectors: null,
          setpieceSourceIndex: null,
          obligatorySceneTag: null,
          resolution: 'Accepted the call.',
        },
      ]);
      // Milestone 2.1 comes after deviation point (0, 1) and is not concluded
      expect(context.plannedBeats).toEqual([
        {
          actIndex: 1,
          milestoneIndex: 0,
          milestoneId: '2.1',
          name: 'First setback',
          description: 'First major setback',
          objective: 'Recover from loss',
          causalLink: 'Because the rushed departure leaves the hero underprepared.',
          exitCondition: 'The hero regains a path forward.',
          role: 'escalation',
          escalationType: null,
          secondaryEscalationType: null,
          crisisType: null,
          expectedGapMagnitude: null,
          isMidpoint: false,
          midpointType: null,
          uniqueScenarioHook: null,
          approachVectors: null,
          setpieceSourceIndex: null,
          obligatorySceneTag: null,
        },
      ]);
    });
  });

  describe('getPreservedMilestoneIds', () => {
    it('returns IDs of concluded milestones only', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Resolved.' },
          { milestoneId: '1.2', status: 'active' },
          { milestoneId: '2.1', status: 'concluded', resolution: 'Resolved again.' },
          { milestoneId: '2.2', status: 'pending' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(getPreservedMilestoneIds(state)).toEqual(['1.1', '2.1']);
    });

    it('returns empty array when no milestones are concluded', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'active' },
          { milestoneId: '1.2', status: 'pending' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(getPreservedMilestoneIds(state)).toEqual([]);
    });
  });

  describe('validatePreservedBeats', () => {
    it('returns true when all completed milestones are preserved unchanged', () => {
      const original = createStructure();
      const next = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentMilestoneIndex: 0,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Resolved.' },
          { milestoneId: '1.2', status: 'concluded', resolution: 'Resolved.' },
          { milestoneId: '2.1', status: 'active' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(true);
    });

    it('returns false when a completed milestone is missing in the new structure', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [original.acts[0]!, { ...original.acts[1]!, milestones: [] }],
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentMilestoneIndex: 0,
        milestoneProgressions: [{ milestoneId: '2.1', status: 'concluded', resolution: 'Resolved.' }],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });

    it('returns false when completed milestone description changes', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [
          {
            ...original.acts[0]!,
            milestones: [
              { ...original.acts[0]!.milestones[0]!, description: 'Different description' },
              original.acts[0]!.milestones[1]!,
            ],
          },
          original.acts[1]!,
        ],
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [{ milestoneId: '1.1', status: 'concluded', resolution: 'Resolved.' }],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });

    it('returns false when completed milestone name changes', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [
          {
            ...original.acts[0]!,
            milestones: [
              { ...original.acts[0]!.milestones[0]!, name: 'Different milestone name' },
              original.acts[0]!.milestones[1]!,
            ],
          },
          original.acts[1]!,
        ],
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [{ milestoneId: '1.1', status: 'concluded', resolution: 'Resolved.' }],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });

    it('returns false when completed milestone objective changes', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [
          {
            ...original.acts[0]!,
            milestones: [
              { ...original.acts[0]!.milestones[0]!, objective: 'Different objective' },
              original.acts[0]!.milestones[1]!,
            ],
          },
          original.acts[1]!,
        ],
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [{ milestoneId: '1.1', status: 'concluded', resolution: 'Resolved.' }],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });

    it('returns false when completed milestone role changes', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [
          {
            ...original.acts[0]!,
            milestones: [
              { ...original.acts[0]!.milestones[0]!, role: 'resolution' as const },
              original.acts[0]!.milestones[1]!,
            ],
          },
          original.acts[1]!,
        ],
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [{ milestoneId: '1.1', status: 'concluded', resolution: 'Resolved.' }],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });

    it('returns true when new milestones are added after preserved milestones', () => {
      const original = createStructure();
      const next: StoryStructure = {
        ...createStructure(),
        acts: [
          {
            ...original.acts[0]!,
            milestones: [
              ...original.acts[0]!.milestones,
              {
                id: '1.3',
                name: 'Additional milestone',
                description: 'Additional milestone',
                objective: 'New objective',
                role: 'escalation' as const,
                escalationType: null,
                crisisType: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
          original.acts[1]!,
        ],
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Resolved.' },
          { milestoneId: '1.2', status: 'active' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(true);
    });

    it('returns true when there are no completed milestones', () => {
      const original = createStructure();
      const next = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'active' },
          { milestoneId: '1.2', status: 'pending' },
          { milestoneId: '2.1', status: 'pending' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(true);
    });

    it('returns false when a concluded milestone has an invalid milestone ID format', () => {
      const original = createStructure();
      const next = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [{ milestoneId: 'invalid-id', status: 'concluded', resolution: 'Resolved.' }],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(validatePreservedBeats(original, next, state)).toBe(false);
    });
  });

  describe('extractPlannedBeats with includeCurrentBeat', () => {
    it('includes the current milestone when includeCurrentBeat is true', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '1.2', status: 'active' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state, true);

      // Should include current milestone 1.2 and future milestone 2.1
      expect(planned).toHaveLength(2);
      expect(planned[0]?.milestoneId).toBe('1.2');
      expect(planned[1]?.milestoneId).toBe('2.1');
    });

    it('excludes the current milestone when includeCurrentBeat defaults to false', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Done.' },
          { milestoneId: '1.2', status: 'active' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state);

      // Should only include future milestone 2.1
      expect(planned).toHaveLength(1);
      expect(planned[0]?.milestoneId).toBe('2.1');
    });

    it('includes current milestone at position 0,0 when includeCurrentBeat is true', () => {
      const structure = createStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      const planned = extractPlannedBeats(structure, state, true);

      // Should include current milestone 1.1, 1.2, and 2.1
      expect(planned).toHaveLength(3);
      expect(planned[0]?.milestoneId).toBe('1.1');
      expect(planned[1]?.milestoneId).toBe('1.2');
      expect(planned[2]?.milestoneId).toBe('2.1');
    });
  });

  describe('buildPacingRewriteContext', () => {
    it('builds context with pacing issue reason and includes current milestone in planned milestones', () => {
      const structure = createStructure();
      const structureVersion = createInitialVersionedStructure(structure);
      const story = {
        ...createStory({
          title: 'Pacing Story',
          characterConcept: 'A wanderer',
          worldbuilding: 'An endless desert',
          tone: 'introspective',
        }),
        decomposedCharacters: [buildMinimalDecomposedCharacter('A wanderer')],
        decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
      };
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Heard the warning.' },
          { milestoneId: '1.2', status: 'active' },
        ],
        pagesInCurrentMilestone: 5,
        pacingNudge: null,
      };

      const context = buildPacingRewriteContext(
        story,
        structureVersion,
        state,
        'Milestone is stalling after 5 pages',
        'The hero hesitates at the gate.'
      );

      expect(context.deviationReason).toBe('Pacing issue: Milestone is stalling after 5 pages');
      expect(context.sceneSummary).toBe('The hero hesitates at the gate.');
      expect(context.tone).toBe('introspective');
      expect(context.currentActIndex).toBe(0);
      expect(context.currentMilestoneIndex).toBe(1);
      expect(context.totalActCount).toBe(2);

      // Completed milestones: only 1.1
      expect(context.completedBeats).toHaveLength(1);
      expect(context.completedBeats[0]?.milestoneId).toBe('1.1');

      // Planned milestones: includes current milestone 1.2 and future milestone 2.1
      expect(context.plannedBeats).toHaveLength(2);
      expect(context.plannedBeats[0]?.milestoneId).toBe('1.2');
      expect(context.plannedBeats[1]?.milestoneId).toBe('2.1');
    });
  });
});
