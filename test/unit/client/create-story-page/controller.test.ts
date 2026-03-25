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

  function getUrl(input: RequestInfo | URL): string {
    return typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  }

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'progress-test-uuid' },
      writable: true,
      configurable: true,
    });
    sessionStorage.clear();
    document.body.innerHTML = buildCreateStoryPageHtml();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('shows the overlay during creation, includes a progress id, and cleans up on success', async () => {
    const createDeferred = createDeferredResponse();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = getUrl(input);
      if (url === '/create-story/api/create') {
        return createDeferred.promise;
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false));
    });

    loadAppAndInit();

    const spineSelect = document.getElementById('createStorySpineId') as HTMLSelectElement;
    const titleInput = document.getElementById('createStoryTitle') as HTMLInputElement;
    const apiKeyInput = document.getElementById('createStoryApiKey') as HTMLInputElement;
    const createBtn = document.getElementById('create-story-btn') as HTMLButtonElement;
    const progressSection = document.getElementById('create-story-progress-section') as HTMLElement;

    spineSelect.value = 'spine-1';
    spineSelect.dispatchEvent(new Event('change'));
    titleInput.value = 'Storm of Ash';
    titleInput.dispatchEvent(new Event('input'));
    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));

    createBtn.click();

    expect(progressSection.style.display).toBe('flex');
    expect(createBtn.disabled).toBe(true);

    createDeferred.resolve(mockJsonResponse({ success: true, storyId: 'story-42' }));

    await flushPromises();
    await flushPromises();

    const createCall = fetchMock.mock.calls.find(
      (call: [RequestInfo | URL]) => getUrl(call[0]) === '/create-story/api/create'
    ) as [RequestInfo | URL, RequestInit];
    const requestBody = JSON.parse(createCall[1].body as string) as {
      spineId: string;
      title: string;
      progressId: string;
    };

    expect(requestBody.spineId).toBe('spine-1');
    expect(requestBody.title).toBe('Storm of Ash');
    expect(requestBody.progressId).toBe('progress-test-uuid');
    expect(progressSection.style.display).toBe('none');
    expect(createBtn.disabled).toBe(false);
    expect((document.getElementById('create-story-error') as HTMLDivElement).style.display).toBe(
      'none'
    );
  });

  it('shows create-story errors inline and still cleans up the overlay after failure', async () => {
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
    expect((document.getElementById('create-story-progress-section') as HTMLElement).style.display).toBe(
      'none'
    );
    expect(createBtn.disabled).toBe(false);
  });
});
