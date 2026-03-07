import { buildPlayPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('rebuildChoicesSection', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(mockJsonResponse({ error: 'No mock' }, 500));
    });
    global.fetch = fetchMock;

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'rebuild-uuid' },
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

  function mockCustomChoiceSuccess(choices: unknown[]): void {
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('custom-choice')) {
        return Promise.resolve(mockJsonResponse({ choices }));
      }
      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    });
  }

  it('removes old custom choice containers before inserting new ones', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    // Verify initial custom choice containers exist
    expect(document.querySelector('.protagonist-guidance')).not.toBeNull();
    expect(document.querySelector('.custom-choice-container')).not.toBeNull();
    expect(document.querySelector('.custom-choice-enums')).not.toBeNull();

    const newChoices = [
      { text: 'Option A', choiceType: 'INTERVENE', primaryDelta: 'GOAL_PRIORITY_CHANGE' },
      { text: 'Option B', choiceType: 'COMMIT', primaryDelta: 'LOCATION_ACCESS_CHANGE' },
    ];
    mockCustomChoiceSuccess(newChoices);

    const input = document.querySelector('.custom-choice-input') as HTMLInputElement;
    input.value = 'Test choice';
    (document.querySelector('.custom-choice-btn') as HTMLButtonElement).click();
    await jest.runAllTimersAsync();

    // After rebuild, should have exactly one of each custom container
    expect(document.querySelectorAll('.protagonist-guidance').length).toBe(1);
    expect(document.querySelectorAll('.custom-choice-container').length).toBe(1);
    expect(document.querySelectorAll('.custom-choice-enums').length).toBe(1);
  });

  it('replaces choice buttons with new choices', async () => {
    document.body.innerHTML = buildPlayPageHtml({
      choices: [
        { text: 'Original A', choiceType: 'INTERVENE', primaryDelta: 'GOAL_PRIORITY_CHANGE' },
      ],
    });
    loadAppAndInit();

    const originalButtons = document.querySelectorAll('.choice-btn');
    expect(originalButtons.length).toBe(1);
    expect(originalButtons[0].querySelector('.choice-text')?.textContent).toBe('Original A');

    mockCustomChoiceSuccess([
      { text: 'Replaced A', choiceType: 'INTERVENE', primaryDelta: 'GOAL_PRIORITY_CHANGE' },
      { text: 'Replaced B', choiceType: 'COMMIT', primaryDelta: 'LOCATION_ACCESS_CHANGE' },
      { text: 'Replaced C', choiceType: 'INVESTIGATE', primaryDelta: 'INFORMATION_STATE_CHANGE' },
    ]);

    const input = document.querySelector('.custom-choice-input') as HTMLInputElement;
    input.value = 'Trigger rebuild';
    (document.querySelector('.custom-choice-btn') as HTMLButtonElement).click();
    await jest.runAllTimersAsync();

    const updatedButtons = document.querySelectorAll('.choice-btn');
    expect(updatedButtons.length).toBe(3);
    expect(updatedButtons[0].querySelector('.choice-text')?.textContent).toBe('Replaced A');
    expect(updatedButtons[1].querySelector('.choice-text')?.textContent).toBe('Replaced B');
    expect(updatedButtons[2].querySelector('.choice-text')?.textContent).toBe('Replaced C');
  });

  it('preserves protagonist guidance values on custom choice rebuild', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    // Type something in the suggested speech input
    const speechInput = document.querySelector('#guidance-speech') as HTMLTextAreaElement;
    const emotionsInput = document.querySelector('#guidance-emotions') as HTMLTextAreaElement;
    const thoughtsInput = document.querySelector('#guidance-thoughts') as HTMLTextAreaElement;
    emotionsInput.value = 'Afraid';
    thoughtsInput.value = 'This might be a trap.';
    speechInput.value = 'I shall speak!';

    mockCustomChoiceSuccess([
      { text: 'Go left', choiceType: 'INTERVENE', primaryDelta: 'GOAL_PRIORITY_CHANGE' },
    ]);

    const input = document.querySelector('.custom-choice-input') as HTMLInputElement;
    input.value = 'New choice';
    (document.querySelector('.custom-choice-btn') as HTMLButtonElement).click();
    await jest.runAllTimersAsync();

    // The guidance fields should preserve values
    const newSpeechInput = document.querySelector('#guidance-speech') as HTMLTextAreaElement;
    const newEmotionsInput = document.querySelector('#guidance-emotions') as HTMLTextAreaElement;
    const newThoughtsInput = document.querySelector('#guidance-thoughts') as HTMLTextAreaElement;
    expect(newSpeechInput.value).toBe('I shall speak!');
    expect(newEmotionsInput.value).toBe('Afraid');
    expect(newThoughtsInput.value).toBe('This might be a trap.');
  });

  it('re-creates #choices div if it has been detached from choicesSectionEl', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    // Detach #choices (simulating ideation UI replacing content) without
    // destroying the custom choice buttons and their event handlers
    const choicesSection = document.getElementById('choices-section')!;
    const choicesEl = choicesSection.querySelector('#choices')!;
    choicesEl.remove();

    // Verify #choices is gone
    expect(choicesSection.querySelector('#choices')).toBeNull();

    const newChoices = [
      { text: 'Option A', choiceType: 'INTERVENE', primaryDelta: 'GOAL_PRIORITY_CHANGE' },
      { text: 'Option B', choiceType: 'COMMIT', primaryDelta: 'LOCATION_ACCESS_CHANGE' },
    ];
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('custom-choice')) {
        return Promise.resolve(mockJsonResponse({ choices: newChoices }));
      }
      return Promise.resolve(mockJsonResponse({ status: 'completed' }));
    });

    const input = choicesSection.querySelector('.custom-choice-input') as HTMLInputElement;
    input.value = 'Test choice';
    (choicesSection.querySelector('.custom-choice-btn') as HTMLButtonElement).click();
    await jest.runAllTimersAsync();

    // The #choices div should be re-created and contain the new choices
    const recreatedChoices = choicesSection.querySelector('#choices');
    expect(recreatedChoices).not.toBeNull();
    const buttons = recreatedChoices!.querySelectorAll('.choice-btn');
    expect(buttons.length).toBe(2);
    expect(buttons[0].querySelector('.choice-text')?.textContent).toBe('Option A');
  });

  it('removes .scene-ideation-wrapper during rebuild', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    // Inject a stale scene-ideation-wrapper into #choices-section
    const choicesSection = document.getElementById('choices-section')!;
    const ideationWrapper = document.createElement('div');
    ideationWrapper.className = 'scene-ideation-wrapper';
    ideationWrapper.textContent = 'Choose a Scene Direction';
    choicesSection.appendChild(ideationWrapper);

    expect(choicesSection.querySelector('.scene-ideation-wrapper')).not.toBeNull();

    const newChoices = [
      { text: 'Option A', choiceType: 'INTERVENE', primaryDelta: 'GOAL_PRIORITY_CHANGE' },
      { text: 'Option B', choiceType: 'COMMIT', primaryDelta: 'LOCATION_ACCESS_CHANGE' },
    ];
    mockCustomChoiceSuccess(newChoices);

    const input = document.querySelector('.custom-choice-input') as HTMLInputElement;
    input.value = 'Trigger rebuild';
    (document.querySelector('.custom-choice-btn') as HTMLButtonElement).click();
    await jest.runAllTimersAsync();

    // After rebuild, scene-ideation-wrapper should be gone
    expect(choicesSection.querySelector('.scene-ideation-wrapper')).toBeNull();
    // And we should have exactly one set of UI elements
    expect(document.querySelectorAll('.protagonist-guidance').length).toBe(1);
    expect(document.querySelectorAll('.custom-choice-container').length).toBe(1);
    expect(document.querySelectorAll('#choices').length).toBe(1);
  });

  it('binds custom choice events after rebuild', async () => {
    document.body.innerHTML = buildPlayPageHtml();
    loadAppAndInit();

    // First rebuild
    mockCustomChoiceSuccess([
      { text: 'First', choiceType: 'INTERVENE', primaryDelta: 'GOAL_PRIORITY_CHANGE' },
    ]);

    const input1 = document.querySelector('.custom-choice-input') as HTMLInputElement;
    input1.value = 'Trigger first';
    (document.querySelector('.custom-choice-btn') as HTMLButtonElement).click();
    await jest.runAllTimersAsync();

    const callsAfterFirst = fetchMock.mock.calls.filter(
      (call: [string]) => typeof call[0] === 'string' && call[0].includes('custom-choice')
    ).length;

    // After rebuild, the new input+button should be functional
    mockCustomChoiceSuccess([
      { text: 'First', choiceType: 'INTERVENE', primaryDelta: 'GOAL_PRIORITY_CHANGE' },
      { text: 'Second', choiceType: 'COMMIT', primaryDelta: 'GOAL_PRIORITY_CHANGE' },
    ]);

    const input2 = document.querySelector('.custom-choice-input') as HTMLInputElement;
    input2.value = 'Trigger second';
    (document.querySelector('.custom-choice-btn') as HTMLButtonElement).click();
    await jest.runAllTimersAsync();

    // Should have made at least one more custom-choice call after rebuild
    const callsAfterSecond = fetchMock.mock.calls.filter(
      (call: [string]) => typeof call[0] === 'string' && call[0].includes('custom-choice')
    ).length;
    expect(callsAfterSecond).toBeGreaterThan(callsAfterFirst);
  });
});
