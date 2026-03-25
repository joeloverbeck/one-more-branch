// ── Character Brainstormer Page Controller ─────────────────────────

function initCharacterBrainstormerPage() {
  var page = document.getElementById('character-brainstormer-page');
  if (!page) {
    return;
  }

  var loading = document.getElementById('loading');
  var errorBlock = document.getElementById('character-brainstormer-error');
  var apiKeyInput = document.getElementById('character-brainstormer-api-key');
  var apiKeyForm = document.getElementById('character-brainstormer-api-key-form');
  var conceptSelector = document.getElementById('character-brainstormer-concept-selector');
  var worldbuildingSelector = document.getElementById('character-brainstormer-worldbuilding-selector');
  var userNotesInput = document.getElementById('character-brainstormer-user-notes');
  var generateBtn = document.getElementById('character-brainstormer-generate-btn');
  var resultsSection = document.getElementById('character-brainstormer-results');
  var cardsContainer = document.getElementById('character-brainstormer-cards');
  var diversityNoteEl = document.getElementById('character-brainstormer-diversity-note');
  var copyAllBtn = document.getElementById('character-brainstormer-copy-all-btn');

  if (!loading || !errorBlock || !generateBtn || !conceptSelector || !worldbuildingSelector) {
    return;
  }

  if (apiKeyForm) {
    apiKeyForm.addEventListener('submit', function (event) {
      event.preventDefault();
    });
  }

  var loadingSession = createLoadingOverlaySession({
    overlayElement: loading,
    progressElement: loading,
    buttonElement: generateBtn,
  });
  var inlineError = createInlineErrorController(errorBlock);
  var lastResult = null;

  // ── API key restore ──────────────────────────────────────────────

  var storedKey = getApiKey();
  if (
    apiKeyInput &&
    storedKey &&
    typeof apiKeyInput.value === 'string' &&
    apiKeyInput.value.length === 0
  ) {
    apiKeyInput.value = storedKey;
  }

  // ── Form validation ──────────────────────────────────────────────

  function getApiKeyFromPage() {
    var val =
      apiKeyInput && typeof apiKeyInput.value === 'string' ? apiKeyInput.value.trim() : '';
    return val || (getApiKey() || '').trim();
  }

  function isFormValid() {
    var key = getApiKeyFromPage();
    var concept = conceptSelector.value || '';
    var wb = worldbuildingSelector.value || '';
    return key.length >= 10 && concept.length > 0 && wb.length > 0;
  }

  function updateGenerateButtonState() {
    generateBtn.disabled = !isFormValid();
  }

  if (apiKeyInput) {
    apiKeyInput.addEventListener('input', updateGenerateButtonState);
  }
  conceptSelector.addEventListener('change', updateGenerateButtonState);
  worldbuildingSelector.addEventListener('change', updateGenerateButtonState);
  updateGenerateButtonState();

  // ── Error display ────────────────────────────────────────────────

  // ── Markdown formatting ──────────────────────────────────────────

  function characterToMarkdown(character) {
    var lines = [];
    lines.push('## ' + (character.name || 'Unnamed'));
    lines.push('');
    lines.push('**Pitch**: ' + (character.highConceptPitch || ''));
    lines.push('');
    lines.push('**Core Wound**: ' + (character.coreWound || ''));
    lines.push('');
    lines.push('**Contradiction**: ' + (character.centralContradiction || ''));
    lines.push('');
    lines.push('**Archetype & Subversion**: ' + (character.archetypeAndSubversion || ''));
    lines.push('');
    lines.push('**Story Function**: ' + (character.suggestedStoryFunction || ''));
    lines.push('');
    lines.push('**Relationship Dynamic**: ' + (character.relationshipDynamicHint || ''));
    lines.push('');
    lines.push('**Memorable For**: ' + (character.whatMakesThemMemorable || ''));
    lines.push('');
    lines.push('**Metaphor Family**: ' + (character.metaphorFamily || ''));
    return lines.join('\n');
  }

  // ── Copy-to-clipboard ────────────────────────────────────────────

  function copyToClipboard(text, buttonEl) {
    try {
      navigator.clipboard.writeText(text).then(function () {
        var originalText = buttonEl.textContent;
        buttonEl.textContent = 'Copied!';
        setTimeout(function () {
          buttonEl.textContent = originalText;
        }, 1500);
      });
    } catch (_err) {
      // Clipboard API not available — silently ignore
    }
  }

  function copyCharacterAsMarkdown(character, buttonEl) {
    var md = characterToMarkdown(character);
    copyToClipboard(md, buttonEl);
  }

  function copyAllCharactersAsMarkdown(characters, diversityNote, buttonEl) {
    var parts = [];
    if (diversityNote) {
      parts.push('# Brainstormed Characters');
      parts.push('');
      parts.push('**Diversity Note**: ' + diversityNote);
      parts.push('');
    }
    for (var i = 0; i < characters.length; i++) {
      parts.push(characterToMarkdown(characters[i]));
      if (i < characters.length - 1) {
        parts.push('');
        parts.push('---');
        parts.push('');
      }
    }
    copyToClipboard(parts.join('\n'), buttonEl);
  }

  // ── Rendering ────────────────────────────────────────────────────

  function renderCharacterCard(character, index) {
    var fields = [
      { label: 'Pitch', value: character.highConceptPitch, emphasis: true },
      { label: 'Core Wound', value: character.coreWound },
      { label: 'Contradiction', value: character.centralContradiction },
      { label: 'Archetype & Subversion', value: character.archetypeAndSubversion },
      { label: 'Story Function', value: character.suggestedStoryFunction },
      { label: 'Relationship Dynamic', value: character.relationshipDynamicHint },
      { label: 'Memorable For', value: character.whatMakesThemMemorable },
      { label: 'Metaphor Family', value: character.metaphorFamily },
    ];

    var html = '<article class="story-card">';
    html += '<div class="story-card-content">';
    html += '<h3>' + escapeHtml(character.name || 'Unnamed') + '</h3>';

    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var val = escapeHtml(f.value || '');
      if (f.emphasis) {
        html += '<p><strong>' + escapeHtml(f.label) + ':</strong> <em>' + val + '</em></p>';
      } else {
        html += '<p><strong>' + escapeHtml(f.label) + ':</strong> ' + val + '</p>';
      }
    }

    html += '</div>';
    html += '<div class="story-card-actions">';
    html +=
      '<button type="button" class="btn btn-secondary" data-copy-index="' +
      index +
      '">Copy as Markdown</button>';
    html += '</div>';
    html += '</article>';
    return html;
  }

  function renderBrainstormResults(result) {
    lastResult = result;

    if (diversityNoteEl && result.diversityNote) {
      diversityNoteEl.textContent = result.diversityNote;
    }

    if (cardsContainer) {
      var html = '';
      for (var i = 0; i < result.characters.length; i++) {
        html += renderCharacterCard(result.characters[i], i);
      }
      cardsContainer.innerHTML = html;
    }

    if (resultsSection) {
      resultsSection.style.display = 'block';
    }
  }

  // ── Event delegation for per-card copy buttons ───────────────────

  if (cardsContainer) {
    cardsContainer.addEventListener('click', function (event) {
      var btn = event.target;
      if (!(btn instanceof HTMLElement) || !btn.hasAttribute('data-copy-index')) {
        return;
      }
      var idx = parseInt(btn.getAttribute('data-copy-index'), 10);
      if (lastResult && Array.isArray(lastResult.characters) && lastResult.characters[idx]) {
        copyCharacterAsMarkdown(lastResult.characters[idx], btn);
      }
    });
  }

  // ── Copy All button ──────────────────────────────────────────────

  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', function () {
      if (lastResult && Array.isArray(lastResult.characters)) {
        copyAllCharactersAsMarkdown(
          lastResult.characters,
          lastResult.diversityNote || '',
          copyAllBtn
        );
      }
    });
  }

  // ── Generate handler ─────────────────────────────────────────────

  async function handleBrainstormGenerate() {
    var apiKey = getApiKeyFromPage();
    if (apiKey.length < 10) {
      showError('OpenRouter API key is required');
      return;
    }

    var conceptId = (conceptSelector.value || '').trim();
    if (!conceptId) {
      showError('Please select a concept');
      return;
    }

    var worldbuildingId = (worldbuildingSelector.value || '').trim();
    if (!worldbuildingId) {
      showError('Please select worldbuilding');
      return;
    }

    var userNotes =
      userNotesInput && typeof userNotesInput.value === 'string'
        ? userNotesInput.value.trim()
        : '';

    inlineError.clear();
    setApiKey(apiKey);
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }

    try {
      await loadingSession.withProgress(async function (progressId) {
        var response = await fetch('/character-brainstormer/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conceptId: conceptId,
            worldbuildingId: worldbuildingId,
            userNotes: userNotes,
            apiKey: apiKey,
            progressId: progressId,
          }),
        });

        var data = null;
        try {
          data = await response.json();
        } catch (_e) {
          data = null;
        }

        if (!response.ok || !data || !data.success) {
          var errorMsg =
            (data && data.error) || 'Generation failed (HTTP ' + response.status + ')';
          inlineError.show(errorMsg);
          return;
        }

        renderBrainstormResults(data.result);
      });
    } catch (err) {
      inlineError.show(err instanceof Error ? err.message : 'Network error');
    } finally {
      updateGenerateButtonState();
    }
  }

  generateBtn.addEventListener('click', function () {
    void handleBrainstormGenerate();
  });
}
