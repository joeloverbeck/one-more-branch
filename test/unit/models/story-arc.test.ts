import {
  AccumulatedStructureState,
  MilestoneRole,
  CrisisType,
  PacingBudget,
  StoryMilestone,
  createDefaultAnchorMoments,
  createMilestoneDeviation,
  createInitialStructureState,
  createNoDeviation,
  StoryStructure,
  isDeviation,
  isNoDeviation,
  validateDeviationTargets,
  createEmptyAccumulatedStructureState,
  getMilestoneProgression,
  getCurrentAct,
  getCurrentMilestone,
  isLastAct,
  isLastMilestoneOfAct,
} from '@/models/story-arc';

function createTestStructure(): StoryStructure {
  return {
    overallTheme: 'Survival against impossible odds',
    premise: 'A lone wanderer must unite warring clans before an ancient threat consumes the land.',
    openingImage: 'An opening image placeholder.',
    closingImage: 'A closing image placeholder.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
    anchorMoments: createDefaultAnchorMoments(3),
    generatedAt: new Date('2026-02-07T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'Beginning',
        objective: 'Start the journey',
        stakes: 'The village may be destroyed',
        entryCondition: 'Hero chooses to leave home',
        actQuestion: 'Will the hero leave safety behind?',
        exitReversal: 'The journey becomes irreversible.',
        promiseTargets: ['The clans can be united'],
        obligationTargets: ['call_to_adventure'],
        milestones: [
          {
            id: '1.1',
            name: 'Call to action',
            description: 'The call to action appears',
            objective: 'Accept the quest',
            causalLink: 'Because the threat reaches the village gates.',
            exitCondition: 'The hero commits to leaving home.',
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
            id: '1.2',
            name: 'Gather allies',
            description: 'The hero gathers allies',
            objective: 'Form a reliable team',
            causalLink: 'Because leaving alone would mean certain failure.',
            exitCondition: 'The first allies agree to join the hero.',
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
        id: '2',
        name: 'Middle',
        objective: 'Face escalating conflict',
        stakes: 'Enemies gain control of key routes',
        entryCondition: 'Team enters contested territory',
        actQuestion: 'Can the team survive coordinated resistance?',
        exitReversal: 'The enemy reveals the real scale of the threat.',
        promiseTargets: ['The clans can be united'],
        obligationTargets: ['midpoint_reversal'],
        milestones: [
          {
            id: '2.1',
            name: 'Ambush',
            description: 'The antagonist strikes back',
            objective: 'Survive the ambush',
            causalLink: 'Because the enemy tracks the team into contested ground.',
            exitCondition: 'The team escapes the ambush with enough strength to continue.',
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
          {
            id: '2.2',
            name: 'Regroup',
            description: 'The team regroups',
            objective: 'Recover resources and morale',
            causalLink: 'Because the ambush cost supplies and confidence.',
            exitCondition: 'The team stabilizes enough to press forward.',
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
      {
        id: '3',
        name: 'End',
        objective: 'Resolve the main conflict',
        stakes: 'The world order may collapse',
        entryCondition: 'Hero reaches the final battlefield',
        actQuestion: 'What will victory cost?',
        exitReversal: '',
        promiseTargets: ['The clans can be united'],
        obligationTargets: ['final_confrontation'],
        milestones: [
          {
            id: '3.1',
            name: 'Final confrontation',
            description: 'The final confrontation begins',
            objective: 'Defeat the antagonist',
            causalLink: 'Because the hero finally reaches the battlefield.',
            exitCondition: 'The antagonist is defeated or the hero falls.',
            role: 'resolution',
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
  };
}

describe('story-arc model utilities', () => {
  describe('MilestoneRole type', () => {
    it('accepts all valid milestone roles on StoryMilestone', () => {
      const roles: MilestoneRole[] = [
        'setup',
        'escalation',
        'turning_point',
        'reflection',
        'resolution',
      ];
      for (const role of roles) {
        const milestone: StoryMilestone = {
          id: '1.1',
          name: 'Test milestone',
          description: 'Test milestone',
          objective: 'Test objective',
          causalLink: 'Because the prior event forces a response.',
          exitCondition: 'The test objective is satisfied.',
          role,
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
        };
        expect(milestone.role).toBe(role);
      }
    });

    it('round-trips milestone role through object spread', () => {
      const milestone: StoryMilestone = {
        id: '1.1',
        name: 'A pivotal moment',
        description: 'A pivotal moment',
        objective: 'Force a decision',
        causalLink: 'Because pressure collapses every safer option.',
        exitCondition: 'The protagonist chooses a side.',
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
      };
      const copy = { ...milestone };
      expect(copy.role).toBe('turning_point');
    });
  });

  describe('AnchorMoments defaults', () => {
    it('creates sensible defaults from act count', () => {
      expect(createDefaultAnchorMoments(3)).toEqual({
        incitingIncident: { actIndex: 0, description: '' },
        midpoint: { actIndex: 1, milestoneSlot: 0, midpointType: 'FALSE_DEFEAT' },
        climax: { actIndex: 2, description: '' },
        signatureScenarioPlacement: null,
      });
    });
  });

  describe('CrisisType type', () => {
    it('accepts all valid crisis types', () => {
      const crisisTypes: CrisisType[] = ['BEST_BAD_CHOICE', 'IRRECONCILABLE_GOODS'];
      expect(crisisTypes).toEqual(['BEST_BAD_CHOICE', 'IRRECONCILABLE_GOODS']);
    });
  });

  describe('StoryStructure premise field', () => {
    it('includes premise on StoryStructure', () => {
      const structure = createTestStructure();
      expect(structure.premise).toBe(
        'A lone wanderer must unite warring clans before an ancient threat consumes the land.'
      );
    });

    it('premise is accessible as a string', () => {
      const structure: StoryStructure = {
        ...createTestStructure(),
        premise: 'A disgraced guard must expose the tribunal.',
      };
      expect(typeof structure.premise).toBe('string');
      expect(structure.premise).toBe('A disgraced guard must expose the tribunal.');
    });
  });

  describe('PacingBudget and StoryStructure.pacingBudget', () => {
    it('includes pacingBudget on StoryStructure', () => {
      const structure = createTestStructure();
      expect(structure.pacingBudget).toEqual({
        targetPagesMin: 15,
        targetPagesMax: 40,
      });
    });

    it('pacingBudget values are accessible', () => {
      const budget: PacingBudget = { targetPagesMin: 10, targetPagesMax: 80 };
      expect(budget.targetPagesMin).toBe(10);
      expect(budget.targetPagesMax).toBe(80);
    });

    it('pacingBudget can be set to boundary values', () => {
      const structure: StoryStructure = {
        ...createTestStructure(),
        pacingBudget: { targetPagesMin: 10, targetPagesMax: 80 },
      };
      expect(structure.pacingBudget.targetPagesMin).toBe(10);
      expect(structure.pacingBudget.targetPagesMax).toBe(80);
    });
  });

  describe('createEmptyAccumulatedStructureState', () => {
    it('creates an initial empty state', () => {
      expect(createEmptyAccumulatedStructureState()).toEqual({
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      });
    });
  });

  describe('createInitialStructureState', () => {
    it('sets the first milestone active and all remaining milestones pending', () => {
      const structure = createTestStructure();
      const result = createInitialStructureState(structure);

      expect(result.currentActIndex).toBe(0);
      expect(result.currentMilestoneIndex).toBe(0);
      expect(result.pagesInCurrentMilestone).toBe(0);
      expect(result.pacingNudge).toBeNull();
      expect(result.milestoneProgressions).toEqual([
        { milestoneId: '1.1', status: 'active' },
        { milestoneId: '1.2', status: 'pending' },
        { milestoneId: '2.1', status: 'pending' },
        { milestoneId: '2.2', status: 'pending' },
        { milestoneId: '3.1', status: 'pending' },
      ]);
    });

    it('returns a valid zeroed state when there are no acts/milestones', () => {
      const structure: StoryStructure = {
        ...createTestStructure(),
        acts: [],
      };

      expect(createInitialStructureState(structure)).toEqual({
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      });
    });
  });

  describe('getCurrentAct', () => {
    it('returns the act at the current index', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentMilestoneIndex: 0,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(getCurrentAct(structure, state)?.id).toBe('2');
    });

    it('returns undefined when act index is out of bounds', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 4,
        currentMilestoneIndex: 0,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(getCurrentAct(structure, state)).toBeUndefined();
    });
  });

  describe('getCurrentMilestone', () => {
    it('returns the milestone at the current act/milestone indices', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(getCurrentMilestone(structure, state)?.id).toBe('1.2');
    });

    it('returns undefined when act index is out of bounds', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 10,
        currentMilestoneIndex: 0,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(getCurrentMilestone(structure, state)).toBeUndefined();
    });

    it('returns undefined when milestone index is out of bounds', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentMilestoneIndex: 6,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(getCurrentMilestone(structure, state)).toBeUndefined();
    });
  });

  describe('getMilestoneProgression', () => {
    it('returns progression for an existing milestone id', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [
          { milestoneId: '1.1', status: 'concluded', resolution: 'Hero agreed to the mission' },
          { milestoneId: '1.2', status: 'active' },
        ],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(getMilestoneProgression(state, '1.1')).toEqual({
        milestoneId: '1.1',
        status: 'concluded',
        resolution: 'Hero agreed to the mission',
      });
    });

    it('returns undefined for an unknown milestone id', () => {
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(getMilestoneProgression(state, '9.9')).toBeUndefined();
    });
  });

  describe('isLastMilestoneOfAct', () => {
    it('returns true for the final milestone in an act', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 1,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(isLastMilestoneOfAct(structure, state)).toBe(true);
    });

    it('returns false for non-final milestones', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 1,
        currentMilestoneIndex: 0,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(isLastMilestoneOfAct(structure, state)).toBe(false);
    });

    it('returns false when indices do not point to a valid act', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 10,
        currentMilestoneIndex: 0,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(isLastMilestoneOfAct(structure, state)).toBe(false);
    });
  });

  describe('isLastAct', () => {
    it('returns true when current act index is the final act', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 2,
        currentMilestoneIndex: 0,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(isLastAct(structure, state)).toBe(true);
    });

    it('returns false when current act index is not the final act', () => {
      const structure = createTestStructure();
      const state: AccumulatedStructureState = {
        currentActIndex: 0,
        currentMilestoneIndex: 0,
        milestoneProgressions: [],
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      };

      expect(isLastAct(structure, state)).toBe(false);
    });
  });

  describe('DeviationResult', () => {
    describe('isDeviation', () => {
      it('returns true for MilestoneDeviation', () => {
        const result = createMilestoneDeviation(
          'Player choice contradicted remaining milestones',
          ['2.2', '3.1'],
          'The protagonist switched allegiances'
        );

        expect(isDeviation(result)).toBe(true);
      });

      it('returns false for NoDeviation', () => {
        const result = createNoDeviation();
        expect(isDeviation(result)).toBe(false);
      });
    });

    describe('isNoDeviation', () => {
      it('returns true for NoDeviation', () => {
        const result = createNoDeviation();
        expect(isNoDeviation(result)).toBe(true);
      });

      it('returns false for MilestoneDeviation', () => {
        const result = createMilestoneDeviation(
          'Branch no longer aligns with planned infiltration milestone',
          ['2.2'],
          'The protagonist accepted command from the enemy'
        );

        expect(isNoDeviation(result)).toBe(false);
      });
    });

    describe('createMilestoneDeviation', () => {
      it('creates MilestoneDeviation with all fields', () => {
        const result = createMilestoneDeviation(
          'Narrative shifted to alliance with antagonist',
          ['2.2', '3.1'],
          'The team split after a betrayal'
        );

        expect(result).toEqual({
          detected: true,
          reason: 'Narrative shifted to alliance with antagonist',
          invalidatedMilestoneIds: ['2.2', '3.1'],
          sceneSummary: 'The team split after a betrayal',
        });
      });

      it('throws if invalidatedMilestoneIds is empty', () => {
        expect(() => createMilestoneDeviation('No invalidated milestones provided', [], 'Summary')).toThrow(
          'MilestoneDeviation must have at least one invalidated milestone ID'
        );
      });

      it('preserves array identity', () => {
        const invalidatedMilestoneIds = ['2.2', '3.1'] as const;
        const result = createMilestoneDeviation('Deviation detected', invalidatedMilestoneIds, 'Summary');

        expect(result.invalidatedMilestoneIds).toBe(invalidatedMilestoneIds);
      });
    });

    describe('createNoDeviation', () => {
      it('creates NoDeviation with detected false', () => {
        expect(createNoDeviation()).toEqual({ detected: false });
      });
    });

    describe('validateDeviationTargets', () => {
      it('returns true when concluded milestones are not invalidated', () => {
        const deviation = createMilestoneDeviation('Future milestones are invalid', ['2.2'], 'Summary');
        const structureState: AccumulatedStructureState = {
          currentActIndex: 1,
          currentMilestoneIndex: 0,
          milestoneProgressions: [
            { milestoneId: '1.1', status: 'concluded', resolution: 'Quest accepted' },
            { milestoneId: '1.2', status: 'concluded', resolution: 'Allies gathered' },
            { milestoneId: '2.1', status: 'active' },
          ],
          pagesInCurrentMilestone: 0,
          pacingNudge: null,
        };

        expect(validateDeviationTargets(deviation, structureState)).toBe(true);
      });

      it('returns false when a concluded milestone is invalidated', () => {
        const deviation = createMilestoneDeviation(
          'Invalidation includes completed milestone',
          ['1.2'],
          'Summary'
        );
        const structureState: AccumulatedStructureState = {
          currentActIndex: 1,
          currentMilestoneIndex: 0,
          milestoneProgressions: [
            { milestoneId: '1.1', status: 'concluded', resolution: 'Quest accepted' },
            { milestoneId: '1.2', status: 'concluded', resolution: 'Allies gathered' },
            { milestoneId: '2.1', status: 'active' },
          ],
          pagesInCurrentMilestone: 0,
          pacingNudge: null,
        };

        expect(validateDeviationTargets(deviation, structureState)).toBe(false);
      });

      it('returns true for milestone IDs not in progressions', () => {
        const deviation = createMilestoneDeviation('Future acts need replacement', ['3.1'], 'Summary');
        const structureState: AccumulatedStructureState = {
          currentActIndex: 1,
          currentMilestoneIndex: 0,
          milestoneProgressions: [{ milestoneId: '1.1', status: 'concluded', resolution: 'Quest accepted' }],
          pagesInCurrentMilestone: 0,
          pacingNudge: null,
        };

        expect(validateDeviationTargets(deviation, structureState)).toBe(true);
      });
    });
  });
});
