import { loadAppAndInit } from '../helpers/app-loader';

describe('character-brainstormer page controller', () => {
  let fetchMock: jest.Mock;

  function mockJsonResponse(body: unknown, ok = true, status = 200): Response {
    return {
      ok,
      status,
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Response;
  }

  function flushPromises(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
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
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    sessionStorage.clear();
    document.body.innerHTML = getPageHtml();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('shows brainstorm generation failures inline instead of relying on controller-local DOM code', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = getUrl(input);
      if (url === '/character-brainstormer/api/generate') {
        return Promise.resolve(
          mockJsonResponse({ success: false, error: 'Character generator failed' }, false, 500)
        );
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

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    conceptSelector.value = 'concept-1';
    conceptSelector.dispatchEvent(new Event('change'));
    worldbuildingSelector.value = 'world-1';
    worldbuildingSelector.dispatchEvent(new Event('change'));

    expect(generateBtn.disabled).toBe(false);
    generateBtn.click();

    await flushPromises();
    await flushPromises();

    expect(errorEl.textContent).toBe('Character generator failed');
    expect(errorEl.style.display).toBe('block');
    expect(errorEl.getAttribute('role')).toBe('alert');
  });
});
