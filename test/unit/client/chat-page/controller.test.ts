import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('chat page controller', () => {
  let scrollIntoViewMock: jest.Mock;

  function getPageHtml(): string {
    return `
      <main
        class="container"
        id="chat-page"
        data-chat-id="chat-1"
        data-target-character-name="Mara"
        data-interlocutor-character-name="Iven"
      >
        <div id="chat-error" class="alert alert-error" style="display: none;" role="alert"></div>
        <section class="form-section">
          <div id="chat-message-list" aria-live="polite">
            <p id="chat-empty-state">No turns yet. Start the conversation below.</p>
          </div>
          <aside id="chat-sidebar">
            <span data-chat-field="location">Archive</span>
            <span data-chat-field="microLocation">Reading alcove</span>
            <span data-chat-field="timeOfDay">EVENING</span>
            <span data-chat-field="privacy">PRIVATE</span>
            <span data-chat-field="distanceBand">CONVERSATIONAL</span>
            <span data-chat-field="characterActivity">Cataloguing ledgers</span>
            <span data-chat-field="interactableObjects">ledger</span>
            <span data-chat-field="ambientConditions">rain</span>
            <span data-chat-field="dynamic">strained allies</span>
            <span data-chat-field="valence">-1</span>
            <span data-chat-field="tension">6</span>
            <span data-chat-field="leverage">Shared guilt</span>
            <span data-chat-field="whyNow">Before dawn.</span>
          </aside>
        </section>
        <section class="form-section">
          <form id="chat-turn-form" data-chat-turn-form>
            <input type="password" id="chat-api-key" name="apiKey" />
            <textarea id="chat-message" name="message"></textarea>
            <div id="chat-turn-error" class="alert alert-error" style="display: none;" role="alert"></div>
            <div id="chat-loading-indicator" style="display: none;" aria-live="polite">
              Character is thinking...
            </div>
            <div id="chat-progress-status" data-chat-progress></div>
            <button type="submit" id="chat-send-button">Send</button>
          </form>
        </section>
      </main>
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

    expect(apiKeyInput.value).toBe('sk-or-stored-key-12345');

    messageInput.value = '*I close the ledger.* Tell me what happened.';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(loadingIndicator.style.display).toBe('flex');

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
    expect(document.querySelector('[data-chat-block="ACTION"] em')?.textContent).toBe(
      'I close the ledger.'
    );
    expect(document.querySelectorAll('[data-chat-block="SPEECH"] strong')[0]?.textContent).toBe(
      'dry:'
    );
    expect(document.querySelector('[data-chat-field="location"]')?.textContent).toBe('Bell tower');
    expect(document.querySelector('[data-chat-field="dynamic"]')?.textContent).toBe(
      'fragile alliance'
    );
    expect(document.querySelector('[data-chat-field="interactableObjects"]')?.textContent).toBe(
      'ledger, lamp'
    );
    expect(document.querySelector('[data-chat-field="whyNow"]')?.textContent).toBe(
      'The bells will cover the truth.'
    );
    expect(scrollIntoViewMock).toHaveBeenCalled();
    expect(loadingIndicator.style.display).toBe('none');
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

    expect(sendButton.disabled).toBe(false);
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
