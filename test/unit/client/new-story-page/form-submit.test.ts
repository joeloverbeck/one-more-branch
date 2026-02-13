import { buildNewStoryPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('new story form submit', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({ status: 'completed' }));
    global.fetch = fetchMock;

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'form-progress-uuid' },
      writable: true,
      configurable: true,
    });

    // Pin Math.random for deterministic progress phrases
    jest.spyOn(Math, 'random').mockReturnValue(0.0);

  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  function setupPage(): void {
    document.body.innerHTML = buildNewStoryPageHtml();
    loadAppAndInit();
  }

  function fillForm(overrides: Record<string, string> = {}): void {
    const defaults: Record<string, string> = {
      title: 'My Test Story',
      characterConcept: 'A brave warrior with a dark past',
      worldbuilding: 'A fantasy realm',
      startingSituation: 'Standing at the gates of doom',
      tone: 'dark fantasy',
      apiKey: 'sk-or-valid-test-key-12345',
    };
    const values = { ...defaults, ...overrides };

    (document.getElementById('title') as HTMLInputElement).value = values.title;
    (document.getElementById('characterConcept') as HTMLTextAreaElement).value =
      values.characterConcept;
    (document.getElementById('worldbuilding') as HTMLTextAreaElement).value = values.worldbuilding;
    (document.getElementById('startingSituation') as HTMLTextAreaElement).value =
      values.startingSituation;
    (document.getElementById('tone') as HTMLInputElement).value = values.tone;
    (document.getElementById('apiKey') as HTMLInputElement).value = values.apiKey;
  }

  function submitForm(): void {
    const form = document.querySelector('.story-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('POSTs to /stories/create-ajax with form fields and progressId', async () => {
    setupPage();
    fillForm();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(mockJsonResponse({ success: true, storyId: 'new-story-42' }));
    });

    submitForm();
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('create-ajax')
    );
    expect(postCall).toBeDefined();

    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body.title).toBe('My Test Story');
    expect(body.characterConcept).toBe('A brave warrior with a dark past');
    expect(body.worldbuilding).toBe('A fantasy realm');
    expect(body.tone).toBe('dark fantasy');
    expect(body.startingSituation).toBe('Standing at the gates of doom');
    expect(body.apiKey).toBe('sk-or-valid-test-key-12345');
    expect(body.progressId).toBe('form-progress-uuid');
  });

  it('stores API key via setApiKey on success', async () => {
    setupPage();
    fillForm({ apiKey: 'sk-or-my-special-key-abc' });

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(mockJsonResponse({ success: true, storyId: 'story-1' }));
    });

    submitForm();
    await jest.runAllTimersAsync();

    expect(sessionStorage.getItem('omb_api_key')).toBe('sk-or-my-special-key-abc');
  });

  it('submits successful preparation response for briefing flow', async () => {
    setupPage();
    fillForm();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(mockJsonResponse({ success: true, storyId: 'story-1' }));
    });

    submitForm();
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('create-ajax')
    );
    expect(postCall).toBeDefined();
  });

  it('shows error banner on failed response', async () => {
    setupPage();
    fillForm();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(
        mockJsonResponse({ success: false, error: 'Rate limit exceeded' }, 429)
      );
    });

    submitForm();
    await jest.runAllTimersAsync();

    const errorDiv = document.querySelector('.alert-error');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toBe('Rate limit exceeded');
    expect((errorDiv as HTMLElement).style.display).toBe('block');
  });

  it('re-enables submit button on error', async () => {
    setupPage();
    fillForm();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Error' }, 500));
    });

    submitForm();
    await jest.runAllTimersAsync();

    const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);
  });

  it('hides loading overlay after completion', async () => {
    setupPage();
    fillForm();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(mockJsonResponse({ success: true, storyId: 'story-1' }));
    });

    submitForm();
    await jest.runAllTimersAsync();

    const loading = document.getElementById('loading');
    expect(loading?.style.display).toBe('none');
  });

  it('includes NPC entries when present', async () => {
    setupPage();
    fillForm();

    // Add an NPC via the UI controls
    const nameInput = document.getElementById('npc-name-input') as HTMLInputElement;
    const descInput = document.getElementById('npc-desc-input') as HTMLTextAreaElement;
    nameInput.value = 'Gandalf';
    descInput.value = 'A wise wizard';

    const addBtn = document.getElementById('npc-add-btn') as HTMLButtonElement;
    addBtn.click();

    fetchMock.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('generation-progress')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      return Promise.resolve(mockJsonResponse({ success: true, storyId: 'story-npc' }));
    });

    submitForm();
    await jest.runAllTimersAsync();

    const postCall = (fetchMock.mock.calls as [string, RequestInit?][]).find(
      (call) => typeof call[0] === 'string' && call[0].includes('create-ajax')
    );
    const body = JSON.parse(postCall![1]!.body as string) as Record<string, unknown>;
    expect(body.npcs).toEqual([{ name: 'Gandalf', description: 'A wise wizard' }]);
  });
});
