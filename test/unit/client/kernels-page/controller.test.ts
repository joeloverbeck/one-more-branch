import { buildKernelsPageHtml } from '../fixtures/html-fixtures';
import { loadAppAndInit } from '../helpers/app-loader';
import { createRoutedFetch, mockJsonResponse } from '../helpers/fetch-helpers';

type FetchCall = [RequestInfo | URL, RequestInit | undefined];

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

interface KernelFixture {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  seeds: {
    thematicInterests?: string;
    emotionalCore?: string;
    sparkLine?: string;
  };
  evaluatedKernel: {
    kernel: {
      dramaticThesis: string;
      valueAtStake: string;
      opposingForce: string;
      directionOfChange: 'POSITIVE' | 'NEGATIVE' | 'IRONIC' | 'AMBIGUOUS';
      thematicQuestion: string;
    };
    scores: {
      dramaticClarity: number;
      thematicUniversality: number;
      generativePotential: number;
      conflictTension: number;
      emotionalDepth: number;
    };
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    tradeoffSummary: string;
  };
}

function createKernel(id = 'kernel-1'): KernelFixture {
  return {
    id,
    name: 'Control vs trust',
    createdAt: '2026-02-19T00:00:00.000Z',
    updatedAt: '2026-02-19T00:00:00.000Z',
    seeds: {
      thematicInterests: 'control',
      emotionalCore: 'fear',
      sparkLine: 'a ruler losing grip',
    },
    evaluatedKernel: {
      kernel: {
        dramaticThesis: 'Obsessive control destroys what it tries to protect',
        valueAtStake: 'Trust',
        opposingForce: 'Fear of chaos',
        directionOfChange: 'NEGATIVE',
        thematicQuestion: 'Can protection exist without control?',
      },
      scores: {
        dramaticClarity: 4,
        thematicUniversality: 3,
        generativePotential: 4,
        conflictTension: 5,
        emotionalDepth: 3,
      },
      overallScore: 82,
      strengths: ['Clear value collision'],
      weaknesses: ['Needs sharper opposition phrasing'],
      tradeoffSummary: 'High tension but risks thematic bluntness.',
    },
  };
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('kernels page controller', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('keeps generate disabled until API key and at least one seed are provided', async () => {
    global.fetch = createRoutedFetch({
      '/kernels/api/list': () => mockJsonResponse({ success: true, kernels: [] }),
    });

    document.body.innerHTML = buildKernelsPageHtml();
    loadAppAndInit();
    await flushPromises();

    const generateBtn = document.getElementById('generate-kernels-btn') as HTMLButtonElement;
    const apiKeyInput = document.getElementById('kernelApiKey') as HTMLInputElement;
    const thematicInterests = document.getElementById('thematicInterests') as HTMLTextAreaElement;

    expect(generateBtn.disabled).toBe(true);

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(generateBtn.disabled).toBe(true);

    thematicInterests.value = 'identity and sacrifice';
    thematicInterests.dispatchEvent(new Event('input', { bubbles: true }));
    expect(generateBtn.disabled).toBe(false);
  });

  it('renders generated kernels and saves a selected generated kernel', async () => {
    const generated = createKernel('generated-1').evaluatedKernel;
    const saved = createKernel('saved-1');

    global.fetch = createRoutedFetch({
      '/kernels/api/list': () => mockJsonResponse({ success: true, kernels: [] }),
      '/generation-progress/': () => mockJsonResponse({ status: 'completed' }),
      '/kernels/api/generate': () => mockJsonResponse({ success: true, evaluatedKernels: [generated] }),
      '/kernels/api/save': () => mockJsonResponse({ success: true, kernel: saved }),
    });

    document.body.innerHTML = buildKernelsPageHtml();
    loadAppAndInit();
    await flushPromises();

    const apiKeyInput = document.getElementById('kernelApiKey') as HTMLInputElement;
    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input', { bubbles: true }));

    const thematicInterests = document.getElementById('thematicInterests') as HTMLTextAreaElement;
    thematicInterests.value = 'power and betrayal';
    thematicInterests.dispatchEvent(new Event('input', { bubbles: true }));

    const generateBtn = document.getElementById('generate-kernels-btn') as HTMLButtonElement;
    generateBtn.click();

    await flushPromises();
    await flushPromises();

    const generatedContainer = document.getElementById('generated-kernels') as HTMLElement;
    expect(generatedContainer.textContent).toContain(generated.kernel.dramaticThesis);

    const saveBtn = generatedContainer.querySelector('.kernel-save-generated-btn') as HTMLButtonElement;
    saveBtn.click();

    await flushPromises();
    await flushPromises();

    const fetchCalls = (global.fetch as jest.MockedFunction<typeof fetch>).mock
      .calls as unknown as FetchCall[];
    const requestUrls = fetchCalls.map((call) => getRequestUrl(call[0]));
    expect(requestUrls.some((url) => url.includes('/kernels/api/save'))).toBe(true);
  });

  it('shows loading as a modal-style overlay while kernel generation is in progress', async () => {
    const generated = createKernel('generated-1').evaluatedKernel;
    let resolveGenerate: ((response: Response) => void) | null = null;

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url.includes('/kernels/api/list')) {
        return Promise.resolve(mockJsonResponse({ success: true, kernels: [] }));
      }
      if (url.includes('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'running', activeStage: 'GENERATING_KERNELS' }));
      }
      if (url.includes('/kernels/api/generate')) {
        return new Promise((resolve) => {
          resolveGenerate = resolve;
        });
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Not found' }, 404));
    }) as jest.MockedFunction<typeof fetch>;

    document.body.innerHTML = buildKernelsPageHtml();
    loadAppAndInit();
    await flushPromises();

    const apiKeyInput = document.getElementById('kernelApiKey') as HTMLInputElement;
    const thematicInterests = document.getElementById('thematicInterests') as HTMLTextAreaElement;
    const generateBtn = document.getElementById('generate-kernels-btn') as HTMLButtonElement;
    const progressSection = document.getElementById('kernel-progress-section') as HTMLElement;
    const progressContent = document.getElementById('kernel-progress-content') as HTMLElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input', { bubbles: true }));
    thematicInterests.value = 'slow-burn paranoia';
    thematicInterests.dispatchEvent(new Event('input', { bubbles: true }));

    generateBtn.click();
    await flushPromises();

    expect(progressSection.style.display).toBe('flex');
    expect(progressContent.classList.contains('loading-overlay-content')).toBe(true);

    resolveGenerate?.(mockJsonResponse({ success: true, evaluatedKernels: [generated] }));
    await flushPromises();
    await flushPromises();

    expect(progressSection.style.display).toBe('none');
  });

  it('surfaces server debug fields in kernels generation error messages', async () => {
    global.fetch = createRoutedFetch({
      '/kernels/api/list': () => mockJsonResponse({ success: true, kernels: [] }),
      '/generation-progress/': () => mockJsonResponse({ status: 'failed' }),
      '/kernels/api/generate': () =>
        mockJsonResponse(
          {
            success: false,
            error: 'API request error: Provider returned error',
            code: 'HTTP_400',
            retryable: false,
            debug: {
              httpStatus: 400,
              model: 'openai/gpt-4o-mini',
              rawError: '{"error":{"message":"Context length exceeded"}}',
            },
          },
          500,
        ),
    });

    document.body.innerHTML = buildKernelsPageHtml();
    loadAppAndInit();
    await flushPromises();

    const apiKeyInput = document.getElementById('kernelApiKey') as HTMLInputElement;
    apiKeyInput.value = 'sk-or-valid-test-key-12345';
    apiKeyInput.dispatchEvent(new Event('input', { bubbles: true }));

    const thematicInterests = document.getElementById('thematicInterests') as HTMLTextAreaElement;
    thematicInterests.value = 'power and guilt';
    thematicInterests.dispatchEvent(new Event('input', { bubbles: true }));

    const generateBtn = document.getElementById('generate-kernels-btn') as HTMLButtonElement;
    generateBtn.click();
    await flushPromises();
    await flushPromises();

    const formError = document.querySelector('.alert-error.form-error');
    expect(formError?.textContent).toContain('API request error: Provider returned error');
    expect(formError?.textContent).toContain('Code: HTTP_400');
    expect(formError?.textContent).toContain('HTTP status: 400');
    expect(formError?.textContent).toContain('Model: openai/gpt-4o-mini');
  });

  it('deletes a saved kernel via the delete action', async () => {
    const kernel = createKernel('delete-me');
    let wasDeleted = false;

    global.fetch = createRoutedFetch({
      '/kernels/api/list': () => mockJsonResponse({ success: true, kernels: wasDeleted ? [] : [kernel] }),
      '/kernels/api/delete-me': (_url, init) => {
        if (init?.method !== 'DELETE') {
          return mockJsonResponse({ success: false, error: 'Bad method' }, 400);
        }
        wasDeleted = true;
        return mockJsonResponse({ success: true });
      },
    });

    jest.spyOn(window, 'confirm').mockReturnValue(true);

    document.body.innerHTML = buildKernelsPageHtml();
    loadAppAndInit();
    await flushPromises();
    await flushPromises();

    const deleteBtn = document.querySelector('.kernel-delete-btn') as HTMLButtonElement;
    expect(deleteBtn).not.toBeNull();
    deleteBtn.click();

    await flushPromises();
    await flushPromises();

    const fetchCalls = (global.fetch as jest.MockedFunction<typeof fetch>).mock
      .calls as unknown as FetchCall[];
    const deleteCall = fetchCalls.find(
      (call) => getRequestUrl(call[0]).includes('/kernels/api/delete-me') && call[1]?.method === 'DELETE'
    );
    expect(deleteCall).toBeDefined();
  });

  it('edits a saved kernel inline and sends PUT payload', async () => {
    const kernel = createKernel('edit-me');

    global.fetch = createRoutedFetch({
      '/kernels/api/list': () => mockJsonResponse({ success: true, kernels: [kernel] }),
      '/kernels/api/edit-me': (_url, init) => {
        if (init?.method !== 'PUT') {
          return mockJsonResponse({ success: false, error: 'Bad method' }, 400);
        }
        return mockJsonResponse({ success: true, kernel });
      },
    });

    document.body.innerHTML = buildKernelsPageHtml();
    loadAppAndInit();
    await flushPromises();

    const editBtn = document.querySelector('.kernel-edit-btn') as HTMLButtonElement;
    editBtn.click();
    await flushPromises();

    const nameInput = document.querySelector('.kernel-edit-name') as HTMLInputElement;
    nameInput.value = 'Reframed Kernel Name';

    const questionInput = document.querySelector('.kernel-edit-thematicQuestion') as HTMLInputElement;
    questionInput.value = 'Can care exist without control?';

    const saveBtn = document.querySelector('.kernel-edit-save-btn') as HTMLButtonElement;
    saveBtn.click();

    await flushPromises();
    await flushPromises();

    const fetchCalls = (global.fetch as jest.MockedFunction<typeof fetch>).mock
      .calls as unknown as FetchCall[];
    const putCall = fetchCalls.find(
      (call) => getRequestUrl(call[0]).includes('/kernels/api/edit-me') && call[1]?.method === 'PUT'
    );
    expect(putCall).toBeDefined();

    const requestBody = typeof putCall?.[1]?.body === 'string' ? putCall[1].body : '{}';
    const body = JSON.parse(requestBody) as {
      name?: string;
      kernelFields?: { thematicQuestion?: string };
    };
    expect(body.name).toBe('Reframed Kernel Name');
    expect(body.kernelFields?.thematicQuestion).toBe('Can care exist without control?');
  });
});
