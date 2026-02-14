import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

function buildAnalystResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    beatConcluded: false,
    beatResolution: '',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: [],
    narrativeSummary: 'Summary',
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    sceneMomentum: 'STASIS',
    objectiveEvidenceStrength: 'WEAK_IMPLICIT',
    commitmentStrength: 'TENTATIVE',
    structuralPositionSignal: 'WITHIN_ACTIVE_BEAT',
    entryConditionReadiness: 'PARTIAL',
    objectiveAnchors: [],
    anchorEvidence: [],
    completionGateSatisfied: false,
    completionGateFailureReason: 'Need a stronger commitment.',
    toneAdherent: true,
    toneDriftDescription: '',
    promisesDetected: [],
    promisesResolved: [],
    promisePayoffAssessments: [],
    threadPayoffAssessments: [],
    rawResponse: '{}',
    ...overrides,
  };
}

describe('analyst insights modal', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;
    sessionStorage.setItem('omb_api_key', 'sk-or-test-key-valid');
    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'insights-uuid-1' },
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

  it('opens and closes the modal from the trigger and close button', async () => {
    document.body.innerHTML = buildPlayPageHtml({ analystResult: buildAnalystResult() });
    loadAppAndInit();

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    const modal = document.getElementById('insights-modal') as HTMLElement;
    const close = document.getElementById('insights-close-btn') as HTMLButtonElement;

    expect(button).not.toBeNull();
    button.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(modal.style.display).toBe('flex');

    close.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(modal.style.display).toBe('none');
  });

  it('closes the modal on outside click and Escape', async () => {
    document.body.innerHTML = buildPlayPageHtml({ analystResult: buildAnalystResult() });
    loadAppAndInit();

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    const modal = document.getElementById('insights-modal') as HTMLElement;

    button.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(modal.style.display).toBe('flex');

    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await jest.advanceTimersByTimeAsync(0);
    expect(modal.style.display).toBe('none');

    button.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(modal.style.display).toBe('flex');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await jest.advanceTimersByTimeAsync(0);
    expect(modal.style.display).toBe('none');
  });

  it('hides the trigger when analyst data is null', async () => {
    document.body.innerHTML = buildPlayPageHtml({ analystResult: null });
    loadAppAndInit();
    await jest.advanceTimersByTimeAsync(0);

    const button = document.getElementById('insights-btn') as HTMLElement;
    expect(button).not.toBeNull();
    expect(button.style.display).toBe('none');
  });

  it('renders sections inside collapsible details elements', async () => {
    document.body.innerHTML = buildPlayPageHtml({ analystResult: buildAnalystResult() });
    loadAppAndInit();

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const modalBody = document.getElementById('insights-modal-body') as HTMLElement;
    const detailsElements = modalBody.querySelectorAll('details');
    expect(detailsElements.length).toBeGreaterThanOrEqual(2);
    detailsElements.forEach((d) => {
      expect(d.hasAttribute('open')).toBe(true);
      expect(d.querySelector('summary')).not.toBeNull();
    });
  });

  it('displays beat info subtitle when actDisplayInfo is provided', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      analystResult: buildAnalystResult(),
      actDisplayInfo: { displayString: 'Act 1: The Setup - Beat 1.2: The Discovery' },
    });
    loadAppAndInit();

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const modalBody = document.getElementById('insights-modal-body') as HTMLElement;
    const subtitle = modalBody.querySelector('.insights-beat-subtitle');
    expect(subtitle).not.toBeNull();
    expect(subtitle?.textContent).toBe('Act 1: The Setup - Beat 1.2: The Discovery');
  });

  it('displays scene summary when provided', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      analystResult: buildAnalystResult(),
      sceneSummary: 'The hero arrived at the castle gates.',
    });
    loadAppAndInit();

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const modalBody = document.getElementById('insights-modal-body') as HTMLElement;
    const summary = modalBody.querySelector('.insights-scene-summary');
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toBe('The hero arrived at the castle gates.');
  });

  it('displays full thread text without truncation in thread payoffs', async () => {
    const longText = 'A very long thread text that should not be truncated at all because truncation was removed from the implementation';
    document.body.innerHTML = buildPlayPageHtml({
      analystResult: buildAnalystResult({
        threadPayoffAssessments: [
          {
            threadId: 'th-1',
            threadText: longText,
            satisfactionLevel: 'WELL_EARNED',
            reasoning: 'Good payoff.',
          },
        ],
      }),
    });
    loadAppAndInit();

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const modalBody = document.getElementById('insights-modal-body') as HTMLElement;
    const threadTextEl = modalBody.querySelector('.payoff-thread-text');
    expect(threadTextEl).not.toBeNull();
    expect(threadTextEl?.textContent).toBe(longText);
  });

  it('renders thread payoffs with separate label, text, and reasoning elements', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      analystResult: buildAnalystResult({
        threadPayoffAssessments: [
          {
            threadId: 'th-1',
            threadText: 'Find the artifact',
            satisfactionLevel: 'ADEQUATE',
            reasoning: 'Resolved naturally.',
          },
        ],
      }),
    });
    loadAppAndInit();

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const modalBody = document.getElementById('insights-modal-body') as HTMLElement;
    const payoffItem = modalBody.querySelector('.payoff-item') as HTMLElement;
    const label = modalBody.querySelector('.payoff-thread-label');
    const badge = modalBody.querySelector('.payoff-satisfaction-badge');
    const threadText = modalBody.querySelector('.payoff-thread-text');
    const reasoning = modalBody.querySelector('.payoff-reasoning');
    expect(label).not.toBeNull();
    expect(badge).not.toBeNull();
    expect(badge?.classList.contains('payoff-satisfaction-badge--centered')).toBe(true);
    expect(threadText?.textContent).toBe('Find the artifact');
    expect(reasoning?.textContent).toBe('Resolved naturally.');
    expect(Array.from(payoffItem.children).indexOf(label as Element)).toBeLessThan(
      Array.from(payoffItem.children).indexOf(threadText as Element)
    );
    expect(Array.from(payoffItem.children).indexOf(threadText as Element)).toBeLessThan(
      Array.from(payoffItem.children).indexOf(badge as Element)
    );
    expect(Array.from(payoffItem.children).indexOf(badge as Element)).toBeLessThan(
      Array.from(payoffItem.children).indexOf(reasoning as Element)
    );
  });

  it('renders completion gate as a gauge row instead of plain text', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      analystResult: buildAnalystResult({
        completionGateSatisfied: false,
        completionGateFailureReason: 'Need stronger commitment.',
      }),
    });
    loadAppAndInit();

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const modalBody = document.getElementById('insights-modal-body') as HTMLElement;
    // Should have a gauge row for Completion Gate
    const gaugeRows = modalBody.querySelectorAll('.beat-gauge__row');
    const labels = Array.from(gaugeRows).map((r) => r.querySelector('.beat-gauge__label')?.textContent);
    expect(labels).toContain('Completion Gate');
    // Should NOT have old completion-gate paragraph
    expect(modalBody.querySelector('.completion-gate')).toBeNull();
    // Should show the reason text below as italic subtitle
    const reason = modalBody.querySelector('.completion-gate-reason');
    expect(reason).not.toBeNull();
    expect(reason?.textContent).toBe('Need stronger commitment.');
  });

  it('renders completion gate gauge as satisfied (100%) when gate is met', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      analystResult: buildAnalystResult({
        completionGateSatisfied: true,
        completionGateFailureReason: '',
      }),
    });
    loadAppAndInit();

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const modalBody = document.getElementById('insights-modal-body') as HTMLElement;
    const gaugeRows = modalBody.querySelectorAll('.beat-gauge__row');
    const gateRow = Array.from(gaugeRows).find(
      (r) => r.querySelector('.beat-gauge__label')?.textContent === 'Completion Gate'
    );
    expect(gateRow).not.toBeNull();
    const fill = gateRow?.querySelector('.beat-gauge__fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
    // No reason text when satisfied with empty reason
    expect(modalBody.querySelector('.completion-gate-reason')).toBeNull();
  });

  it('renders thread payoff badges when resolvedThreadMeta is provided', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      analystResult: buildAnalystResult({
        threadPayoffAssessments: [
          {
            threadId: 'td-1',
            threadText: 'Find the artifact',
            satisfactionLevel: 'WELL_EARNED',
            reasoning: 'Excellent resolution.',
          },
        ],
      }),
      resolvedThreadMeta: {
        'td-1': { threadType: 'QUEST', urgency: 'HIGH' },
      },
    });
    loadAppAndInit();

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const modalBody = document.getElementById('insights-modal-body') as HTMLElement;
    const badge = modalBody.querySelector('.payoff-thread-badge');
    expect(badge).not.toBeNull();
    const img = badge?.querySelector('img.thread-icon') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toContain('thread-quest-high');
  });

  it('gracefully omits thread payoff badge when meta is missing', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      analystResult: buildAnalystResult({
        threadPayoffAssessments: [
          {
            threadId: 'td-1',
            threadText: 'Find the artifact',
            satisfactionLevel: 'ADEQUATE',
            reasoning: 'Resolved.',
          },
        ],
      }),
      // no resolvedThreadMeta
    });
    loadAppAndInit();

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);

    const modalBody = document.getElementById('insights-modal-body') as HTMLElement;
    const badge = modalBody.querySelector('.payoff-thread-badge');
    expect(badge).toBeNull();
    // But the payoff item itself should still render
    const payoffItem = modalBody.querySelector('.payoff-item');
    expect(payoffItem).not.toBeNull();
  });

  it('updates modal content on choice response and supports ending-page initialization', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      analystResult: buildAnalystResult({ sceneMomentum: 'STASIS' }),
      isEnding: true,
    });
    loadAppAndInit();

    const endingButton = document.getElementById('insights-btn') as HTMLButtonElement;
    expect(endingButton).not.toBeNull();
    endingButton.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(document.getElementById('insights-modal-body')?.textContent).toContain('Stasis');

    document.body.innerHTML = buildPlayPageHtml({
      analystResult: buildAnalystResult({ sceneMomentum: 'STASIS' }),
      isEnding: false,
    });
    loadAppAndInit();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      return Promise.resolve(
        mockJsonResponse({
          page: {
            id: 2,
            narrativeText: 'Next page.',
            sceneSummary: 'The scene unfolded dramatically.',
            choices: [
              { text: 'Continue', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
            ],
            isEnding: false,
            analystResult: buildAnalystResult({
              sceneMomentum: 'MAJOR_PROGRESS',
              completionGateSatisfied: true,
              completionGateFailureReason: '',
            }),
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
            resolvedThreadMeta: {},
          },
          wasGenerated: true,
          actDisplayInfo: { displayString: 'Act 2: Rising Action - Beat 2.1: Confrontation' },
          deviationInfo: null,
        })
      );
    });

    const button = document.getElementById('insights-btn') as HTMLButtonElement;
    button.click();
    await jest.advanceTimersByTimeAsync(0);
    expect(document.getElementById('insights-modal-body')?.textContent).toContain('Stasis');

    const choice = document.querySelector('.choice-btn') as HTMLButtonElement;
    choice.click();
    await jest.runAllTimersAsync();

    const modalBody = document.getElementById('insights-modal-body') as HTMLElement;
    expect(modalBody.textContent).toContain('Major Progress');
    expect(modalBody.textContent).toContain('Act 2: Rising Action - Beat 2.1: Confrontation');
    expect(modalBody.textContent).toContain('The scene unfolded dramatically.');
  });
});
