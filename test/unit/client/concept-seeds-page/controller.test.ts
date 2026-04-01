import { buildConceptSeedsPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';

describe('concept seeds page controller', () => {
  let fetchMock: jest.Mock;

  function mockJsonResponse(body: unknown, ok = true, status = 200): Response {
    return {
      ok,
      status,
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Response;
  }

  function flushPromises(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('shows the overlay during seed generation and hides it after success', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === '/kernels/api/list') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            kernels: [{ id: 'kernel-1', name: 'Kernel 1' }],
          })
        );
      }
      if (url === '/kernels/api/kernel-1') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            kernel: {
              id: 'kernel-1',
              evaluatedKernel: {
                kernel: {
                  dramaticThesis: 'Thesis',
                  valueAtStake: 'Value',
                  opposingForce: 'Force',
                  thematicQuestion: 'Question',
                },
                overallScore: 80,
              },
            },
          })
        );
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'running', activeStage: 'brainstorming' }));
      }
      if (url === '/concept-seeds/api/generate') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            seeds: [{ oneLineHook: 'Seed hook', genreFrame: 'FANTASY', conflictAxis: 'POWER_VS_MORALITY' }],
            characterWorlds: [{}],
            kernelId: 'kernel-1',
          })
        );
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    document.body.innerHTML = buildConceptSeedsPageHtml();
    loadAppAndInit();
    await flushPromises();

    const kernelSelector = document.getElementById('kernel-selector') as HTMLSelectElement;
    const protagonist = document.getElementById('protagonistDetails') as HTMLTextAreaElement;
    const genreVibes = document.getElementById('genreVibes') as HTMLInputElement;
    const apiKeyInput = document.getElementById('seedApiKey') as HTMLInputElement;
    const generateBtn = document.getElementById('generate-seeds-btn') as HTMLButtonElement;
    const loading = document.getElementById('loading') as HTMLElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    protagonist.value = 'A disgraced former surgeon';
    protagonist.dispatchEvent(new Event('input'));
    genreVibes.value = 'dark fantasy';
    genreVibes.dispatchEvent(new Event('input'));
    kernelSelector.value = 'kernel-1';
    kernelSelector.dispatchEvent(new Event('change'));
    await flushPromises();

    expect(generateBtn.disabled).toBe(false);
    generateBtn.click();
    expect(loading.style.display).toBe('flex');
    expect(generateBtn.disabled).toBe(true);
    await flushPromises();
    await flushPromises();

    expect(loading.style.display).toBe('none');
    expect(generateBtn.disabled).toBe(false);
    expect(document.getElementById('seed-results-section')?.style.display).toBe('block');
  });

  it('shows generation failures in the dedicated inline error element', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === '/kernels/api/list') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            kernels: [{ id: 'kernel-1', name: 'Kernel 1' }],
          })
        );
      }
      if (url === '/kernels/api/kernel-1') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            kernel: { id: 'kernel-1', evaluatedKernel: { kernel: { dramaticThesis: 'T' }, overallScore: 80 } },
          })
        );
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      if (url === '/concept-seeds/api/generate') {
        return Promise.resolve(
          mockJsonResponse({ success: false, error: 'Seed generation failed' }, false, 500)
        );
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    document.body.innerHTML = buildConceptSeedsPageHtml();
    loadAppAndInit();
    await flushPromises();

    const kernelSelector = document.getElementById('kernel-selector') as HTMLSelectElement;
    const protagonist = document.getElementById('protagonistDetails') as HTMLTextAreaElement;
    const genreVibes = document.getElementById('genreVibes') as HTMLInputElement;
    const apiKeyInput = document.getElementById('seedApiKey') as HTMLInputElement;
    const generateBtn = document.getElementById('generate-seeds-btn') as HTMLButtonElement;
    const error = document.getElementById('concept-seeds-error') as HTMLElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    protagonist.value = 'A disgraced former surgeon';
    protagonist.dispatchEvent(new Event('input'));
    genreVibes.value = 'dark fantasy';
    genreVibes.dispatchEvent(new Event('input'));
    kernelSelector.value = 'kernel-1';
    kernelSelector.dispatchEvent(new Event('change'));
    await flushPromises();

    generateBtn.click();
    await flushPromises();
    await flushPromises();

    expect(error.textContent).toContain('Seed generation failed');
    expect(error.style.display).toBe('block');
    expect(generateBtn.disabled).toBe(false);
  });

  it('opens text editor when clicking a concept-field-value in a saved seed', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === '/kernels/api/list') {
        return Promise.resolve(mockJsonResponse({ success: true, kernels: [] }));
      }
      return Promise.resolve(mockJsonResponse({ success: true }));
    });

    document.body.innerHTML = buildConceptSeedsPageHtml();
    loadAppAndInit();
    await flushPromises();

    const nameValue = document.querySelector(
      '[data-field-key="name"] .concept-field-value'
    ) as HTMLElement;
    expect(nameValue).not.toBeNull();
    nameValue.click();

    const input = nameValue.querySelector('input, textarea');
    expect(input).not.toBeNull();
  });

  it('sends PUT with fieldPath and value when inline edit commits', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === '/kernels/api/list') {
        return Promise.resolve(mockJsonResponse({ success: true, kernels: [] }));
      }
      if (url.includes('/concept-seeds/api/seed-1')) {
        return Promise.resolve(mockJsonResponse({ success: true, seed: { name: 'Updated' } }));
      }
      return Promise.resolve(mockJsonResponse({ success: true }));
    });

    document.body.innerHTML = buildConceptSeedsPageHtml();
    loadAppAndInit();
    await flushPromises();

    const nameValue = document.querySelector(
      '[data-field-key="name"] .concept-field-value'
    ) as HTMLElement;
    nameValue.click();

    const input = nameValue.querySelector('input') as HTMLInputElement;
    input.value = 'Updated Name';
    input.dispatchEvent(new Event('blur'));
    await flushPromises();

    const putCall = fetchMock.mock.calls.find(
      (c: [RequestInfo | URL, RequestInit?]) => {
        const url = typeof c[0] === 'string' ? c[0] : '';
        return url.includes('/concept-seeds/api/seed-1') && c[1]?.method === 'PUT';
      }
    );
    expect(putCall).toBeDefined();
    const body = JSON.parse(putCall![1]!.body as string);
    expect(body).toEqual({ fieldPath: 'name', value: 'Updated Name' });
  });

  it('does not contain Edit Name button references', () => {
    document.body.innerHTML = buildConceptSeedsPageHtml();
    expect(document.querySelector('.seed-edit-btn')).toBeNull();
  });
});
