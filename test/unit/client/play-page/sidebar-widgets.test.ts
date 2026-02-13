import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('sidebar widgets container', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'test-uuid-sidebar' },
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

  function makeChoiceResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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
        activeConstraints: [],
        constraintsOverflowSummary: null,
        stateChanges: [],
        ...overrides,
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

  it('creates sidebar container when any widget has data', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    await clickChoiceAndResolve(
      makeChoiceResponse({
        activeThreats: [{ id: 'at-1', text: 'A threat' }],
      })
    );

    const sidebar = document.getElementById('sidebar-widgets');
    expect(sidebar).not.toBeNull();
    expect(sidebar!.classList.contains('sidebar-widgets')).toBe(true);
  });

  it('removes sidebar container when all widgets are empty', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      activeThreats: [{ id: 'at-1', text: 'Existing threat' }],
    });
    loadAppAndInit();

    // Verify sidebar exists initially
    expect(document.getElementById('sidebar-widgets')).not.toBeNull();

    await clickChoiceAndResolve(makeChoiceResponse());

    const sidebar = document.getElementById('sidebar-widgets');
    expect(sidebar).toBeNull();
  });

  it('stacks all three widgets in correct order', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    await clickChoiceAndResolve(
      makeChoiceResponse({
        openThreads: [
          { id: 'th-1', text: 'A thread', threadType: 'QUEST', urgency: 'HIGH' },
        ],
        activeThreats: [{ id: 'at-1', text: 'A threat' }],
        activeConstraints: [{ id: 'cn-1', text: 'A constraint' }],
      })
    );

    const sidebar = document.getElementById('sidebar-widgets');
    expect(sidebar).not.toBeNull();

    const asides = sidebar!.querySelectorAll('aside');
    expect(asides.length).toBe(3);
    expect(asides[0].id).toBe('open-threads-panel');
    expect(asides[1].id).toBe('active-threats-panel');
    expect(asides[2].id).toBe('active-constraints-panel');
  });

  it('handles mixed visibility (threads + constraints but no threats)', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    await clickChoiceAndResolve(
      makeChoiceResponse({
        openThreads: [
          { id: 'th-1', text: 'A thread', threadType: 'QUEST', urgency: 'MEDIUM' },
        ],
        activeConstraints: [{ id: 'cn-1', text: 'A constraint' }],
      })
    );

    const sidebar = document.getElementById('sidebar-widgets');
    expect(sidebar).not.toBeNull();

    const asides = sidebar!.querySelectorAll('aside');
    expect(asides.length).toBe(2);
    expect(asides[0].id).toBe('open-threads-panel');
    expect(asides[1].id).toBe('active-constraints-panel');

    expect(document.getElementById('active-threats-panel')).toBeNull();
  });

  it('handles only threats visible', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    await clickChoiceAndResolve(
      makeChoiceResponse({
        activeThreats: [{ id: 'at-1', text: 'Only threats' }],
      })
    );

    const sidebar = document.getElementById('sidebar-widgets');
    expect(sidebar).not.toBeNull();

    const asides = sidebar!.querySelectorAll('aside');
    expect(asides.length).toBe(1);
    expect(asides[0].id).toBe('active-threats-panel');
  });
});
