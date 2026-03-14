import { CONTENT_POLICY } from '../../../../src/llm/content-policy';
import { buildStructureRewritePrompt } from '../../../../src/llm/prompts/structure-rewrite-prompt';
import {
  buildContinuationSystemPrompt,
  composeContinuationDataRules,
} from '../../../../src/llm/prompts/system-prompt';
import type { StructureRewriteContext } from '../../../../src/llm/structure-rewrite-types';
import { buildMinimalDecomposedCharacter, MINIMAL_DECOMPOSED_WORLD } from '../../../fixtures/decomposed';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  // Get the last user message
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages[userMessages.length - 1]?.content ?? '';
}

describe('buildStructureRewritePrompt', () => {
  const baseContext: StructureRewriteContext = {
    tone: 'tactical political thriller',
    decomposedCharacters: [buildMinimalDecomposedCharacter('A former royal scout', { rawDescription: 'A former royal scout with a forged identity' })],
    decomposedWorld: { facts: [{ domain: 'geography' as const, fact: 'A flooded republic where cities travel on chained barges.', scope: 'global' }], rawWorldbuilding: 'A flooded republic where cities travel on chained barges.' },
    completedBeats: [
      {
        actIndex: 0,
        milestoneIndex: 0,
        milestoneId: '1.1',
        name: 'Sluice Flight',
        description: 'Escape the tribunal ambush in the port quarter',
        objective: 'Survive and recover a smuggled ledger',
        causalLink: 'Because the protagonist leaked evidence in the prior hearing.',
        role: 'setup',
        escalationType: null,
        expectedGapMagnitude: 'WIDE',
        uniqueScenarioHook: null,
        approachVectors: null,
        setpieceSourceIndex: null,
        resolution: 'You escaped through maintenance sluices with the ledger intact.',
      },
    ],
    plannedBeats: [],
    sceneSummary: 'The protagonist has publicly aligned with a rival flotilla.',
    currentActIndex: 1,
    currentMilestoneIndex: 0,
    deviationReason: 'The prior allies now treat the protagonist as a traitor.',
    originalTheme: 'Duty versus chosen loyalty',
    totalActCount: 3,
  };

  it('returns system and user messages', () => {
    const messages = buildStructureRewritePrompt(baseContext);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('includes NC-21 content policy in system prompt', () => {
    const messages = buildStructureRewritePrompt(baseContext);
    const system = getSystemMessage(messages);

    expect(system).toContain('NC-21');
    expect(system).toContain(CONTENT_POLICY);
  });

  it('includes key rewrite context in user prompt', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).toContain('flooded republic');
    expect(user).toContain(baseContext.tone);
    expect(user).toContain(baseContext.originalTheme);
    expect(user).toContain(baseContext.deviationReason);
    expect(user).toContain(baseContext.sceneSummary);
  });

  it('lists completed milestones as canon with act/milestone numbering, milestone id, role, and resolution', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).toContain('CANON - DO NOT CHANGE');
    expect(user).toContain('Act 1, Milestone 1 (1.1) [setup] "Sluice Flight"');
    expect(user).toContain('Causal link: Because the protagonist leaked evidence in the prior hearing.');
    expect(user).toContain('Expected gap magnitude: WIDE');
    expect(user).toContain(
      'Resolution: You escaped through maintenance sluices with the ledger intact.'
    );
  });

  it('includes genre obligation preservation and remaining coverage requirements when conceptSpec exists', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        conceptSpec: {
          oneLineHook: 'A detective hunts a killer in a flooded city.',
          elevatorParagraph: 'A noir investigation spirals into civic collapse.',
          genreFrame: 'MYSTERY',
          genreSubversion: 'The detective is complicit in the opening crime.',
          protagonistRole: 'Disgraced detective',
          coreCompetence: 'Pattern recognition under pressure',
          coreFlaw: 'Compulsive self-justification',
          actionVerbs: ['investigate', 'interrogate', 'infiltrate', 'evade', 'expose', 'choose'],
          coreConflictLoop: 'Truth vs self-preservation under institutional pressure',
          conflictAxis: 'TRUTH_VS_STABILITY',
          conflictType: 'PERSON_VS_SOCIETY',
          pressureSource: 'A tribunal cover-up',
          stakesPersonal: 'Loss of remaining allies',
          stakesSystemic: 'Permanent rule by corrupt tribunals',
          deadlineMechanism: 'Evidence destruction at dawn',
          settingAxioms: [
            'Tidal districts flood nightly',
            'Courts are controlled by merchant families',
          ],
          constraintSet: ['No direct violence in tribunal halls', 'Witnesses disappear after curfew'],
          keyInstitutions: ['Harbor Tribunal', 'Tide Guard'],
          settingScale: 'LOCAL',
          whatIfQuestion: 'What if justice requires admitting your own guilt?',
          ironicTwist: 'The case can only be solved by proving the detective framed someone else.',
          playerFantasy: 'Outsmarting corrupt institutions',
          incitingDisruption: 'A protected witness is murdered publicly',
          escapeValve: 'A smuggler route beneath the court archive',
        },
        completedBeats: [
          {
            ...baseContext.completedBeats[0]!,
            obligatorySceneTag: 'crime_or_puzzle_presented',
          },
        ],
      })
    );

    expect(user).toContain('GENRE OBLIGATION CONTRACT (for MYSTERY)');
    expect(user).toContain('Already fulfilled in completed canon milestones');
    expect(user).toContain('- crime_or_puzzle_presented');
    expect(user).toContain('Remaining obligation tags to cover in regenerated milestones');
    expect(user).toContain('Preserve obligatorySceneTag on completed milestones unchanged');
    expect(user).toContain('obligatorySceneTag: genre obligation tag');
  });

  it('shows explicit None text when no completed milestones exist', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        completedBeats: [],
      })
    );

    expect(user).toContain('None (story is at the beginning)');
  });

  it('uses Act 1 scope when deviation occurs in Act 1', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 0,
      })
    );

    expect(user).toContain('remaining milestones in Act 1, plus all of Acts 2 and 3');
  });

  it('uses Act 2 scope when deviation occurs in Act 2', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).toContain('remaining milestones in Act 2, plus all of Act 3');
  });

  it('uses Act 3-only scope when deviation occurs in Act 3', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 2,
      })
    );

    expect(user).toContain('remaining milestones in Act 3');
  });

  it('handles 4-act stories correctly', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 0,
        totalActCount: 4,
      })
    );

    expect(user).toContain('remaining milestones in Act 1, plus all of Acts 2, 3 and 4');
  });

  it('handles 5-act stories correctly', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 1,
        totalActCount: 5,
      })
    );

    expect(user).toContain('remaining milestones in Act 2, plus all of Acts 3, 4 and 5');
  });

  it('handles last-act deviation in 4-act story', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 3,
        totalActCount: 4,
      })
    );

    expect(user).toContain('remaining milestones in Act 4');
  });

  it('includes JSON-compatible output shape description with premise, pacingBudget, milestone name, and role', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    // Now uses JSON output shape matching the schema
    expect(user).toContain('OUTPUT SHAPE');
    expect(user).toContain('overallTheme: string');
    expect(user).toContain('premise: string');
    expect(user).toContain('pacingBudget:');
    expect(user).toContain('targetPagesMin');
    expect(user).toContain('targetPagesMax');
    expect(user).toContain('acts: 3-5 items');
    expect(user).toContain('name: evocative act title');
    expect(user).toContain('objective: main goal for the act');
    expect(user).toContain('stakes: consequence of failure');
    expect(user).toContain('entryCondition:');
    expect(user).toContain('milestones: 2-4 items');
    expect(user).toContain('name: short evocative milestone title');
    expect(user).toContain('description: what should happen in this milestone');
    expect(user).toContain('causalLink: one sentence explaining the cause');
    expect(user).toContain(
      'role: "setup" | "escalation" | "turning_point" | "reflection" | "resolution"'
    );
    expect(user).toContain(
      'crisisType: BEST_BAD_CHOICE | IRRECONCILABLE_GOODS | null'
    );
    expect(user).toContain('expectedGapMagnitude: NARROW | MODERATE | WIDE | CHASM | null');
  });

  it('includes causal linkage requirement for regenerated milestones', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).toContain('write a causalLink sentence');
    expect(user).toContain('avoid "and then" sequencing');
    expect(user).toContain('Preserve causalLink from completed milestones unchanged');
  });

  it('instructs to preserve completed milestones in the output', () => {
    const user = getUserMessage(
      buildStructureRewritePrompt({
        ...baseContext,
        currentActIndex: 0,
      })
    );

    expect(user).toContain('Preserve completed milestones exactly');
    expect(user).toContain('include them in the output');
  });

  it('includes planned milestones section when planned milestones exist', () => {
    const contextWithPlanned: StructureRewriteContext = {
      ...baseContext,
      plannedBeats: [
        {
          actIndex: 1,
          milestoneIndex: 1,
          milestoneId: '2.2',
          name: 'Betrayal Revealed',
          description: 'A hidden betrayal comes to light',
          objective: 'Confront the traitor and decide their fate',
          causalLink: 'Because convoy records expose a forged alliance charter.',
          role: 'turning_point',
          escalationType: null,
          uniqueScenarioHook: null,
          approachVectors: null,
          setpieceSourceIndex: null,
        },
        {
          actIndex: 2,
          milestoneIndex: 0,
          milestoneId: '3.1',
          name: 'Final Gambit',
          description: 'The last move before everything changes',
          objective: 'Set up the endgame',
          causalLink: 'Because the betrayal severs the council coalition.',
          role: 'escalation',
          escalationType: null,
          uniqueScenarioHook: null,
          approachVectors: null,
          setpieceSourceIndex: null,
        },
      ],
    };
    const user = getUserMessage(buildStructureRewritePrompt(contextWithPlanned));

    expect(user).toContain('ORIGINALLY PLANNED BEATS (CONTEXT ONLY — DO NOT COPY)');
    expect(user).toContain('Act 2, Milestone 2 (2.2) [turning_point] "Betrayal Revealed"');
    expect(user).toContain('Confront the traitor and decide their fate');
    expect(user).toContain('Act 3, Milestone 1 (3.1) [escalation] "Final Gambit"');
  });

  it('omits planned milestones section when no planned milestones exist', () => {
    const user = getUserMessage(buildStructureRewritePrompt(baseContext));

    expect(user).not.toContain('ORIGINALLY PLANNED BEATS');
  });

  it('places planned milestones section between completed milestones and current situation', () => {
    const contextWithPlanned: StructureRewriteContext = {
      ...baseContext,
      plannedBeats: [
        {
          actIndex: 2,
          milestoneIndex: 0,
          milestoneId: '3.1',
          name: 'Endgame',
          description: 'The final confrontation',
          objective: 'Resolve the conflict',
          causalLink: 'Because every ally has chosen a side.',
          role: 'resolution',
          escalationType: null,
          uniqueScenarioHook: null,
          approachVectors: null,
          setpieceSourceIndex: null,
        },
      ],
    };
    const user = getUserMessage(buildStructureRewritePrompt(contextWithPlanned));

    const canonIndex = user.indexOf('CANON - DO NOT CHANGE');
    const plannedIndex = user.indexOf('ORIGINALLY PLANNED BEATS');
    const situationIndex = user.indexOf('CURRENT SITUATION');

    expect(canonIndex).toBeLessThan(plannedIndex);
    expect(plannedIndex).toBeLessThan(situationIndex);
  });
});

describe('buildStructureRewritePrompt - minimal system prompt', () => {
  const baseContext: StructureRewriteContext = {
    tone: 'tactical political thriller',
    decomposedCharacters: [buildMinimalDecomposedCharacter('A former royal scout')],
    decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
    completedBeats: [],
    plannedBeats: [],
    sceneSummary: 'The protagonist has publicly aligned with a rival flotilla.',
    currentActIndex: 1,
    currentMilestoneIndex: 0,
    deviationReason: 'The prior allies now treat the protagonist as a traitor.',
    originalTheme: 'Duty versus chosen loyalty',
    totalActCount: 3,
  };

  it('does NOT include state management instructions', () => {
    const messages = buildStructureRewritePrompt(baseContext);
    const systemMessage = getSystemMessage(messages);

    expect(systemMessage).not.toContain('stateChangesAdded');
    expect(systemMessage).not.toContain('stateChangesRemoved');
    expect(systemMessage).not.toContain('inventoryAdded');
    expect(systemMessage).not.toContain('inventoryRemoved');
    expect(systemMessage).not.toContain('healthAdded');
    expect(systemMessage).not.toContain('healthRemoved');
  });

  it('does NOT include choice requirements', () => {
    const messages = buildStructureRewritePrompt(baseContext);
    const systemMessage = getSystemMessage(messages);

    expect(systemMessage).not.toContain('CHOICE REQUIREMENTS');
    expect(systemMessage).not.toContain('DIVERGENCE ENFORCEMENT');
    expect(systemMessage).not.toContain('FORBIDDEN CHOICE PATTERNS');
  });

  it('is significantly shorter than the full narrative prompt (system + data rules)', () => {
    const messages = buildStructureRewritePrompt(baseContext);
    const structureSystemPrompt = getSystemMessage(messages);
    const fullNarrativePrompt = buildContinuationSystemPrompt() + composeContinuationDataRules();

    // Structure prompt should be at most 40% the size of full narrative prompt
    expect(structureSystemPrompt.length).toBeLessThan(fullNarrativePrompt.length * 0.4);
  });

  it('includes structure-specific guidelines', () => {
    const messages = buildStructureRewritePrompt(baseContext);
    const systemMessage = getSystemMessage(messages);

    expect(systemMessage).toContain('dramatic structures');
    expect(systemMessage).toContain('milestones');
    expect(systemMessage).toContain('stakes');
  });
});
