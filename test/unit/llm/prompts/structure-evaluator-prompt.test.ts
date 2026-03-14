import type { StructureEvaluatorContext } from '../../../../src/llm/structure-evaluator-types';
import { buildStructureEvaluatorPrompt } from '../../../../src/llm/prompts/structure-evaluator-prompt';

describe('buildStructureEvaluatorPrompt', () => {
  const baseContext: StructureEvaluatorContext = {
    narrative: 'The courier locks the archive vault and transmits the evidence.',
    structure: {
      overallTheme: 'Truth survives pressure.',
      premise: 'A courier must expose a purge before the city closes in.',
      openingImage: 'A silent checkpoint at dawn.',
      closingImage: 'Archive windows burning with emergency light.',
      pacingBudget: { targetPagesMin: 12, targetPagesMax: 18 },
      generatedAt: new Date('2026-01-01T00:00:00.000Z'),
      anchorMoments: {
        incitingIncident: { actIndex: 0, description: 'The purge order is signed.' },
        midpoint: { actIndex: 0, milestoneSlot: 0, midpointType: 'FALSE_VICTORY' },
        climax: { actIndex: 0, description: 'The archive opens to the public.' },
        signatureScenarioPlacement: null,
      },
      acts: [
        {
          id: '1',
          name: 'Archive Run',
          objective: 'Carry the proof to the archive.',
          stakes: 'Failure means the purge proceeds unseen.',
          entryCondition: 'The courier is discovered.',
          actQuestion: 'Can the courier keep the proof alive long enough to make it public?',
          exitReversal: 'Reaching safety reveals the archive is already compromised.',
          promiseTargets: ['The purge can be exposed'],
          obligationTargets: [],
          milestones: [
            {
              id: '1.1',
              name: 'Vault the proof',
              description: 'Secure the archive vault',
              objective: 'Keep the proof intact',
              causalLink: 'The purge is burning evidence caches.',
              exitCondition: 'The proof is secured in the archive vault beyond the purge’s immediate reach.',
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
          ],
        },
      ],
    },
    accumulatedStructureState: {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [{ milestoneId: '1.1', status: 'active' }],
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    },
    activeState: {
      currentLocation: 'Archive annex',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    },
    threadsResolved: [],
    threadAges: {},
  };

  it('tells the evaluator to prefer exitCondition when present', () => {
    const [systemMessage, userMessage] = buildStructureEvaluatorPrompt(baseContext);

    expect(systemMessage?.content).toContain(
      'Apply the completion gate against the active milestone exit condition when present; otherwise use the active milestone objective'
    );
    expect(systemMessage?.content).toContain(
      'extract 1-3 completion anchors from activeMilestone.exitCondition when it is non-empty; otherwise extract them from activeMilestone.objective'
    );
    expect(userMessage?.content).toContain(
      'Active Milestone Exit Condition: The proof is secured in the archive vault beyond the purge’s immediate reach.'
    );
  });
});
