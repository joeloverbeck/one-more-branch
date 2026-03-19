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
        <input type="checkbox" id="usePipeline">
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

  function mockJsonResponse(body: unknown, ok = true): Response {
    return {
      ok,
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Response;
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

  it('renders generated packet cards without a title and saves the full candidate with evaluation', async () => {
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
        imageCharge: 8,
        humanAche: 7,
        socialLoadBearing: 9,
        branchingPressure: 6,
        antiGenericity: 8,
        sceneBurst: 7,
        structuralIrony: 8,
        conceptUtility: 9,
      },
      strengths: ['Strong image'],
      weaknesses: ['Minor weakness'],
      recommendedRole: 'PRIMARY_SEED',
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
                details: [
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
                metaDetails: [{ key: 'recommendedRole', label: 'Role', value: 'PRIMARY_SEED' }],
              },
            ],
            evaluations: [evaluation],
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
    expect(generatedList?.textContent).toContain('Kind');
    expect(generatedList?.textContent).toContain('Content ID');
    expect(generatedList?.textContent).toContain('Interaction Verbs');
    expect(generatedList?.innerHTML).toContain('data-detail-key="contentKind"');
    expect(generatedList?.innerHTML).toContain('<li>observe</li>');

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
