import { buildNewStoryPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

const MOCK_SPINE_OPTIONS = [
  {
    centralDramaticQuestion: 'Can a broken warrior find redemption?',
    protagonistNeedVsWant: { need: 'inner peace', want: 'revenge', dynamic: 'DIVERGENT' },
    primaryAntagonisticForce: { description: 'A warlord', pressureMechanism: 'Hunts the hero' },
    storySpineType: 'QUEST',
    conflictType: 'PERSON_VS_PERSON',
    characterArcType: 'POSITIVE_CHANGE',
  },
  {
    centralDramaticQuestion: 'Will power corrupt absolutely?',
    protagonistNeedVsWant: { need: 'humility', want: 'power', dynamic: 'IRRECONCILABLE' },
    primaryAntagonisticForce: {
      description: 'The temptation of the throne',
      pressureMechanism: 'Allies demand ruthlessness',
    },
    storySpineType: 'RISE_TO_POWER',
    conflictType: 'PERSON_VS_SELF',
    characterArcType: 'CORRUPTION',
  },
  {
    centralDramaticQuestion: 'Can one person change a broken system?',
    protagonistNeedVsWant: { need: 'acceptance', want: 'justice', dynamic: 'CONVERGENT' },
    primaryAntagonisticForce: {
      description: 'The ruling council',
      pressureMechanism: 'Silences dissenters',
    },
    storySpineType: 'REBELLION',
    conflictType: 'PERSON_VS_SOCIETY',
    characterArcType: 'FLAT',
  },
];

const MOCK_EVALUATED_CONCEPTS = [
  {
    concept: {
      oneLineHook: 'A memory broker hunts a stolen life.',
      elevatorParagraph: 'In a city where memory is currency, a broker discovers her own past was forged.',
      genreFrame: 'NOIR',
      genreSubversion: 'The detective is also the evidence.',
      protagonistRole: 'Memory broker',
      coreCompetence: 'Pattern recall',
      coreFlaw: 'Compulsive secrecy',
      actionVerbs: ['investigate', 'bargain', 'deceive', 'expose', 'evade', 'reconstruct'],
      coreConflictLoop: 'Reveal truth at the cost of identity stability.',
      conflictAxis: 'TRUTH_VS_STABILITY',
      pressureSource: 'Memory cartels erase witnesses.',
      stakesPersonal: 'She may lose her own identity.',
      stakesSystemic: 'The city record collapses into chaos.',
      deadlineMechanism: 'A citywide memory reset begins at dawn.',
      settingAxioms: ['Memories can be extracted.'],
      constraintSet: ['Unlicensed extraction is fatal.'],
      keyInstitutions: ['Cartel courts'],
      settingScale: 'LOCAL',
      branchingPosture: 'RECONVERGE',
      stateComplexity: 'MEDIUM',
    },
    scores: {
      hookStrength: 4,
      conflictEngine: 4,
      agencyBreadth: 3,
      noveltyLeverage: 4,
      branchingFitness: 4,
      llmFeasibility: 3,
    },
    overallScore: 78,
    strengths: ['Strong contradiction'],
    weaknesses: ['Moderate systems load'],
    tradeoffSummary: 'High intrigue, medium complexity cost.',
  },
];

describe('new story form submit', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'form-progress-uuid' },
      writable: true,
      configurable: true,
    });

    // Pin Math.random for deterministic progress phrases
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  function setupPage(): void {
    document.body.innerHTML = buildNewStoryPageHtml();
    loadAppAndInit();
  }

  function fillForm(overrides: Record<string, string> = {}): void {
    const defaults: Record<string, string> = {
      title: 'My Test Story',
      characterConcept: 'A brave warrior with a dark past',
      worldbuilding: 'A fantasy realm',
      startingSituation: 'Standing at the gates of doom',
      tone: 'dark fantasy',
      apiKey: 'sk-or-valid-test-key-12345',
    };
    const values = { ...defaults, ...overrides };

    (document.getElementById('title') as HTMLInputElement).value = values.title;
    (document.getElementById('characterConcept') as HTMLTextAreaElement).value =
      values.characterConcept;
    (document.getElementById('worldbuilding') as HTMLTextAreaElement).value = values.worldbuilding;
    (document.getElementById('startingSituation') as HTMLTextAreaElement).value =
      values.startingSituation;
    (document.getElementById('tone') as HTMLInputElement).value = values.tone;
    (document.getElementById('apiKey') as HTMLInputElement).value = values.apiKey;
  }

  function clickGenerateSpine(): void {
    const btn = document.getElementById('generate-spine-btn') as HTMLButtonElement;
    btn.click();
  }

  it('POSTs to /stories/generate-spines when Generate Spine is clicked', async () => {
    setupPage();
    fillForm();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(
        mockJsonResponse({ success: true, options: MOCK_SPINE_OPTIONS })
      );
    });

    clickGenerateSpine();
    await jest.runAllTimersAsync();

    const spineCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('generate-spines')
    );
    expect(spineCall).toBeDefined();

    const body = JSON.parse(spineCall![1]!.body as string) as Record<string, unknown>;
    expect(body.characterConcept).toBe('A brave warrior with a dark past');
    expect(body.worldbuilding).toBe('A fantasy realm');
    expect(body.tone).toBe('dark fantasy');
    expect(body.startingSituation).toBe('Standing at the gates of doom');
    expect(body.apiKey).toBe('sk-or-valid-test-key-12345');
    expect(body.progressId).toBe('form-progress-uuid');
  });

  it('POSTs to /stories/generate-concepts with seed payload', async () => {
    setupPage();
    fillForm();
    (document.getElementById('genreVibes') as HTMLInputElement).value = 'neo noir';
    (document.getElementById('moodKeywords') as HTMLInputElement).value = 'tense';

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(
        mockJsonResponse({ success: true, evaluatedConcepts: MOCK_EVALUATED_CONCEPTS })
      );
    });

    const generateConceptsBtn = document.getElementById('generate-concepts-btn') as HTMLButtonElement;
    generateConceptsBtn.click();
    await jest.runAllTimersAsync();

    const conceptCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('generate-concepts')
    );
    expect(conceptCall).toBeDefined();
    const body = JSON.parse(conceptCall![1]!.body as string) as Record<string, unknown>;
    expect(body.genreVibes).toBe('neo noir');
    expect(body.moodKeywords).toBe('tense');
    expect(body.apiKey).toBe('sk-or-valid-test-key-12345');
    expect(body.progressId).toBe('form-progress-uuid');
  });

  it('reveals manual story section when Skip is clicked', () => {
    setupPage();
    const manualSection = document.getElementById('manual-story-section') as HTMLElement;
    const skipBtn = document.getElementById('skip-concept-btn') as HTMLButtonElement;

    expect(manualSection.style.display).toBe('none');
    skipBtn.click();
    expect(manualSection.style.display).toBe('block');
  });

  it('reveals manual story section after concept card selection', async () => {
    setupPage();
    fillForm();
    (document.getElementById('genreVibes') as HTMLInputElement).value = 'dystopian';

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(
        mockJsonResponse({ success: true, evaluatedConcepts: MOCK_EVALUATED_CONCEPTS })
      );
    });

    const generateConceptsBtn = document.getElementById('generate-concepts-btn') as HTMLButtonElement;
    generateConceptsBtn.click();
    await jest.runAllTimersAsync();

    const card = document.querySelector('.concept-card') as HTMLElement;
    expect(card).not.toBeNull();
    card.click();

    const manualSection = document.getElementById('manual-story-section') as HTMLElement;
    expect(manualSection.style.display).toBe('block');
  });

  it('stores API key via setApiKey on spine generation success', async () => {
    setupPage();
    fillForm({ apiKey: 'sk-or-my-special-key-abc' });

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(
        mockJsonResponse({ success: true, options: MOCK_SPINE_OPTIONS })
      );
    });

    clickGenerateSpine();
    await jest.runAllTimersAsync();

    expect(sessionStorage.getItem('omb_api_key')).toBe('sk-or-my-special-key-abc');
  });

  it('renders spine cards after successful generation', async () => {
    setupPage();
    fillForm();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(
        mockJsonResponse({ success: true, options: MOCK_SPINE_OPTIONS })
      );
    });

    clickGenerateSpine();
    await jest.runAllTimersAsync();

    const spineSection = document.getElementById('spine-section');
    expect(spineSection?.style.display).toBe('block');

    const cards = document.querySelectorAll('.spine-card');
    expect(cards.length).toBe(3);
  });

  it('POSTs to /stories/create-ajax when spine card is clicked', async () => {
    setupPage();
    fillForm();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      if (typeof url === 'string' && url.includes('generate-spines')) {
        return Promise.resolve(
          mockJsonResponse({ success: true, options: MOCK_SPINE_OPTIONS })
        );
      }
      // create-ajax call
      return Promise.resolve(mockJsonResponse({ success: true, storyId: 'story-1' }));
    });

    // Phase A: generate spines
    clickGenerateSpine();
    await jest.runAllTimersAsync();

    // Phase B: click a spine card
    const card = document.querySelector('.spine-card') as HTMLElement;
    card.click();
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('create-ajax')
    );
    expect(postCall).toBeDefined();

    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body.title).toBe('My Test Story');
    expect(body.spine).toBeDefined();
    expect((body.spine as Record<string, unknown>).storySpineType).toBe('QUEST');
  });

  it('shows error banner on failed spine generation', async () => {
    setupPage();
    fillForm();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(
        mockJsonResponse({ success: false, error: 'Rate limit exceeded' }, 429)
      );
    });

    clickGenerateSpine();
    await jest.runAllTimersAsync();

    const errorDiv = document.querySelector('.alert-error');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toBe('Rate limit exceeded');
    expect((errorDiv as HTMLElement).style.display).toBe('block');
  });

  it('re-enables generate button on error', async () => {
    setupPage();
    fillForm();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Error' }, 500));
    });

    clickGenerateSpine();
    await jest.runAllTimersAsync();

    const generateBtn = document.getElementById('generate-spine-btn') as HTMLButtonElement;
    expect(generateBtn.disabled).toBe(false);
  });

  it('hides loading overlay after completion', async () => {
    setupPage();
    fillForm();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(
        mockJsonResponse({ success: true, options: MOCK_SPINE_OPTIONS })
      );
    });

    clickGenerateSpine();
    await jest.runAllTimersAsync();

    const loading = document.getElementById('loading');
    expect(loading?.style.display).toBe('none');
  });

  it('includes NPC entries in spine generation request', async () => {
    setupPage();
    fillForm();

    // Add an NPC via the UI controls
    const nameInput = document.getElementById('npc-name-input') as HTMLInputElement;
    const descInput = document.getElementById('npc-desc-input') as HTMLTextAreaElement;
    nameInput.value = 'Gandalf';
    descInput.value = 'A wise wizard';

    const addBtn = document.getElementById('npc-add-btn') as HTMLButtonElement;
    addBtn.click();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(
        mockJsonResponse({ success: true, options: MOCK_SPINE_OPTIONS })
      );
    });

    clickGenerateSpine();
    await jest.runAllTimersAsync();

    const spineCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('generate-spines')
    );
    const body = JSON.parse(spineCall![1]!.body as string) as Record<string, unknown>;
    expect(body.npcs).toEqual([{ name: 'Gandalf', description: 'A wise wizard' }]);
  });

  it('prevents default form submission', () => {
    setupPage();
    fillForm();

    const form = document.querySelector('.story-form') as HTMLFormElement;
    const event = new Event('submit', { bubbles: true, cancelable: true });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    form.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
