import { buildCharacterWebsPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

function flushClientWork(): Promise<void> {
  return jest.runAllTimersAsync().then(() => undefined);
}

describe('character webs page controller', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'character-web-progress-id' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('loads saved character webs without auto-selecting the first web', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/character-webs/api/list')) {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            webs: [
              {
                id: 'web-1',
                name: 'Shattered Compass',
                createdAt: '2026-03-09T12:00:00.000Z',
                updatedAt: '2026-03-09T12:00:00.000Z',
                protagonistName: 'Iria Vale',
                assignments: [{ characterName: 'Iria Vale', isProtagonist: true }],
                relationshipArchetypes: [],
                castDynamicsSummary: 'Trust corrodes every alliance.',
              },
            ],
          })
        );
      }

      if (url.includes('/kernels/api/list')) {
        return Promise.resolve(mockJsonResponse({ success: true, kernels: [] }));
      }

      if (url.includes('/concepts/api/list')) {
        return Promise.resolve(mockJsonResponse({ success: true, concepts: [] }));
      }

      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    }) as jest.Mock;

    document.body.innerHTML = buildCharacterWebsPageHtml();
    loadAppAndInit();
    await flushClientWork();

    expect(document.getElementById('character-web-list')?.textContent).toContain(
      'Shattered Compass'
    );
    expect(document.getElementById('character-web-details')?.style.display).toBe('none');
  });

  it('creates a new character web with trimmed summaries and refreshes the page state', async () => {
    const webs: Array<Record<string, unknown>> = [];
    let createBody: Record<string, unknown> | null = null;

    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      if (url.includes('/character-webs/api/create')) {
        const body = JSON.parse(init?.body as string) as {
          name: string;
          sourceConceptId: string;
          userNotes?: string;
        };
        createBody = {
          name: body.name,
          sourceConceptId: body.sourceConceptId,
          userNotes: body.userNotes,
        };

        const web = {
          id: 'web-2',
          name: body.name,
          createdAt: '2026-03-09T12:00:00.000Z',
          updatedAt: '2026-03-09T12:00:00.000Z',
          sourceConceptId: body.sourceConceptId,
          protagonistName: '',
          assignments: [],
          relationshipArchetypes: [],
          castDynamicsSummary: '',
          inputs: { userNotes: body.userNotes },
        };
        webs.splice(0, webs.length, web);
        return Promise.resolve(mockJsonResponse({ success: true, web }, 201));
      }

      if (url.includes('/character-webs/api/list')) {
        return Promise.resolve(mockJsonResponse({ success: true, webs }));
      }

      if (url.includes('/character-webs/api/web-2')) {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            web: webs[0],
            characters: [],
          })
        );
      }

      if (url.includes('/kernels/api/list')) {
        return Promise.resolve(mockJsonResponse({ success: true, kernels: [] }));
      }

      if (url.includes('/concepts/api/list')) {
        return Promise.resolve(mockJsonResponse({ success: true, concepts: [] }));
      }

      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    }) as jest.Mock;

    document.body.innerHTML = buildCharacterWebsPageHtml();
    loadAppAndInit();
    await flushClientWork();

    (document.getElementById('character-web-name') as HTMLInputElement).value = '  Court of Ash  ';
    const conceptSelector = document.getElementById('character-web-concept-selector') as HTMLSelectElement;
    const option = document.createElement('option');
    option.value = 'concept-1';
    option.textContent = 'Test Concept';
    conceptSelector.appendChild(option);
    conceptSelector.value = 'concept-1';
    (document.getElementById('character-web-user-notes') as HTMLTextAreaElement).value =
      '  Keep the alliances venomous.  ';

    (document.getElementById('character-web-create-btn') as HTMLButtonElement).click();
    await flushClientWork();

    expect(createBody).toEqual({
      name: 'Court of Ash',
      sourceConceptId: 'concept-1',
      userNotes: 'Keep the alliances venomous.',
    });
    expect(document.getElementById('selected-character-web-name')?.textContent).toBe(
      'Court of Ash'
    );
  });

  it('initializes a character and generates the first stage with the stored API key', async () => {
    const assignment = {
      characterName: 'Iria Vale',
      isProtagonist: true,
      storyFunction: 'CATALYST',
      characterDepth: 'ROUND',
      narrativeRole: 'A disgraced navigator.',
      conflictRelationship: 'Needs allies but distrusts them.',
    };
    const web = {
      id: 'web-1',
      name: 'Shattered Compass',
      createdAt: '2026-03-09T12:00:00.000Z',
      updatedAt: '2026-03-09T12:00:00.000Z',
      protagonistName: 'Iria Vale',
      assignments: [assignment],
      relationshipArchetypes: [],
      castDynamicsSummary: 'Trust corrodes every alliance.',
    };

    let character: Record<string, unknown> | null = null;
    let stageRequestBody: Record<string, unknown> | null = null;

    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      if (url.includes('/character-webs/api/list')) {
        return Promise.resolve(mockJsonResponse({ success: true, webs: [web] }));
      }

      if (url.includes('/character-webs/api/web-1/characters/init')) {
        character = {
          id: 'char-1',
          characterName: 'Iria Vale',
          createdAt: '2026-03-09T12:00:00.000Z',
          updatedAt: '2026-03-09T12:00:00.000Z',
          sourceWebId: 'web-1',
          sourceWebName: 'Shattered Compass',
          webContext: {
            assignment,
            protagonistName: 'Iria Vale',
            relationshipArchetypes: [],
            castDynamicsSummary: 'Trust corrodes every alliance.',
          },
          characterKernel: null,
          tridimensionalProfile: null,
          agencyModel: null,
          deepRelationships: null,
          textualPresentation: null,
          completedStages: [],
        };
        return Promise.resolve(mockJsonResponse({ success: true, character }, 201));
      }

      if (url.includes('/character-webs/api/characters/char-1/generate')) {
        const body = JSON.parse(init?.body as string) as Record<string, unknown>;
        stageRequestBody = body;
        character = {
          ...character,
          updatedAt: '2026-03-09T12:05:00.000Z',
          characterKernel: {
            characterName: 'Iria Vale',
            superObjective: 'Recover the vanished map.',
            immediateObjectives: ['Survive the mutiny'],
            primaryOpposition: 'Captain Mara Voss',
            stakes: ['Lose the crew'],
            constraints: ['No safe harbor'],
            pressurePoint: 'She cannot ask for help without surrendering authority.',
          },
          completedStages: [1],
          lastStageBody: body,
        };
        return Promise.resolve(mockJsonResponse({ success: true, character }));
      }

      if (url.includes('/character-webs/api/characters/char-1')) {
        return Promise.resolve(mockJsonResponse({ success: true, character }));
      }

      if (url.includes('/character-webs/api/web-1')) {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            web,
            characters: character ? [character] : [],
          })
        );
      }

      if (url.includes('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      if (url.includes('/kernels/api/list')) {
        return Promise.resolve(mockJsonResponse({ success: true, kernels: [] }));
      }

      if (url.includes('/concepts/api/list')) {
        return Promise.resolve(mockJsonResponse({ success: true, concepts: [] }));
      }

      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    }) as jest.Mock;

    document.body.innerHTML = buildCharacterWebsPageHtml();
    loadAppAndInit();
    await flushClientWork();

    // Explicitly open the web (no auto-select on page load)
    (document.querySelector('.character-web-select-btn') as HTMLButtonElement).click();
    await flushClientWork();

    (document.getElementById('character-webs-api-key') as HTMLInputElement).value =
      'sk-or-valid-key-12345';

    (document.querySelector('.character-init-btn') as HTMLButtonElement).click();
    await flushClientWork();

    expect(document.getElementById('selected-character-name')?.textContent).toBe('Iria Vale');

    (document.querySelector('.character-stage-btn') as HTMLButtonElement).click();
    await flushClientWork();

    expect(stageRequestBody).toEqual({
      stage: 1,
      apiKey: 'sk-or-valid-key-12345',
      progressId: 'character-web-progress-id',
    });
    expect(document.getElementById('selected-character-status')?.textContent).toContain('1/5');
    expect(document.getElementById('character-stage-list')?.textContent).toContain(
      'Recover the vanished map.'
    );
  });
});
