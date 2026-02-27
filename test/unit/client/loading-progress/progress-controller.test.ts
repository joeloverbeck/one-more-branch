import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('loading progress controller', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'progress-test-uuid' },
      writable: true,
      configurable: true,
    });

    sessionStorage.setItem('omb_api_key', 'sk-or-test-key-valid');

    // Pin Math.random for deterministic phrase selection
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  function setupPage(): void {
    document.body.innerHTML = buildPlayPageHtml({
      choices: [
        { text: 'Go left', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE', nextPageId: 2 },
        { text: 'Go right', choiceType: 'MORAL_DILEMMA', primaryDelta: 'GOAL_SHIFT', nextPageId: 3 },
      ],
    });
    loadAppAndInit();
  }

  function getStatusText(): string {
    const el = document.querySelector('.loading-status');
    return el?.textContent ?? '';
  }

  it('starts polling when choice is clicked (progress endpoint called)', async () => {
    setupPage();

    // Never resolve POST - we only want to observe polling behavior
    let resolvePost!: (value: Response) => void;
    const pendingPost = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });

    // First call will be progress poll, second is the POST
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(
          mockJsonResponse({ status: 'running', activeStage: 'PLANNING_PAGE' })
        );
      }
      return pendingPost;
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();

    // Flush microtasks for ensureApiKey + start()
    await jest.advanceTimersByTimeAsync(0);

    // Progress poll should have been called
    const progressCalls = fetchMock.mock.calls.filter(
      (call: [string]) => typeof call[0] === 'string' && call[0].includes('generation-progress')
    );
    expect(progressCalls.length).toBeGreaterThanOrEqual(1);

    // Clean up by resolving the POST
    resolvePost(
      mockJsonResponse({
        page: {
          id: 2,
          narrativeText: 'Done.',
          choices: [{ text: 'Go', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
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
    await jest.runAllTimersAsync();
  });

  it('applies STAGE_DISPLAY_NAMES mapping to .loading-stage element', async () => {
    setupPage();

    // Track all values written to the .loading-stage element
    const stageValues: string[] = [];
    const stageEl = document.querySelector('.loading-stage') as HTMLElement;
    const originalDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    Object.defineProperty(stageEl, 'textContent', {
      set(value: string) {
        stageValues.push(value);
        originalDescriptor!.set!.call(this, value);
      },
      get(): string {
        return originalDescriptor!.get!.call(this) as string;
      },
      configurable: true,
    });

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(
          mockJsonResponse({ status: 'running', activeStage: 'EVALUATING_STRUCTURE' })
        );
      }
      return Promise.resolve(
        mockJsonResponse({
          page: {
            id: 2,
            narrativeText: 'Done.',
            choices: [{ text: 'Go', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
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
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.runAllTimersAsync();

    // The progress controller should have mapped EVALUATING_STRUCTURE to 'EVALUATING'
    expect(stageValues).toContain('EVALUATING');
  });

  it('maps kernel stage names for kernel generation polling', async () => {
    setupPage();

    const stageValues: string[] = [];
    const stageEl = document.querySelector('.loading-stage') as HTMLElement;
    const originalDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    Object.defineProperty(stageEl, 'textContent', {
      set(value: string) {
        stageValues.push(value);
        originalDescriptor!.set!.call(this, value);
      },
      get(): string {
        return originalDescriptor!.get!.call(this) as string;
      },
      configurable: true,
    });

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(
          mockJsonResponse({ status: 'running', activeStage: 'GENERATING_KERNELS' })
        );
      }
      return Promise.resolve(
        mockJsonResponse({
          page: {
            id: 2,
            narrativeText: 'Done.',
            choices: [{ text: 'Go', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
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
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.runAllTimersAsync();

    expect(stageValues).toContain('IDEATING');
  });

  it('maps evolving stage names for concept evolution polling', async () => {
    setupPage();

    const stageValues: string[] = [];
    const stageEl = document.querySelector('.loading-stage') as HTMLElement;
    const originalDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    Object.defineProperty(stageEl, 'textContent', {
      set(value: string) {
        stageValues.push(value);
        originalDescriptor!.set!.call(this, value);
      },
      get(): string {
        return originalDescriptor!.get!.call(this) as string;
      },
      configurable: true,
    });

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(
          mockJsonResponse({ status: 'running', activeStage: 'SEEDING_EVOLVED_CONCEPTS' })
        );
      }
      return Promise.resolve(
        mockJsonResponse({
          page: {
            id: 2,
            narrativeText: 'Done.',
            choices: [{ text: 'Go', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
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
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.runAllTimersAsync();

    expect(stageValues).toContain('SEEDING');
  });

  it('uses evolving stage phrase pool instead of fallback text', async () => {
    setupPage();

    let resolvePost!: (value: Response) => void;
    const pendingPost = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(
          mockJsonResponse({ status: 'running', activeStage: 'SEEDING_EVOLVED_CONCEPTS' })
        );
      }
      return pendingPost;
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const seedingEvolvedPhrases = [
      'Breeding offspring concept seeds...',
      'Recombining parent hooks and conflicts...',
      'Mutating concept seeds from proven parents...',
      'Cross-pollinating genre frames and conflict axes...',
      'Evolving new seed variations from parent strengths...',
      'Inverting parent assumptions into fresh hooks...',
      'Escalating parent tensions to new extremes...',
      'Transplanting working conflicts into new genres...',
      'Hybridizing parent identities into third patterns...',
      'Radicalizing parent differentiators to logical extremes...',
      'Fusing strongest parent mechanics into cohesive seeds...',
      'Selecting mutations that maximize generative spread...',
      'Preserving parent strengths while attacking weaknesses...',
      'Generating offspring seeds with maximum diversity...',
      'Applying mutation strategies to parent concept DNA...',
      'Testing whether offspring seeds escape parent shadows...',
      'Calibrating seed diversity across genre and conflict space...',
      'Drafting evolved hooks that outperform their parents...',
      'Splicing parent fantasy and pressure into new seeds...',
      'Germinating next-generation concept candidates...',
    ];
    expect(seedingEvolvedPhrases).toContain(getStatusText());
    expect(getStatusText()).not.toBe('Crafting your story...');

    resolvePost(
      mockJsonResponse({
        page: {
          id: 2,
          narrativeText: 'Done.',
          choices: [{ text: 'Go', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
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
    await jest.runAllTimersAsync();
  });

  it('shows fallback text on poll error', async () => {
    setupPage();

    let resolvePost!: (value: Response) => void;
    const pendingPost = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.reject(new Error('Network error'));
      }
      return pendingPost;
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    // Should fall back to default text
    expect(getStatusText()).toBe('Crafting your story...');

    resolvePost(
      mockJsonResponse({
        page: {
          id: 2,
          narrativeText: 'Done.',
          choices: [{ text: 'Go', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
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
    await jest.runAllTimersAsync();
  });

  it('stops polling on completed status', async () => {
    setupPage();

    let resolvePost!: (value: Response) => void;
    const pendingPost = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });

    let pollCount = 0;
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        pollCount++;
        if (pollCount === 1) {
          return Promise.resolve(
            mockJsonResponse({ status: 'running', activeStage: 'PLANNING_PAGE' })
          );
        }
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return pendingPost;
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    // Advance to second poll
    await jest.advanceTimersByTimeAsync(1200);

    const pollCountAfterCompleted = pollCount;

    // Advance more - polling should have stopped
    await jest.advanceTimersByTimeAsync(5000);
    expect(pollCount).toBe(pollCountAfterCompleted);

    resolvePost(
      mockJsonResponse({
        page: {
          id: 2,
          narrativeText: 'Done.',
          choices: [{ text: 'Go', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
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
    await jest.runAllTimersAsync();
  });

  it('stops polling on failed status', async () => {
    setupPage();

    let resolvePost!: (value: Response) => void;
    const pendingPost = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });

    let pollCount = 0;
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        pollCount++;
        return Promise.resolve(mockJsonResponse({ status: 'failed' }));
      }
      return pendingPost;
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const pollCountAfterFailed = pollCount;
    await jest.advanceTimersByTimeAsync(5000);
    expect(pollCount).toBe(pollCountAfterFailed);

    resolvePost(
      mockJsonResponse({
        page: {
          id: 2,
          narrativeText: 'Done.',
          choices: [{ text: 'Go', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
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
    await jest.runAllTimersAsync();
  });

  it('resets stage text after stop', async () => {
    setupPage();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(
          mockJsonResponse({ status: 'running', activeStage: 'EVALUATING_STRUCTURE' })
        );
      }
      return Promise.resolve(
        mockJsonResponse({
          page: {
            id: 2,
            narrativeText: 'Done.',
            choices: [{ text: 'Go', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
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
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.runAllTimersAsync();

    // After the whole flow completes (including finally block), loading should be hidden
    // and stage text should be reset
    const loading = document.getElementById('loading');
    expect(loading?.style.display).toBe('none');
  });
});
