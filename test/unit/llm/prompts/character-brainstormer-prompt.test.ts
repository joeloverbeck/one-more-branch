import { buildCharacterBrainstormerMessages } from '../../../../src/llm/prompts/character-brainstormer-prompt';
import type { CharacterBrainstormerContext } from '../../../../src/llm/character-brainstormer-types';
import type { ConceptSpec } from '../../../../src/models/concept-generator';
import type { StoryKernel } from '../../../../src/models/story-kernel';
import type { DecomposedWorld } from '../../../../src/models/decomposed-world';

function makeMinimalConceptSpec(): ConceptSpec {
  return {
    oneLineHook: 'A thief who steals memories',
    elevatorParagraph: 'In a world where memories are currency...',
    genreFrame: 'FANTASY',
    genreSubversion: 'The thief is the victim',
    protagonistRole: 'Memory Thief',
    coreCompetence: 'Memory extraction',
    coreFlaw: 'Cannot form new memories',
    actionVerbs: ['steal', 'forget', 'remember'],
    coreConflictLoop: 'Steal memories to survive but lose self',
    conflictAxis: 'IDENTITY_VS_BELONGING',
    conflictType: 'PERSON_VS_SELF',
    pressureSource: 'Memory decay',
    stakesPersonal: 'Loss of identity',
    stakesSystemic: 'Memory economy collapse',
    deadlineMechanism: 'Final memory fading',
    settingAxioms: ['Memories are physical objects'],
    constraintSet: ['No magic beyond memory manipulation'],
    keyInstitutions: ['The Memory Bank'],
    settingScale: 'LOCAL',
    whatIfQuestion: 'What if memories could be stolen?',
    ironicTwist: 'The best thief has no memories of their own',
    playerFantasy: 'Being the ultimate memory thief',
    incitingDisruption: 'A stolen memory reveals a conspiracy',
    escapeValve: 'Return all stolen memories',
    protagonistLie: 'Memories define who you are',
    protagonistTruth: 'Identity persists beyond memory',
    protagonistGhost: 'The day they lost their first memory',
    wantNeedCollisionSketch: 'Wants to steal the ultimate memory but needs to let go',
  } as ConceptSpec;
}

function makeMinimalKernel(): StoryKernel {
  return {
    dramaticThesis: 'Memory is identity',
    antithesis: 'Identity transcends memory',
    valueAtStake: 'selfhood',
    opposingForce: 'The Memory Cartel',
    directionOfChange: 'IRONIC',
    conflictAxis: 'IDENTITY_VS_BELONGING',
    dramaticStance: 'TRAGIC',
    thematicQuestion: 'Can you be yourself without your past?',
    valueSpectrum: {
      positive: 'Authentic self-knowledge',
      contrary: 'Comfortable ignorance',
      contradictory: 'False identity',
      negationOfNegation: 'Total dissolution of self',
    },
    moralArgument: 'Identity is chosen, not inherited',
  } as StoryKernel;
}

function makeMinimalContext(
  overrides: Partial<CharacterBrainstormerContext> = {}
): CharacterBrainstormerContext {
  return {
    conceptSpec: makeMinimalConceptSpec(),
    storyKernel: makeMinimalKernel(),
    decomposedWorld: null,
    rawWorldbuilding: null,
    existingCharacterNames: [],
    userNotes: '',
    ...overrides,
  };
}

describe('buildCharacterBrainstormerMessages', () => {
  it('returns exactly 2 messages with system and user roles', () => {
    const messages = buildCharacterBrainstormerMessages(makeMinimalContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('system message contains content policy text', () => {
    const messages = buildCharacterBrainstormerMessages(makeMinimalContext());

    expect(messages[0].content).toContain('CONTENT GUIDELINES');
  });

  it('system message contains narrative theory technique keywords', () => {
    const messages = buildCharacterBrainstormerMessages(makeMinimalContext());
    const system = messages[0].content;

    expect(system).toContain('CAUSAL CHAIN');
    expect(system).toContain('PRESSURE REVEAL');
    expect(system).toContain('SPECIFIC WOUND');
    expect(system).toContain('PRODUCTIVE CONTRADICTION');
    expect(system).toContain('ARCHETYPE + SUBVERSION');
    expect(system).toContain('METAPHOR FAMILY');
    expect(system).toContain('OPPOSITION MATRIX');
    expect(system).toContain('TECHNIQUE ROTATION');
    expect(system).toContain('WORLDVIEW FINGERPRINTING');
    expect(system).toContain('FUNCTIONAL DIVERSITY');
  });

  it('system message contains diagnostic uniqueness mandate', () => {
    const messages = buildCharacterBrainstormerMessages(makeMinimalContext());

    expect(messages[0].content).toContain('DIAGNOSTIC UNIQUENESS TEST');
  });

  it('system message contains quality gates', () => {
    const messages = buildCharacterBrainstormerMessages(makeMinimalContext());

    expect(messages[0].content).toContain('QUALITY GATES');
  });

  it('user message includes concept analysis section', () => {
    const messages = buildCharacterBrainstormerMessages(makeMinimalContext());

    expect(messages[1].content).toContain('CONCEPT ANALYSIS');
    expect(messages[1].content).toContain('A thief who steals memories');
  });

  it('user message includes kernel grounding section', () => {
    const messages = buildCharacterBrainstormerMessages(makeMinimalContext());

    expect(messages[1].content).toContain('THEMATIC KERNEL');
    expect(messages[1].content).toContain('Memory is identity');
  });

  it('user message includes worldbuilding when decomposedWorld is provided', () => {
    const decomposedWorld: DecomposedWorld = {
      facts: [
        {
          id: 'wf-1',
          domain: 'geography',
          fact: 'The city floats above the clouds',
          scope: 'global',
          narrativeWeight: 'HIGH',
          storyFunctions: ['ATMOSPHERIC'],
        },
      ],
      rawWorldbuilding: 'A floating city above the clouds',
    };

    const messages = buildCharacterBrainstormerMessages(
      makeMinimalContext({ decomposedWorld })
    );

    expect(messages[1].content).toContain('WORLD CONTEXT');
  });

  it('user message includes rawWorldbuilding when decomposedWorld is null', () => {
    const messages = buildCharacterBrainstormerMessages(
      makeMinimalContext({ rawWorldbuilding: 'A dark medieval setting with magic' })
    );

    expect(messages[1].content).toContain('WORLD CONTEXT');
    expect(messages[1].content).toContain('A dark medieval setting with magic');
  });

  it('user message omits worldbuilding when both decomposedWorld and rawWorldbuilding are null', () => {
    const messages = buildCharacterBrainstormerMessages(makeMinimalContext());

    expect(messages[1].content).not.toContain('WORLD CONTEXT');
  });

  it('user message includes existing characters block when non-empty', () => {
    const messages = buildCharacterBrainstormerMessages(
      makeMinimalContext({
        existingCharacterNames: [
          {
            name: 'Kael',
            storyFunction: 'ANTAGONIST',
            narrativeRole: 'The memory cartel boss',
            superObjective: 'Control all memories',
          },
          {
            name: 'Mira',
            storyFunction: null,
            narrativeRole: null,
            superObjective: null,
          },
        ],
      })
    );

    expect(messages[1].content).toContain('EXISTING CHARACTERS');
    expect(messages[1].content).toContain('Kael (ANTAGONIST)');
    expect(messages[1].content).toContain('The memory cartel boss');
    expect(messages[1].content).toContain('drives toward: Control all memories');
    expect(messages[1].content).toContain('- Mira');
  });

  it('user message omits existing characters block when empty', () => {
    const messages = buildCharacterBrainstormerMessages(makeMinimalContext());

    expect(messages[1].content).not.toContain('EXISTING CHARACTERS');
  });

  it('user message includes user notes when provided', () => {
    const messages = buildCharacterBrainstormerMessages(
      makeMinimalContext({ userNotes: 'I want morally ambiguous characters' })
    );

    expect(messages[1].content).toContain('USER CREATIVE DIRECTION');
    expect(messages[1].content).toContain('I want morally ambiguous characters');
    expect(messages[1].content).toContain('ANCHORING CONSTRAINTS');
  });

  it('user message omits user notes when empty', () => {
    const messages = buildCharacterBrainstormerMessages(makeMinimalContext({ userNotes: '' }));

    expect(messages[1].content).not.toContain('USER CREATIVE DIRECTION');
  });

  it('user message contains output requirements', () => {
    const messages = buildCharacterBrainstormerMessages(makeMinimalContext());

    expect(messages[1].content).toContain('OUTPUT REQUIREMENTS');
    expect(messages[1].content).toContain('Generate between 6 and 10 characters');
  });
});
