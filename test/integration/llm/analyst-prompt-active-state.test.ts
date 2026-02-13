import { buildAnalystPrompt } from '../../../src/llm/prompts/analyst-prompt';
import type { AnalystContext } from '../../../src/llm/analyst-types';
import type { StoryStructure, AccumulatedStructureState } from '../../../src/models/story-arc';
import type { ActiveState } from '../../../src/models/state/active-state';

describe('buildAnalystPrompt integration - active state summary', () => {
  const structure: StoryStructure = {
    overallTheme: 'Survive the occupation long enough to spark resistance.',
    premise: 'A courier must keep a rebel network alive under martial law.',
    pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'Crackdown',
        objective: 'Escape the first dragnet',
        stakes: 'Capture means execution.',
        entryCondition: 'Occupation forces seal the district.',
        beats: [
          {
            id: '1.1',
            description: 'Reach safehouse',
            objective: 'Get off the street',
            role: 'setup',
          },
          {
            id: '1.2',
            description: 'Secure courier route',
            objective: 'Reopen communications',
            role: 'escalation',
          },
        ],
      },
      {
        id: '2',
        name: 'Countermove',
        objective: 'Keep the resistance alive',
        stakes: 'If cells are exposed, the rebellion collapses.',
        entryCondition: 'Safehouse network is partially restored.',
        beats: [
          {
            id: '2.1',
            description: 'Bait the patrols',
            objective: 'Create a diversion',
            role: 'turning_point',
          },
        ],
      },
      {
        id: '3',
        name: 'Uprising',
        objective: 'Trigger coordinated resistance',
        stakes: 'Failure cements permanent military rule.',
        entryCondition: 'Cells can move without immediate interception.',
        beats: [
          {
            id: '3.1',
            description: 'Broadcast proof',
            objective: 'Turn public opinion',
            role: 'resolution',
          },
        ],
      },
    ],
  };

  const structureState: AccumulatedStructureState = {
    currentActIndex: 0,
    currentBeatIndex: 0,
    beatProgressions: [{ beatId: '1.1', status: 'active' }],
    pagesInCurrentBeat: 1,
    pacingNudge: null,
  };

  it('renders active state texts in CURRENT STATE section (not IDs)', () => {
    const activeState: ActiveState = {
      currentLocation: 'Village square triage area',
      activeThreats: [
        { id: 'th-15', text: 'Militia spotters are marking anyone who helps the wounded' },
        { id: 'th-17', text: 'A drone sweep will begin in under five minutes' },
      ],
      activeConstraints: [
        { id: 'cn-8', text: 'Most exits are blocked by burned carts' },
        { id: 'cn-9', text: 'The medic has only one dose of painkiller left' },
      ],
      openThreads: [
        {
          id: 'td-2',
          text: 'Find where the detainees were moved',
          threadType: 'MYSTERY',
          urgency: 'HIGH',
        },
        {
          id: 'td-8',
          text: 'Get a secure line to the western cell',
          threadType: 'QUEST',
          urgency: 'MEDIUM',
        },
      ],
    };

    const context: AnalystContext = {
      narrative: 'You drag another survivor behind cover while loudspeakers demand surrender.',
      structure,
      accumulatedStructureState: structureState,
      activeState,
      threadsResolved: [],
      threadAges: {},
    };

    const messages = buildAnalystPrompt(context);
    const userContent = messages[1]?.content ?? '';

    expect(userContent).toContain('CURRENT STATE (for beat evaluation)');
    expect(userContent).toContain('Location: Village square triage area');
    expect(userContent).toContain(
      'Active threats: Militia spotters are marking anyone who helps the wounded, A drone sweep will begin in under five minutes'
    );
    expect(userContent).toContain(
      'Constraints: Most exits are blocked by burned carts, The medic has only one dose of painkiller left'
    );
    expect(userContent).toContain('[td-2] (MYSTERY/HIGH) Find where the detainees were moved');
    expect(userContent).toContain('[td-8] (QUEST/MEDIUM) Get a secure line to the western cell');

    expect(userContent).not.toContain('Active threats: th-15, th-17');
    expect(userContent).not.toContain('Constraints: cn-8, cn-9');
    expect(userContent).not.toContain('Open threads: td-2, td-8');
  });
});
