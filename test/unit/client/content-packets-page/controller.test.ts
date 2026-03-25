import { loadAppAndInit } from '../helpers/app-loader';

function buildContentPacketsPageHtml(): string {
  return `
    <main id="content-packets-page">
      <form id="content-generate-form">
        <div id="exemplar-entries">
          <div class="exemplar-entry">
            <span class="exemplar-entry-text">A strange institution</span>
          </div>
        </div>
        <input type="text" id="exemplar-idea-input">
        <button type="button" id="exemplar-add-btn">Add</button>
        <input type="text" id="contentMoodKeywords">
        <textarea id="contentPreferences"></textarea>
        <input type="password" id="contentApiKey">
        <button type="submit" id="content-generate-btn">Generate</button>
      </form>
      <div id="content-generation-progress" style="display: none;">
        <div class="loading-stage"></div>
      </div>
      <div id="content-generation-results" style="display: none;">
        <div id="generated-packets-list"></div>
      </div>
    </main>
  `;
}

describe('content-packets page controller', () => {
  let fetchMock: jest.Mock;
  let alertMock: jest.Mock;

  type FetchCall = [RequestInfo | URL, RequestInit | undefined];

  interface Deferred<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
  }

  function mockJsonResponse(body: unknown, ok = true): Response {
    return {
      ok,
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Response;
  }

  function createDeferred<T>(): Deferred<T> {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  function flushPromises(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function extractUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') {
      return input;
    }

    if (input instanceof URL) {
      return input.toString();
    }

    return input.url;
  }

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    alertMock = jest.fn();
    global.alert = alertMock;
    document.body.innerHTML = buildContentPacketsPageHtml();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
    sessionStorage.clear();
  });

  it('shows the loading overlay during generation and hides it after a successful response', async () => {
    const generateResponse = createDeferred<Response>();

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = extractUrl(input);
      if (url === '/content-packets/api/generate') {
        return generateResponse.promise;
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'unknown' }));
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false));
    });

    loadAppAndInit();

    const apiKeyInput = document.getElementById('contentApiKey') as HTMLInputElement;
    const form = document.getElementById('content-generate-form') as HTMLFormElement;
    const progressEl = document.getElementById('content-generation-progress') as HTMLDivElement;
    const generateBtn = document.getElementById('content-generate-btn') as HTMLButtonElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';

    form.dispatchEvent(new Event('submit'));

    expect(progressEl.style.display).toBe('flex');
    expect(generateBtn.disabled).toBe(true);

    generateResponse.resolve(
      mockJsonResponse({
        success: true,
        packets: [],
        packetCards: [],
        evaluations: [],
        tasteProfile: null,
      })
    );

    await flushPromises();
    await flushPromises();

    expect(progressEl.style.display).toBe('none');
    expect(generateBtn.disabled).toBe(false);
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('hides the loading overlay after an API-level failure response', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = extractUrl(input);
      if (url === '/content-packets/api/generate') {
        return Promise.resolve(mockJsonResponse({ success: false, error: 'Bad pipeline output' }));
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'unknown' }));
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false));
    });

    loadAppAndInit();

    const apiKeyInput = document.getElementById('contentApiKey') as HTMLInputElement;
    const form = document.getElementById('content-generate-form') as HTMLFormElement;
    const progressEl = document.getElementById('content-generation-progress') as HTMLDivElement;
    const generateBtn = document.getElementById('content-generate-btn') as HTMLButtonElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';

    form.dispatchEvent(new Event('submit'));
    expect(progressEl.style.display).toBe('flex');

    await flushPromises();
    await flushPromises();

    expect(progressEl.style.display).toBe('none');
    expect(generateBtn.disabled).toBe(false);
    expect(alertMock).toHaveBeenCalledWith('Generation failed: Bad pipeline output');
  });

  it('hides the loading overlay after a rejected fetch', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = extractUrl(input);
      if (url === '/content-packets/api/generate') {
        return Promise.reject(new Error('Network down'));
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'unknown' }));
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false));
    });

    loadAppAndInit();

    const apiKeyInput = document.getElementById('contentApiKey') as HTMLInputElement;
    const form = document.getElementById('content-generate-form') as HTMLFormElement;
    const progressEl = document.getElementById('content-generation-progress') as HTMLDivElement;
    const generateBtn = document.getElementById('content-generate-btn') as HTMLButtonElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';

    form.dispatchEvent(new Event('submit'));
    expect(progressEl.style.display).toBe('flex');

    await flushPromises();
    await flushPromises();

    expect(progressEl.style.display).toBe('none');
    expect(generateBtn.disabled).toBe(false);
    expect(alertMock).toHaveBeenCalledWith('Generation failed: Network down');
  });

  it('uses the same progress id for polling and the generation request payload', async () => {
    const generateResponse = createDeferred<Response>();

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = extractUrl(input);
      if (url === '/content-packets/api/generate') {
        return generateResponse.promise;
      }
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'running', activeStage: 'GENERATING_CONTENT' }));
      }
      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false));
    });

    loadAppAndInit();

    const apiKeyInput = document.getElementById('contentApiKey') as HTMLInputElement;
    const form = document.getElementById('content-generate-form') as HTMLFormElement;

    apiKeyInput.value = 'sk-or-valid-test-key-12345';

    form.dispatchEvent(new Event('submit'));
    await flushPromises();

    const fetchCalls = fetchMock.mock.calls as unknown as FetchCall[];
    const progressRequest = fetchCalls.find((call) =>
      extractUrl(call[0]).startsWith('/generation-progress/')
    );
    const generateRequest = fetchCalls.find(
      (call) => extractUrl(call[0]) === '/content-packets/api/generate'
    );

    expect(progressRequest).toBeDefined();
    expect(generateRequest).toBeDefined();

    const requestInit = generateRequest?.[1];
    const requestBody = typeof requestInit?.body === 'string' ? requestInit.body : '';
    const payload = JSON.parse(requestBody) as { progressId: string };
    const progressRequestUrl = progressRequest ? extractUrl(progressRequest[0]) : '';
    const progressIdFromPoll = progressRequestUrl.replace('/generation-progress/', '');

    expect(payload.progressId).toBe(progressIdFromPoll);

    generateResponse.resolve(
      mockJsonResponse({
        success: true,
        packets: [],
        packetCards: [],
        evaluations: [],
        tasteProfile: null,
      })
    );

    await flushPromises();
    await flushPromises();
  });

  it('renders generated packet cards with sectioned context/origin details and saves the full candidate with evaluation', async () => {
    const generatedPacket = {
      packet: {
        contentId: 'pkt-01',
        contentKind: 'ENTITY',
        coreAnomaly: 'Test anomaly',
        humanAnchor: 'Human anchor',
        socialEngine: 'Social engine',
        choicePressure: 'Choice pressure',
        signatureImage: 'Signature image',
        escalationPath: 'Escalation path',
        wildnessInvariant: 'Wildness invariant',
        dullCollapse: 'Dull collapse',
        interactionVerbs: ['observe', 'trade', 'rupture', 'escalate'],
      },
      context: {
        premiseSummary: 'A premise summary',
        situationFrame: 'A situation frame',
        worldState: 'A world state',
        playerPosition: 'You are the only actor who can still change the arrangement.',
      },
      origin: {
        generationMode: 'pipeline',
        sourceArtifacts: [
          {
            artifactType: 'SPARK',
            sourceId: 'spark-01',
            contentKind: 'ENTITY',
            summary: 'A spark summary',
            imageSeed: 'A spark image',
            collisionTags: ['tag-a'],
          },
        ],
      },
    };
    const evaluation = {
      contentId: 'pkt-01',
      scores: {
        imageCharge: 5,
        humanAche: 4,
        socialLoadBearing: 5,
        branchingPressure: 4,
        surfaceFreshness: 5,
        deepOriginality: 4,
        sceneBurst: 4,
        structuralIrony: 5,
        tasteAlignment: 5,
        causalSpecificity: 4,
      },
      strengths: ['Strong image'],
      weaknesses: ['Minor weakness'],
      recommendedRole: 'PRIMARY_SEED',
      redundancyCluster: 'pkt-02',
    };
    const tasteProfile = {
      collisionPatterns: ['ritual meets bureaucracy'],
      favoredMechanisms: ['escalating obligation'],
      humanAnchors: ['the witness who stayed'],
      socialEngines: ['debt-backed loyalty'],
      toneBlend: ['ominous tenderness'],
      sceneAppetites: ['fraught negotiation'],
      antiPatterns: ['quirky whimsy'],
      surfaceDoNotRepeat: ['foggy alley'],
      riskAppetite: 'HIGH',
      engagementModes: ['protect something fragile while compromised'],
      valueTensions: ['truth vs belonging'],
      deepPatterns: ['private grief becomes public procedure'],
    };

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = extractUrl(input);

      if (url === '/content-packets/api/generate') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            packets: [generatedPacket],
            packetCards: [
              {
                id: 'pkt-01',
                pinned: false,
                contextDetails: [
                  {
                    key: 'premiseSummary',
                    label: 'Premise Summary',
                    value: 'A premise summary',
                  },
                  {
                    key: 'situationFrame',
                    label: 'Situation Frame',
                    value: 'A situation frame',
                  },
                  {
                    key: 'worldState',
                    label: 'World State',
                    value: 'A world state',
                  },
                  {
                    key: 'playerPosition',
                    label: 'Player Position',
                    value: 'You are the only actor who can still change the arrangement.',
                  },
                ],
                packetDetails: [
                  { key: 'contentKind', label: 'Kind', value: 'ENTITY' },
                  { key: 'contentId', label: 'Content ID', value: 'pkt-01' },
                  { key: 'coreAnomaly', label: 'Core Anomaly', value: 'Test anomaly' },
                  { key: 'humanAnchor', label: 'Human Anchor', value: 'Human anchor' },
                  { key: 'socialEngine', label: 'Social Engine', value: 'Social engine' },
                  { key: 'choicePressure', label: 'Choice Pressure', value: 'Choice pressure' },
                  { key: 'signatureImage', label: 'Signature Image', value: 'Signature image' },
                  { key: 'escalationPath', label: 'Escalation Path', value: 'Escalation path' },
                  {
                    key: 'wildnessInvariant',
                    label: 'Wildness Invariant',
                    value: 'Wildness invariant',
                  },
                  { key: 'dullCollapse', label: 'Dull Collapse', value: 'Dull collapse' },
                  {
                    key: 'interactionVerbs',
                    label: 'Interaction Verbs',
                    value: ['observe', 'trade', 'rupture', 'escalate'],
                  },
                ],
                originDetails: [
                  {
                    key: 'generationMode',
                    label: 'Generation Mode',
                    value: 'pipeline',
                  },
                  {
                    key: 'sourceArtifact-1',
                    label: 'Source Artifact 1',
                    value: [
                      'Type: SPARK',
                      'Source ID: spark-01',
                      'Kind: ENTITY',
                      'Summary: A spark summary',
                      'Image Seed: A spark image',
                      'Collision Tags: tag-a',
                    ],
                  },
                ],
                metaDetails: [{ key: 'recommendedRole', label: 'Role', value: 'PRIMARY_SEED' }],
                evaluationDetails: {
                  scores: [
                    { key: 'imageCharge', label: 'Image Charge', value: 5, maxValue: 5 },
                    { key: 'tasteAlignment', label: 'Taste Alignment', value: 5, maxValue: 5 },
                  ],
                  strengths: ['Strong image'],
                  weaknesses: ['Minor weakness'],
                  recommendedRole: 'PRIMARY_SEED',
                  redundancyCluster: 'pkt-02',
                },
              },
            ],
            evaluations: [evaluation],
            tasteProfile,
          })
        );
      }

      if (/\/content-packets\/api\/.+\/save$/.test(url)) {
        return Promise.resolve(mockJsonResponse({ success: true }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, false));
    });

    loadAppAndInit();

    const apiKeyInput = document.getElementById('contentApiKey') as HTMLInputElement;
    apiKeyInput.value = 'sk-or-valid-test-key-12345';

    const form = document.getElementById('content-generate-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await flushPromises();

    const generatedList = document.getElementById('generated-packets-list');
    expect(generatedList?.querySelector('.story-title')).toBeNull();
    expect(generatedList?.textContent).toContain('Context');
    expect(generatedList?.textContent).toContain('Packet');
    expect(generatedList?.textContent).toContain('Origin');
    expect(generatedList?.textContent).toContain('Meta');
    expect(generatedList?.textContent).toContain('Premise Summary');
    expect(generatedList?.textContent).toContain('A premise summary');
    expect(generatedList?.textContent).toContain('Player Position');
    expect(generatedList?.textContent).toContain('Kind');
    expect(generatedList?.textContent).toContain('Content ID');
    expect(generatedList?.textContent).toContain('Interaction Verbs');
    expect(generatedList?.textContent).toContain('Generation Mode');
    expect(generatedList?.textContent).toContain('Source Artifact 1');
    expect(generatedList?.textContent).toContain('Taste Profile');
    expect(generatedList?.textContent).toContain('Engagement Modes');
    expect(generatedList?.textContent).toContain('protect something fragile while compromised');
    expect(generatedList?.textContent).toContain('Value Tensions');
    expect(generatedList?.textContent).toContain('truth vs belonging');
    expect(generatedList?.textContent).toContain('Deep Patterns');
    expect(generatedList?.textContent).toContain('private grief becomes public procedure');
    expect(generatedList?.textContent).toContain('Evaluation');
    expect(generatedList?.textContent).toContain('Overlaps With');
    expect(generatedList?.textContent).toContain('pkt-02');
    expect(generatedList?.innerHTML).toContain('data-section-key="context"');
    expect(generatedList?.innerHTML).toContain('data-section-key="packet"');
    expect(generatedList?.innerHTML).toContain('data-section-key="origin"');
    expect(generatedList?.innerHTML).toContain('data-section-key="meta"');
    expect(generatedList?.innerHTML).toContain('data-detail-key="contentKind"');
    expect(generatedList?.innerHTML).toContain('data-detail-key="engagementModes"');
    expect(generatedList?.innerHTML).toContain('data-detail-key="valueTensions"');
    expect(generatedList?.innerHTML).toContain('data-detail-key="deepPatterns"');
    expect(generatedList?.innerHTML).toContain('data-detail-key="redundancyCluster"');
    expect(generatedList?.innerHTML).toContain('<li>observe</li>');
    expect(generatedList?.innerHTML).toContain('<li>Type: SPARK</li>');

    const saveButton = generatedList?.querySelector('.save-generated-btn') as HTMLButtonElement;
    saveButton.click();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/content-packets\/api\/.+\/save$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ candidate: generatedPacket, evaluation }),
      })
    );
    expect(saveButton.textContent).toBe('Saved');
    expect(saveButton.disabled).toBe(true);
    expect(alertMock).not.toHaveBeenCalled();
  });
});
