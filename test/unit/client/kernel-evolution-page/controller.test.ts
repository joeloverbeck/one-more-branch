import { buildKernelEvolutionPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';

describe('kernel evolution page controller', () => {
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

  it('shows the overlay during kernel evolution and re-enables the evolve button afterward', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === '/kernels/api/list') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            kernels: [
              {
                id: 'kernel-1',
                name: 'Kernel 1',
                evaluatedKernel: {
                  kernel: {
                    dramaticThesis: 'Thesis 1',
                    valueAtStake: 'Value 1',
                    opposingForce: 'Force 1',
                    thematicQuestion: 'Question 1',
                  },
                  overallScore: 80,
                },
              },
              {
                id: 'kernel-2',
                name: 'Kernel 2',
                evaluatedKernel: {
                  kernel: {
                    dramaticThesis: 'Thesis 2',
                    valueAtStake: 'Value 2',
                    opposingForce: 'Force 2',
                    thematicQuestion: 'Question 2',
                  },
                  overallScore: 81,
                },
              },
            ],
          })
        );
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'running', activeStage: 'brainstorming' }));
      }
      if (url === '/evolve-kernels/api/evolve') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            evaluatedKernels: [
              {
                kernel: {
                  dramaticThesis: 'Merged thesis',
                  valueAtStake: 'Merged value',
                  opposingForce: 'Merged force',
                  thematicQuestion: 'Merged question',
                },
                overallScore: 88,
              },
            ],
          })
        );
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    document.body.innerHTML = buildKernelEvolutionPageHtml();
    loadAppAndInit();
    await flushPromises();

    const apiKeyInput = document.getElementById('kernelEvoApiKey') as HTMLInputElement;
    const evolveBtn = document.getElementById('kernel-evo-btn') as HTMLButtonElement;
    const loading = document.getElementById('kernel-evo-loading') as HTMLElement;
    const cards = Array.from(document.querySelectorAll('#kernel-evo-parent-cards .spine-card'));

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    (cards[0] as HTMLElement).click();
    (cards[1] as HTMLElement).click();

    expect(evolveBtn.disabled).toBe(false);
    evolveBtn.click();
    expect(loading.style.display).toBe('flex');
    expect(evolveBtn.disabled).toBe(true);
    await flushPromises();
    await flushPromises();

    expect(loading.style.display).toBe('none');
    expect(evolveBtn.disabled).toBe(false);
    expect(document.querySelectorAll('#kernel-evo-cards .spine-card')).toHaveLength(1);
  });

  it('shows evolve failures in the dedicated inline error element', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === '/kernels/api/list') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            kernels: [
              {
                id: 'kernel-1',
                name: 'Kernel 1',
                evaluatedKernel: { kernel: { dramaticThesis: 'T1' }, overallScore: 80 },
              },
              {
                id: 'kernel-2',
                name: 'Kernel 2',
                evaluatedKernel: { kernel: { dramaticThesis: 'T2' }, overallScore: 81 },
              },
            ],
          })
        );
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      if (url === '/evolve-kernels/api/evolve') {
        return Promise.resolve(
          mockJsonResponse({ success: false, error: 'Kernel evolution failed' }, false, 500)
        );
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    document.body.innerHTML = buildKernelEvolutionPageHtml();
    loadAppAndInit();
    await flushPromises();

    const apiKeyInput = document.getElementById('kernelEvoApiKey') as HTMLInputElement;
    const evolveBtn = document.getElementById('kernel-evo-btn') as HTMLButtonElement;
    const error = document.getElementById('kernel-evolution-error') as HTMLElement;
    const cards = Array.from(document.querySelectorAll('#kernel-evo-parent-cards .spine-card'));

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    (cards[0] as HTMLElement).click();
    (cards[1] as HTMLElement).click();
    evolveBtn.click();
    await flushPromises();
    await flushPromises();

    expect(error.textContent).toContain('Kernel evolution failed');
    expect(error.style.display).toBe('block');
    expect(evolveBtn.disabled).toBe(false);
  });
});
