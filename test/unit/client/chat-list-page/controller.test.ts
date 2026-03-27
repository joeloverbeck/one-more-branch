import { loadAppAndInit } from '../helpers/app-loader';
import { mockJsonResponse } from '../helpers/fetch-helpers';

describe('chat list page controller', () => {
  async function settleAsyncWork(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  function getPageHtml(): string {
    return `
      <main class="container" id="chat-list-page">
        <section class="form-section" data-chat-list>
          <div class="story-card">
            <div class="story-card-content">
              <div id="chat-list-items">
                <article class="story-card" data-chat-summary data-chat-id="chat-1">
                  <div class="story-card-actions">
                    <button
                      type="button"
                      data-chat-delete-button
                      data-chat-id="chat-1"
                      data-chat-label="Mara and Iven"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>
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

  it('confirms deletion, sends DELETE, and removes the chat card from the DOM', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockJsonResponse({ success: true }));
    window.confirm = jest.fn().mockReturnValue(true);

    loadAppAndInit();

    const button = document.querySelector('[data-chat-delete-button]') as HTMLButtonElement;
    button.click();
    await settleAsyncWork();

    expect(window.confirm).toHaveBeenCalledWith('Delete chat "Mara and Iven"?');
    expect(global.fetch).toHaveBeenCalledWith('/chat/chat-1', { method: 'DELETE' });
    expect(document.querySelector('[data-chat-summary]')).toBeNull();
    expect(document.getElementById('chat-list-empty-state')?.textContent).toContain('No chats yet.');
  });

  it('does nothing when deletion is cancelled', () => {
    global.fetch = jest.fn();
    window.confirm = jest.fn().mockReturnValue(false);

    loadAppAndInit();

    const button = document.querySelector('[data-chat-delete-button]') as HTMLButtonElement;
    button.click();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(document.querySelector('[data-chat-summary]')).not.toBeNull();
  });
});
