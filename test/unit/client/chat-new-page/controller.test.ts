import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('chat new page controller', () => {
  async function settleAsyncWork(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  }

  function getPageHtml(): string {
    return `
      <main class="container" id="chat-new-page">
        <div id="chat-new-error" class="alert alert-error" style="display: none;" role="alert"></div>
        <form id="chat-new-form" action="/chat" method="post" data-chat-new-form>
          <select id="chat-target-character-id" name="targetCharacterId" required>
            <option value="">Select the character to play...</option>
          </select>
          <select id="chat-interlocutor-character-id" name="interlocutorCharacterId" required>
            <option value="">Select the user's character...</option>
          </select>
          <select id="chat-worldbuilding-id" name="worldbuildingId" required>
            <option value="">Select worldbuilding...</option>
          </select>
          <input id="chat-location" name="location" required />
          <input id="chat-micro-location" name="microLocation" required />
          <select id="chat-time-of-day" name="timeOfDay" required><option value=""></option><option value="EVENING">Evening</option></select>
          <select id="chat-privacy" name="privacy" required><option value=""></option><option value="PRIVATE">Private</option></select>
          <select id="chat-distance-band" name="distanceBand" required><option value=""></option><option value="CONVERSATIONAL">Conversational</option></select>
          <input id="chat-character-activity" name="characterActivity" required />
          <textarea id="chat-lead-in-summary" name="leadInSummary" required></textarea>
          <textarea id="chat-why-now" name="whyNow" required></textarea>
          <button type="submit" id="chat-new-submit">Create Chat</button>
        </form>
      </main>
    `;
  }

  beforeEach(() => {
    document.body.innerHTML = getPageHtml();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('loads character options into both selects on init', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse({
          success: true,
          characters: [
            { id: 'char-1', name: 'Mara' },
            { id: 'char-2', name: 'Iven' },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          success: true,
          worldbuildings: [
            { id: 'world-1', name: 'Salt Archive' },
            { id: 'world-2', name: 'Glass Orchard' },
          ],
        })
      );

    loadAppAndInit();
    await settleAsyncWork();

    const targetSelect = document.getElementById('chat-target-character-id') as HTMLSelectElement;
    const interlocutorSelect = document.getElementById(
      'chat-interlocutor-character-id'
    ) as HTMLSelectElement;
    const worldbuildingSelect = document.getElementById(
      'chat-worldbuilding-id'
    ) as HTMLSelectElement;

    expect(targetSelect.options).toHaveLength(3);
    expect(interlocutorSelect.options).toHaveLength(3);
    expect(worldbuildingSelect.options).toHaveLength(3);
    expect(targetSelect.options[1]?.textContent).toBe('Mara');
    expect(interlocutorSelect.options[2]?.value).toBe('char-2');
    expect(worldbuildingSelect.options[1]?.textContent).toBe('Salt Archive');
  });

  it('blocks submit when target and interlocutor are the same character', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse({
          success: true,
          characters: [
            { id: 'char-1', name: 'Mara' },
            { id: 'char-2', name: 'Iven' },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          success: true,
          worldbuildings: [{ id: 'world-1', name: 'Salt Archive' }],
        })
      );

    loadAppAndInit();
    await settleAsyncWork();

    const form = document.getElementById('chat-new-form') as HTMLFormElement;
    const errorEl = document.getElementById('chat-new-error') as HTMLDivElement;

    (document.getElementById('chat-target-character-id') as HTMLSelectElement).value = 'char-1';
    (document.getElementById('chat-interlocutor-character-id') as HTMLSelectElement).value =
      'char-1';
    (document.getElementById('chat-worldbuilding-id') as HTMLSelectElement).value = 'world-1';
    (document.getElementById('chat-location') as HTMLInputElement).value = 'Archive';
    (document.getElementById('chat-micro-location') as HTMLInputElement).value = 'Alcove';
    (document.getElementById('chat-time-of-day') as HTMLSelectElement).value = 'EVENING';
    (document.getElementById('chat-privacy') as HTMLSelectElement).value = 'PRIVATE';
    (document.getElementById('chat-distance-band') as HTMLSelectElement).value =
      'CONVERSATIONAL';
    (document.getElementById('chat-character-activity') as HTMLInputElement).value =
      'Cataloguing ledgers';
    (document.getElementById('chat-lead-in-summary') as HTMLTextAreaElement).value =
      'They agreed to meet after the raid.';
    (document.getElementById('chat-why-now') as HTMLTextAreaElement).value =
      'The bells will cover the truth.';

    const result = form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(result).toBe(false);
    expect(errorEl.textContent).toContain('Target and interlocutor must be different characters');
    expect(errorEl.style.display).toBe('block');
  });

  it('disables repeat submission after a valid submit', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse({
          success: true,
          characters: [
            { id: 'char-1', name: 'Mara' },
            { id: 'char-2', name: 'Iven' },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          success: true,
          worldbuildings: [{ id: 'world-1', name: 'Salt Archive' }],
        })
      );

    loadAppAndInit();
    await settleAsyncWork();

    const form = document.getElementById('chat-new-form') as HTMLFormElement;
    const submitButton = document.getElementById('chat-new-submit') as HTMLButtonElement;

    (document.getElementById('chat-target-character-id') as HTMLSelectElement).value = 'char-1';
    (document.getElementById('chat-interlocutor-character-id') as HTMLSelectElement).value =
      'char-2';
    (document.getElementById('chat-worldbuilding-id') as HTMLSelectElement).value = 'world-1';
    (document.getElementById('chat-location') as HTMLInputElement).value = 'Archive';
    (document.getElementById('chat-micro-location') as HTMLInputElement).value = 'Alcove';
    (document.getElementById('chat-time-of-day') as HTMLSelectElement).value = 'EVENING';
    (document.getElementById('chat-privacy') as HTMLSelectElement).value = 'PRIVATE';
    (document.getElementById('chat-distance-band') as HTMLSelectElement).value =
      'CONVERSATIONAL';
    (document.getElementById('chat-character-activity') as HTMLInputElement).value =
      'Cataloguing ledgers';
    (document.getElementById('chat-lead-in-summary') as HTMLTextAreaElement).value =
      'They agreed to meet after the raid.';
    (document.getElementById('chat-why-now') as HTMLTextAreaElement).value =
      'The bells will cover the truth.';

    const firstResult = form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const secondResult = form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(firstResult).toBe(true);
    expect(submitButton.disabled).toBe(true);
    expect(secondResult).toBe(false);
  });

  it('shows an error when worldbuilding options fail to load', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse({
          success: true,
          characters: [
            { id: 'char-1', name: 'Mara' },
            { id: 'char-2', name: 'Iven' },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          {
            success: false,
            error: 'Failed to load worldbuildings',
          },
          500
        )
      );

    loadAppAndInit();
    await settleAsyncWork();

    const errorEl = document.getElementById('chat-new-error') as HTMLDivElement;

    expect(errorEl.textContent).toContain('Failed to load worldbuildings');
    expect(errorEl.style.display).toBe('block');
  });
});
