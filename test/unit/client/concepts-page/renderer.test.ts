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

  function extractUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    return input.url;
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

  function mockSeedEndpoint(url: string): Response | null {
    if (url.startsWith('/concept-seeds/api/seed-1')) {
      return mockJsonResponse({
        success: true,
        seed: {
          id: 'seed-1',
          name: 'A dark mage rises',
          oneLineHook: 'A dark mage rises',
          genreFrame: 'FANTASY',
          conflictAxis: 'POWER_VS_MORALITY',
          protagonistRole: 'Dark mage',
        },
      });
    }
    return null;
  }

  async function setupAndDevelop(evaluatedConcept: unknown, verification?: unknown): Promise<void> {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = extractUrl(input);
      const seedResp = mockSeedEndpoint(url);
      if (seedResp) return Promise.resolve(seedResp);

      if (url === '/concepts/api/generate/develop') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            evaluatedConcept,
            verification: verification ?? null,
          }),
        );
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    document.body.innerHTML = buildConceptsPageHtml();
    loadAppAndInit();

    const apiKeyInput = document.getElementById('conceptApiKey') as HTMLInputElement;
    const seedSelector = document.getElementById('seed-selector') as HTMLSelectElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    seedSelector.value = 'seed-1';
    seedSelector.dispatchEvent(new Event('change'));
    await flushPromises();

    const developBtn = document.getElementById('develop-concept-btn') as HTMLButtonElement;
    developBtn.click();
    await flushPromises();
  }

  it('renders whatIfQuestion, ironicTwist, and playerFantasy when present', async () => {
    await setupAndDevelop(createEvaluatedConceptFixture(1));

    const cardText = document.getElementById('concept-cards')?.textContent ?? '';
    expect(cardText).toContain('What If:');
    expect(cardText).toContain('What if question 1?');
    expect(cardText).toContain('Ironic Twist:');
    expect(cardText).toContain('Ironic twist 1.');
    expect(cardText).toContain('Player Fantasy:');
    expect(cardText).toContain('Player fantasy 1.');
  });

  it('renders concept card when enrichment fields are missing', async () => {
    const concept = createEvaluatedConceptFixture(2);
    const missingFields = { ...concept.concept } as Record<string, unknown>;
    delete missingFields['whatIfQuestion'];
    delete missingFields['ironicTwist'];
    delete missingFields['playerFantasy'];

    await setupAndDevelop({
      ...concept,
      concept: missingFields,
    });

    const card = document.querySelector('#concept-cards .concept-card');
    expect(card).not.toBeNull();
    const cardText = card?.textContent ?? '';
    expect(cardText).not.toContain('What If:');
    expect(cardText).not.toContain('Ironic Twist:');
    expect(cardText).not.toContain('Player Fantasy:');
  });

  it('logs server debug details to console when concept development fails', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = extractUrl(input);
      const seedResp = mockSeedEndpoint(url);
      if (seedResp) return Promise.resolve(seedResp);

      if (url === '/concepts/api/generate/develop') {
        return Promise.resolve(
          mockJsonResponse(
            {
              success: false,
              error: 'API error: Failed to develop concept',
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

    document.body.innerHTML = buildConceptsPageHtml();
    loadAppAndInit();

    const apiKeyInput = document.getElementById('conceptApiKey') as HTMLInputElement;
    const seedSelector = document.getElementById('seed-selector') as HTMLSelectElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    seedSelector.value = 'seed-1';
    seedSelector.dispatchEvent(new Event('change'));
    await flushPromises();

    const developBtn = document.getElementById('develop-concept-btn') as HTMLButtonElement;
    developBtn.click();
    await flushPromises();

    const errorDiv = document.querySelector('.alert-error');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toContain('Failed to develop concept');
  });
});
