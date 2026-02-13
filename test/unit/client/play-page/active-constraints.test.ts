import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('active constraints panel', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'test-uuid-constraints' },
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

  function makeChoiceResponseWithConstraints(
    constraints: Array<{ id: string; text: string }>,
    constraintsOverflowSummary: string | null = null
  ): Record<string, unknown> {
    return {
      page: {
        id: 2,
        narrativeText: 'Story continues.',
        choices: [{ text: 'Next', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
        isEnding: false,
        openThreads: [],
        openThreadOverflowSummary: null,
        activeThreats: [],
        threatsOverflowSummary: null,
        activeConstraints: constraints,
        constraintsOverflowSummary: constraintsOverflowSummary,
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

  it('renders constraints after AJAX choice response', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const constraints = [
      { id: 'cn-1', text: 'Cannot use magic' },
      { id: 'cn-2', text: 'Must stay hidden' },
    ];

    await clickChoiceAndResolve(makeChoiceResponseWithConstraints(constraints));

    const panel = document.getElementById('active-constraints-panel');
    expect(panel).not.toBeNull();

    const items = panel!.querySelectorAll('.active-constraints-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('Cannot use magic');
    expect(items[1].textContent).toBe('Must stay hidden');
  });

  it('limits to 6 visible items with overflow summary', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const constraints = Array.from({ length: 8 }, (_, i) => ({
      id: `cn-${i + 1}`,
      text: `Constraint ${i + 1}`,
    }));

    await clickChoiceAndResolve(makeChoiceResponseWithConstraints(constraints));

    const panel = document.getElementById('active-constraints-panel');
    const items = panel!.querySelectorAll('.active-constraints-item');
    expect(items.length).toBe(6);

    const overflow = panel!.querySelector('#active-constraints-overflow');
    expect(overflow).not.toBeNull();
    expect(overflow!.textContent).toBe('+2 more not shown');
  });

  it('removes panel when constraints array is empty', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      activeConstraints: [{ id: 'cn-1', text: 'Existing constraint' }],
    });
    loadAppAndInit();

    await clickChoiceAndResolve(makeChoiceResponseWithConstraints([]));

    const panel = document.getElementById('active-constraints-panel');
    expect(panel).toBeNull();
  });

  it('updates panel in-place on subsequent renders', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    await clickChoiceAndResolve(
      makeChoiceResponseWithConstraints([{ id: 'cn-1', text: 'First constraint' }])
    );

    let panel = document.getElementById('active-constraints-panel');
    expect(panel).not.toBeNull();

    await clickChoiceAndResolve(
      makeChoiceResponseWithConstraints([{ id: 'cn-2', text: 'Second constraint' }])
    );

    panel = document.getElementById('active-constraints-panel');
    expect(panel).not.toBeNull();
    const items = panel!.querySelectorAll('.active-constraints-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Second constraint');
  });

  it('filters out invalid entries', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const constraints = [
      null as unknown as { id: string; text: string },
      { id: '', text: 'Missing ID' },
      { id: 'cn-1', text: 'Valid constraint' },
      { id: 'cn-2', text: '' },
    ];

    await clickChoiceAndResolve(makeChoiceResponseWithConstraints(constraints));

    const panel = document.getElementById('active-constraints-panel');
    const items = panel!.querySelectorAll('.active-constraints-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Valid constraint');
  });

  it('does not render when no constraints in response', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    await clickChoiceAndResolve(makeChoiceResponseWithConstraints([]));

    const panel = document.getElementById('active-constraints-panel');
    expect(panel).toBeNull();
  });

  it('applies correct CSS classes', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    await clickChoiceAndResolve(
      makeChoiceResponseWithConstraints([{ id: 'cn-1', text: 'Test constraint' }])
    );

    const panel = document.getElementById('active-constraints-panel');
    expect(panel!.classList.contains('active-constraints-panel')).toBe(true);
    expect(panel!.querySelector('.active-constraints-title')).not.toBeNull();
    expect(panel!.querySelector('.active-constraints-list')).not.toBeNull();
    expect(panel!.querySelector('.active-constraints-item')).not.toBeNull();
  });
});
