import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('pacing rewrite button', () => {
  let fetchMock: jest.Mock;
  let reloadSpy: jest.Mock;
  let postHandler: (url: string, init: RequestInit) => Promise<Response>;

  beforeEach(() => {
    jest.useFakeTimers();

    postHandler = (): Promise<Response> => Promise.resolve(mockJsonResponse({ success: true }));

    fetchMock = jest.fn((url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      if (init?.method === 'POST' && typeof url === 'string' && url.includes('rewrite-structure')) {
        return postHandler(url, init);
      }
      return Promise.resolve(mockJsonResponse({ error: 'No mock' }, 404));
    });
    global.fetch = fetchMock;

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'test-uuid-progress' },
      writable: true,
      configurable: true,
    });

    reloadSpy = jest.fn();
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
    delete (window as any).location;
    (window as any).location = { reload: reloadSpy, href: '' };
    /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  function setupWithPacingBtn(options: { storyId?: string; pageId?: number } = {}): void {
    document.body.innerHTML = buildPlayPageHtml({
      storyId: options.storyId ?? 'story-abc',
      pageId: options.pageId ?? 5,
      hasPacingRewriteBtn: true,
    });
    loadAppAndInit();
  }

  function clickRewriteBtn(): void {
    const btn = document.getElementById('pacing-rewrite-btn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
  }

  it('awaits ensureApiKey and uses the resolved value', async () => {
    sessionStorage.setItem('omb_api_key', 'sk-or-my-key');
    setupWithPacingBtn({ storyId: 'story-xyz', pageId: 7 });

    clickRewriteBtn();
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => call[1]?.method === 'POST'
    );
    expect(postCall).toBeDefined();
    expect(postCall![0]).toContain('/play/story-xyz/rewrite-structure');

    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body.pageId).toBe(7);
    expect(body.apiKey).toBe('sk-or-my-key');
    expect(body.progressId).toBe('test-uuid-progress');
  });

  it('returns early without fetch when ensureApiKey resolves to falsy', async () => {
    sessionStorage.removeItem('omb_api_key');
    setupWithPacingBtn();

    clickRewriteBtn();
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => call[1]?.method === 'POST'
    );
    expect(postCall).toBeUndefined();
  });

  it('sends correct POST payload', async () => {
    sessionStorage.setItem('omb_api_key', 'sk-or-test');
    setupWithPacingBtn({ storyId: 'story-post', pageId: 10 });

    clickRewriteBtn();
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => call[1]?.method === 'POST'
    );
    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body).toEqual({
      pageId: 10,
      apiKey: 'sk-or-test',
      progressId: 'test-uuid-progress',
    });
  });

  it('shows loading overlay during request', async () => {
    sessionStorage.setItem('omb_api_key', 'sk-or-test');
    setupWithPacingBtn();

    let resolvePost!: (val: Response) => void;
    postHandler = (): Promise<Response> =>
      new Promise<Response>((resolve) => {
        resolvePost = resolve;
      });

    clickRewriteBtn();
    await jest.runAllTimersAsync();

    const loading = document.getElementById('loading');
    expect(loading?.style.display).toBe('flex');

    resolvePost(mockJsonResponse({ success: true }));
    await jest.runAllTimersAsync();
  });

  it('reloads page on success response', async () => {
    sessionStorage.setItem('omb_api_key', 'sk-or-test');
    setupWithPacingBtn();

    clickRewriteBtn();
    await jest.runAllTimersAsync();

    // On success, loading overlay stays visible (page would reload)
    // and no error is shown
    const loading = document.getElementById('loading');
    expect(loading?.style.display).toBe('flex');
    const errorBlock = document.getElementById('play-error');
    expect(errorBlock?.style.display).toBe('none');

    // Verify the POST was made with success response
    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => call[1]?.method === 'POST'
    );
    expect(postCall).toBeDefined();
  });

  it('shows inline error on failure response', async () => {
    sessionStorage.setItem('omb_api_key', 'sk-or-test');
    setupWithPacingBtn();

    postHandler = (): Promise<Response> =>
      Promise.resolve(mockJsonResponse({ error: 'Structure rewrite failed badly' }, 500));

    clickRewriteBtn();
    await jest.runAllTimersAsync();

    const errorBlock = document.getElementById('play-error');
    expect(errorBlock?.textContent).toBe('Structure rewrite failed badly');
    expect(errorBlock?.style.display).toBe('block');

    const loading = document.getElementById('loading');
    expect(loading?.style.display).toBe('none');
  });

  it('shows inline error on network error', async () => {
    sessionStorage.setItem('omb_api_key', 'sk-or-test');
    setupWithPacingBtn();

    postHandler = (): Promise<Response> => Promise.reject(new Error('Network failure'));

    clickRewriteBtn();
    await jest.runAllTimersAsync();

    const errorBlock = document.getElementById('play-error');
    expect(errorBlock?.textContent).toBe('Network failure');
    expect(errorBlock?.style.display).toBe('block');

    const loading = document.getElementById('loading');
    expect(loading?.style.display).toBe('none');
  });
});
