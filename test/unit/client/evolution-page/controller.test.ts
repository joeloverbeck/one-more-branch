import { createConceptVerificationFixture, createEvaluatedConceptFixture } from '../../../fixtures/concept-generator';
import { buildEvolutionPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';

describe('evolution page controller', () => {
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

  function getUrl(input: RequestInfo | URL): string {
    return typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  }

  function getRequestBody(callIndex: number): Record<string, unknown> {
    const call = fetchMock.mock.calls[callIndex] as [RequestInfo | URL, RequestInit?] | undefined;
    const body = call?.[1]?.body;
    if (typeof body !== 'string') {
      return {};
    }

    return JSON.parse(body) as Record<string, unknown>;
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

  it('loads parent concepts by kernel and enforces 3-parent selection maximum', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = getUrl(input);
      if (url === '/kernels/api/list') {
        return Promise.resolve(mockJsonResponse({
          success: true,
          kernels: [{ id: 'kernel-1', name: 'Kernel 1' }],
        }));
      }
      if (url === '/kernels/api/kernel-1') {
        return Promise.resolve(mockJsonResponse({
          success: true,
          kernel: {
            id: 'kernel-1',
            name: 'Kernel 1',
            evaluatedKernel: {
              kernel: {
                dramaticThesis: 'Thesis',
                valueAtStake: 'Value',
                opposingForce: 'Force',
                thematicQuestion: 'Question',
              },
              overallScore: 82,
            },
          },
        }));
      }
      if (url === '/evolve/api/concepts-by-kernel/kernel-1') {
        return Promise.resolve(mockJsonResponse({
          success: true,
          concepts: [
            { id: 'c1', name: 'Concept 1', evaluatedConcept: createEvaluatedConceptFixture(1) },
            { id: 'c2', name: 'Concept 2', evaluatedConcept: createEvaluatedConceptFixture(2) },
            { id: 'c3', name: 'Concept 3', evaluatedConcept: createEvaluatedConceptFixture(3) },
            { id: 'c4', name: 'Concept 4', evaluatedConcept: createEvaluatedConceptFixture(4) },
          ],
        }));
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    document.body.innerHTML = buildEvolutionPageHtml();
    loadAppAndInit();

    const kernelSelector = document.getElementById('evolution-kernel-selector') as HTMLSelectElement;
    const apiKeyInput = document.getElementById('evolutionApiKey') as HTMLInputElement;
    const evolveBtn = document.getElementById('evolve-btn') as HTMLButtonElement;

    await flushPromises();

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));

    kernelSelector.value = 'kernel-1';
    kernelSelector.dispatchEvent(new Event('change'));
    await flushPromises();

    const cards = Array.from(document.querySelectorAll('#evolution-parent-concepts .concept-card'));
    expect(cards).toHaveLength(4);

    cards[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    cards[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    cards[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    cards[3]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const selectedCards = document.querySelectorAll('#evolution-parent-concepts .spine-card-selected');
    expect(selectedCards).toHaveLength(3);

    const selectionCounter = document.getElementById('evolution-selection-counter');
    expect(selectionCounter?.textContent).toContain('Selected: 3/3');
    expect(evolveBtn.disabled).toBe(false);
  });

  it('posts evolve payload, renders results, and saves selected offspring with matching verification', async () => {
    const evolvedConcepts = [createEvaluatedConceptFixture(10), createEvaluatedConceptFixture(11)];
    const verifications = [createConceptVerificationFixture(10), createConceptVerificationFixture(11)];

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = getUrl(input);
      if (url === '/kernels/api/list') {
        return Promise.resolve(mockJsonResponse({
          success: true,
          kernels: [{ id: 'kernel-1', name: 'Kernel 1' }],
        }));
      }
      if (url === '/kernels/api/kernel-1') {
        return Promise.resolve(mockJsonResponse({
          success: true,
          kernel: {
            id: 'kernel-1',
            name: 'Kernel 1',
            evaluatedKernel: {
              kernel: {
                dramaticThesis: 'Thesis',
                valueAtStake: 'Value',
                opposingForce: 'Force',
                thematicQuestion: 'Question',
              },
              overallScore: 82,
            },
          },
        }));
      }
      if (url === '/evolve/api/concepts-by-kernel/kernel-1') {
        return Promise.resolve(mockJsonResponse({
          success: true,
          concepts: [
            { id: 'c1', name: 'Concept 1', evaluatedConcept: createEvaluatedConceptFixture(1) },
            { id: 'c2', name: 'Concept 2', evaluatedConcept: createEvaluatedConceptFixture(2) },
            { id: 'c3', name: 'Concept 3', evaluatedConcept: createEvaluatedConceptFixture(3) },
          ],
        }));
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      if (url === '/evolve/api/evolve') {
        return Promise.resolve(mockJsonResponse({
          success: true,
          evaluatedConcepts: evolvedConcepts,
          verifications,
        }));
      }
      if (url === '/concepts/api/save') {
        return Promise.resolve(mockJsonResponse({ success: true, concept: { id: 'saved-1' } }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    document.body.innerHTML = buildEvolutionPageHtml();
    loadAppAndInit();

    const kernelSelector = document.getElementById('evolution-kernel-selector') as HTMLSelectElement;
    const apiKeyInput = document.getElementById('evolutionApiKey') as HTMLInputElement;
    const evolveBtn = document.getElementById('evolve-btn') as HTMLButtonElement;

    await flushPromises();

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    kernelSelector.value = 'kernel-1';
    kernelSelector.dispatchEvent(new Event('change'));
    await flushPromises();

    const parentCards = Array.from(document.querySelectorAll('#evolution-parent-concepts .concept-card'));
    parentCards[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    parentCards[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(evolveBtn.disabled).toBe(false);

    evolveBtn.click();
    await flushPromises();

    const evolveCallIndex = fetchMock.mock.calls.findIndex((call: [RequestInfo | URL]) => getUrl(call[0]) === '/evolve/api/evolve');
    expect(evolveCallIndex).toBeGreaterThanOrEqual(0);
    expect(getRequestBody(evolveCallIndex)).toMatchObject({
      conceptIds: ['c1', 'c2'],
      kernelId: 'kernel-1',
      apiKey: 'sk-or-valid-test-key-12345',
    });

    const resultsSection = document.getElementById('evolution-results-section') as HTMLElement;
    expect(resultsSection.style.display).toBe('block');
    expect(document.querySelectorAll('#evolution-cards .concept-card')).toHaveLength(2);

    const saveBtn = document.querySelector('.evolution-save-btn') as HTMLButtonElement;
    saveBtn.click();
    await flushPromises();

    const saveCallIndex = fetchMock.mock.calls.findIndex((call: [RequestInfo | URL]) => getUrl(call[0]) === '/concepts/api/save');
    expect(saveCallIndex).toBeGreaterThanOrEqual(0);
    expect(getRequestBody(saveCallIndex)).toMatchObject({
      evaluatedConcept: evolvedConcepts[0],
      sourceKernelId: 'kernel-1',
      verificationResult: verifications[0],
    });
    expect(saveBtn.disabled).toBe(true);
    expect(saveBtn.textContent).toBe('Saved');
    expect(sessionStorage.getItem('omb_api_key')).toBe('sk-or-valid-test-key-12345');
  });
});
