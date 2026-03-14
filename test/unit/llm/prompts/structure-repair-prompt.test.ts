import { buildStructureRepairPrompt } from '../../../../src/llm/prompts/structure-repair-prompt';

describe('structure-repair-prompt', () => {
  it('builds targeted repair messages with diagnostics and act indices', () => {
    const messages = buildStructureRepairPrompt(
      {
        tone: 'grim political fantasy',
        decomposedCharacters: [],
        decomposedWorld: { facts: [], rawWorldbuilding: '' },
        conceptSpec: {
          oneLineHook: 'A disgraced guard weaponizes public ritual.',
          elevatorParagraph: 'A hearing ritual becomes the engine of civic collapse.',
          genreFrame: 'MYSTERY',
          genreSubversion: 'The investigator built the system.',
          protagonistRole: 'Disgraced guard',
          coreCompetence: 'Pattern recognition under pressure',
          coreFlaw: 'Compulsive self-justification',
          actionVerbs: ['investigate'],
          coreConflictLoop: 'Truth versus power',
          conflictAxis: 'TRUTH_VS_STABILITY',
          conflictType: 'PERSON_VS_SOCIETY',
          pressureSource: 'Tribunal suppression',
          stakesPersonal: 'Loss of allies',
          stakesSystemic: 'Permanent authoritarian control',
          deadlineMechanism: 'Evidence purge at sunrise',
          settingAxioms: ['Courts rule the harbor'],
          constraintSet: ['No weapons in tribunal halls'],
          keyInstitutions: ['Harbor Tribunal'],
          settingScale: 'LOCAL',
          whatIfQuestion: 'Can truth survive corrupt institutions?',
          ironicTwist: 'Exposure requires public shame.',
          playerFantasy: 'Outmaneuvering corrupt elites',
          incitingDisruption: 'A witness is killed in public',
          escapeValve: 'Smuggler tunnels',
          protagonistLie: 'I can stay clean inside a dirty institution.',
          protagonistTruth: 'Truth requires public cost.',
          protagonistGhost: 'She signed off on an innocent arrest.',
          wantNeedCollisionSketch: 'She wants exoneration but needs accountability.',
        },
        conceptVerification: {
          conceptId: 'concept_1',
          signatureScenario: 'A ritual hearing becomes a public trap.',
          loglineCompressible: true,
          logline: 'A disgraced guard weaponizes public ritual against a tribunal cover-up.',
          premisePromises: ['Public ritual becomes a weapon'],
          escalatingSetpieces: ['setpiece 0', 'setpiece 1', 'setpiece 2', 'setpiece 3'],
          setpieceCausalChainBroken: false,
          setpieceCausalLinks: ['0->1', '1->2', '2->3'],
          inevitabilityStatement: 'The ritual machinery will turn on itself.',
          loadBearingCheck: {
            passes: true,
            reasoning: 'Specific to the harbor tribunal.',
            genericCollapse: 'Would collapse without ritualized law.',
          },
          kernelFidelityCheck: {
            passes: true,
            reasoning: 'Aligned to public shame versus truth.',
            kernelDrift: 'None.',
          },
          conceptIntegrityScore: 92,
        },
      },
      {
        targetActIndices: [1, 2],
        diagnostics: [
          {
            passed: false,
            check: 'act-question-distinct',
            details: 'Each act must have a distinct non-empty actQuestion',
            affectedActIndices: [1, 2],
          },
        ],
        result: {
          overallTheme: 'Theme',
          premise: 'Premise',
          openingImage: 'Opening',
          closingImage: 'Closing',
          pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
          anchorMoments: {
            incitingIncident: { actIndex: 0, description: 'Inciting' },
            midpoint: { actIndex: 1, milestoneSlot: 1, midpointType: 'FALSE_DEFEAT' },
            climax: { actIndex: 2, description: 'Climax' },
            signatureScenarioPlacement: { actIndex: 1, description: 'Hearing trap' },
          },
          acts: [
            {
              name: 'Act I',
              objective: 'Objective',
              stakes: 'Stakes',
              entryCondition: 'Entry',
              actQuestion: 'Question 1',
              exitReversal: 'Reversal 1',
              promiseTargets: ['Public ritual becomes a weapon'],
              obligationTargets: ['crime_or_puzzle_presented'],
              milestones: [],
            },
            {
              name: 'Act II',
              objective: 'Objective',
              stakes: 'Stakes',
              entryCondition: 'Entry',
              actQuestion: 'Question 1',
              exitReversal: 'Reversal 2',
              promiseTargets: ['Public ritual becomes a weapon'],
              obligationTargets: ['key_clue_recontextualized'],
              milestones: [],
            },
            {
              name: 'Act III',
              objective: 'Objective',
              stakes: 'Stakes',
              entryCondition: 'Entry',
              actQuestion: 'Question 3',
              exitReversal: '',
              promiseTargets: ['Public ritual becomes a weapon'],
              obligationTargets: ['culprit_unmasked'],
              milestones: [],
            },
          ],
          initialNpcAgendas: [],
        },
      }
    );

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.content).toContain('TARGET ACT INDICES:\n1, 2');
    expect(messages[1]?.content).toContain('FAILED VALIDATION CHECKS:');
    expect(messages[1]?.content).toContain('act-question-distinct');
    expect(messages[1]?.content).toContain('"repairedActs"');
    expect(messages[1]?.content).toContain('Public ritual becomes a weapon');
  });
});
