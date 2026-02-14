import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('story lore modal', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    sessionStorage.setItem('omb_api_key', 'sk-or-test-key-valid');
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'lore-uuid-1' },
      writable: true,
      configurable: true,
    });
    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  function setupAndInit(): void {
    document.body.innerHTML = buildPlayPageHtml({
      worldFacts: ['The citadel stands'],
      characterCanon: { 'Bobby Western': ['Bobby is in a coma'] },
    });
    loadAppAndInit();
  }

  it('opens and closes from trigger, close button, outside click, and Escape', async () => {
    setupAndInit();

    const trigger = document.getElementById('lore-trigger-btn') as HTMLButtonElement;
    const modal = document.getElementById('lore-modal') as HTMLElement;
    const close = document.getElementById('lore-close-btn') as HTMLButtonElement;

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

  it('renders world and characters tabs, including collapsible character facts', async () => {
    setupAndInit();

    const trigger = document.getElementById('lore-trigger-btn') as HTMLButtonElement;
    const worldPanel = document.getElementById('lore-panel-world') as HTMLElement;
    const charactersPanel = document.getElementById('lore-panel-characters') as HTMLElement;
    const charactersTab = document.getElementById('lore-tab-characters') as HTMLButtonElement;

    trigger.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(worldPanel.textContent).toContain('The citadel stands');

    charactersTab.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(charactersPanel.style.display).not.toBe('none');
    expect(charactersPanel.textContent).toContain('Bobby Western');

    const characterButton = charactersPanel.querySelector('.lore-character-name') as HTMLButtonElement;
    const factsList = charactersPanel.querySelector('.lore-character-facts') as HTMLElement;
    expect(factsList.style.display).toBe('none');

    characterButton.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(factsList.style.display).toBe('block');
    expect(factsList.textContent).toContain('Bobby is in a coma');
  });

  it('shows empty states when lore-data JSON is invalid', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    const loreData = document.getElementById('lore-data') as HTMLElement;
    loreData.textContent = '{ this is invalid json }';
    loadAppAndInit();

    const trigger = document.getElementById('lore-trigger-btn') as HTMLButtonElement;
    const count = document.getElementById('lore-count-badge') as HTMLElement;
    const charactersTab = document.getElementById('lore-tab-characters') as HTMLButtonElement;
    const worldPanel = document.getElementById('lore-panel-world') as HTMLElement;
    const charactersPanel = document.getElementById('lore-panel-characters') as HTMLElement;

    expect(count.textContent).toBe('(0)');
    trigger.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(worldPanel.textContent).toContain('No world facts established yet.');

    charactersTab.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(charactersPanel.textContent).toContain('No character facts established yet.');
  });

  it('updates lore count/content from choice response and keeps trigger at sidebar bottom', async () => {
    document.body.innerHTML = buildPlayPageHtml({ choices: [{ text: 'Continue' }] });
    loadAppAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse({
          success: true,
          page: {
            id: 2,
            narrativeText: 'A new branch unfolds.',
            sceneSummary: 'Summary',
            choices: [{ text: 'Next', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
            isEnding: false,
            analystResult: null,
            openThreads: [],
            openThreadOverflowSummary: null,
            activeThreats: [],
            threatsOverflowSummary: null,
            activeConstraints: [],
            constraintsOverflowSummary: null,
            inventory: [{ id: 'item-1', text: 'Silver key' }],
            inventoryOverflowSummary: null,
            health: [],
            healthOverflowSummary: null,
            protagonistAffect: null,
          },
          globalCanon: ['The moon is red'],
          globalCharacterCanon: { 'Captain Vale': ['Lost an eye'] },
          actDisplayInfo: null,
          wasGenerated: true,
          deviationInfo: null,
        })
      );

    const choiceButton = document.querySelector('.choice-btn') as HTMLButtonElement;
    choiceButton.click();
    await jest.runAllTimersAsync();

    const badge = document.getElementById('lore-count-badge') as HTMLElement;
    expect(badge.textContent).toBe('(2)');

    const trigger = document.getElementById('lore-trigger-btn') as HTMLElement;
    const leftSidebar = document.getElementById('left-sidebar-widgets') as HTMLElement;
    expect(leftSidebar.lastElementChild).toBe(trigger);

    trigger.click();
    await jest.advanceTimersByTimeAsync(0);
    const worldPanel = document.getElementById('lore-panel-world') as HTMLElement;
    expect(worldPanel.textContent).toContain('The moon is red');
  });
});
