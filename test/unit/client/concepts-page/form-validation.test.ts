import { buildConceptsPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';

describe('concepts page form validation', () => {
  let fetchMock: jest.Mock;

  function mockJsonResponse(body: unknown, ok = true, status = 200): Response {
    return {
      ok,
      status,
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Response;
  }

  beforeEach(() => {
    fetchMock = jest.fn();
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      if (url === '/kernels/api/list') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            kernels: [{ id: 'kernel-1', name: 'Kernel 1' }],
          }),
        );
      }
      if (url === '/kernels/api/kernel-1') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            kernel: {
              id: 'kernel-1',
              name: 'Kernel 1',
              evaluatedKernel: {
                kernel: {
                  dramaticThesis: 'Control destroys trust',
                  valueAtStake: 'Trust',
                  opposingForce: 'Fear of uncertainty',
                  directionOfChange: 'IRONIC',
                  conflictAxis: 'TRUTH_VS_STABILITY',
                  dramaticStance: 'TRAGIC',
                  thematicQuestion: 'Can safety exist without control?',
                  antithesis: 'Counter-argument challenges the thesis.',
                },
                overallScore: 82,
              },
            },
          }),
        );
      }
      if (url === '/concepts/api/generate/ideate') {
        return Promise.resolve(mockJsonResponse({ success: true, seeds: [], characterWorlds: [] }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });
    global.fetch = fetchMock;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  function setupPage(): void {
    document.body.innerHTML = buildConceptsPageHtml();
    loadAppAndInit();
  }

  function flushPromises(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('keeps generate disabled until both API key and kernel are selected', async () => {
    setupPage();

    const apiKeyInput = document.getElementById('conceptApiKey') as HTMLInputElement;
    const kernelSelector = document.getElementById('kernel-selector') as HTMLSelectElement;
    const generateBtn = document.getElementById('generate-concepts-btn') as HTMLButtonElement;
    expect(generateBtn.disabled).toBe(true);

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    expect(generateBtn.disabled).toBe(true);

    await flushPromises();
    kernelSelector.value = 'kernel-1';
    kernelSelector.dispatchEvent(new Event('change'));
    await flushPromises();

    expect(generateBtn.disabled).toBe(false);
  });

  it('shows inline error when no seed fields are provided', async () => {
    setupPage();

    const apiKeyInput = document.getElementById('conceptApiKey') as HTMLInputElement;
    const kernelSelector = document.getElementById('kernel-selector') as HTMLSelectElement;
    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    await flushPromises();
    kernelSelector.value = 'kernel-1';
    kernelSelector.dispatchEvent(new Event('change'));
    await flushPromises();

    const generateBtn = document.getElementById('generate-concepts-btn') as HTMLButtonElement;
    generateBtn.click();

    const hasGenerateCall = fetchMock.mock.calls.some((call: [RequestInfo | URL, ...unknown[]]) => {
      const requestInput = call[0];
      const url = typeof requestInput === 'string'
        ? requestInput
        : requestInput instanceof URL
          ? requestInput.toString()
          : requestInput.url;
      return url === '/concepts/api/generate/ideate';
    });
    expect(hasGenerateCall).toBe(false);
    const errorDiv = document.querySelector('.alert-error');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toBe('At least one concept seed field is required');
  });
});
