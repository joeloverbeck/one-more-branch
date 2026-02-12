import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('play page choice click handler', () => {
  let fetchMock: jest.Mock;
  let pushStateSpy: jest.SpyInstance;
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn();
    global.fetch = fetchMock;

    pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'test-uuid-1234' },
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

  function setupAndInit(options = {}): void {
    document.body.innerHTML = buildPlayPageHtml(options);
    loadAppAndInit();
  }

  function clickChoice(index: number): void {
    const button = document.querySelector(
      `.choice-btn[data-choice-index="${index}"]`
    ) as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
  }

  function makeSuccessfulChoiceResponse(overrides: Record<string, unknown> = {}) {
    return {
      page: {
        id: 2,
        narrativeText: 'You went left and found a cave.',
        choices: [
          { text: 'Enter the cave', choiceType: 'INVESTIGATION', primaryDelta: 'LOCATION_CHANGE' },
          { text: 'Walk away', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'GOAL_SHIFT' },
        ],
        isEnding: false,
        openThreads: [],
        openThreadOverflowSummary: null,
        stateChanges: ['Moved to cave entrance'],
      },
      wasGenerated: true,
      actDisplayInfo: { displayString: 'Act I - The Beginning' },
      deviationInfo: null,
      ...overrides,
    };
  }

  it('sends fetch with correct body on choice click', async () => {
    setupAndInit({ storyId: 'story-abc', pageId: 3 });

    // Progress polling + choice POST
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse(makeSuccessfulChoiceResponse()));

    clickChoice(0);
    await jest.runAllTimersAsync();

    // Find the POST call (not the progress poll)
    const postCall = fetchMock.mock.calls.find(
      (call: [string, RequestInit?]) => call[1]?.method === 'POST'
    );
    expect(postCall).toBeDefined();

    const body = JSON.parse(postCall![1]!.body as string);
    expect(body.pageId).toBe(3);
    expect(body.choiceIndex).toBe(0);
    expect(body.progressId).toBe('test-uuid-1234');
    expect(body.apiKey).toBe('sk-or-test-key-valid');
  });

  it('updates narrative DOM on successful choice', async () => {
    setupAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse(
          makeSuccessfulChoiceResponse({
            page: {
              id: 2,
              narrativeText: 'New story text here.',
              choices: [
                { text: 'Continue', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
              ],
              isEnding: false,
              openThreads: [],
              openThreadOverflowSummary: null,
              stateChanges: [],
            },
          })
        )
      );

    clickChoice(0);
    await jest.runAllTimersAsync();

    const narrative = document.getElementById('narrative');
    expect(narrative?.innerHTML).toContain('New story text here.');
  });

  it('updates page indicator and URL on successful choice', async () => {
    setupAndInit({ storyId: 'story-xyz', pageId: 1 });

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse(makeSuccessfulChoiceResponse()));

    clickChoice(0);
    await jest.runAllTimersAsync();

    const pageIndicator = document.querySelector('.page-indicator');
    expect(pageIndicator?.textContent).toBe('Page 2');

    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/play/story-xyz?page=2');
  });

  it('updates act indicator on successful choice with actDisplayInfo', async () => {
    setupAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse(
          makeSuccessfulChoiceResponse({
            actDisplayInfo: { displayString: 'Act II - Rising Action' },
          })
        )
      );

    clickChoice(0);
    await jest.runAllTimersAsync();

    const actIndicator = document.querySelector('.act-indicator');
    expect(actIndicator?.textContent).toBe('Act II - Rising Action');
  });

  it('hides loading overlay after fetch completes', async () => {
    setupAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse(makeSuccessfulChoiceResponse()));

    clickChoice(0);
    await jest.runAllTimersAsync();

    const loading = document.getElementById('loading');
    expect(loading?.style.display).toBe('none');
  });

  it('shows error message on failed response', async () => {
    setupAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse({ error: 'Server exploded' }, 500)
      );

    clickChoice(0);
    await jest.runAllTimersAsync();

    const errorBlock = document.getElementById('play-error');
    expect(errorBlock?.textContent).toBe('Server exploded');
    expect(errorBlock?.style.display).toBe('block');

    // Buttons should be re-enabled
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('renders ending banner when isEnding is true', async () => {
    setupAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse(
          makeSuccessfulChoiceResponse({
            page: {
              id: 5,
              narrativeText: 'The story ends here.',
              choices: [],
              isEnding: true,
              openThreads: [],
              openThreadOverflowSummary: null,
              stateChanges: [],
            },
          })
        )
      );

    clickChoice(0);
    await jest.runAllTimersAsync();

    const endingBanner = document.querySelector('.ending-banner');
    expect(endingBanner).not.toBeNull();
    expect(endingBanner?.innerHTML).toContain('THE END');
    expect(endingBanner?.innerHTML).toContain('Play Again');
  });

  it('does not show API key modal for explored choices', async () => {
    setupAndInit({
      choices: [
        { text: 'Explored path', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT', nextPageId: 5 },
        { text: 'New path', choiceType: 'MORAL_DILEMMA', primaryDelta: 'LOCATION_CHANGE' },
      ],
    });

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse(makeSuccessfulChoiceResponse()));

    clickChoice(0);
    await jest.runAllTimersAsync();

    const modal = document.getElementById('api-key-modal');
    expect(modal?.style.display).toBe('none');
  });

  it('includes suggestedProtagonistSpeech in body when provided', async () => {
    setupAndInit();

    const speechInput = document.querySelector(
      '.suggested-protagonist-speech-input'
    ) as HTMLInputElement;
    speechInput.value = 'I choose courage!';

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse(makeSuccessfulChoiceResponse()));

    clickChoice(0);
    await jest.runAllTimersAsync();

    const postCall = fetchMock.mock.calls.find(
      (call: [string, RequestInit?]) => call[1]?.method === 'POST'
    );
    const body = JSON.parse(postCall![1]!.body as string);
    expect(body.suggestedProtagonistSpeech).toBe('I choose courage!');
  });

  it('does not include suggestedProtagonistSpeech when empty', async () => {
    setupAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse(makeSuccessfulChoiceResponse()));

    clickChoice(0);
    await jest.runAllTimersAsync();

    const postCall = fetchMock.mock.calls.find(
      (call: [string, RequestInit?]) => call[1]?.method === 'POST'
    );
    const body = JSON.parse(postCall![1]!.body as string);
    expect(body.suggestedProtagonistSpeech).toBeUndefined();
  });

  it('clears suggested speech after generated response', async () => {
    setupAndInit();

    const speechInput = document.querySelector(
      '.suggested-protagonist-speech-input'
    ) as HTMLInputElement;
    speechInput.value = 'Something brave';

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse(makeSuccessfulChoiceResponse({ wasGenerated: true }))
      );

    clickChoice(0);
    await jest.runAllTimersAsync();

    // After a generated response, the speech input value in the rebuilt section should be empty
    const newSpeechInput = document.querySelector(
      '.suggested-protagonist-speech-input'
    ) as HTMLInputElement;
    expect(newSpeechInput?.value).toBe('');
  });

  it('renders state changes section on successful choice', async () => {
    setupAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse(
          makeSuccessfulChoiceResponse({
            page: {
              id: 2,
              narrativeText: 'Story text.',
              choices: [
                { text: 'Go on', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
              ],
              isEnding: false,
              openThreads: [],
              openThreadOverflowSummary: null,
              stateChanges: ['Gained a sword', 'Lost a friend'],
            },
          })
        )
      );

    clickChoice(0);
    await jest.runAllTimersAsync();

    const stateChanges = document.getElementById('state-changes');
    expect(stateChanges).not.toBeNull();
    expect(stateChanges?.innerHTML).toContain('Gained a sword');
    expect(stateChanges?.innerHTML).toContain('Lost a friend');
  });

  it('renders deviation banner when deviation info is present', async () => {
    setupAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse(
          makeSuccessfulChoiceResponse({
            deviationInfo: {
              detected: true,
              reason: 'The story took an unexpected turn.',
              beatsInvalidated: 3,
            },
          })
        )
      );

    clickChoice(0);
    await jest.runAllTimersAsync();

    const banner = document.getElementById('deviation-banner');
    expect(banner).not.toBeNull();
    expect(banner?.innerHTML).toContain('Story Path Shifted');
    expect(banner?.innerHTML).toContain('The story took an unexpected turn.');
    expect(banner?.innerHTML).toContain('3 story beats replanned');
  });
});
