import {
  createEvaluatedConceptFixture,
  createConceptSeedFixture,
  createConceptCharacterWorldFixture,
} from '../../../fixtures/concept-generator';
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

  function mockKernelEndpoints(
    url: string,
  ): Response | null {
    if (url === '/kernels/api/list') {
      return mockJsonResponse({ success: true, kernels: [{ id: 'kernel-1', name: 'Kernel 1' }] });
    }
    if (url === '/kernels/api/kernel-1') {
      return mockJsonResponse({
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
              conflictAxis: 'JUSTICE_VS_MERCY',
              dramaticStance: 'IRONIC',
              thematicQuestion: 'Can safety exist without control?',
              antithesis: 'Counter-argument challenges the thesis.',
            },
            overallScore: 82,
          },
        },
      });
    }
    return null;
  }

  function extractUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    return input.url;
  }

  async function setupAndIdeate(): Promise<void> {
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

  async function setupWithTwoPhasePayload(evaluatedConcepts: unknown[]): Promise<void> {
    const seeds = [createConceptSeedFixture(1)];
    const characterWorlds = [createConceptCharacterWorldFixture(1)];

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = extractUrl(input);
      const kernelResp = mockKernelEndpoints(url);
      if (kernelResp) return Promise.resolve(kernelResp);

      if (url === '/concepts/api/generate/ideate') {
        return Promise.resolve(mockJsonResponse({ success: true, seeds, characterWorlds }));
      }
      if (url === '/concepts/api/generate/develop') {
        return Promise.resolve(mockJsonResponse({ success: true, evaluatedConcepts, verifications: [] }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    // Phase 1: ideate
    await setupAndIdeate();

    // Phase 2: develop
    const developBtn = document.getElementById('develop-concepts-btn') as HTMLButtonElement;
    developBtn.click();
    await flushPromises();
  }

  it('renders whatIfQuestion, ironicTwist, and playerFantasy when present', async () => {
    await setupWithTwoPhasePayload([createEvaluatedConceptFixture(1)]);

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

    await setupWithTwoPhasePayload([
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

  it('logs server debug details to console when concept ideation fails', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = extractUrl(input);
      const kernelResp = mockKernelEndpoints(url);
      if (kernelResp) return Promise.resolve(kernelResp);

      if (url === '/concepts/api/generate/ideate') {
        return Promise.resolve(
          mockJsonResponse(
            {
              success: false,
              error: 'API error: Scored concept 4 has invalid scores',
              code: 'STRUCTURE_PARSE_ERROR',
              retryable: true,
              debug: {
                rawContent: '{"scoredConcepts":[{"scores":"N/A"}]}',
                parseStage: 'message_content',
              },
            },
            false,
            500,
          ),
        );
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    await setupAndIdeate();

    expect(console.error).toHaveBeenCalledWith(
      'Concept ideation error code:',
      'STRUCTURE_PARSE_ERROR',
      '| Retryable:',
      true,
    );
    expect(console.error).toHaveBeenCalledWith(
      'Concept ideation debug info:',
      expect.objectContaining({
        rawContent: '{"scoredConcepts":[{"scores":"N/A"}]}',
        parseStage: 'message_content',
      }),
    );
  });
});
