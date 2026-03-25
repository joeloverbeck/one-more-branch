import { buildCreateStoryPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';

describe('create-story page controller', () => {
  let fetchMock: jest.Mock;

  function mockJsonResponse(body: unknown, ok = true): Response {
    return {
      ok,
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Response;
  }

  function flushPromises(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function getUrl(input: RequestInfo | URL): string {
    return typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  }

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    sessionStorage.clear();
    document.body.innerHTML = buildCreateStoryPageHtml();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('shows create-story errors inline with alert semantics', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = getUrl(input);
      if (url === '/create-story/api/create') {
        return Promise.resolve(mockJsonResponse({ success: false, error: 'Pipeline exploded' }, false));
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'failed' }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false));
    });

    loadAppAndInit();

    const spineSelect = document.getElementById('createStorySpineId') as HTMLSelectElement;
    const titleInput = document.getElementById('createStoryTitle') as HTMLInputElement;
    const apiKeyInput = document.getElementById('createStoryApiKey') as HTMLInputElement;
    const createBtn = document.getElementById('create-story-btn') as HTMLButtonElement;
    const errorEl = document.getElementById('create-story-error') as HTMLDivElement;

    spineSelect.value = 'spine-1';
    spineSelect.dispatchEvent(new Event('change'));
    titleInput.value = 'Storm of Ash';
    titleInput.dispatchEvent(new Event('input'));
    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));

    expect(createBtn.disabled).toBe(false);
    createBtn.click();

    await flushPromises();
    await flushPromises();

    expect(errorEl.textContent).toBe('Pipeline exploded');
    expect(errorEl.style.display).toBe('block');
    expect(errorEl.getAttribute('role')).toBe('alert');
    expect(errorEl.getAttribute('aria-live')).toBe('polite');
  });
});
