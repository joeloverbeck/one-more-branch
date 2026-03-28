import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('chat page controller', () => {
  let scrollIntoViewMock: jest.Mock;

  function getPageHtml(): string {
    return `
      <main
        class="chat-layout"
        id="chat-page"
        data-chat-id="chat-1"
        data-target-character-name="Mara"
        data-interlocutor-character-name="Iven"
      >
        <header class="chat-header">
          <div class="chat-header__meta">
            <span data-chat-turn-count>0 turns</span>
            <span data-chat-field="timeOfDay">EVENING</span>
            <span data-chat-field="privacy">PRIVATE</span>
            <span data-chat-field="distanceBand">CONVERSATIONAL</span>
            <button type="button" data-chat-sidebar-toggle aria-controls="chat-sidebar" aria-expanded="true">
              Hide Scene State
            </button>
          </div>
        </header>
        <section class="chat-conversation" id="chat-message-list" aria-live="polite">
          <div id="chat-error" class="alert alert-error" style="display: none;" role="alert"></div>
          <p id="chat-empty-state">No turns yet. Start the conversation below.</p>
        </section>
        <aside class="chat-sidebar" id="chat-sidebar">
          <details class="chat-accordion chat-sidebar__section" data-chat-section="physical" open>
            <summary class="chat-accordion-summary">
              <span class="chat-accordion-summary__title">Physical Context</span>
              <span class="chat-accordion-summary__meta">
                <span class="chat-summary-chip" data-chat-field="microLocation">Reading alcove</span>
                <span class="chat-summary-chip" data-chat-field="timeOfDay">EVENING</span>
                <span class="chat-summary-chip chat-summary-chip--accent" data-chat-field="distanceBand">CONVERSATIONAL</span>
              </span>
            </summary>
            <div class="chat-accordion-content">
              <span data-chat-field="location">Archive</span>
              <span data-chat-field="microLocation">Reading alcove</span>
              <span data-chat-field="timeOfDay">EVENING</span>
              <span data-chat-field="privacy">PRIVATE</span>
              <span data-chat-field="distanceBand">CONVERSATIONAL</span>
              <span data-chat-field="characterActivity">Cataloguing ledgers</span>
              <span data-chat-field="interactableObjects">ledger</span>
              <div data-chat-list="interactableObjects"></div>
              <span data-chat-field="ambientConditions">rain</span>
              <ul data-chat-list="ambientConditions"></ul>
            </div>
          </details>
          <details class="chat-accordion chat-sidebar__section" data-chat-section="relationship" open>
            <summary class="chat-accordion-summary">
              <span class="chat-accordion-summary__title">Relationship</span>
              <span class="chat-accordion-summary__meta">
                <span class="chat-summary-stat">V: <span data-chat-field="valence">-1</span></span>
                <span class="chat-summary-stat">T: <span data-chat-field="tension">6</span></span>
              </span>
            </summary>
            <div class="chat-accordion-content">
              <span data-chat-gauge-value="valence">-1</span>
              <span data-chat-gauge-delta="valence">0</span>
              <div class="chat-gauge chat-gauge--valence" data-chat-gauge="valence">
                <span class="chat-gauge__track"></span>
                <span class="chat-gauge__marker"></span>
              </div>
              <svg class="chat-sparkline" data-chat-sparkline="valence" viewBox="0 0 120 32"></svg>
              <span data-chat-gauge-value="tension">6</span>
              <span data-chat-gauge-delta="tension">0</span>
              <div class="chat-gauge chat-gauge--tension" data-chat-gauge="tension">
                <span class="chat-gauge__track"></span>
                <span class="chat-gauge__marker"></span>
              </div>
              <svg class="chat-sparkline" data-chat-sparkline="tension" viewBox="0 0 120 32"></svg>
              <span data-chat-field="dynamic">strained allies</span>
              <span data-chat-field="leverage">Shared guilt</span>
            </div>
          </details>
          <span data-chat-field="whyNow">Before dawn.</span>
        </aside>
        <section class="chat-input-bar">
          <form id="chat-turn-form" class="chat-input-form" data-chat-turn-form>
            <div class="chat-input-form__composer">
              <div class="chat-apikey-popover-anchor">
                <button
                  type="button"
                  id="chat-apikey-toggle"
                  class="chat-apikey-btn"
                  aria-controls="chat-apikey-popover"
                  aria-expanded="false"
                >
                  <span class="chat-apikey-btn__icon">Unlocked</span>
                  <span class="chat-apikey-btn__label">API Key</span>
                </button>
                <div id="chat-apikey-popover" hidden>
                  <input type="password" id="chat-api-key" name="apiKey" />
                </div>
              </div>
              <textarea id="chat-message" name="message" rows="1"></textarea>
            </div>
            <div id="chat-turn-error" class="alert alert-error" style="display: none;" role="alert"></div>
            <div id="chat-loading-indicator" style="display: none;" aria-live="polite">
              Character is thinking...
            </div>
            <div id="chat-progress-status" data-chat-progress></div>
            <button type="submit" id="chat-send-button" class="chat-send-btn">Send</button>
          </form>
        </section>
      </main>
      <script type="application/json" id="chat-ui-bootstrap">{"relationshipHistory":[{"turnNumber":0,"valence":0,"tension":0,"dynamic":""},{"turnNumber":2,"valence":-1,"tension":6,"dynamic":"strained allies"}]}</script>
    `;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = getPageHtml();
    sessionStorage.clear();
    sessionStorage.setItem('omb_api_key', 'sk-or-stored-key-12345');
    scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: () => 'chat-progress-id-1' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('toggles the sidebar collapsed class from the header button', () => {
    global.fetch = jest.fn((url: string) => {
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, 404));
    }) as jest.Mock;

    loadAppAndInit();

    const page = document.getElementById('chat-page') as HTMLElement;
    const toggle = document.querySelector('[data-chat-sidebar-toggle]') as HTMLButtonElement;

    expect(page.classList.contains('sidebar-collapsed')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    expect(page.classList.contains('sidebar-collapsed')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toBe('Show Scene State');

    toggle.click();
    expect(page.classList.contains('sidebar-collapsed')).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe('Hide Scene State');
  });

  it('restores the API key, submits the turn, renders returned blocks, and updates sidebar state', async () => {
    let requestBody: Record<string, unknown> | null = null;

    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      if (url === '/chat/chat-1/turn') {
        requestBody = JSON.parse(typeof init?.body === 'string' ? init.body : '') as Record<string, unknown>;
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            progressId: 'chat-progress-id-1',
            userTurn: {
              turnNumber: 1,
              speaker: 'USER',
              blocks: [
                { type: 'ACTION', text: 'I close the ledger.' },
                { type: 'SPEECH', text: 'Tell me what happened.' },
              ],
              rawText: '*I close the ledger.* Tell me what happened.',
              timestamp: '2026-03-27T10:00:00.000Z',
            },
            characterTurn: {
              turnNumber: 2,
              speaker: 'CHARACTER',
              turnMeta: {
                expectsReply: true,
                endsWithQuestion: false,
                visibleEmotion: 'guarded',
                finalPressure: null,
              },
              plannerOutput: {
                internalSelfCheck: {
                  whatDoIWant: 'Keep control.',
                  whatDoIKnow: 'He is bluffing.',
                  whatAmIHiding: 'I moved the copy.',
                  howHonestAmI: 'Partially.',
                },
                responseGoal: 'Deflect and probe.',
                speechAct: 'DEFLECT',
                honestyMode: 'PARTIAL',
                surfaceEmotion: 'guarded',
                suppressedEmotion: 'fear',
                subtext: 'If I bend now, I lose the room.',
                mustAddress: ['The ledger'],
                mustAvoid: ['The copy'],
                targetLength: 'MEDIUM',
                actionPlan: [
                  {
                    kind: 'GESTURE',
                    text: 'Steady my hands before I answer.',
                    changesPhysicalState: false,
                  },
                ],
                expectedImpact: {
                  relationshipDeltaHint: -1,
                  tensionDeltaHint: 2,
                  revealsSecret: false,
                },
              },
              stateUpdate: {
                summaryDelta: 'The exchange sharpens into mutual suspicion.',
                relationshipShifts: [
                  {
                    shiftDescription: 'Trust slips.',
                    suggestedValenceChange: -1,
                    suggestedTensionChange: 2,
                    suggestedNewDynamic: 'escalating standoff',
                  },
                ],
                knowledgeChanges: {
                  newKnownFacts: ['She knows the ledger seal.'],
                  newSuspicions: ['He suspects there is a copy.'],
                  falseBeliefsCorrected: [],
                  secretsRevealed: [],
                },
                conversationUpdate: {
                  commitmentsMade: ['She will answer before dawn.'],
                  threatsMade: [],
                  questionsOpened: ['Who moved the copy?'],
                  questionsResolved: [],
                },
                physicalStateUpdate: {
                  locationChanged: false,
                  newLocation: null,
                  newMicroLocation: null,
                  newDistanceBand: 'ARM_REACH',
                  objectStateChanges: ['The lamp flame shivers.'],
                },
              },
              blocks: [
                { type: 'ACTION', text: 'Mara stiffens.' },
                { type: 'SPEECH', delivery: 'dry', text: 'You already know enough.' },
              ],
              timestamp: '2026-03-27T10:00:05.000Z',
            },
            updatedSession: {
              physicalContext: {
                location: 'Bell tower',
                microLocation: 'Narrow stair',
                timeOfDay: 'LATE_NIGHT',
                privacy: 'SEMI_PRIVATE',
                distanceBand: 'ARM_REACH',
                characterActivity: 'Listening for footsteps',
                interactableObjects: ['ledger', 'lamp'],
                ambientConditions: ['rain', 'bells'],
              },
              relationshipState: {
                dynamic: 'fragile alliance',
                valence: 1,
                tension: 8,
                leverage: 'The missing ledger copy',
              },
              leadInContext: {
                whyNow: 'The bells will cover the truth.',
              },
            },
          })
        );
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, 404));
    }) as jest.Mock;

    loadAppAndInit();

    const apiKeyInput = document.getElementById('chat-api-key') as HTMLInputElement;
    const messageInput = document.getElementById('chat-message') as HTMLTextAreaElement;
    const form = document.getElementById('chat-turn-form') as HTMLFormElement;
    const loadingIndicator = document.getElementById('chat-loading-indicator') as HTMLDivElement;
    const sendButton = document.getElementById('chat-send-button') as HTMLButtonElement;
    const apiKeyToggle = document.getElementById('chat-apikey-toggle') as HTMLButtonElement;

    expect(apiKeyInput.value).toBe('sk-or-stored-key-12345');
    expect(apiKeyToggle.classList.contains('chat-apikey-btn--configured')).toBe(true);
    expect(apiKeyToggle.querySelector('.chat-apikey-btn__icon')?.textContent).toBe('Locked');
    expect(sendButton.disabled).toBe(true);

    messageInput.value = '*I close the ledger.* Tell me what happened.';
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(sendButton.disabled).toBe(false);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(loadingIndicator.style.display).toBe('flex');
    expect(messageInput.readOnly).toBe(true);

    await Promise.resolve();
    await jest.runAllTimersAsync();
    await Promise.resolve();

    expect(requestBody).toEqual({
      message: '*I close the ledger.* Tell me what happened.',
      apiKey: 'sk-or-stored-key-12345',
      progressId: 'chat-progress-id-1',
    });
    expect(messageInput.value).toBe('');
    expect(document.querySelectorAll('[data-chat-turn]')).toHaveLength(2);
    expect(document.querySelectorAll('.chat-turn--user')).toHaveLength(1);
    expect(document.querySelectorAll('.chat-turn--character')).toHaveLength(1);
    expect(document.querySelector('[data-chat-block="ACTION"].chat-block--action em')?.textContent).toBe(
      'I close the ledger.'
    );
    expect(
      document.querySelectorAll('[data-chat-block="SPEECH"].chat-block--speech .chat-delivery')[0]
        ?.textContent
    ).toBe('dry');
    expect(
      document.querySelector('.chat-turn--character .chat-tag--speech-act')?.textContent
    ).toBe('DEFLECT');
    expect(document.querySelector('.chat-turn--character .chat-tag--honesty')?.textContent).toBe(
      'PARTIAL'
    );
    expect(document.querySelector('.chat-turn--character .chat-tag--emotion')?.textContent).toBe(
      'guarded'
    );
    expect(document.querySelector('.chat-turn--character .chat-inner-world')).not.toBeNull();
    expect(
      document.querySelector('.chat-turn--character .chat-inner-world__summary')?.textContent
    ).toContain("Character's Inner World");
    expect(document.querySelector('.chat-turn--character .chat-inner-world__section-title')?.textContent).toBe(
      'Internal Self-Check'
    );
    expect(document.querySelector('.chat-turn--character .chat-inner-world__pill')?.textContent).toBe(
      'GESTURE'
    );
    expect(document.querySelector('.chat-turn--character .chat-inner-world')?.textContent).toContain(
      'The exchange sharpens into mutual suspicion.'
    );
    expect(document.querySelector('.chat-turn--user .chat-tag-bar')).toBeNull();
    expect(document.querySelector('.chat-turn--user .chat-inner-world')).toBeNull();
    expect(document.querySelector('[data-chat-field="location"]')?.textContent).toBe('Bell tower');
    expect(document.querySelectorAll('[data-chat-field="timeOfDay"]')[0]?.textContent).toBe(
      'LATE_NIGHT'
    );
    expect(document.querySelectorAll('[data-chat-field="timeOfDay"]')[1]?.textContent).toBe(
      'LATE_NIGHT'
    );
    expect(document.querySelector('[data-chat-field="dynamic"]')?.textContent).toBe(
      'fragile alliance'
    );
    expect(document.querySelector('[data-chat-field="interactableObjects"]')?.textContent).toBe(
      'ledger, lamp'
    );
    expect(document.querySelector('[data-chat-list="interactableObjects"]')?.textContent).toContain(
      'ledger'
    );
    expect(document.querySelector('[data-chat-list="interactableObjects"]')?.textContent).toContain(
      'lamp'
    );
    expect(document.querySelector('[data-chat-list="ambientConditions"]')?.textContent).toContain(
      'bells'
    );
    expect(document.querySelector('[data-chat-field="whyNow"]')?.textContent).toBe(
      'The bells will cover the truth.'
    );
    expect(document.querySelector('[data-chat-gauge-value="valence"]')?.textContent).toBe('1');
    expect(document.querySelector('[data-chat-gauge-delta="valence"]')?.textContent).toBe('+2');
    expect(document.querySelector('[data-chat-gauge-value="tension"]')?.textContent).toBe('8');
    expect(document.querySelector('[data-chat-gauge-delta="tension"]')?.textContent).toBe('+2');
    expect(
      document.querySelector('[data-chat-gauge="valence"]')?.getAttribute('aria-valuenow')
    ).toBe('1');
    expect(document.querySelector('[data-chat-sparkline="valence"] polyline')).not.toBeNull();
    expect(document.querySelector('[data-chat-sparkline="tension"] polyline')).not.toBeNull();
    expect(document.querySelector('[data-chat-turn-count]')?.textContent).toBe('2 turns');
    expect(scrollIntoViewMock).toHaveBeenCalled();
    expect(loadingIndicator.style.display).toBe('none');
    expect(messageInput.readOnly).toBe(false);
    expect(sendButton.disabled).toBe(true);
  });

  it('renders initial gauge and sparkline state from bootstrap history', () => {
    global.fetch = jest.fn((url: string) => {
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, 404));
    }) as jest.Mock;

    loadAppAndInit();

    expect(document.querySelector('[data-chat-list="interactableObjects"]')?.textContent).toContain(
      'ledger'
    );
    expect(document.querySelector('[data-chat-list="ambientConditions"]')?.textContent).toContain(
      'rain'
    );
    expect(document.querySelector('[data-chat-gauge-value="valence"]')?.textContent).toBe('-1');
    expect(document.querySelector('[data-chat-gauge-delta="valence"]')?.textContent).toBe('-1');
    expect(document.querySelector('[data-chat-gauge-value="tension"]')?.textContent).toBe('6');
    expect(document.querySelector('[data-chat-gauge-delta="tension"]')?.textContent).toBe('+6');
    expect(document.querySelector('[data-chat-sparkline="valence"] polyline')).not.toBeNull();
    expect(document.querySelector('[data-chat-sparkline="tension"] polyline')).not.toBeNull();
  });

  it('updates composer state from message and API key input, and manages the API key popover', () => {
    global.fetch = jest.fn((url: string) => {
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, 404));
    }) as jest.Mock;

    loadAppAndInit();

    const apiKeyInput = document.getElementById('chat-api-key') as HTMLInputElement;
    const apiKeyToggle = document.getElementById('chat-apikey-toggle') as HTMLButtonElement;
    const apiKeyPopover = document.getElementById('chat-apikey-popover') as HTMLDivElement;
    const messageInput = document.getElementById('chat-message') as HTMLTextAreaElement;
    const sendButton = document.getElementById('chat-send-button') as HTMLButtonElement;

    expect(sendButton.disabled).toBe(true);
    expect(apiKeyToggle.getAttribute('aria-expanded')).toBe('false');
    expect(apiKeyPopover.hasAttribute('hidden')).toBe(true);

    apiKeyToggle.click();
    expect(apiKeyToggle.getAttribute('aria-expanded')).toBe('true');
    expect(apiKeyPopover.hasAttribute('hidden')).toBe(false);

    document.body.click();
    expect(apiKeyToggle.getAttribute('aria-expanded')).toBe('false');
    expect(apiKeyPopover.hasAttribute('hidden')).toBe(true);

    apiKeyInput.value = 'short';
    apiKeyInput.dispatchEvent(new Event('input', { bubbles: true }));
    messageInput.value = 'Hello there.';
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(sendButton.disabled).toBe(true);
    expect(apiKeyToggle.classList.contains('chat-apikey-btn--configured')).toBe(false);
    expect(apiKeyToggle.querySelector('.chat-apikey-btn__icon')?.textContent).toBe('Unlocked');

    apiKeyInput.value = 'sk-or-valid-key-67890';
    apiKeyInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(sendButton.disabled).toBe(false);
    expect(apiKeyToggle.classList.contains('chat-apikey-btn--configured')).toBe(true);
    expect(apiKeyToggle.querySelector('.chat-apikey-btn__icon')?.textContent).toBe('Locked');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(apiKeyPopover.hasAttribute('hidden')).toBe(true);
  });

  it('auto-grows the message box and resets it after a successful submit', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      if (url === '/chat/chat-1/turn') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            userTurn: {
              turnNumber: 1,
              speaker: 'USER',
              blocks: [{ type: 'SPEECH', text: 'Tell me what happened.' }],
              rawText: 'Tell me what happened.',
              timestamp: '2026-03-27T10:00:00.000Z',
            },
            characterTurn: {
              turnNumber: 2,
              speaker: 'CHARACTER',
              blocks: [{ type: 'SPEECH', text: 'No.' }],
              timestamp: '2026-03-27T10:00:05.000Z',
            },
            updatedSession: {
              physicalContext: {
                location: 'Archive',
                microLocation: 'Reading alcove',
                timeOfDay: 'EVENING',
                privacy: 'PRIVATE',
                distanceBand: 'CONVERSATIONAL',
                characterActivity: 'Cataloguing ledgers',
                interactableObjects: ['ledger'],
                ambientConditions: ['rain'],
              },
              relationshipState: {
                dynamic: 'strained allies',
                valence: -1,
                tension: 7,
                leverage: 'Shared guilt',
              },
              leadInContext: {
                whyNow: 'Before dawn.',
              },
            },
          })
        );
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, 404));
    }) as jest.Mock;

    loadAppAndInit();

    const messageInput = document.getElementById('chat-message') as HTMLTextAreaElement;
    const form = document.getElementById('chat-turn-form') as HTMLFormElement;

    Object.defineProperty(messageInput, 'scrollHeight', {
      configurable: true,
      get: () => (messageInput.value.length > 0 ? 140 : 20),
    });

    messageInput.value = 'Tell me what happened.\nNow.';
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(messageInput.style.height).toBe('140px');

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await jest.runAllTimersAsync();
    await Promise.resolve();

    expect(messageInput.value).toBe('');
    expect(messageInput.style.height).toBe('46px');
  });

  it('renders character turns without a tag bar when planner and meta fields are missing', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      if (url === '/chat/chat-1/turn') {
        return Promise.resolve(
          mockJsonResponse({
            success: true,
            userTurn: {
              turnNumber: 1,
              speaker: 'USER',
              blocks: [{ type: 'SPEECH', text: 'Tell me what happened.' }],
              rawText: 'Tell me what happened.',
              timestamp: '2026-03-27T10:00:00.000Z',
            },
            characterTurn: {
              turnNumber: 2,
              speaker: 'CHARACTER',
              blocks: [{ type: 'SPEECH', text: 'No.' }],
              timestamp: '2026-03-27T10:00:05.000Z',
            },
            updatedSession: {
              physicalContext: {
                location: 'Archive',
                microLocation: 'Reading alcove',
                timeOfDay: 'EVENING',
                privacy: 'PRIVATE',
                distanceBand: 'CONVERSATIONAL',
                characterActivity: 'Cataloguing ledgers',
                interactableObjects: ['ledger'],
                ambientConditions: ['rain'],
              },
              relationshipState: {
                dynamic: 'strained allies',
                valence: -1,
                tension: 7,
                leverage: 'Shared guilt',
              },
              leadInContext: {
                whyNow: 'Before dawn.',
              },
            },
          })
        );
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, 404));
    }) as jest.Mock;

    loadAppAndInit();

    const form = document.getElementById('chat-turn-form') as HTMLFormElement;
    const messageInput = document.getElementById('chat-message') as HTMLTextAreaElement;

    messageInput.value = 'Tell me what happened.';
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await jest.runAllTimersAsync();
    await Promise.resolve();

    expect(document.querySelectorAll('[data-chat-turn]')).toHaveLength(2);
    expect(document.querySelector('.chat-turn--character .chat-tag-bar')).toBeNull();
    expect(document.querySelector('.chat-turn--character .chat-inner-world')).toBeNull();
    expect(
      document.querySelector('.chat-turn--character [data-chat-block="SPEECH"] p')?.textContent
    ).toContain('No.');
  });

  it('prevents duplicate submits while a turn request is in flight', async () => {
    let resolveTurn!: (response: Response) => void;
    const turnRequest = new Promise<Response>((resolve) => {
      resolveTurn = resolve;
    });

    global.fetch = jest.fn((url: string) => {
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'running', activeStage: 'WRITING_CHAT_TURN' }));
      }

      if (url === '/chat/chat-1/turn') {
        return turnRequest;
      }

      return Promise.resolve(mockJsonResponse({ success: false, error: 'Unexpected URL' }, 404));
    }) as jest.Mock;

    loadAppAndInit();

    const form = document.getElementById('chat-turn-form') as HTMLFormElement;
    const messageInput = document.getElementById('chat-message') as HTMLTextAreaElement;
    const sendButton = document.getElementById('chat-send-button') as HTMLButtonElement;

    messageInput.value = 'Tell me what happened.';
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(sendButton.disabled).toBe(true);
    const turnCalls = (global.fetch as jest.Mock).mock.calls as Array<[string, RequestInit?]>;
    expect(turnCalls.filter((call) => call[0] === '/chat/chat-1/turn')).toHaveLength(1);

    resolveTurn(
      mockJsonResponse({
        success: true,
        userTurn: {
          turnNumber: 1,
          speaker: 'USER',
          blocks: [{ type: 'SPEECH', text: 'Tell me what happened.' }],
          rawText: 'Tell me what happened.',
          timestamp: '2026-03-27T10:00:00.000Z',
        },
        characterTurn: {
          turnNumber: 2,
          speaker: 'CHARACTER',
          blocks: [{ type: 'SPEECH', text: 'No.' }],
          timestamp: '2026-03-27T10:00:05.000Z',
        },
        updatedSession: {
          physicalContext: {
            location: 'Archive',
            microLocation: 'Reading alcove',
            timeOfDay: 'EVENING',
            privacy: 'PRIVATE',
            distanceBand: 'CONVERSATIONAL',
            characterActivity: 'Cataloguing ledgers',
            interactableObjects: ['ledger'],
            ambientConditions: ['rain'],
          },
          relationshipState: {
            dynamic: 'strained allies',
            valence: -1,
            tension: 7,
            leverage: 'Shared guilt',
          },
          leadInContext: {
            whyNow: 'Before dawn.',
          },
        },
      })
    );

    await Promise.resolve();
    await jest.runAllTimersAsync();
    await Promise.resolve();

    expect(sendButton.disabled).toBe(true);
  });

  it('displays model and HTTP status from debug payload in error message', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.startsWith('/generation-progress/')) {
        return Promise.resolve(mockJsonResponse({ status: 'completed' }));
      }

      if (url === '/chat/chat-1/turn') {
        return Promise.resolve(
          mockJsonResponse(
            {
              success: false,
              error: 'API request error: Provider returned error',
              code: 'HTTP_400',
              retryable: false,
              debug: {
                httpStatus: 400,
                model: 'anthropic/claude-sonnet-4.5',
              },
            },
            400
          )
        );
      }

      return Promise.resolve(mockJsonResponse({ success: false }, 404));
    }) as jest.Mock;

    loadAppAndInit();

    const form = document.getElementById('chat-turn-form') as HTMLFormElement;
    const messageInput = document.getElementById('chat-message') as HTMLTextAreaElement;

    messageInput.value = 'Hello there.';
    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await jest.runAllTimersAsync();
    await Promise.resolve();

    const turnError = document.getElementById('chat-turn-error') as HTMLDivElement;
    expect(turnError.style.display).toBe('block');
    expect(turnError.textContent).toContain('anthropic/claude-sonnet-4.5');
    expect(turnError.textContent).toContain('HTTP 400');
  });
});
