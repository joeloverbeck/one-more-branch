import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('active threats panel', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'test-uuid-threats' },
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

  function makeChoiceResponseWithThreats(
    threats: Array<{ id: string; text: string }>,
    threatsOverflowSummary: string | null = null
  ): Record<string, unknown> {
    return {
      page: {
        id: 2,
        narrativeText: 'Story continues.',
        choices: [{ text: 'Next', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
        isEnding: false,
        openThreads: [],
        openThreadOverflowSummary: null,
        activeThreats: threats,
        threatsOverflowSummary: threatsOverflowSummary,
        activeConstraints: [],
        constraintsOverflowSummary: null,
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

  it('renders threats after AJAX choice response', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const threats = [
      { id: 'at-1', text: 'A dragon approaches' },
      { id: 'at-2', text: 'Poison gas fills the room' },
    ];

    await clickChoiceAndResolve(makeChoiceResponseWithThreats(threats));

    const panel = document.getElementById('active-threats-panel');
    expect(panel).not.toBeNull();

    const items = panel!.querySelectorAll('.active-threats-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('A dragon approaches');
    expect(items[1].textContent).toBe('Poison gas fills the room');
  });

  it('limits to 6 visible items with overflow summary', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const threats = Array.from({ length: 9 }, (_, i) => ({
      id: `at-${i + 1}`,
      text: `Threat ${i + 1}`,
    }));

    await clickChoiceAndResolve(makeChoiceResponseWithThreats(threats));

    const panel = document.getElementById('active-threats-panel');
    const items = panel!.querySelectorAll('.active-threats-item');
    expect(items.length).toBe(6);

    const overflow = panel!.querySelector('#active-threats-overflow');
    expect(overflow).not.toBeNull();
    expect(overflow!.textContent).toBe('+3 more not shown');
  });

  it('uses server-provided overflow summary when present', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const threats = Array.from({ length: 8 }, (_, i) => ({
      id: `at-${i + 1}`,
      text: `Threat ${i + 1}`,
    }));

    await clickChoiceAndResolve(makeChoiceResponseWithThreats(threats, '+2 more not shown'));

    const overflow = document.getElementById('active-threats-overflow');
    expect(overflow).not.toBeNull();
    expect(overflow!.textContent).toBe('+2 more not shown');
  });

  it('removes panel when threats array is empty', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      activeThreats: [{ id: 'at-1', text: 'Existing threat' }],
    });
    loadAppAndInit();

    await clickChoiceAndResolve(makeChoiceResponseWithThreats([]));

    const panel = document.getElementById('active-threats-panel');
    expect(panel).toBeNull();
  });

  it('updates panel in-place on subsequent renders', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    await clickChoiceAndResolve(
      makeChoiceResponseWithThreats([{ id: 'at-1', text: 'First threat' }])
    );

    let panel = document.getElementById('active-threats-panel');
    expect(panel).not.toBeNull();

    await clickChoiceAndResolve(
      makeChoiceResponseWithThreats([{ id: 'at-2', text: 'Second threat' }])
    );

    panel = document.getElementById('active-threats-panel');
    expect(panel).not.toBeNull();
    const items = panel!.querySelectorAll('.active-threats-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Second threat');
  });

  it('filters out invalid entries', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    const threats = [
      null as unknown as { id: string; text: string },
      { id: '', text: 'Missing ID' },
      { id: 'at-1', text: 'Valid threat' },
      { id: 'at-2', text: '' },
    ];

    await clickChoiceAndResolve(makeChoiceResponseWithThreats(threats));

    const panel = document.getElementById('active-threats-panel');
    const items = panel!.querySelectorAll('.active-threats-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Valid threat');
  });

  it('does not render when no threats in response', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    await clickChoiceAndResolve(makeChoiceResponseWithThreats([]));

    const panel = document.getElementById('active-threats-panel');
    expect(panel).toBeNull();
  });

  it('applies correct CSS classes', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    await clickChoiceAndResolve(
      makeChoiceResponseWithThreats([{ id: 'at-1', text: 'Test threat' }])
    );

    const panel = document.getElementById('active-threats-panel');
    expect(panel!.classList.contains('active-threats-panel')).toBe(true);
    expect(panel!.querySelector('.active-threats-title')).not.toBeNull();
    expect(panel!.querySelector('.active-threats-list')).not.toBeNull();
    expect(panel!.querySelector('.active-threats-item')).not.toBeNull();
  });
});
