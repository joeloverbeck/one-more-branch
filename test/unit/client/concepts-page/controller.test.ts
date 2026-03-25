import { buildConceptsPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';

describe('concepts page controller', () => {
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

  function setupPage(): void {
    document.body.innerHTML = buildConceptsPageHtml();
    loadAppAndInit();
  }

  it('shows the loading overlay during concept development and hides it after success', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url === '/concept-seeds/api/seed-1') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            seed: {
              id: 'seed-1',
              oneLineHook: 'A dark mage rises',
              genreFrame: 'FANTASY',
              conflictAxis: 'POWER_VS_MORALITY',
              protagonistRole: 'Dark mage',
            },
          })
        );
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'running', activeStage: 'brainstorming' }));
      }
      if (url === '/concepts/api/generate/develop') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            evaluatedConcept: {
              concept: {
                oneLineHook: 'A dark mage rises',
                elevatorParagraph: 'A mage seeks redemption.',
                genreFrame: 'FANTASY',
                conflictAxis: 'POWER_VS_MORALITY',
              },
              overallScore: 4.2,
              scores: {},
            },
            verification: null,
            sourceKernelId: 'kernel-1',
          })
        );
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    setupPage();

    const apiKeyInput = document.getElementById('conceptApiKey') as HTMLInputElement;
    const seedSelector = document.getElementById('seed-selector') as HTMLSelectElement;
    const developBtn = document.getElementById('develop-concept-btn') as HTMLButtonElement;
    const loading = document.getElementById('loading') as HTMLElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));
    seedSelector.value = 'seed-1';
    seedSelector.dispatchEvent(new Event('change'));
    await flushPromises();

    developBtn.click();
    expect(loading.style.display).toBe('flex');
    expect(developBtn.disabled).toBe(true);
    await flushPromises();
    await flushPromises();

    expect(loading.style.display).toBe('none');
    expect(document.getElementById('concept-results-section')?.style.display).toBe('block');
  });

  it('shows harden failures in the dedicated inline error element and restores the harden button', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }
      if (url === '/concepts/api/concept-1/harden') {
        return Promise.resolve(
          mockJsonResponse({ success: false, error: 'Hardening failed' }, false, 500)
        );
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false, 404));
    });

    setupPage();

    const apiKeyInput = document.getElementById('conceptApiKey') as HTMLInputElement;
    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input'));

    const savedConceptsList = document.getElementById('saved-concepts-list') as HTMLElement;
    savedConceptsList.innerHTML = `
      <article class="spine-card saved-concept-card" data-concept-id="concept-1">
        <div class="spine-badges"></div>
        <div class="form-actions">
          <button type="button" class="btn btn-primary concept-harden-btn" data-concept-id="concept-1">Harden</button>
        </div>
      </article>
    `;

    const hardenBtn = savedConceptsList.querySelector('.concept-harden-btn') as HTMLButtonElement;
    const loading = document.getElementById('loading') as HTMLElement;
    const error = document.getElementById('concepts-error') as HTMLElement;

    hardenBtn.click();
    expect(loading.style.display).toBe('flex');
    await flushPromises();
    await flushPromises();

    expect(loading.style.display).toBe('none');
    expect(hardenBtn.disabled).toBe(false);
    expect(hardenBtn.textContent).toBe('Harden');
    expect(error.textContent).toContain('Hardening failed');
    expect(error.style.display).toBe('block');
  });
});
