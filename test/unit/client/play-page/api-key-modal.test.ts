import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('API key modal', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();
    jest.spyOn(window, 'alert').mockImplementation(() => {});

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'modal-test-uuid' },
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
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();
  }

  function makeSuccessResponse(): Response {
    return mockJsonResponse({
      page: {
        id: 2,
        narrativeText: 'Next page.',
        choices: [
          { text: 'Continue', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        ],
        isEnding: false,
        openThreads: [],
        openThreadOverflowSummary: null,
        stateChanges: [],
      },
      wasGenerated: true,
      actDisplayInfo: null,
      deviationInfo: null,
    });
  }

  it('shows modal when no API key in sessionStorage', async () => {
    sessionStorage.clear();
    setupPage();

    // No fetch mocks needed - handler suspends at ensureApiKey() waiting for form submit
    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();

    await jest.advanceTimersByTimeAsync(0);

    const modal = document.getElementById('api-key-modal');
    expect(modal?.style.display).toBe('flex');
  });

  it('does not show modal when API key exists in sessionStorage', async () => {
    sessionStorage.setItem('omb_api_key', 'sk-or-existing-key');
    setupPage();

    // Need to handle both progress poll and POST
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(makeSuccessResponse());
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.runAllTimersAsync();

    const modal = document.getElementById('api-key-modal');
    expect(modal?.style.display).toBe('none');
  });

  it('stores valid API key and hides modal on submit', async () => {
    sessionStorage.clear();
    setupPage();

    // Set up fetch for after the key is provided
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(makeSuccessResponse());
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    // Modal should be visible
    const modal = document.getElementById('api-key-modal');
    expect(modal?.style.display).toBe('flex');

    // Fill in key and submit
    const keyInput = document.getElementById('modal-api-key') as HTMLInputElement;
    keyInput.value = 'sk-or-new-valid-key-1234567890';

    const form = document.getElementById('api-key-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await jest.runAllTimersAsync();

    expect(sessionStorage.getItem('omb_api_key')).toBe('sk-or-new-valid-key-1234567890');
    expect(modal?.style.display).toBe('none');
  });

  it('shows alert for short API key', async () => {
    sessionStorage.clear();
    setupPage();

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const keyInput = document.getElementById('modal-api-key') as HTMLInputElement;
    keyInput.value = 'short';

    const form = document.getElementById('api-key-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await jest.advanceTimersByTimeAsync(0);

    expect(window.alert).toHaveBeenCalledWith('Please enter a valid API key');

    // Modal should still be visible
    const modal = document.getElementById('api-key-modal');
    expect(modal?.style.display).toBe('flex');
  });

  it('does not show modal for explored choices even without stored key', async () => {
    sessionStorage.clear();
    document.body.innerHTML = buildPlayPageHtml({
      choices: [
        {
          text: 'Explored path',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
          nextPageId: 5,
        },
      ],
    });
    loadAppAndInit();

    // Explored choices use getApiKey() directly (no await ensureApiKey)
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(makeSuccessResponse());
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.runAllTimersAsync();

    const modal = document.getElementById('api-key-modal');
    expect(modal?.style.display).toBe('none');
  });
});
