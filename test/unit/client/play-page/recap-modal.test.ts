import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('story recap modal', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    sessionStorage.setItem('omb_api_key', 'sk-or-test-key-valid');
    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'recap-uuid-1' },
      writable: true,
      configurable: true,
    });
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
        sceneSummary: 'Scene two summary.',
        choices: [{ text: 'Next', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
        isEnding: false,
        openThreads: [],
        openThreadOverflowSummary: null,
        activeThreats: [],
        threatsOverflowSummary: null,
        activeConstraints: [],
        constraintsOverflowSummary: null,
        inventory: [],
        inventoryOverflowSummary: null,
        health: [],
        healthOverflowSummary: null,
        protagonistAffect: null,
        stateChanges: [],
        analystResult: null,
        resolvedThreadMeta: {},
      },
      globalCanon: [],
      globalCharacterCanon: {},
      recapSummaries: [
        { pageId: 1, summary: 'Scene one summary.' },
        { pageId: 2, summary: 'Scene two summary.' },
      ],
      wasGenerated: true,
      actDisplayInfo: null,
      deviationInfo: null,
      ...overrides,
    };
  }

  it('opens and closes from trigger, close button, outside click, and Escape', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      recapSummaries: [{ pageId: 1, summary: 'Opening recap.' }],
    });
    loadAppAndInit();

    const trigger = document.getElementById('recap-btn') as HTMLButtonElement;
    const modal = document.getElementById('recap-modal') as HTMLElement;
    const close = document.getElementById('recap-close-btn') as HTMLButtonElement;

    trigger.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(modal.style.display).toBe('flex');

    close.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(modal.style.display).toBe('none');

    trigger.click();
    await jest.advanceTimersByTimeAsync(0);
    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await jest.advanceTimersByTimeAsync(0);
    expect(modal.style.display).toBe('none');

    trigger.click();
    await jest.advanceTimersByTimeAsync(0);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await jest.advanceTimersByTimeAsync(0);
    expect(modal.style.display).toBe('none');
  });

  it('renders recap entries in order with scene labels', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      recapSummaries: [
        { pageId: 1, summary: 'First scene summary.' },
        { pageId: 2, summary: 'Second scene summary.' },
      ],
    });
    loadAppAndInit();

    const trigger = document.getElementById('recap-btn') as HTMLButtonElement;
    trigger.click();
    await jest.advanceTimersByTimeAsync(0);

    const body = document.getElementById('recap-modal-body') as HTMLElement;
    const labels = Array.from(body.querySelectorAll('.recap-page-label')).map((el) => el.textContent);
    const summaries = Array.from(body.querySelectorAll('.recap-summary')).map((el) => el.textContent);

    expect(labels).toEqual(['Scene 1', 'Scene 2']);
    expect(summaries).toEqual(['First scene summary.', 'Second scene summary.']);
  });

  it('shows empty state when recap-data is invalid', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    const recapData = document.getElementById('recap-data') as HTMLElement;
    recapData.textContent = '{ invalid json }';
    loadAppAndInit();

    const trigger = document.getElementById('recap-btn') as HTMLButtonElement;
    trigger.click();
    await jest.advanceTimersByTimeAsync(0);

    expect(document.getElementById('recap-modal-body')?.textContent).toContain(
      'No scenes recorded yet.'
    );
  });

  it('updates recap modal after choice response', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      recapSummaries: [{ pageId: 1, summary: 'Scene one summary.' }],
    });
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(mockJsonResponse(makeChoiceResponse()));
    });
    loadAppAndInit();

    const choiceButton = document.querySelector('.choice-btn') as HTMLButtonElement;
    choiceButton.click();
    await jest.runAllTimersAsync();

    const trigger = document.getElementById('recap-btn') as HTMLButtonElement;
    trigger.click();
    await jest.advanceTimersByTimeAsync(0);

    expect(document.getElementById('recap-modal-body')?.textContent).toContain('Scene one summary.');
    expect(document.getElementById('recap-modal-body')?.textContent).toContain('Scene two summary.');
  });
});
