/**
 * One More Branch - Client-side JavaScript
 */

(function() {
  'use strict';

  const API_KEY_STORAGE_KEY = 'omb_api_key';

  /**
   * Execute log script received from server to display LLM prompts in browser console.
   * @param {string|undefined} scriptContent - HTML script tag with console.log calls
   */
  function executeLogScript(scriptContent) {
    if (!scriptContent) return;
    try {
      // Extract just the script content, not the <script> tags
      const match = scriptContent.match(/<script>([\s\S]*?)<\/script>/);
      if (match && match[1]) {
        new Function(match[1])();
      }
    } catch (e) {
      console.error('Failed to execute log script:', e);
    }
  }

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

        const form = document.getElementById('api-key-form');
        const input = document.getElementById('modal-api-key');

        if (!(form instanceof HTMLFormElement) || !input) {
          reject(new Error('API key prompt is unavailable.'));
          return;
        }

        apiKeyModal.style.display = 'flex';

        const handleSubmit = (event) => {
          event.preventDefault();
          const newKey = input.value.trim();
          if (newKey.length < 10) {
            alert('Please enter a valid API key');
            return;
          }

          form.removeEventListener('submit', handleSubmit);
          setApiKey(newKey);
          apiKeyModal.style.display = 'none';
          resolve(newKey);
        };

        form.addEventListener('submit', handleSubmit);
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

        // Execute log script to display LLM prompts in browser console
        if (data.logScript) {
          executeLogScript(data.logScript);
        }

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

  function showFormError(message) {
    let errorDiv = document.querySelector('.alert-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-error';
      const form = document.querySelector('.story-form');
      if (form && form.parentNode) {
        form.parentNode.insertBefore(errorDiv, form);
      }
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  function initNewStoryPage() {
    const form = document.querySelector('.story-form');
    const loading = document.getElementById('loading');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    const errorDiv = document.querySelector('.alert-error');

    if (!form || !loading || !submitBtn) {
      return;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (errorDiv) {
        errorDiv.style.display = 'none';
      }

      submitBtn.disabled = true;
      loading.style.display = 'flex';

      try {
        const formData = new FormData(form);
        const response = await fetch('/stories/create-ajax', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterConcept: formData.get('characterConcept'),
            worldbuilding: formData.get('worldbuilding'),
            tone: formData.get('tone'),
            apiKey: formData.get('apiKey'),
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to create story');
        }

        setApiKey(formData.get('apiKey'));

        window.location.href = '/play/' + data.storyId + '?page=1&newStory=true';
      } catch (error) {
        showFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
        submitBtn.disabled = false;
        loading.style.display = 'none';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPlayPage();
    initNewStoryPage();
  });
})();
