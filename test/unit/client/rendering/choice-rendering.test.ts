import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('choice rendering', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'render-test-uuid' },
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

  function setupAndClick(responseChoices: Array<Record<string, unknown>>): Promise<void> {
    document.body.innerHTML = buildPlayPageHtml({
      choices: [
        { text: 'Go left', choiceType: 'INTERVENE', primaryDelta: 'LOCATION_ACCESS_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'COMMIT', primaryDelta: 'GOAL_PRIORITY_CHANGE', nextPageId: 3 },
      ],
    });
    loadAppAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse({
          page: {
            id: 2,
            narrativeText: 'Story continues.',
            choices: responseChoices,
            isEnding: false,
            openThreads: [],
            openThreadOverflowSummary: null,
            stateChanges: [],
          },
          wasGenerated: true,
          actDisplayInfo: null,
          deviationInfo: null,
        })
      );

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    return jest.runAllTimersAsync();
  }

  it('escapes HTML in choice text to prevent XSS', async () => {
    await setupAndClick([
      {
        text: '<script>alert("xss")</script>',
        choiceType: 'INTERVENE',
        primaryDelta: 'GOAL_PRIORITY_CHANGE',
      },
    ]);

    const choiceText = document.querySelector('.choice-text');
    // Should be escaped, not rendered as HTML
    expect(choiceText?.textContent).toBe('<script>alert("xss")</script>');
    expect(choiceText?.innerHTML).not.toContain('<script>');
  });

  it('renders choice type and primary delta icon paths', async () => {
    await setupAndClick([
      {
        text: 'A choice',
        choiceType: 'COMMIT',
        primaryDelta: 'RELATIONSHIP_ALIGNMENT_CHANGE',
      },
    ]);

    const typeIcon = document.querySelector('.choice-icon--type') as HTMLImageElement;
    expect(typeIcon?.src).toContain('/images/icons/commit.png');

    const deltaIcon = document.querySelector('.choice-icon--delta') as HTMLImageElement;
    expect(deltaIcon?.src).toContain('/images/icons/relationship-alignment-change.png');
  });

  it('marks explored choices with data-explored and marker', async () => {
    await setupAndClick([
      {
        text: 'Already explored',
        choiceType: 'INTERVENE',
        primaryDelta: 'GOAL_PRIORITY_CHANGE',
        nextPageId: 10,
      },
      {
        text: 'Not explored',
        choiceType: 'COMMIT',
        primaryDelta: 'LOCATION_ACCESS_CHANGE',
      },
    ]);

    const buttons = document.querySelectorAll('.choice-btn');
    expect((buttons[0] as HTMLElement).dataset.explored).toBe('true');
    expect((buttons[1] as HTMLElement).dataset.explored).toBeUndefined();

    const markers = document.querySelectorAll('.explored-marker');
    expect(markers.length).toBe(1);
  });

  it('sets data-choice-index on each button', async () => {
    await setupAndClick([
      { text: 'First', choiceType: 'INTERVENE', primaryDelta: 'GOAL_PRIORITY_CHANGE' },
      { text: 'Second', choiceType: 'COMMIT', primaryDelta: 'LOCATION_ACCESS_CHANGE' },
      { text: 'Third', choiceType: 'INVESTIGATE', primaryDelta: 'INFORMATION_STATE_CHANGE' },
    ]);

    const buttons = document.querySelectorAll('.choice-btn');
    expect(buttons.length).toBe(3);
    expect((buttons[0] as HTMLElement).dataset.choiceIndex).toBe('0');
    expect((buttons[1] as HTMLElement).dataset.choiceIndex).toBe('1');
    expect((buttons[2] as HTMLElement).dataset.choiceIndex).toBe('2');
  });

  it('stores choice type and primary delta in data attributes', async () => {
    await setupAndClick([
      {
        text: 'Test',
        choiceType: 'CONTEST',
        primaryDelta: 'THREAT_LEVEL_CHANGE',
      },
    ]);

    const button = document.querySelector('.choice-btn') as HTMLElement;
    expect(button.dataset.choiceType).toBe('CONTEST');
    expect(button.dataset.primaryDelta).toBe('THREAT_LEVEL_CHANGE');
  });
});
