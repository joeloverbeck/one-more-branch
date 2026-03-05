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
      if (url.startsWith('/concept-seeds/api/seed-1')) {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            seed: {
              id: 'seed-1',
              name: 'A dark mage rises',
              oneLineHook: 'A dark mage rises',
              genreFrame: 'FANTASY',
              conflictAxis: 'POWER_VS_MORALITY',
              protagonistRole: 'Dark mage',
            },
          }),
        );
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

  it('keeps develop disabled until API key and seed are selected', async () => {
    setupPage();

    const apiKeyInput = document.getElementById('conceptApiKey') as HTMLInputElement;
    const seedSelector = document.getElementById('seed-selector') as HTMLSelectElement;
    const developBtn = document.getElementById('develop-concept-btn') as HTMLButtonElement;
    expect(developBtn.disabled).toBe(true);

    // API key alone is not enough
    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    expect(developBtn.disabled).toBe(true);

    // Selecting a seed enables the button (async fetch completes)
    seedSelector.value = 'seed-1';
    seedSelector.dispatchEvent(new Event('change'));
    await flushPromises();
    expect(developBtn.disabled).toBe(false);
  });

  it('keeps develop disabled when only seed is selected without API key', async () => {
    setupPage();

    const seedSelector = document.getElementById('seed-selector') as HTMLSelectElement;
    const developBtn = document.getElementById('develop-concept-btn') as HTMLButtonElement;

    seedSelector.value = 'seed-1';
    seedSelector.dispatchEvent(new Event('change'));
    await flushPromises();
    expect(developBtn.disabled).toBe(true);
  });
});
