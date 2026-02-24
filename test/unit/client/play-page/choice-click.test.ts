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

  function makeSuccessfulChoiceResponse(
    overrides: Record<string, unknown> = {}
  ): Record<string, unknown> {
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
        activeThreats: [],
        threatsOverflowSummary: null,
        activeConstraints: [],
        constraintsOverflowSummary: null,
        trackedPromises: [],
        trackedPromisesOverflowSummary: null,
        inventory: [],
        inventoryOverflowSummary: null,
        health: [],
        healthOverflowSummary: null,
        protagonistAffect: null,
        analystResult: null,
        resolvedThreadMeta: {},
        resolvedPromiseMeta: {},
      },
      wasGenerated: true,
      actDisplayInfo: { displayString: 'Act I - The Beginning' },
      deviationInfo: null,
      ...overrides,
    };
  }

  it('sends fetch with correct body on choice click', async () => {
    setupAndInit({
      storyId: 'story-abc',
      pageId: 3,
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

    // Progress polling + choice POST
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse(makeSuccessfulChoiceResponse()));

    clickChoice(0);
    await jest.runAllTimersAsync();

    // Find the POST call (not the progress poll)
    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => call[1]?.method === 'POST'
    );
    expect(postCall).toBeDefined();

    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body.pageId).toBe(3);
    expect(body.choiceIndex).toBe(0);
    expect(body.progressId).toBe('test-uuid-1234');
    expect(body.apiKey).toBe('sk-or-test-key-valid');
  });

  it('updates narrative DOM on successful choice', async () => {
    setupAndInit({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

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
    setupAndInit({
      storyId: 'story-xyz',
      pageId: 1,
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

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
    setupAndInit({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse(
          makeSuccessfulChoiceResponse({
            actDisplayInfo: { displayString: 'Act II - Rising Action', actNumber: 2 },
          })
        )
      );

    clickChoice(0);
    await jest.runAllTimersAsync();

    const actIndicator = document.querySelector('.act-indicator');
    expect(actIndicator?.textContent).toContain('Act II - Rising Action');
  });

  it('hides loading overlay after fetch completes', async () => {
    setupAndInit({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse(makeSuccessfulChoiceResponse()));

    clickChoice(0);
    await jest.runAllTimersAsync();

    const loading = document.getElementById('loading');
    expect(loading?.style.display).toBe('none');
  });

  it('shows error message on failed response', async () => {
    setupAndInit({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse({ error: 'Server exploded' }, 500));

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
    setupAndInit({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

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
        {
          text: 'Explored path',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
          nextPageId: 5,
        },
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

  it('includes protagonistGuidance in body when provided', async () => {
    setupAndInit({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

    const speechInput = document.querySelector('#guidance-speech') as HTMLTextAreaElement;
    const thoughtsInput = document.querySelector('#guidance-thoughts') as HTMLTextAreaElement;
    speechInput.value = 'I choose courage!';
    thoughtsInput.value = 'I cannot freeze now.';

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse(makeSuccessfulChoiceResponse()));

    clickChoice(0);
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => call[1]?.method === 'POST'
    );
    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body.protagonistGuidance).toEqual({
      suggestedThoughts: 'I cannot freeze now.',
      suggestedSpeech: 'I choose courage!',
    });
  });

  it('does not include protagonistGuidance when all fields are empty', async () => {
    setupAndInit({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse(makeSuccessfulChoiceResponse()));

    clickChoice(0);
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => call[1]?.method === 'POST'
    );
    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body.protagonistGuidance).toBeUndefined();
  });

  it('clears protagonist guidance after generated response', async () => {
    setupAndInit({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

    const speechInput = document.querySelector('#guidance-speech') as HTMLTextAreaElement;
    const emotionsInput = document.querySelector('#guidance-emotions') as HTMLTextAreaElement;
    speechInput.value = 'Something brave';
    emotionsInput.value = 'Terrified';

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse(makeSuccessfulChoiceResponse({ wasGenerated: true }))
      );

    clickChoice(0);
    await jest.runAllTimersAsync();

    // After a generated response, guidance fields should be empty in rebuilt section
    const newSpeechInput = document.querySelector('#guidance-speech') as HTMLTextAreaElement;
    const newEmotionsInput = document.querySelector('#guidance-emotions') as HTMLTextAreaElement;
    expect(newSpeechInput?.value).toBe('');
    expect(newEmotionsInput?.value).toBe('');
  });

  it('renders state changes section on successful choice', async () => {
    setupAndInit({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

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
    setupAndInit({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

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

  it('does not stop loading prematurely when ideation path is taken', async () => {
    setupAndInit({
      choices: [
        { text: 'Unexplored path', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' },
        { text: 'Another path', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT' },
      ],
    });

    // The ideation fetch returns options with correct shape
    const ideationResponse = {
      success: true,
      options: [
        {
          scenePurpose: 'RISING_COMPLICATION',
          valuePolarityShift: 'POSITIVE_TO_NEGATIVE',
          pacingMode: 'ACCELERATING',
          sceneDirection: 'The hero faces a dark cave',
          dramaticJustification: 'Builds tension',
        },
        {
          scenePurpose: 'REVELATION',
          valuePolarityShift: 'NEGATIVE_TO_POSITIVE',
          pacingMode: 'DECELERATING',
          sceneDirection: 'A hidden ally appears',
          dramaticJustification: 'Provides relief',
        },
        {
          scenePurpose: 'CONFRONTATION',
          valuePolarityShift: 'IRONIC_SHIFT',
          pacingMode: 'SUSTAINED_HIGH',
          sceneDirection: 'A confrontation with the rival',
          dramaticJustification: 'Heightens conflict',
        },
      ],
    };

    let choicePostCalled = false;

    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === 'string' && url.includes('ideate-scene')) {
        return Promise.resolve(mockJsonResponse(ideationResponse));
      }
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      if (init?.method === 'POST' && typeof url === 'string' && url.includes('/choice')) {
        choicePostCalled = true;
        return Promise.resolve(mockJsonResponse(makeSuccessfulChoiceResponse()));
      }
      return Promise.resolve(mockJsonResponse({ error: 'No mock' }, 500));
    });

    // Click the unexplored choice - triggers ideation
    clickChoice(0);
    await jest.runAllTimersAsync();

    // Ideation UI should be rendered - select a card first
    const card = document.querySelector('.scene-direction-card') as HTMLElement;
    expect(card).not.toBeNull();
    card.click();
    await jest.runAllTimersAsync();

    // Now click the confirm button
    const confirmBtn = document.querySelector('.scene-ideation-confirm') as HTMLButtonElement;
    expect(confirmBtn).not.toBeNull();
    expect(confirmBtn.disabled).toBe(false);
    confirmBtn.click();
    await jest.runAllTimersAsync();

    // The choice POST should have been made (proceedWithChoice ran to completion)
    expect(choicePostCalled).toBe(true);
  });

  it('choice click works after #choices has been detached and restored', async () => {
    setupAndInit({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });

    // Simulate ideation detaching #choices and then restoring it
    const choicesSection = document.getElementById('choices-section')!;
    const originalChoices = document.getElementById('choices')!;
    originalChoices.remove();

    // Re-create #choices with new buttons (simulating what rebuildChoicesSection does)
    const newChoicesDiv = document.createElement('div');
    newChoicesDiv.id = 'choices';
    newChoicesDiv.className = 'choices';
    newChoicesDiv.innerHTML =
      '<div class="choice-row"><button class="choice-btn" data-choice-index="0" data-explored="true"><span class="choice-text">Restored choice</span></button></div>' +
      '<div class="choice-row"><button class="choice-btn" data-choice-index="1" data-explored="true"><span class="choice-text">Another choice</span></button></div>';
    choicesSection.prepend(newChoicesDiv);

    // Mock the fetch for the explored choice path
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(mockJsonResponse(makeSuccessfulChoiceResponse()));

    // Click the new choice button - should work because delegation is on choicesSection
    const newButton = newChoicesDiv.querySelector('.choice-btn[data-choice-index="0"]') as HTMLButtonElement;
    newButton.click();
    await jest.runAllTimersAsync();

    // Verify the choice was processed
    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => call[1]?.method === 'POST'
    );
    expect(postCall).toBeDefined();
  });
});
