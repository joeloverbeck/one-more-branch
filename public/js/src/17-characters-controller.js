// ── Characters Page Controller ───────────────────────────────────

function initCharactersPage() {
  var page = document.getElementById('characters-page');
  if (!page) {
    return;
  }

  var loading = document.getElementById('loading');
  var errorBlock = document.getElementById('characters-error');
  var apiKeyInput = document.getElementById('characters-api-key');
  var decomposeBtn = document.getElementById('character-decompose-btn');
  var nameInput = document.getElementById('character-name-input');
  var descInput = document.getElementById('character-desc-input');
  var characterList = document.getElementById('character-list');
  var detailSection = document.getElementById('character-detail-section');
  var selectedNameHeading = document.getElementById('selected-character-name');
  var detailContent = document.getElementById('character-detail-content');
  var deleteBtn = document.getElementById('character-delete-btn');

  if (!loading || !decomposeBtn || !nameInput || !descInput || !characterList) {
    return;
  }

  var loadingProgress = createLoadingProgressController(loading);
  var state = {
    characters: [],
    selectedCharacter: null,
  };

  var storedKey = getApiKey();
  if (apiKeyInput && storedKey && apiKeyInput.value.length === 0) {
    apiKeyInput.value = storedKey;
  }

  function setError(message) {
    if (!errorBlock) {
      return;
    }
    errorBlock.textContent = message;
    errorBlock.style.display = 'block';
  }

  function clearError() {
    if (!errorBlock) {
      return;
    }
    errorBlock.textContent = '';
    errorBlock.style.display = 'none';
  }

  function getApiKeyFromPage() {
    var apiKey = apiKeyInput && typeof apiKeyInput.value === 'string'
      ? apiKeyInput.value.trim()
      : '';
    if (apiKey.length < 10) {
      throw new Error('OpenRouter API key is required');
    }
    setApiKey(apiKey);
    return apiKey;
  }

  function formatDate(value) {
    if (!value) {
      return '';
    }
    try {
      return new Date(value).toLocaleDateString();
    } catch (_error) {
      return value;
    }
  }

  function renderCharacterList() {
    if (!Array.isArray(state.characters) || state.characters.length === 0) {
      characterList.innerHTML = '<p class="form-help">No characters decomposed yet.</p>';
      return;
    }

    characterList.innerHTML = state.characters
      .map(function (character) {
        var isSelected = state.selectedCharacter && state.selectedCharacter.id === character.id;
        var traits = Array.isArray(character.coreTraits)
          ? character.coreTraits.slice(0, 3).join(', ')
          : '';
        return (
          '<article class="spine-card' +
          (isSelected ? ' spine-card-selected' : '') +
          '" data-character-id="' +
          escapeHtml(character.id) +
          '">' +
          '<div class="story-card-content">' +
          '<h4>' +
          escapeHtml(character.name || 'Unnamed') +
          '</h4>' +
          (traits
            ? '<div class="spine-field"><span class="spine-label">Traits:</span> ' +
              escapeHtml(traits) +
              '</div>'
            : '') +
          '<div class="spine-field"><span class="spine-label">Created:</span> ' +
          escapeHtml(formatDate(character.createdAt)) +
          '</div>' +
          '</div>' +
          '<div class="story-card-actions">' +
          '<button type="button" class="btn btn-secondary character-select-btn" data-character-id="' +
          escapeHtml(character.id) +
          '">View</button>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');

    characterList.querySelectorAll('.character-select-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        var characterId = button.getAttribute('data-character-id') || '';
        if (characterId) {
          void selectCharacter(characterId);
        }
      });
    });
  }

  function renderCharacterDetail() {
    var character = state.selectedCharacter;
    if (!character || !detailSection || !detailContent) {
      if (detailSection) {
        detailSection.style.display = 'none';
      }
      return;
    }

    detailSection.style.display = 'block';
    if (selectedNameHeading) {
      selectedNameHeading.textContent = character.name || 'Unnamed';
    }

    var sections = [];

    if (character.appearance) {
      sections.push(
        '<div class="spine-field"><span class="spine-label">Appearance:</span> ' +
        escapeHtml(character.appearance) +
        '</div>'
      );
    }

    if (Array.isArray(character.coreTraits) && character.coreTraits.length > 0) {
      sections.push(
        '<div class="spine-field"><span class="spine-label">Core Traits:</span> ' +
        escapeHtml(character.coreTraits.join(', ')) +
        '</div>'
      );
    }

    if (character.motivations) {
      sections.push(
        '<div class="spine-field"><span class="spine-label">Motivations:</span> ' +
        escapeHtml(character.motivations) +
        '</div>'
      );
    }

    if (Array.isArray(character.coreBeliefs) && character.coreBeliefs.length > 0) {
      sections.push(
        '<div class="spine-field"><span class="spine-label">Core Beliefs:</span> ' +
        escapeHtml(character.coreBeliefs.join(', ')) +
        '</div>'
      );
    }

    if (character.decisionPattern) {
      sections.push(
        '<div class="spine-field"><span class="spine-label">Decision Pattern:</span> ' +
        escapeHtml(character.decisionPattern) +
        '</div>'
      );
    }

    if (character.conflictPriority) {
      sections.push(
        '<div class="spine-field"><span class="spine-label">Conflict Priority:</span> ' +
        escapeHtml(character.conflictPriority) +
        '</div>'
      );
    }

    if (character.knowledgeBoundaries) {
      sections.push(
        '<div class="spine-field"><span class="spine-label">Knowledge Boundaries:</span> ' +
        escapeHtml(character.knowledgeBoundaries) +
        '</div>'
      );
    }

    if (Array.isArray(character.falseBeliefs) && character.falseBeliefs.length > 0) {
      sections.push(
        '<div class="spine-field"><span class="spine-label">False Beliefs:</span> ' +
        escapeHtml(character.falseBeliefs.join('; ')) +
        '</div>'
      );
    }

    if (Array.isArray(character.secretsKept) && character.secretsKept.length > 0) {
      sections.push(
        '<div class="spine-field"><span class="spine-label">Secrets Kept:</span> ' +
        escapeHtml(character.secretsKept.join('; ')) +
        '</div>'
      );
    }

    if (character.speechFingerprint) {
      var sf = character.speechFingerprint;
      var speechParts = [];
      if (sf.vocabularyLevel) {
        speechParts.push('Vocabulary: ' + sf.vocabularyLevel);
      }
      if (sf.sentencePattern) {
        speechParts.push('Pattern: ' + sf.sentencePattern);
      }
      if (sf.verbalTic) {
        speechParts.push('Tic: ' + sf.verbalTic);
      }
      if (sf.emotionalDefault) {
        speechParts.push('Default emotion: ' + sf.emotionalDefault);
      }
      if (speechParts.length > 0) {
        sections.push(
          '<div class="spine-field"><span class="spine-label">Speech Fingerprint:</span> ' +
          escapeHtml(speechParts.join(' | ')) +
          '</div>'
        );
      }
    }

    if (character.rawDescription) {
      sections.push(
        '<details class="form-section-collapsible">' +
        '<summary>Original Description</summary>' +
        '<div class="form-section-collapsible__body">' +
        '<p>' + escapeHtmlWithBreaks(character.rawDescription) + '</p>' +
        '</div>' +
        '</details>'
      );
    }

    detailContent.innerHTML = sections.join('');
  }

  async function refreshCharacters(preferredId) {
    try {
      var response = await fetch('/characters/api/list', { method: 'GET' });
      var data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error((data && data.error) || 'Failed to load characters');
      }
      state.characters = Array.isArray(data.characters) ? data.characters : [];
      renderCharacterList();

      if (preferredId) {
        await selectCharacter(preferredId);
      } else if (state.selectedCharacter) {
        var stillExists = state.characters.some(function (c) {
          return c.id === state.selectedCharacter.id;
        });
        if (!stillExists) {
          state.selectedCharacter = null;
          renderCharacterDetail();
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load characters');
    }
  }

  async function selectCharacter(characterId) {
    try {
      var response = await fetch(
        '/characters/api/' + encodeURIComponent(characterId),
        { method: 'GET' }
      );
      var data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error((data && data.error) || 'Failed to load character');
      }
      state.selectedCharacter = data.character;
      renderCharacterDetail();
      renderCharacterList();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load character');
    }
  }

  async function decomposeCharacter() {
    clearError();
    var characterName = nameInput.value.trim();
    var characterDescription = descInput.value.trim();

    if (!characterName) {
      setError('Character name is required');
      return;
    }
    if (characterDescription.length < 10) {
      setError('Character description must be at least 10 characters');
      return;
    }

    try {
      var apiKey = getApiKeyFromPage();
      var progressId = createProgressId();
      decomposeBtn.disabled = true;
      loading.style.display = 'flex';
      loadingProgress.start(progressId);

      var response = await fetch('/characters/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: characterName,
          characterDescription: characterDescription,
          apiKey: apiKey,
          progressId: progressId,
        }),
      });

      var data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error((data && data.error) || 'Decomposition failed');
      }

      nameInput.value = '';
      descInput.value = '';
      await refreshCharacters(data.character && data.character.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Decomposition failed');
    } finally {
      loadingProgress.stop();
      loading.style.display = 'none';
      decomposeBtn.disabled = false;
    }
  }

  async function deleteSelectedCharacter() {
    if (!state.selectedCharacter) {
      return;
    }

    if (!window.confirm('Delete character "' + (state.selectedCharacter.name || '') + '"?')) {
      return;
    }

    try {
      var response = await fetch(
        '/characters/api/' + encodeURIComponent(state.selectedCharacter.id),
        { method: 'DELETE' }
      );
      var data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error((data && data.error) || 'Failed to delete character');
      }
      state.selectedCharacter = null;
      renderCharacterDetail();
      await refreshCharacters();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete character');
    }
  }

  decomposeBtn.addEventListener('click', function () {
    void decomposeCharacter();
  });

  if (deleteBtn) {
    deleteBtn.addEventListener('click', function () {
      void deleteSelectedCharacter();
    });
  }

  void refreshCharacters();
}
