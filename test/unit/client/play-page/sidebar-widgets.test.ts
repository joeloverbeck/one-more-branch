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

  it('keeps sidebar container when all widgets are empty (grid cell)', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      activeThreats: [{ id: 'at-1', text: 'Existing threat' }],
    });
    loadAppAndInit();

    // Verify sidebar exists initially with content
    expect(document.getElementById('sidebar-widgets')).not.toBeNull();
    expect(document.getElementById('active-threats-panel')).not.toBeNull();

    await clickChoiceAndResolve(makeChoiceResponse());

    // Container persists as a grid cell but has no aside children
    const sidebar = document.getElementById('sidebar-widgets');
    expect(sidebar).not.toBeNull();
    expect(sidebar!.querySelectorAll('aside').length).toBe(0);
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
        trackedPromises: [{ id: 'pr-1', text: 'A promise', promiseType: 'CHEKHOV_GUN', scope: 'BEAT', age: 2, suggestedUrgency: 'HIGH' }],
      })
    );

    const sidebar = document.getElementById('sidebar-widgets');
    expect(sidebar).not.toBeNull();

    const asides = sidebar!.querySelectorAll('aside');
    expect(asides.length).toBe(4);
    expect(asides[0].id).toBe('open-threads-panel');
    expect(asides[1].id).toBe('active-threats-panel');
    expect(asides[2].id).toBe('active-constraints-panel');
    expect(asides[3].id).toBe('tracked-promises-panel');
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

  it('renders tracked promises panel with icon, type badge, and age', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    await clickChoiceAndResolve(
      makeChoiceResponse({
        trackedPromises: [
          { id: 'pr-1', text: 'The gun on the mantle', promiseType: 'CHEKHOV_GUN', scope: 'BEAT', age: 3, suggestedUrgency: 'HIGH' },
        ],
      })
    );

    const panel = document.getElementById('tracked-promises-panel');
    expect(panel).not.toBeNull();
    expect(panel!.querySelector('.tracked-promises-title')?.textContent).toBe('Tracked Promises');

    const items = panel!.querySelectorAll('.tracked-promises-item');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('.promise-age-badge')?.textContent).toBe('3 pg');
    expect(items[0].textContent).toContain('The gun on the mantle');

    const iconImg = items[0].querySelector('img.thread-icon--promise') as HTMLImageElement;
    expect(iconImg).not.toBeNull();
    expect(iconImg.src).toContain('promise-chekhov-gun-high.png');
    expect(iconImg.getAttribute('onerror')).toContain("this.style.display='none'");
  });

  it('removes tracked promises panel when response has empty array', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      trackedPromises: [{ id: 'pr-1', text: 'Old promise', promiseType: 'FORESHADOWING', scope: 'BEAT', age: 1, suggestedUrgency: 'LOW' }],
    });
    loadAppAndInit();

    expect(document.getElementById('tracked-promises-panel')).not.toBeNull();

    await clickChoiceAndResolve(makeChoiceResponse());

    expect(document.getElementById('tracked-promises-panel')).toBeNull();
  });
});
