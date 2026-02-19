import { createEvaluatedConceptFixture } from '../../../fixtures/concept-generator';
import { buildConceptsPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';

describe('concepts page renderer', () => {
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

  async function setupWithGeneratePayload(evaluatedConcepts: unknown[]): Promise<void> {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      if (url === '/kernels/api/list') {
        return Promise.resolve(
          mockJsonResponse({ success: true, kernels: [{ id: 'kernel-1', name: 'Kernel 1' }] }),
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
                  thematicQuestion: 'Can safety exist without control?',
                },
                overallScore: 82,
              },
            },
          }),
        );
      }
      if (url === '/concepts/api/generate') {
        return Promise.resolve(mockJsonResponse({ success: true, evaluatedConcepts }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    document.body.innerHTML = buildConceptsPageHtml();
    loadAppAndInit();

    const apiKeyInput = document.getElementById('conceptApiKey') as HTMLInputElement;
    const kernelSelector = document.getElementById('kernel-selector') as HTMLSelectElement;
    const genreInput = document.getElementById('genreVibes') as HTMLInputElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    await flushPromises();
    kernelSelector.value = 'kernel-1';
    kernelSelector.dispatchEvent(new Event('change'));
    await flushPromises();
    genreInput.value = 'dark fantasy';

    const generateBtn = document.getElementById('generate-concepts-btn') as HTMLButtonElement;
    generateBtn.click();
    await flushPromises();
  }

  it('renders whatIfQuestion, ironicTwist, and playerFantasy when present', async () => {
    await setupWithGeneratePayload([createEvaluatedConceptFixture(1)]);

    const cardText = document.getElementById('concept-cards')?.textContent ?? '';
    expect(cardText).toContain('What If:');
    expect(cardText).toContain('What if question 1?');
    expect(cardText).toContain('Ironic Twist:');
    expect(cardText).toContain('Ironic twist 1.');
    expect(cardText).toContain('Player Fantasy:');
    expect(cardText).toContain('Player fantasy 1.');
  });

  it('renders concept cards when enrichment fields are missing', async () => {
    const concept = createEvaluatedConceptFixture(2);
    const missingFields = { ...concept.concept } as Record<string, unknown>;
    delete missingFields['whatIfQuestion'];
    delete missingFields['ironicTwist'];
    delete missingFields['playerFantasy'];

    await setupWithGeneratePayload([
      {
        ...concept,
        concept: missingFields,
      },
    ]);

    const card = document.querySelector('#concept-cards .concept-card');
    expect(card).not.toBeNull();
    const cardText = card?.textContent ?? '';
    expect(cardText).not.toContain('What If:');
    expect(cardText).not.toContain('Ironic Twist:');
    expect(cardText).not.toContain('Player Fantasy:');
  });
});
