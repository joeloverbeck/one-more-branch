import { loadAppAndInit } from '../helpers/app-loader';

describe('character-brainstormer page controller', () => {
  let fetchMock: jest.Mock;

  function createDeferredResponse(): {
    promise: Promise<Response>;
    resolve: (response: Response) => void;
  } {
    let resolveResponse: (response: Response) => void = () => {};
    const promise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });

    return {
      promise,
      resolve: resolveResponse,
    };
  }

  function mockJsonResponse(body: unknown, ok = true, status = 200): Response {
    return {
      ok,
      status,
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Response;
  }

  async function settleAsyncWork(): Promise<void> {
    await Promise.resolve();
    await jest.runAllTimersAsync();
    await Promise.resolve();
    await jest.runAllTimersAsync();
  }

  function getPageHtml(): string {
    return `
      <main class="container" id="character-brainstormer-page">
        <div
          class="alert alert-error"
          id="character-brainstormer-error"
          style="display: none;"
          role="alert"
        ></div>
        <form id="character-brainstormer-api-key-form">
          <input type="password" id="character-brainstormer-api-key">
        </form>
        <select id="character-brainstormer-concept-selector">
          <option value="">Select concept...</option>
          <option value="concept-1">Concept 1</option>
        </select>
        <select id="character-brainstormer-worldbuilding-selector">
          <option value="">Select worldbuilding...</option>
          <option value="world-1">World 1</option>
        </select>
        <textarea id="character-brainstormer-user-notes"></textarea>
        <button type="button" id="character-brainstormer-generate-btn" disabled>Brainstorm</button>
        <section id="character-brainstormer-results" style="display: none;">
          <p id="character-brainstormer-diversity-note"></p>
          <div id="character-brainstormer-cards"></div>
        </section>
        <button type="button" id="character-brainstormer-copy-all-btn">Copy All</button>
        <div id="loading" style="display: none;">
          <div class="loading-stage"></div>
          <p class="loading-status">Working...</p>
        </div>
      </main>
    `;
  }

  function getUrl(input: RequestInfo | URL): string {
    return typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    sessionStorage.clear();
    document.body.innerHTML = getPageHtml();
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'brainstorm-progress-id' },
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

  it('shows brainstorm generation failures inline and cleans up the loading session', async () => {
    const generateDeferred = createDeferredResponse();
    let generateBody: Record<string, unknown> | null = null;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = getUrl(input);
      if (url === '/character-brainstormer/api/generate') {
        generateBody = JSON.parse(init?.body as string) as Record<string, unknown>;
        return generateDeferred.promise;
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'failed' }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false));
    });

    loadAppAndInit();

    const apiKeyInput = document.getElementById(
      'character-brainstormer-api-key'
    ) as HTMLInputElement;
    const conceptSelector = document.getElementById(
      'character-brainstormer-concept-selector'
    ) as HTMLSelectElement;
    const worldbuildingSelector = document.getElementById(
      'character-brainstormer-worldbuilding-selector'
    ) as HTMLSelectElement;
    const generateBtn = document.getElementById(
      'character-brainstormer-generate-btn'
    ) as HTMLButtonElement;
    const errorEl = document.getElementById(
      'character-brainstormer-error'
    ) as HTMLDivElement;
    const loading = document.getElementById('loading') as HTMLDivElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    conceptSelector.value = 'concept-1';
    conceptSelector.dispatchEvent(new Event('change'));
    worldbuildingSelector.value = 'world-1';
    worldbuildingSelector.dispatchEvent(new Event('change'));

    expect(generateBtn.disabled).toBe(false);
    generateBtn.click();

    expect(loading.style.display).toBe('flex');
    expect(generateBtn.disabled).toBe(true);

    generateDeferred.resolve(
      mockJsonResponse({ success: false, error: 'Character generator failed' }, false, 500)
    );
    await settleAsyncWork();

    expect(generateBody).toEqual({
      conceptId: 'concept-1',
      worldbuildingId: 'world-1',
      userNotes: '',
      apiKey: 'sk-or-valid-test-key-12345',
      progressId: 'brainstorm-progress-id',
    });
    expect(errorEl.textContent).toBe('Character generator failed');
    expect(errorEl.style.display).toBe('block');
    expect(errorEl.getAttribute('role')).toBe('alert');
    expect(loading.style.display).toBe('none');
    expect(generateBtn.disabled).toBe(false);
  });

  it('shows the loading overlay during brainstorm generation and restores the form on success', async () => {
    const generateDeferred = createDeferredResponse();

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = getUrl(input);
      if (url === '/character-brainstormer/api/generate') {
        return generateDeferred.promise;
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false));
    });

    loadAppAndInit();

    const apiKeyInput = document.getElementById(
      'character-brainstormer-api-key'
    ) as HTMLInputElement;
    const conceptSelector = document.getElementById(
      'character-brainstormer-concept-selector'
    ) as HTMLSelectElement;
    const worldbuildingSelector = document.getElementById(
      'character-brainstormer-worldbuilding-selector'
    ) as HTMLSelectElement;
    const generateBtn = document.getElementById(
      'character-brainstormer-generate-btn'
    ) as HTMLButtonElement;
    const loading = document.getElementById('loading') as HTMLDivElement;
    const resultsSection = document.getElementById(
      'character-brainstormer-results'
    ) as HTMLDivElement;
    const cardsContainer = document.getElementById(
      'character-brainstormer-cards'
    ) as HTMLDivElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    conceptSelector.value = 'concept-1';
    conceptSelector.dispatchEvent(new Event('change'));
    worldbuildingSelector.value = 'world-1';
    worldbuildingSelector.dispatchEvent(new Event('change'));

    generateBtn.click();

    expect(loading.style.display).toBe('flex');
    expect(generateBtn.disabled).toBe(true);

    generateDeferred.resolve(
      mockJsonResponse({
        success: true,
        result: {
          diversityNote: 'Make the cast ideologically diverse.',
          characters: [
            {
              name: 'Mira',
              highConceptPitch: 'A navigator who lies to stay alive.',
              coreWound: 'Abandoned during a mutiny.',
              centralContradiction: 'Craves trust but hoards secrets.',
              archetypeAndSubversion: 'Reluctant hero turned manipulator.',
              suggestedStoryFunction: 'Catalyst',
              relationshipDynamicHint: 'Push-pull with the captain.',
              whatMakesThemMemorable: 'Maps routes by scars.',
              metaphorFamily: 'Broken compasses',
            },
          ],
        },
      })
    );
    await settleAsyncWork();

    expect(loading.style.display).toBe('none');
    expect(generateBtn.disabled).toBe(false);
    expect(resultsSection.style.display).toBe('block');
    expect(cardsContainer.textContent).toContain('Mira');
  });
});
