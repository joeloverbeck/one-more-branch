import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('open threads panel', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'test-uuid-threads' },
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

  function makeChoiceResponseWithThreads(
    threads: Array<{ id: string; text: string; threadType: string; urgency: string }>,
    overflowSummary: string | null = null
  ): Record<string, unknown> {
    return {
      page: {
        id: 2,
        narrativeText: 'Story continues.',
        choices: [{ text: 'Next', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
        isEnding: false,
        openThreads: threads,
        openThreadOverflowSummary: overflowSummary,
        stateChanges: [],
      },
      wasGenerated: true,
      actDisplayInfo: null,
      deviationInfo: null,
    };
  }

  async function clickChoiceAndResolve(response: unknown): Promise<void> {
    const postResponse = mockJsonResponse(response);
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(postResponse);
    });

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.runAllTimersAsync();
  }

  it('renders threads sorted by urgency (HIGH > MEDIUM > LOW)', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const threads = [
      { id: 'th-1', text: 'Low priority', threadType: 'QUEST', urgency: 'LOW' },
      { id: 'th-2', text: 'High priority', threadType: 'DANGER', urgency: 'HIGH' },
      { id: 'th-3', text: 'Medium priority', threadType: 'MYSTERY', urgency: 'MEDIUM' },
    ];

    await clickChoiceAndResolve(makeChoiceResponseWithThreads(threads));

    const panel = document.getElementById('open-threads-panel');
    expect(panel).not.toBeNull();

    const items = panel!.querySelectorAll('.open-threads-item');
    expect(items.length).toBe(3);

    // HIGH first, MEDIUM second, LOW third
    expect(items[0].querySelector('.open-threads-text')?.textContent).toBe('High priority');
    expect(items[1].querySelector('.open-threads-text')?.textContent).toBe('Medium priority');
    expect(items[2].querySelector('.open-threads-text')?.textContent).toBe('Low priority');
  });

  it('truncates to 6 visible with overflow summary', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const threads = Array.from({ length: 8 }, (_, i) => ({
      id: `th-${i + 1}`,
      text: `Thread ${i + 1}`,
      threadType: 'QUEST',
      urgency: i < 3 ? 'HIGH' : i < 6 ? 'MEDIUM' : 'LOW',
    }));

    await clickChoiceAndResolve(makeChoiceResponseWithThreads(threads));

    const panel = document.getElementById('open-threads-panel');
    const items = panel!.querySelectorAll('.open-threads-item');
    expect(items.length).toBe(6);

    // Should have overflow summary
    const summary = panel!.querySelector('#open-threads-overflow-summary');
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toContain('Not shown:');
  });

  it('builds overflow summary with correct urgency counts', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    // 9 threads: 4 HIGH, 3 MEDIUM, 2 LOW
    // After sort: 4 HIGH, 3 MEDIUM, 2 LOW
    // Visible: first 6 (4 HIGH + 2 MEDIUM)
    // Hidden: 1 MEDIUM + 2 LOW
    const threads = [
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `th-h${i}`,
        text: `High ${i}`,
        threadType: 'DANGER',
        urgency: 'HIGH',
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `th-m${i}`,
        text: `Med ${i}`,
        threadType: 'QUEST',
        urgency: 'MEDIUM',
      })),
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `th-l${i}`,
        text: `Low ${i}`,
        threadType: 'MYSTERY',
        urgency: 'LOW',
      })),
    ];

    await clickChoiceAndResolve(makeChoiceResponseWithThreads(threads));

    const summary = document.getElementById('open-threads-overflow-summary');
    expect(summary).not.toBeNull();
    // Hidden: 1 MEDIUM + 2 LOW
    expect(summary!.textContent).toBe('Not shown: 1 (medium), 2 (low)');
  });

  it('uses server-provided overflow summary when present', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const threads = Array.from({ length: 8 }, (_, i) => ({
      id: `th-${i + 1}`,
      text: `Thread ${i + 1}`,
      threadType: 'QUEST',
      urgency: 'HIGH',
    }));

    await clickChoiceAndResolve(
      makeChoiceResponseWithThreads(threads, 'Custom summary from server')
    );

    const summary = document.getElementById('open-threads-overflow-summary');
    expect(summary).not.toBeNull();
    expect(summary!.textContent).toBe('Custom summary from server');
  });

  it('removes overflow summary when thread count drops below limit', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    // First: render with overflow
    const manyThreads = Array.from({ length: 8 }, (_, i) => ({
      id: `th-${i + 1}`,
      text: `Thread ${i + 1}`,
      threadType: 'QUEST',
      urgency: 'HIGH',
    }));
    await clickChoiceAndResolve(makeChoiceResponseWithThreads(manyThreads));
    expect(document.getElementById('open-threads-overflow-summary')).not.toBeNull();

    // Second: render with fewer threads (no overflow)
    const fewThreads = [{ id: 'th-1', text: 'Only thread', threadType: 'QUEST', urgency: 'HIGH' }];
    await clickChoiceAndResolve(makeChoiceResponseWithThreads(fewThreads));
    expect(document.getElementById('open-threads-overflow-summary')).toBeNull();
  });

  it('removes panel when threads array is empty', async () => {
    // Start with threads
    document.body.innerHTML = buildPlayPageHtml({
      openThreads: [{ id: 'th-1', text: 'Existing thread', threadType: 'QUEST', urgency: 'HIGH' }],
    });
    loadAppAndInit();

    // Response with empty threads
    await clickChoiceAndResolve(makeChoiceResponseWithThreads([]));

    const panel = document.getElementById('open-threads-panel');
    expect(panel).toBeNull();
  });

  it('updates panel in place on subsequent renders', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const threads1 = [{ id: 'th-1', text: 'First thread', threadType: 'QUEST', urgency: 'HIGH' }];

    await clickChoiceAndResolve(makeChoiceResponseWithThreads(threads1));

    let panel = document.getElementById('open-threads-panel');
    expect(panel).not.toBeNull();

    // Now trigger a second response with different threads
    const threads2 = [
      { id: 'th-2', text: 'Second thread', threadType: 'DANGER', urgency: 'MEDIUM' },
    ];

    await clickChoiceAndResolve(makeChoiceResponseWithThreads(threads2));

    panel = document.getElementById('open-threads-panel');
    expect(panel).not.toBeNull();

    const items = panel!.querySelectorAll('.open-threads-item');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('.open-threads-text')?.textContent).toBe('Second thread');
  });

  it('filters out null or invalid threads', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const threads = [
      null as unknown as { id: string; text: string; threadType: string; urgency: string },
      { id: '', text: 'Missing ID', threadType: 'QUEST', urgency: 'HIGH' },
      { id: 'th-1', text: 'Valid thread', threadType: 'QUEST', urgency: 'HIGH' },
      { id: 'th-2', text: '', threadType: 'QUEST', urgency: 'MEDIUM' },
    ];

    await clickChoiceAndResolve(makeChoiceResponseWithThreads(threads));

    const panel = document.getElementById('open-threads-panel');
    const items = panel!.querySelectorAll('.open-threads-item');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('.open-threads-text')?.textContent).toBe('Valid thread');
  });

  it('applies correct urgency CSS class', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const threads = [
      { id: 'th-1', text: 'High thread', threadType: 'DANGER', urgency: 'HIGH' },
      { id: 'th-2', text: 'Medium thread', threadType: 'QUEST', urgency: 'MEDIUM' },
      { id: 'th-3', text: 'Low thread', threadType: 'MYSTERY', urgency: 'LOW' },
    ];

    await clickChoiceAndResolve(makeChoiceResponseWithThreads(threads));

    const panel = document.getElementById('open-threads-panel');
    const textElements = panel!.querySelectorAll('.open-threads-text');

    expect(textElements[0].classList.contains('open-threads-text--high')).toBe(true);
    expect(textElements[1].classList.contains('open-threads-text--medium')).toBe(true);
    expect(textElements[2].classList.contains('open-threads-text--low')).toBe(true);
  });

  it('renders thread badge pills with correct icon paths', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const threads = [{ id: 'th-1', text: 'A quest thread', threadType: 'QUEST', urgency: 'HIGH' }];

    await clickChoiceAndResolve(makeChoiceResponseWithThreads(threads));

    const panel = document.getElementById('open-threads-panel');
    const pill = panel!.querySelector('.thread-icon-pill');
    expect(pill).not.toBeNull();

    const img = pill!.querySelector('.thread-icon') as HTMLImageElement;
    expect(img?.src).toContain('/images/icons/thread-quest-high.png');
  });
});
