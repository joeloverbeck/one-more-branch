import type { OpeningPagePlanContext } from '../../../../../../src/llm/context-types.js';
import { buildPlannerOpeningContextSection } from '../../../../../../src/llm/prompts/sections/planner/opening-context.js';
import { buildMinimalDecomposedCharacter, MINIMAL_DECOMPOSED_WORLD } from '../../../../../fixtures/decomposed';

describe('planner opening context section', () => {
  it('includes decomposed world and tone in opening context', () => {
    const context: OpeningPagePlanContext = {
      mode: 'opening',
      tone: 'sci-fi suspense',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A stranded deep-space courier')],
      decomposedWorld: { facts: [{ domain: 'geography' as const, fact: 'A decaying orbital trade ring.', scope: 'global' }], rawWorldbuilding: 'A decaying orbital trade ring.' },
    };

    const result = buildPlannerOpeningContextSection(context);

    expect(result).toContain('=== PLANNER CONTEXT: OPENING ===');
    expect(result).not.toContain('CHARACTER CONCEPT:');
    expect(result).toContain('decaying orbital trade ring');
    expect(result).toContain('TONE/GENRE: sci-fi suspense');
  });

  it('omits character concept and marks the first decomposed character as PROTAGONIST', () => {
    const context: OpeningPagePlanContext = {
      mode: 'opening',
      tone: 'sci-fi suspense',
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
      decomposedCharacters: [
        {
          name: 'Rin',
          coreTraits: ['resourceful', 'stubborn'],
          motivations: 'Expose station sabotage',
          protagonistRelationship: null,
          knowledgeBoundaries: 'Knows courier routes, not reactor internals',
          appearance: 'Lean, grease-stained uniform',
          rawDescription: 'A courier',
          speechFingerprint: {
            catchphrases: [],
            vocabularyProfile: 'Direct and technical',
            sentencePatterns: 'Short directives',
            verbalTics: [],
            dialogueSamples: [],
            metaphorFrames: '',
            antiExamples: [],
            discourseMarkers: [],
            registerShifts: '',
          },
          decisionPattern: '',
          coreBeliefs: [],
          conflictPriority: '',
        },
        {
          name: 'Voss',
          coreTraits: ['secretive'],
          motivations: 'Contain evidence leak',
          protagonistRelationship: {
            valence: -1,
            dynamic: 'antagonist',
            history: 'Has been covering evidence of sabotage.',
            currentTension: 'Suspects the courier knows too much.',
            leverage: 'Controls station security access.',
          },
          knowledgeBoundaries: 'Knows internal security systems',
          appearance: 'Tall in officer coat',
          rawDescription: 'A station officer',
          speechFingerprint: {
            catchphrases: [],
            vocabularyProfile: 'Formal command language',
            sentencePatterns: 'Measured statements',
            verbalTics: [],
            dialogueSamples: [],
            metaphorFrames: '',
            antiExamples: [],
            discourseMarkers: [],
            registerShifts: '',
          },
          decisionPattern: '',
          coreBeliefs: [],
          conflictPriority: '',
        },
      ],
    };

    const result = buildPlannerOpeningContextSection(context);

    expect(result).not.toContain('CHARACTER CONCEPT:');
    expect(result).toContain('CHARACTERS (structured profiles):');
    expect(result).toContain('CHARACTER: Rin\nPROTAGONIST');
    expect(result).not.toContain('CHARACTER: Voss\nPROTAGONIST');
  });

  it('renders rich structure context with active and pending beats', () => {
    const context: OpeningPagePlanContext = {
      mode: 'opening',
      tone: 'sci-fi suspense',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A stranded deep-space courier')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
      startingSituation: 'An airlock alarm starts as oxygen drops.',
      structure: {
        overallTheme: 'Truth survives only if transmitted in time.',
        premise: 'A courier must publish evidence before the station implodes.',
        pacingBudget: { targetPagesMin: 20, targetPagesMax: 30 },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'Lockdown',
            objective: 'Reach the relay core',
            stakes: 'Failure buries the evidence forever.',
            entryCondition: 'The station enters hard lockdown.',
            beats: [
              {
                id: '1.1',
                description: 'Break through maintenance sectors',
                objective: 'Get to a functioning uplink',
                role: 'setup',
              },
              {
                id: '1.2',
                description: 'Escape patrol dragnet',
                objective: 'Reach the relay corridor',
                role: 'escalation',
              },
            ],
          },
          {
            id: '2',
            name: 'Broadcast',
            objective: 'Transmit evidence',
            stakes: 'Conspiracy survives if transmission fails.',
            entryCondition: 'Courier reaches relay core',
            beats: [
              {
                id: '2.1',
                description: 'Fight signal jamming',
                objective: 'Stabilize transmission',
                role: 'turning_point',
              },
            ],
          },
        ],
      },
    };

    const result = buildPlannerOpeningContextSection(context);

    expect(result).toContain('STARTING SITUATION:');
    expect(result).toContain('=== STORY STRUCTURE ===');
    expect(result).toContain('CURRENT ACT: Lockdown (Act 1 of 2)');
    expect(result).toContain('[>] ACTIVE (setup): Break through maintenance sectors');
    expect(result).toContain('[ ] PENDING (escalation): Escape patrol dragnet');
    expect(result).toContain('REMAINING ACTS:');
  });

  it('includes initial NPC agendas when present', () => {
    const context: OpeningPagePlanContext = {
      mode: 'opening',
      tone: 'sci-fi',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A courier')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
      initialNpcAgendas: [
        {
          npcName: 'Voss',
          currentGoal: 'Sabotage the relay',
          leverage: 'Access to security systems',
          fear: 'Being identified',
          offScreenBehavior: 'Planting devices in maintenance shafts',
        },
      ],
    };

    const result = buildPlannerOpeningContextSection(context);

    expect(result).toContain('NPC INITIAL AGENDAS');
    expect(result).toContain('[Voss]');
    expect(result).toContain('Goal: Sabotage the relay');
    expect(result).toContain('Leverage: Access to security systems');
    expect(result).toContain('Fear: Being identified');
    expect(result).toContain('Off-screen: Planting devices in maintenance shafts');
  });

  it('omits NPC agendas section when no agendas exist', () => {
    const context: OpeningPagePlanContext = {
      mode: 'opening',
      tone: 'sci-fi',
      decomposedCharacters: [buildMinimalDecomposedCharacter('A courier')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
    };

    const result = buildPlannerOpeningContextSection(context);

    expect(result).not.toContain('NPC INITIAL AGENDAS');
  });
});
