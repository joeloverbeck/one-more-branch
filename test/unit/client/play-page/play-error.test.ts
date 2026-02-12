import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('showPlayError and clearPlayError', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(mockJsonResponse({ error: 'No mock' }, 500));
    });
    global.fetch = fetchMock;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'error-test-uuid' },
      writable: true,
      configurable: true,
    });

    sessionStorage.setItem('omb_api_key', 'sk-or-test-key-valid');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('shows error in existing play-error block', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    // The fixture includes a #play-error block
    const errorBlock = document.getElementById('play-error');
    expect(errorBlock).not.toBeNull();
    expect(errorBlock!.style.display).toBe('none');

    // Trigger an error via custom choice failure
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('custom-choice')) {
        return Promise.resolve(mockJsonResponse({ error: 'Custom error message' }, 400));
      }
      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    });

    const input = document.querySelector('.custom-choice-input') as HTMLInputElement;
    input.value = 'Bad choice';
    (document.querySelector('.custom-choice-btn') as HTMLButtonElement).click();
    await jest.runAllTimersAsync();

    expect(errorBlock!.textContent).toBe('Custom error message');
    expect(errorBlock!.style.display).toBe('block');
  });

  it('creates error block dynamically when missing', async () => {
    document.body.innerHTML = buildPlayPageHtml({ hasCustomChoiceInput: false });
    loadAppAndInit();

    // No #play-error block in the DOM initially (no custom choice input)
    expect(document.getElementById('play-error')).toBeNull();

    // Trigger an error via choice click failure
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(mockJsonResponse({ error: 'Server error' }, 500));
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.runAllTimersAsync();

    const errorBlock = document.getElementById('play-error');
    expect(errorBlock).not.toBeNull();
    expect(errorBlock!.textContent).toBe('Server error');
    expect(errorBlock!.style.display).toBe('block');
  });

  it('clears error before making a new choice', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    // First: trigger an error
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('custom-choice')) {
        return Promise.resolve(mockJsonResponse({ error: 'First error' }, 400));
      }
      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    });

    const input = document.querySelector('.custom-choice-input') as HTMLInputElement;
    input.value = 'Bad';
    (document.querySelector('.custom-choice-btn') as HTMLButtonElement).click();
    await jest.runAllTimersAsync();

    const errorBlock = document.getElementById('play-error');
    expect(errorBlock!.style.display).toBe('block');

    // Second: trigger a successful custom choice (clearPlayError runs before fetch)
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('custom-choice')) {
        return Promise.resolve(
          mockJsonResponse({
            choices: [
              { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
            ],
          })
        );
      }
      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    });

    const input2 = document.querySelector('.custom-choice-input') as HTMLInputElement;
    input2.value = 'Good';
    (document.querySelector('.custom-choice-btn') as HTMLButtonElement).click();
    await jest.runAllTimersAsync();

    // Error block should be cleared (rebuild removes it, new one starts hidden)
    const newErrorBlock = document.getElementById('play-error');
    expect(newErrorBlock!.style.display).toBe('none');
  });

  it('clears error before choice click', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    // First: trigger a custom choice error
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('custom-choice')) {
        return Promise.resolve(mockJsonResponse({ error: 'Some error' }, 400));
      }
      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    });

    const customInput = document.querySelector('.custom-choice-input') as HTMLInputElement;
    customInput.value = 'Bad';
    (document.querySelector('.custom-choice-btn') as HTMLButtonElement).click();
    await jest.runAllTimersAsync();

    expect(document.getElementById('play-error')!.style.display).toBe('block');

    // Second: click a regular choice (successful)
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(
        mockJsonResponse({
          page: {
            id: 2,
            narrativeText: 'Next page.',
            choices: [
              { text: 'Continue', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
            ],
            isEnding: false,
            openThreads: [],
            stateChanges: [],
          },
          wasGenerated: true,
          actDisplayInfo: null,
          deviationInfo: null,
        })
      );
    });

    const choiceBtn = document.querySelector('.choice-btn') as HTMLButtonElement;
    choiceBtn.click();
    await jest.runAllTimersAsync();

    // Error should be cleared (rebuild creates fresh error block hidden)
    const errorBlock = document.getElementById('play-error');
    expect(errorBlock!.style.display).toBe('none');
  });
});
