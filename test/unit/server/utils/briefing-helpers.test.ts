import type { DecomposedCharacter, NpcAgenda } from '@/models';
import {
  extractNpcBriefings,
  extractProtagonistBriefing,
  groupWorldFacts,
} from '@/server/utils/briefing-helpers';

function buildCharacter(overrides: Partial<DecomposedCharacter> = {}): DecomposedCharacter {
  return {
    name: 'Aria',
    appearance: 'Tall with silver hair',
    coreTraits: ['Calm', 'Perceptive'],
    motivations: 'Protect the city',
    protagonistRelationship: null,
    knowledgeBoundaries: 'Does not know traitor identity',
    rawDescription: 'Character',
    speechFingerprint: {
      catchphrases: [],
      vocabularyProfile: 'formal',
      sentencePatterns: 'measured',
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
    ...overrides,
  };
}

describe('briefing-helpers', () => {
  it('extracts protagonist from first character', () => {
    const protagonist = extractProtagonistBriefing([buildCharacter()]);

    expect(protagonist).toEqual({
      name: 'Aria',
      appearance: 'Tall with silver hair',
      coreTraits: ['Calm', 'Perceptive'],
      motivations: 'Protect the city',
    });
  });

  it('maps NPCs and joins agendas with case-insensitive name matching', () => {
    const characters = [
      buildCharacter({ name: 'Aria' }),
      buildCharacter({ name: 'Captain Vex', motivations: 'Keep power' }),
    ];
    const agendas: NpcAgenda[] = [
      {
        npcName: 'captain vex',
        currentGoal: 'Control the docks',
        leverage: 'Harbor militia',
        fear: 'Exposure',
        offScreenBehavior: 'Bribes officials',
      },
    ];

    const npcs = extractNpcBriefings(characters, agendas);
    expect(npcs).toHaveLength(1);
    expect(npcs[0]).toEqual(
      expect.objectContaining({
        name: 'Captain Vex',
        currentGoal: 'Control the docks',
        fear: 'Exposure',
      })
    );
  });

  it('groups world facts by domain', () => {
    const grouped = groupWorldFacts({
      rawWorldbuilding: 'World',
      facts: [
        { domain: 'geography', fact: 'The pass freezes nightly.', scope: 'regional' },
        { domain: 'geography', fact: 'The eastern ridge is unstable.', scope: 'local' },
      ],
    });

    expect(grouped).toEqual({
      geography: [
        { fact: 'The pass freezes nightly.', scope: 'regional' },
        { fact: 'The eastern ridge is unstable.', scope: 'local' },
      ],
    });
  });
});
