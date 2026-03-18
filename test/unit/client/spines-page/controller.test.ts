import { buildSpinesPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { createRoutedFetch, mockJsonResponse } from '../helpers/fetch-helpers';

const MOCK_SPINE_OPTION = {
  centralDramaticQuestion: 'Can justice survive?',
  protagonistNeedVsWant: { need: 'truth', want: 'safety', dynamic: 'DIVERGENT' },
  primaryAntagonisticForce: { description: 'Tribunal', pressureMechanism: 'Courts' },
  storySpineType: 'MYSTERY',
  conflictAxis: 'INDIVIDUAL_VS_SYSTEM',
  conflictType: 'PERSON_VS_SOCIETY',
  characterArcType: 'POSITIVE_CHANGE',
  toneFeel: ['grim'],
  toneAvoid: ['comedy'],
  wantNeedCollisionPoint: 'At trial',
  protagonistDeepestFear: 'Betrayal',
};

describe('spines page controller', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    jest.spyOn(window.history, 'pushState').mockImplementation(() => {});
    Element.prototype.scrollIntoView = jest.fn();

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'progress-test-uuid' },
      writable: true,
      configurable: true,
    });

    sessionStorage.setItem('omb_api_key', 'sk-or-test-key-valid');
    jest.spyOn(Math, 'random').mockReturnValue(0.0);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  function setupPage(): void {
    document.body.innerHTML = buildSpinesPageHtml();
    loadAppAndInit();
  }

  it('initializes without errors when spines-page is present', () => {
    expect(() => {
      setupPage();
    }).not.toThrow();
  });

  it('enables generate button only when all required fields are filled', () => {
    setupPage();

    const btn = document.getElementById('generate-spines-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    // Fill required fields
    (document.getElementById('spineConceptId') as HTMLSelectElement).value = 'concept-1';
    (document.getElementById('spineProtagonistId') as HTMLSelectElement).value = 'char-1';
    (document.getElementById('spineWorldbuildingId') as HTMLSelectElement).value = 'wb-1';
    const apiKey = document.getElementById('spineApiKey') as HTMLInputElement;
    apiKey.value = 'sk-or-test-key-valid';
    apiKey.dispatchEvent(new Event('input'));

    // Also dispatch change events for selects
    document.getElementById('spineConceptId')!.dispatchEvent(new Event('change'));
    document.getElementById('spineProtagonistId')!.dispatchEvent(new Event('change'));
    document.getElementById('spineWorldbuildingId')!.dispatchEvent(new Event('change'));

    expect(btn.disabled).toBe(false);
  });

  it('calls /spines/api/generate on button click and renders results', async () => {
    const fetchMock = createRoutedFetch({
      '/spines/api/generate': () =>
        mockJsonResponse({
          success: true,
          options: [MOCK_SPINE_OPTION],
        }),
      '/generation-progress': () => mockJsonResponse({ status: 'completed' }),
    });
    global.fetch = fetchMock;

    setupPage();

    // Fill required fields
    (document.getElementById('spineConceptId') as HTMLSelectElement).value = 'concept-1';
    (document.getElementById('spineProtagonistId') as HTMLSelectElement).value = 'char-1';
    (document.getElementById('spineWorldbuildingId') as HTMLSelectElement).value = 'wb-1';
    const apiKey = document.getElementById('spineApiKey') as HTMLInputElement;
    apiKey.value = 'sk-or-test-key-valid';
    apiKey.dispatchEvent(new Event('input'));
    document.getElementById('spineConceptId')!.dispatchEvent(new Event('change'));
    document.getElementById('spineProtagonistId')!.dispatchEvent(new Event('change'));
    document.getElementById('spineWorldbuildingId')!.dispatchEvent(new Event('change'));

    const btn = document.getElementById('generate-spines-btn') as HTMLButtonElement;
    btn.click();

    // Wait for async fetch
    await jest.runAllTimersAsync();
    await Promise.resolve();
    await jest.runAllTimersAsync();

    // Check that generate endpoint was called
    const fetchCalls = fetchMock.mock.calls as [string, RequestInit?][];
    const generateCall = fetchCalls.find(
      (call: [string, RequestInit?]) =>
        typeof call[0] === 'string' && call[0].includes('/spines/api/generate')
    );
    expect(generateCall).toBeDefined();

    // Check request body
    const body = JSON.parse((generateCall as [string, RequestInit])[1]?.body as string) as {
      conceptId: string;
      protagonistCharacterId: string;
      worldbuildingId: string;
    };
    expect(body.conceptId).toBe('concept-1');
    expect(body.protagonistCharacterId).toBe('char-1');
    expect(body.worldbuildingId).toBe('wb-1');
  });

  it('calls /spines/api/save when save button is clicked on a generated spine', async () => {
    const savedSpine = {
      id: 'spine-saved-1',
      name: 'MYSTERY — Can justice survive?',
      spineOption: MOCK_SPINE_OPTION,
    };

    const fetchMock = createRoutedFetch({
      '/spines/api/generate': () =>
        mockJsonResponse({ success: true, options: [MOCK_SPINE_OPTION] }),
      '/spines/api/save': () => mockJsonResponse({ success: true, spine: savedSpine }),
      '/generation-progress': () => mockJsonResponse({ status: 'completed' }),
    });
    global.fetch = fetchMock;

    setupPage();

    // Fill and generate
    (document.getElementById('spineConceptId') as HTMLSelectElement).value = 'concept-1';
    (document.getElementById('spineProtagonistId') as HTMLSelectElement).value = 'char-1';
    (document.getElementById('spineWorldbuildingId') as HTMLSelectElement).value = 'wb-1';
    const apiKey = document.getElementById('spineApiKey') as HTMLInputElement;
    apiKey.value = 'sk-or-test-key-valid';
    apiKey.dispatchEvent(new Event('input'));
    document.getElementById('spineConceptId')!.dispatchEvent(new Event('change'));
    document.getElementById('spineProtagonistId')!.dispatchEvent(new Event('change'));
    document.getElementById('spineWorldbuildingId')!.dispatchEvent(new Event('change'));

    document.getElementById('generate-spines-btn')!.click();
    await jest.runAllTimersAsync();
    await Promise.resolve();
    await jest.runAllTimersAsync();

    // Click save on generated spine
    const saveBtn = document.querySelector('.save-spine-btn') as HTMLButtonElement;
    expect(saveBtn).not.toBeNull();
    saveBtn.click();

    await jest.runAllTimersAsync();
    await Promise.resolve();
    await jest.runAllTimersAsync();

    const fetchCalls = fetchMock.mock.calls as [string, RequestInit?][];
    const saveCall = fetchCalls.find(
      (call: [string, RequestInit?]) =>
        typeof call[0] === 'string' && call[0].includes('/spines/api/save')
    );
    expect(saveCall).toBeDefined();
  });
});
