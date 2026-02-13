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

  it('POSTs begin request and includes progress id', async () => {
    setupPage();
    sessionStorage.setItem('omb_api_key', 'sk-or-valid-test-key-12345');

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      if (typeof url === 'string' && url.includes('/begin')) {
        return Promise.resolve(mockJsonResponse({ success: true, storyId: 'briefing-story-1' }));
      }
      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    });

    const beginBtn = document.getElementById('begin-adventure-btn') as HTMLButtonElement;
    beginBtn.click();
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('/play/briefing-story-1/begin')
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body.apiKey).toBe('sk-or-valid-test-key-12345');
    expect(body.progressId).toBe('briefing-progress-uuid');
  });
});
