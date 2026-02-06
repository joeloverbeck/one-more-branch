/**
 * One More Branch - Client-side JavaScript
 */

(function() {
  'use strict';

  const API_KEY_STORAGE_KEY = 'omb_api_key';

  function getApiKey() {
    return sessionStorage.getItem(API_KEY_STORAGE_KEY);
  }

  function setApiKey(key) {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  }

  function escapeHtmlWithBreaks(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function initPlayPage() {
    const container = document.querySelector('.play-container');
    if (!container) {
      return;
    }

    const storyId = container.dataset.storyId;
    let currentPageId = Number.parseInt(container.dataset.pageId || '1', 10);
    if (!Number.isFinite(currentPageId) || currentPageId < 1) {
      currentPageId = 1;
    }

    const choicesSection = document.getElementById('choices-section');
    const choices = document.getElementById('choices');
    const narrative = document.getElementById('narrative');
    const loading = document.getElementById('loading');
    const apiKeyModal = document.getElementById('api-key-modal');

    if (!storyId || !choicesSection || !choices || !narrative || !loading || !apiKeyModal) {
      return;
    }

    function ensureApiKey() {
      return new Promise((resolve, reject) => {
        const key = getApiKey();
        if (key) {
          resolve(key);
          return;
        }

        const saveButton = document.getElementById('save-api-key');
        const input = document.getElementById('modal-api-key');

        if (!saveButton || !input) {
          reject(new Error('API key prompt is unavailable.'));
          return;
        }

        apiKeyModal.style.display = 'flex';

        const handleSave = () => {
          const newKey = input.value.trim();
          if (newKey.length < 10) {
            alert('Please enter a valid API key');
            return;
          }

          setApiKey(newKey);
          apiKeyModal.style.display = 'none';
          resolve(newKey);
        };

        saveButton.onclick = handleSave;
        input.onkeypress = (event) => {
          if (event.key === 'Enter') {
            handleSave();
          }
        };
      });
    }

    function setChoicesDisabled(disabled) {
      const allButtons = choices.querySelectorAll('.choice-btn');
      allButtons.forEach((button) => {
        button.disabled = disabled;
      });
    }

    function renderStateChanges(changes) {
      let stateChangesElement = document.getElementById('state-changes');

      if (Array.isArray(changes) && changes.length > 0) {
        const items = changes.map((change) => `<li>${escapeHtml(change)}</li>`).join('');
        const stateHtml = `<h4>What happened:</h4><ul>${items}</ul>`;

        if (stateChangesElement) {
          stateChangesElement.innerHTML = stateHtml;
          stateChangesElement.style.display = 'block';
        } else {
          stateChangesElement = document.createElement('aside');
          stateChangesElement.className = 'state-changes';
          stateChangesElement.id = 'state-changes';
          stateChangesElement.innerHTML = stateHtml;
          narrative.after(stateChangesElement);
        }
      } else if (stateChangesElement) {
        stateChangesElement.style.display = 'none';
        stateChangesElement.innerHTML = '';
      }
    }

    choices.addEventListener('click', async (event) => {
      const clickedElement = event.target;
      if (!(clickedElement instanceof HTMLElement)) {
        return;
      }

      const button = clickedElement.closest('.choice-btn');
      if (!button || button.disabled) {
        return;
      }

      const choiceIndex = Number.parseInt(button.dataset.choiceIndex || '', 10);
      if (!Number.isFinite(choiceIndex) || choiceIndex < 0) {
        return;
      }

      try {
        const apiKey = await ensureApiKey();

        setChoicesDisabled(true);
        loading.style.display = 'flex';

        const response = await fetch(`/play/${storyId}/choice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pageId: currentPageId,
            choiceIndex,
            apiKey,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to process choice');
        }

        if (!data.page) {
          throw new Error('Invalid response from server');
        }

        currentPageId = data.page.id;
        container.dataset.pageId = String(currentPageId);

        history.pushState({}, '', `/play/${storyId}?page=${currentPageId}`);

        narrative.innerHTML = `<div class="narrative-text">${escapeHtmlWithBreaks(data.page.narrativeText || '')}</div>`;
        renderStateChanges(data.page.stateChanges);

        const pageIndicator = document.querySelector('.page-indicator');
        if (pageIndicator) {
          pageIndicator.textContent = `Page ${currentPageId}`;
        }

        if (data.page.isEnding) {
          choicesSection.innerHTML = `
            <div class="ending-banner">
              <h3>THE END</h3>
              <div class="ending-actions">
                <a href="/play/${storyId}/restart" class="btn btn-primary">Play Again</a>
                <a href="/" class="btn btn-secondary">Back to Stories</a>
              </div>
            </div>
          `;
        } else {
          choices.innerHTML = data.page.choices.map((choice, index) => {
            const isExplored = Boolean(choice.nextPageId);
            const choiceText = typeof choice.text === 'string' ? choice.text : '';

            return `
              <button
                class="choice-btn"
                data-choice-index="${index}"
                ${isExplored ? 'data-explored="true"' : ''}
              >
                ${escapeHtml(choiceText)}
                ${isExplored ? '<span class="explored-marker" title="Previously explored">↩</span>' : ''}
              </button>
            `;
          }).join('');
        }

        narrative.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Error:', error);
        alert(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
        setChoicesDisabled(false);
      } finally {
        loading.style.display = 'none';
      }
    });

    window.addEventListener('popstate', () => {
      location.reload();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPlayPage();
  });
})();
