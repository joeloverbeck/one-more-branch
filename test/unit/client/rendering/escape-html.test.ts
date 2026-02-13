import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('escapeHtml and escapeHtmlWithBreaks (exercised through DOM)', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'escape-test-uuid' },
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

  function clickAndGetNarrative(narrativeText: string): Promise<string> {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse({
          page: {
            id: 2,
            narrativeText,
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

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();

    return jest.runAllTimersAsync().then(() => {
      const narrative = document.getElementById('narrative');
      return narrative?.innerHTML ?? '';
    });
  }

  it('escapes HTML entities in narrative text', async () => {
    const html = await clickAndGetNarrative('The <bold> & "brave" hero');

    expect(html).toContain('&lt;bold&gt;');
    expect(html).toContain('&amp;');
    // jsdom's innerHTML serializes " as literal " (not &quot;) since it's safe in element content.
    // The escapeHtml function converts " to &quot; but jsdom re-serializes.
    // We verify the quote character survived (not stripped) and wasn't interpreted as HTML.
    expect(html).toMatch(/"brave"/);
    expect(html).not.toContain('<bold>');
  });

  it('converts newlines to <br> in narrative text', async () => {
    const html = await clickAndGetNarrative('Line one.\nLine two.\nLine three.');

    expect(html).toContain('Line one.<br>Line two.<br>Line three.');
  });

  it('escapes XSS vectors in narrative', async () => {
    const html = await clickAndGetNarrative('<img src=x onerror=alert(1)>');

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('escapes HTML in state changes', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ status: 'completed' }))
      .mockResolvedValueOnce(
        mockJsonResponse({
          page: {
            id: 2,
            narrativeText: 'Story.',
            choices: [{ text: 'Go', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' }],
            isEnding: false,
            openThreads: [],
            openThreadOverflowSummary: null,
            stateChanges: ['<script>alert("xss")</script>'],
          },
          wasGenerated: true,
          actDisplayInfo: null,
          deviationInfo: null,
        })
      );

    const button = document.querySelector('.choice-btn') as HTMLButtonElement;
    button.click();
    await jest.runAllTimersAsync();

    const stateChanges = document.getElementById('state-changes');
    expect(stateChanges?.innerHTML).not.toContain('<script>');
    expect(stateChanges?.innerHTML).toContain('&lt;script&gt;');
  });

  it('handles null/undefined narrative gracefully', async () => {
    const html = await clickAndGetNarrative('');
    expect(html).toContain('narrative-text');
  });
});
