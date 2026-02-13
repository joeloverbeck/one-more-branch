import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('custom choice input', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(mockJsonResponse({ error: 'No mock configured' }, 500))
      );
    global.fetch = fetchMock;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'custom-choice-uuid' },
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

  function setupPage(options = {}): void {
    document.body.innerHTML = buildPlayPageHtml(options);
    loadAppAndInit();
  }

  function getCustomInput(): HTMLInputElement {
    return document.querySelector('.custom-choice-input') as HTMLInputElement;
  }

  function getAddButton(): HTMLButtonElement {
    return document.querySelector('.custom-choice-btn') as HTMLButtonElement;
  }

  function mockCustomChoiceResponse(responseBody: unknown, status = 200): void {
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('custom-choice')) {
        return Promise.resolve(mockJsonResponse(responseBody, status));
      }
      // Progress polling and other calls
      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    });
  }

  it('POSTs custom choice on button click', async () => {
    setupPage({ storyId: 'story-custom', pageId: 3 });

    const input = getCustomInput();
    input.value = 'Run away screaming';

    mockCustomChoiceResponse({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        {
          text: 'Run away screaming',
          choiceType: 'AVOIDANCE_RETREAT',
          primaryDelta: 'LOCATION_CHANGE',
        },
      ],
    });

    getAddButton().click();
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('custom-choice')
    );
    expect(postCall).toBeDefined();

    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body.pageId).toBe(3);
    expect(body.choiceText).toBe('Run away screaming');
    expect(body.choiceType).toBe('TACTICAL_APPROACH');
    expect(body.primaryDelta).toBe('LOCATION_CHANGE');
  });

  it('POSTs custom choice on Enter key', async () => {
    setupPage({ storyId: 'story-enter', pageId: 1 });

    const input = getCustomInput();
    input.value = 'Negotiate peacefully';

    mockCustomChoiceResponse({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        {
          text: 'Negotiate peacefully',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'RELATIONSHIP_CHANGE',
        },
      ],
    });

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('custom-choice')
    );
    expect(postCall).toBeDefined();
  });

  it('rebuilds choices section on success', async () => {
    setupPage();

    const input = getCustomInput();
    input.value = 'New choice';

    mockCustomChoiceResponse({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT' },
        { text: 'New choice', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      ],
    });

    getAddButton().click();
    await jest.runAllTimersAsync();

    const choiceButtons = document.querySelectorAll('.choice-btn');
    expect(choiceButtons.length).toBe(3);

    const lastChoice = choiceButtons[2];
    expect(lastChoice.querySelector('.choice-text')?.textContent).toBe('New choice');
  });

  it('shows error in play error block on failure', async () => {
    setupPage();

    const input = getCustomInput();
    input.value = 'Bad choice';

    mockCustomChoiceResponse({ error: 'Too many custom choices' }, 400);

    getAddButton().click();
    await jest.runAllTimersAsync();

    const errorBlock = document.getElementById('play-error');
    expect(errorBlock?.textContent).toBe('Too many custom choices');
    expect(errorBlock?.style.display).toBe('block');
  });

  it('re-enables button and input on failure', async () => {
    setupPage();

    const input = getCustomInput();
    input.value = 'Bad choice';

    mockCustomChoiceResponse({ error: 'Error' }, 500);

    getAddButton().click();
    await jest.runAllTimersAsync();

    expect(getAddButton().disabled).toBe(false);
    expect(getCustomInput().disabled).toBe(false);
  });

  it('ignores empty input', async () => {
    setupPage();

    const input = getCustomInput();
    input.value = '   ';

    getAddButton().click();
    await jest.runAllTimersAsync();

    // No fetch call should have been made to custom-choice endpoint
    const customChoiceCalls = fetchMock.mock.calls.filter(
      (call: [string]) => typeof call[0] === 'string' && call[0].includes('custom-choice')
    );
    expect(customChoiceCalls.length).toBe(0);
  });

  it('uses selected choice type and primary delta from dropdowns', async () => {
    setupPage();

    const input = getCustomInput();
    input.value = 'Custom action';

    // Change the select values
    const typeSelect = document.querySelector('.custom-choice-type') as HTMLSelectElement;
    const deltaSelect = document.querySelector('.custom-choice-delta') as HTMLSelectElement;
    typeSelect.value = 'MORAL_DILEMMA';
    deltaSelect.value = 'GOAL_SHIFT';

    mockCustomChoiceResponse({
      choices: [{ text: 'Custom action', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT' }],
    });

    getAddButton().click();
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('custom-choice')
    );
    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body.choiceType).toBe('MORAL_DILEMMA');
    expect(body.primaryDelta).toBe('GOAL_SHIFT');
  });
});
