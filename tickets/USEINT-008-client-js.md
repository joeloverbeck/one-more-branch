# USEINT-008: Client-Side JavaScript

## Summary

Implement client-side JavaScript for the play page functionality including API key management (session storage), choice selection via AJAX, and dynamic page updates without full reload.

## Files to Create

- `public/js/app.js` - Client-side JavaScript

## Files to Modify

None.

## Out of Scope

- **DO NOT** modify any files in `src/`
- **DO NOT** modify any EJS templates
- **DO NOT** modify CSS
- **DO NOT** use any JavaScript frameworks (React, Vue, etc.)
- **DO NOT** use npm packages for client-side code (no bundler)

## Implementation Details

### `public/js/app.js`

```javascript
/**
 * One More Branch - Client-side JavaScript
 */

(function() {
  'use strict';

  // API Key management (session storage only)
  const API_KEY_STORAGE_KEY = 'omb_api_key';

  function getApiKey() {
    return sessionStorage.getItem(API_KEY_STORAGE_KEY);
  }

  function setApiKey(key) {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
  }

  // Play page functionality
  function initPlayPage() {
    const container = document.querySelector('.play-container');
    if (!container) return;

    const storyId = container.dataset.storyId;
    let currentPageId = parseInt(container.dataset.pageId);

    const choicesSection = document.getElementById('choices-section');
    const choices = document.getElementById('choices');
    const narrative = document.getElementById('narrative');
    const stateChanges = document.getElementById('state-changes');
    const loading = document.getElementById('loading');
    const apiKeyModal = document.getElementById('api-key-modal');

    // Check for API key
    function ensureApiKey() {
      return new Promise((resolve) => {
        const key = getApiKey();
        if (key) {
          resolve(key);
          return;
        }

        // Show modal
        apiKeyModal.style.display = 'flex';

        const saveBtn = document.getElementById('save-api-key');
        const input = document.getElementById('modal-api-key');

        function handleSave() {
          const newKey = input.value.trim();
          if (newKey.length > 10) {
            setApiKey(newKey);
            apiKeyModal.style.display = 'none';
            resolve(newKey);
          } else {
            alert('Please enter a valid API key');
          }
        }

        saveBtn.onclick = handleSave;
        input.onkeypress = (e) => {
          if (e.key === 'Enter') handleSave();
        };
      });
    }

    // Handle choice clicks
    if (choices) {
      choices.addEventListener('click', async (e) => {
        const btn = e.target.closest('.choice-btn');
        if (!btn || btn.disabled) return;

        const choiceIndex = parseInt(btn.dataset.choiceIndex);

        try {
          // Get API key
          const apiKey = await ensureApiKey();

          // Disable buttons and show loading
          const allBtns = choices.querySelectorAll('.choice-btn');
          allBtns.forEach(b => b.disabled = true);
          loading.style.display = 'flex';

          // Make choice
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

          // Update page
          currentPageId = data.page.id;
          container.dataset.pageId = currentPageId;

          // Update URL without reload
          history.pushState({}, '', `/play/${storyId}?page=${currentPageId}`);

          // Update narrative
          narrative.innerHTML = `<div class="narrative-text">${data.page.narrativeText.replace(/\n/g, '<br>')}</div>`;

          // Update state changes
          if (data.page.stateChanges && data.page.stateChanges.length > 0) {
            const stateHtml = `
              <h4>What happened:</h4>
              <ul>
                ${data.page.stateChanges.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
              </ul>
            `;
            if (stateChanges) {
              stateChanges.innerHTML = stateHtml;
              stateChanges.style.display = 'block';
            } else {
              const newStateDiv = document.createElement('aside');
              newStateDiv.className = 'state-changes';
              newStateDiv.id = 'state-changes';
              newStateDiv.innerHTML = stateHtml;
              narrative.after(newStateDiv);
            }
          } else if (stateChanges) {
            stateChanges.style.display = 'none';
          }

          // Update page indicator
          document.querySelector('.page-indicator').textContent = `Page ${currentPageId}`;

          // Update choices or show ending
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
            choices.innerHTML = data.page.choices.map((choice, idx) => `
              <button
                class="choice-btn"
                data-choice-index="${idx}"
                ${choice.nextPageId ? 'data-explored="true"' : ''}
              >
                ${escapeHtml(choice.text)}
                ${choice.nextPageId ? '<span class="explored-marker" title="Previously explored">↩</span>' : ''}
              </button>
            `).join('');
          }

          // Scroll to narrative
          narrative.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
          console.error('Error:', error);
          alert(error.message || 'Something went wrong. Please try again.');

          // Re-enable buttons
          const allBtns = choices.querySelectorAll('.choice-btn');
          allBtns.forEach(b => b.disabled = false);
        } finally {
          loading.style.display = 'none';
        }
      });
    }

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      location.reload();
    });
  }

  // HTML escaping utility
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initPlayPage();
  });
})();
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/server/public/app.test.ts`:

1. JavaScript file exists at public/js/app.js
2. JavaScript file is non-empty
3. File uses strict mode ('use strict')
4. File uses IIFE pattern (immediately invoked function expression)
5. File defines API_KEY_STORAGE_KEY constant
6. File defines getApiKey function
7. File defines setApiKey function
8. File defines initPlayPage function
9. File defines escapeHtml function
10. File adds DOMContentLoaded event listener

Note: These tests verify file structure, not runtime behavior. Full behavior testing would require a browser environment (jsdom) which is optional for this ticket.

### Verification Commands

```bash
npm run test:unit -- --testPathPattern=test/unit/server/public/app.test.ts
# Also run dev server and manually verify functionality
npm run dev
```

## Invariants That Must Remain True

1. **Session Storage Only**: API key stored in sessionStorage (cleared on browser close)
2. **Never localStorage**: API key must not use localStorage (persists too long)
3. **No XSS**: All user/API content is escaped before insertion into DOM
4. **AJAX for Choices**: Choice selection uses fetch, not form submission
5. **History API**: URL updates without page reload
6. **Graceful Degradation**: Modal shows if API key missing
7. **Loading State**: UI shows loading indicator during generation
8. **Error Recovery**: Buttons re-enabled after errors

## Security Considerations

- **XSS Prevention**: `escapeHtml()` function sanitizes all dynamic content
- **API Key Isolation**: Key only in sessionStorage, never sent except to choice endpoint
- **No eval**: No dynamic code execution
- **Content-Type**: Fetch uses application/json

## Dependencies

- Depends on USEINT-006 for play page HTML structure (data attributes, element IDs)

## Estimated Size

~200 LOC (JavaScript only)
