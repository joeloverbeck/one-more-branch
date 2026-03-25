import { loadAppAndInit } from '../helpers/app-loader';

describe('characters page controller', () => {
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
      <main class="container" id="characters-page">
        <div id="characters-error" class="alert alert-error" style="display: none;" role="alert"></div>
        <input type="password" id="characters-api-key" />
        <input type="text" id="character-name-input" />
        <textarea id="character-desc-input"></textarea>
        <button type="button" id="character-decompose-btn">Decompose</button>
        <div id="character-list"></div>
        <section id="character-detail-section" style="display: none;">
          <h2 id="selected-character-name"></h2>
          <div id="character-detail-content"></div>
          <button type="button" id="character-delete-btn">Delete</button>
        </section>
        <div id="loading" style="display: none;">
          <div class="loading-stage"></div>
          <p class="loading-status">Working...</p>
        </div>
      </main>
    `;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'character-decompose-progress-id' },
      writable: true,
      configurable: true,
    });
    sessionStorage.clear();
    document.body.innerHTML = getPageHtml();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('shows the loading overlay during decomposition and restores the button after success', async () => {
    const decomposeDeferred = createDeferredResponse();
    let decomposeBody: Record<string, unknown> | null = null;

    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      if (url === '/characters/decompose') {
        decomposeBody = JSON.parse(init?.body as string) as Record<string, unknown>;
        return decomposeDeferred.promise;
      }
      if (url === '/characters/api/list') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            characters: [
              {
                id: 'char-1',
                name: 'Iria Vale',
                coreTraits: ['stubborn'],
                createdAt: '2026-03-09T12:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/characters/api/char-1') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            character: {
              id: 'char-1',
              name: 'Iria Vale',
              appearance: 'Weathered navigator',
              coreTraits: ['stubborn'],
              emotionSalience: 'HIGH',
              speechFingerprint: {},
              stressVariants: {},
              focalizationFilter: {},
              createdAt: '2026-03-09T12:00:00.000Z',
            },
          })
        );
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false));
    }) as jest.Mock;

    loadAppAndInit();

    const apiKeyInput = document.getElementById('characters-api-key') as HTMLInputElement;
    const nameInput = document.getElementById('character-name-input') as HTMLInputElement;
    const descInput = document.getElementById('character-desc-input') as HTMLTextAreaElement;
    const decomposeBtn = document.getElementById('character-decompose-btn') as HTMLButtonElement;
    const loading = document.getElementById('loading') as HTMLDivElement;

    apiKeyInput.value = 'sk-or-valid-key-12345';
    nameInput.value = 'Iria Vale';
    descInput.value = 'A disgraced navigator trying to survive a mutiny.';

    decomposeBtn.click();

    expect(loading.style.display).toBe('flex');
    expect(decomposeBtn.disabled).toBe(true);

    decomposeDeferred.resolve(
      mockJsonResponse({
        success: true,
        character: {
          id: 'char-1',
        },
      })
    );
    await settleAsyncWork();

    expect(decomposeBody).toEqual({
      characterName: 'Iria Vale',
      characterDescription: 'A disgraced navigator trying to survive a mutiny.',
      apiKey: 'sk-or-valid-key-12345',
      progressId: 'character-decompose-progress-id',
    });
    expect(loading.style.display).toBe('none');
    expect(decomposeBtn.disabled).toBe(false);
    expect(nameInput.value).toBe('');
    expect(descInput.value).toBe('');
    expect(document.getElementById('character-list')?.textContent).toContain('Iria Vale');
  });

  it('hides the loading overlay and re-enables the button after decomposition failure', async () => {
    const decomposeDeferred = createDeferredResponse();

    global.fetch = jest.fn((url: string) => {
      if (url === '/characters/decompose') {
        return decomposeDeferred.promise;
      }
      if (url === '/characters/api/list') {
        return Promise.resolve(mockJsonResponse({ success: true, characters: [] }));
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'failed' }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false));
    }) as jest.Mock;

    loadAppAndInit();

    const apiKeyInput = document.getElementById('characters-api-key') as HTMLInputElement;
    const nameInput = document.getElementById('character-name-input') as HTMLInputElement;
    const descInput = document.getElementById('character-desc-input') as HTMLTextAreaElement;
    const decomposeBtn = document.getElementById('character-decompose-btn') as HTMLButtonElement;
    const loading = document.getElementById('loading') as HTMLDivElement;
    const errorEl = document.getElementById('characters-error') as HTMLDivElement;

    apiKeyInput.value = 'sk-or-valid-key-12345';
    nameInput.value = 'Iria Vale';
    descInput.value = 'A disgraced navigator trying to survive a mutiny.';

    decomposeBtn.click();

    expect(loading.style.display).toBe('flex');
    expect(decomposeBtn.disabled).toBe(true);

    decomposeDeferred.resolve(
      mockJsonResponse({ success: false, error: 'Decomposition failed hard' }, false, 500)
    );
    await settleAsyncWork();

    expect(loading.style.display).toBe('none');
    expect(decomposeBtn.disabled).toBe(false);
    expect(errorEl.textContent).toContain('Decomposition failed hard');
    expect(errorEl.style.display).toBe('block');
  });
});
