import {
  buildLorekeeperPrompt,
  detectMentionedCharacters,
} from '../../../../src/llm/prompts/lorekeeper-prompt';
import {
  ChoiceType,
  PrimaryDelta,
  createEmptyActiveState,
  parsePageId,
} from '../../../../src/models';
import type { LorekeeperContext } from '../../../../src/llm/context-types';
import type { PagePlan } from '../../../../src/llm/planner-types';
import type { DecomposedCharacter } from '../../../../src/models/decomposed-character';
import { MINIMAL_DECOMPOSED_WORLD } from '../../../fixtures/decomposed';

function buildMinimalPagePlan(overrides?: Partial<PagePlan>): PagePlan {
  return {
    sceneIntent: 'Protagonist confronts the merchant',
    continuityAnchors: ['The merchant holds the key'],
    dramaticQuestion: 'Will the protagonist get the key peacefully?',
    writerBrief: {
      openingLineDirective: 'Start with the merchant counting coins',
      mustIncludeBeats: ['Negotiate for the key'],
      forbiddenRecaps: ['Do not repeat the bridge scene'],
    },
    stateIntents: {
      currentLocation: 'Market square',
      threats: { add: [], removeIds: [] },
      constraints: { add: [], removeIds: [] },
      threads: { add: [], resolveIds: [] },
      inventory: { add: [], removeIds: [] },
      health: { add: [], removeIds: [] },
      characterState: { add: [], removeIds: [] },
      canon: { worldAdd: [], characterAdd: [] },
    },
    choiceIntents: [],
    ...overrides,
  };
}

function buildMinimalContext(overrides?: Partial<LorekeeperContext>): LorekeeperContext {
  return {
    tone: 'dark fantasy',
    decomposedCharacters: [],
    decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
    globalCanon: [],
    globalCharacterCanon: {},
    accumulatedCharacterState: {},
    activeState: createEmptyActiveState(),
    ancestorSummaries: [],
    grandparentNarrative: null,
    previousNarrative: 'The protagonist entered the market square.',
    pagePlan: buildMinimalPagePlan(),
    ...overrides,
  };
}

describe('buildLorekeeperPrompt', () => {
  it('returns system and user messages', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('includes content policy in system prompt', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());

    expect(messages[0]?.content).toContain('CONTENT GUIDELINES');
  });

  it('includes curation principles in system prompt', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());

    expect(messages[0]?.content).toContain('SELECTIVE INCLUSION');
    expect(messages[0]?.content).toContain('SPEECH PATTERN EXTRACTION');
    expect(messages[0]?.content).toContain('NARRATIVE CHRONOLOGY');
  });

  it('includes planner guidance in user prompt', () => {
    const context = buildMinimalContext();
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('Scene Intent: Protagonist confronts the merchant');
    expect(userPrompt).toContain('Dramatic Question: Will the protagonist get the key peacefully?');
    expect(userPrompt).toContain('The merchant holds the key');
  });

  it('includes tone in user prompt', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('dark fantasy');
  });

  it('omits raw character concept and marks first decomposed character as PROTAGONIST', () => {
    const messages = buildLorekeeperPrompt(
      buildMinimalContext({
        decomposedCharacters: [
          {
            name: 'Jon Ureña',
            coreTraits: ['introverted', 'disciplined'],
            motivations: 'Find connection without getting betrayed again.',
            protagonistRelationship: null,
            knowledgeBoundaries: 'Knows city gangs but not court politics.',
            appearance: 'Tall, stoic, scarred knuckles.',
            rawDescription: 'A guarded former enforcer.',
            speechFingerprint: {
              catchphrases: ['Keep it clean.'],
              vocabularyProfile: 'Precise and restrained',
              sentencePatterns: 'Short declarative statements',
              verbalTics: ['Pauses before disagreeing'],
              dialogueSamples: ['I said no.'],
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
            name: 'Captain Voss',
            coreTraits: ['charismatic', 'calculating'],
            motivations: 'Control the district.',
            protagonistRelationship: {
              valence: -2,
              dynamic: 'manipulator',
              history: 'Has been using Jon as an unwitting enforcer.',
              currentTension: 'Fears Jon will discover the truth.',
              leverage: 'Knows Jon\'s criminal past.',
            },
            knowledgeBoundaries: 'Knows court politics and trade routes.',
            appearance: 'Immaculate uniform, polished boots.',
            rawDescription: 'District commander with ambition.',
            speechFingerprint: {
              catchphrases: ['Order has a price.'],
              vocabularyProfile: 'Formal political language',
              sentencePatterns: 'Layered persuasive clauses',
              verbalTics: ['Uses rhetorical questions'],
              dialogueSamples: ['You understand what stability requires.'],
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
      })
    );
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('CHARACTERS (structured profiles with speech fingerprints)');
    expect(userPrompt).toContain('CHARACTER: Jon Ureña\nPROTAGONIST');
    expect(userPrompt).not.toContain('CHARACTER: Captain Voss\nPROTAGONIST');
    expect(userPrompt).not.toContain('CHARACTER CONCEPT:');
    expect(userPrompt).not.toContain('A wandering healer');
  });

  it('includes decomposed character profiles when present', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [
        buildMinimalDecomposedCharacter('Gareth', {
          rawDescription: 'A gruff blacksmith who protects the village',
        }),
      ],
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('CHARACTERS (structured profiles with speech fingerprints)');
    expect(userPrompt).toContain('Gareth');
  });

  it('includes global canon when present', () => {
    const context = buildMinimalContext({
      globalCanon: [
        { text: 'The eastern gate is sealed', factType: 'NORM' },
        { text: 'Dragons are extinct', factType: 'NORM' },
      ],
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('ESTABLISHED WORLD FACTS');
    expect(userPrompt).toContain('The eastern gate is sealed');
    expect(userPrompt).toContain('Dragons are extinct');
  });

  it('includes character canon when present', () => {
    const context = buildMinimalContext({
      globalCharacterCanon: {
        Mira: ['Has a scar on her left hand', 'Allergic to ironwood'],
      },
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('CHARACTER CANON');
    expect(userPrompt).toContain('[Mira]');
    expect(userPrompt).toContain('Has a scar on her left hand');
  });

  it('includes accumulated character state when present', () => {
    const context = buildMinimalContext({
      accumulatedCharacterState: {
        Gareth: [{ id: 'cs-1', text: 'Wounded in the battle' }],
      },
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('NPC ACCUMULATED STATE');
    expect(userPrompt).toContain('[Gareth]');
    expect(userPrompt).toContain('[cs-1] Wounded in the battle');
  });

  it('includes active state when populated', () => {
    const context = buildMinimalContext({
      activeState: {
        currentLocation: 'Tavern',
        activeThreats: [{ id: 'th-1', text: 'Bandits outside' }],
        activeConstraints: [{ id: 'cn-1', text: 'Locked door' }],
        openThreads: [],
      },
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('ACTIVE STATE');
    expect(userPrompt).toContain('Tavern');
    expect(userPrompt).toContain('Bandits outside');
    expect(userPrompt).toContain('Locked door');
  });

  it('includes ancestor summaries when present', () => {
    const context = buildMinimalContext({
      ancestorSummaries: [
        { pageId: parsePageId(1), summary: 'The journey began' },
        { pageId: parsePageId(2), summary: 'Met the merchant' },
      ],
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('ANCESTOR PAGE SUMMARIES');
    expect(userPrompt).toContain('Page 1: The journey began');
    expect(userPrompt).toContain('Page 2: Met the merchant');
  });

  it('includes grandparent narrative when present', () => {
    const context = buildMinimalContext({
      grandparentNarrative: 'Two pages ago: the forest clearing scene.',
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('GRANDPARENT NARRATIVE');
    expect(userPrompt).toContain('Two pages ago: the forest clearing scene.');
  });

  it('always includes parent narrative', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('PARENT NARRATIVE');
    expect(userPrompt).toContain('The protagonist entered the market square.');
  });

  it('includes choice intents when present', () => {
    const context = buildMinimalContext({
      pagePlan: buildMinimalPagePlan({
        choiceIntents: [
          {
            choiceType: ChoiceType.TACTICAL_APPROACH,
            primaryDelta: PrimaryDelta.GOAL_SHIFT,
            hook: 'Try to negotiate',
          },
          {
            choiceType: ChoiceType.MORAL_DILEMMA,
            primaryDelta: PrimaryDelta.RELATIONSHIP_CHANGE,
            hook: 'Threaten the merchant',
          },
        ],
      }),
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('Choice Intents');
    expect(userPrompt).toContain('[TACTICAL_APPROACH / GOAL_SHIFT] Try to negotiate');
    expect(userPrompt).toContain('[MORAL_DILEMMA / RELATIONSHIP_CHANGE] Threaten the merchant');
  });

  it('includes NPC agendas when present', () => {
    const context = buildMinimalContext({
      accumulatedNpcAgendas: {
        Gareth: {
          npcName: 'Gareth',
          currentGoal: 'Protect the village',
          leverage: 'Knowledge of secret paths',
          fear: 'Losing his family',
          offScreenBehavior: 'Fortifying the walls',
        },
      },
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('NPC AGENDAS');
    expect(userPrompt).toContain('[Gareth]');
    expect(userPrompt).toContain('Goal: Protect the village');
    expect(userPrompt).toContain('Leverage: Knowledge of secret paths');
    expect(userPrompt).toContain('Fear: Losing his family');
    expect(userPrompt).toContain('Off-screen: Fortifying the walls');
  });

  it('includes NPC agendas curation principle in system prompt', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());
    expect(messages[0]?.content).toContain('NPC AGENDAS');
  });

  it('omits NPC agendas section when no agendas exist', () => {
    const context = buildMinimalContext({ accumulatedNpcAgendas: undefined });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).not.toContain('NPC AGENDAS');
  });

  it('includes tone feel and avoid when provided', () => {
    const context = buildMinimalContext({
      toneFeel: ['gritty', 'visceral', 'tense'],
      toneAvoid: ['whimsical', 'lighthearted'],
    });
    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('TONE DIRECTIVE:');
    expect(userPrompt).toContain('Atmospheric feel (evoke these qualities): gritty, visceral, tense');
    expect(userPrompt).toContain('Anti-patterns (never drift toward): whimsical, lighthearted');
  });

  it('falls back to tone-only when feel/avoid are absent', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('TONE DIRECTIVE:');
    expect(userPrompt).toContain('Genre/tone: dark fantasy');
    expect(userPrompt).not.toContain('Atmospheric feel');
    expect(userPrompt).not.toContain('Anti-patterns');
  });

  it('omits optional sections when empty', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).not.toContain('NPC DEFINITIONS');
    expect(userPrompt).not.toContain('ESTABLISHED WORLD FACTS');
    expect(userPrompt).not.toContain('CHARACTER CANON');
    expect(userPrompt).not.toContain('NPC ACCUMULATED STATE');
    expect(userPrompt).not.toContain('ACTIVE STATE');
    expect(userPrompt).not.toContain('ANCESTOR PAGE SUMMARIES');
    expect(userPrompt).not.toContain('GRANDPARENT NARRATIVE');
    expect(userPrompt).not.toContain('NPC AGENDAS');
  });

  it('includes PROXIMITY AWARENESS principle in system prompt', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());
    const systemPrompt = messages[0]?.content ?? '';

    expect(systemPrompt).toContain('PROXIMITY AWARENESS');
    expect(systemPrompt).toContain('physically nearby');
    expect(systemPrompt).toContain('behind doors');
  });

  it('includes physically nearby language in user prompt instructions', () => {
    const messages = buildLorekeeperPrompt(buildMinimalContext());
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('physically nearby');
    expect(userPrompt).toContain('behind doors');
  });
});

const EMPTY_SPEECH_FINGERPRINT = {
  catchphrases: [],
  vocabularyProfile: '',
  sentencePatterns: '',
  verbalTics: [],
  dialogueSamples: [],
  metaphorFrames: '',
  antiExamples: [],
  discourseMarkers: [],
  registerShifts: '',
};

function buildMinimalDecomposedCharacter(
  name: string,
  overrides?: Partial<DecomposedCharacter>
): DecomposedCharacter {
  return {
    name,
    speechFingerprint: EMPTY_SPEECH_FINGERPRINT,
    coreTraits: [],
    motivations: '',
    protagonistRelationship: null,
    knowledgeBoundaries: '',
    decisionPattern: '',
    coreBeliefs: [],
    conflictPriority: '',
    appearance: '',
    rawDescription: '',
    ...overrides,
  };
}

describe('detectMentionedCharacters', () => {
  it('detects a character by partial name match in sceneIntent', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Alicia Western')],
      pagePlan: buildMinimalPagePlan({
        sceneIntent: 'Jon materializes outside Alicia\'s room',
      }),
    });

    const result = detectMentionedCharacters(context);

    expect(result).toContain('Alicia Western');
  });

  it('strips parenthetical suffixes before token matching', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Bobby Western (1972)')],
      pagePlan: buildMinimalPagePlan({
        sceneIntent: 'Bobby appears at the doorway',
      }),
    });

    const result = detectMentionedCharacters(context);

    expect(result).toContain('Bobby Western (1972)');
  });

  it('returns empty array when no characters are mentioned', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Alicia Western')],
      pagePlan: buildMinimalPagePlan({
        sceneIntent: 'The protagonist explores the empty corridor',
      }),
    });

    const result = detectMentionedCharacters(context);

    expect(result).toHaveLength(0);
  });

  it('filters out tokens shorter than 3 characters', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Li Chen')],
      pagePlan: buildMinimalPagePlan({
        sceneIntent: 'Chen enters the room while Li waits outside',
      }),
    });

    const result = detectMentionedCharacters(context);

    expect(result).toContain('Li Chen');
  });

  it('does not match on short-only tokens', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Li Al')],
      pagePlan: buildMinimalPagePlan({
        sceneIntent: 'Li and Al walk down the street',
      }),
    });

    const result = detectMentionedCharacters(context);

    expect(result).toHaveLength(0);
  });

  it('matches case-insensitively', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Alicia Western')],
      pagePlan: buildMinimalPagePlan({
        sceneIntent: 'alicia is waiting in the lobby',
      }),
    });

    const result = detectMentionedCharacters(context);

    expect(result).toContain('Alicia Western');
  });

  it('detects multiple characters from different planner fields', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [
        buildMinimalDecomposedCharacter('Alicia Western'),
        buildMinimalDecomposedCharacter('Captain Voss'),
      ],
      pagePlan: buildMinimalPagePlan({
        sceneIntent: 'Alicia enters the command room',
        continuityAnchors: ['Voss is waiting with his soldiers'],
      }),
    });

    const result = detectMentionedCharacters(context);

    expect(result).toContain('Alicia Western');
    expect(result).toContain('Captain Voss');
    expect(result).toHaveLength(2);
  });

  it('deduplicates characters when same character appears in decomposedCharacters', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Alicia Western')],
      pagePlan: buildMinimalPagePlan({
        sceneIntent: 'Alicia appears',
      }),
    });

    const result = detectMentionedCharacters(context);

    expect(result).toEqual(['Alicia Western']);
  });

  it('detects characters mentioned in choiceIntents hooks', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Marcus Reed')],
      pagePlan: buildMinimalPagePlan({
        choiceIntents: [
          {
            hook: 'Confront Marcus about the theft',
            choiceType: ChoiceType.MORAL_DILEMMA,
            primaryDelta: PrimaryDelta.RELATIONSHIP_CHANGE,
          },
        ],
      }),
    });

    const result = detectMentionedCharacters(context);

    expect(result).toContain('Marcus Reed');
  });

  it('detects characters mentioned in writerBrief fields', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Elena Vasquez')],
      pagePlan: buildMinimalPagePlan({
        writerBrief: {
          openingLineDirective: 'Elena steps through the door',
          mustIncludeBeats: [],
          forbiddenRecaps: [],
        },
      }),
    });

    const result = detectMentionedCharacters(context);

    expect(result).toContain('Elena Vasquez');
  });
});

describe('buildLorekeeperPrompt character directive integration', () => {
  it('includes CHARACTERS REFERENCED directive when characters are detected', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [
        buildMinimalDecomposedCharacter('Alicia Western'),
        buildMinimalDecomposedCharacter('Captain Voss'),
      ],
      pagePlan: buildMinimalPagePlan({
        sceneIntent: 'Alicia confronts Voss in the command tent',
      }),
    });

    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).toContain('CHARACTERS REFERENCED IN THIS PLAN');
    expect(userPrompt).toContain('- Alicia Western');
    expect(userPrompt).toContain('- Captain Voss');
  });

  it('omits CHARACTERS REFERENCED directive when no characters are detected', () => {
    const context = buildMinimalContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Alicia Western')],
      pagePlan: buildMinimalPagePlan({
        sceneIntent: 'The protagonist wanders alone through the forest',
      }),
    });

    const messages = buildLorekeeperPrompt(context);
    const userPrompt = messages[1]?.content ?? '';

    expect(userPrompt).not.toContain('CHARACTERS REFERENCED IN THIS PLAN');
  });
});
