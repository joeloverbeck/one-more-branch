import { buildBriefingPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('briefing begin adventure', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'briefing-progress-uuid' },
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

  function setupPage(): void {
    document.body.innerHTML = buildBriefingPageHtml({ storyId: 'briefing-story-1' });
    loadAppAndInit();
  }

  const mockSceneOptions = [
    {
      scenePurpose: 'EXPOSITION',
      valuePolarityShift: 'NEGATIVE_TO_POSITIVE',
      pacingMode: 'BUILDING_SLOW',
      sceneDirection: 'The hero awakens in a dark forest.',
      dramaticJustification: 'Establishes the mysterious setting.',
    },
    {
      scenePurpose: 'INCITING_INCIDENT',
      valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
      pacingMode: 'ACCELERATING',
      sceneDirection: 'A stranger arrives with urgent news.',
      dramaticJustification: 'Disrupts the status quo.',
    },
  ];

  it('POSTs begin request through ideation flow with progress id and scene direction', async () => {
    setupPage();
    sessionStorage.setItem('omb_api_key', 'sk-or-valid-test-key-12345');

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      if (typeof url === 'string' && url.includes('/ideate-scene')) {
        return Promise.resolve(
          mockJsonResponse({ success: true, options: mockSceneOptions })
        );
      }
      if (typeof url === 'string' && url.includes('/begin')) {
        return Promise.resolve(mockJsonResponse({ success: true, storyId: 'briefing-story-1' }));
      }
      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    });

    // Step 1: Click "Begin Adventure" - triggers ensureApiKey -> startIdeation -> fetch ideate-scene
    const beginBtn = document.getElementById('begin-adventure-btn') as HTMLButtonElement;
    beginBtn.click();
    await jest.runAllTimersAsync();

    // Verify ideation fetch was called
    const ideationCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('/ideate-scene')
    );
    expect(ideationCall).toBeDefined();

    // Step 2: Ideation UI should be rendered - select a direction card
    const directionCard = document.querySelector('.scene-direction-card') as HTMLElement;
    expect(directionCard).not.toBeNull();
    directionCard.click();

    // Step 3: Click "Confirm Direction" to proceed to beginAdventure
    const confirmBtn = document.querySelector('.scene-ideation-confirm') as HTMLButtonElement;
    expect(confirmBtn).not.toBeNull();
    confirmBtn.click();
    await jest.runAllTimersAsync();

    // Step 4: Verify the POST to /begin was made with correct data
    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('/play/briefing-story-1/begin')
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body.apiKey).toBe('sk-or-valid-test-key-12345');
    expect(body.progressId).toBe('briefing-progress-uuid');
    expect(body.selectedSceneDirection).toBeDefined();
    expect((body.selectedSceneDirection as Record<string, unknown>).scenePurpose).toBe(
      'EXPOSITION'
    );
  });
});
