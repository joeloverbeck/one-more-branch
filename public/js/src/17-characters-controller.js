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

  var EMOTION_SALIENCE_OPTIONS = [
    { value: '', label: '-- None --' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
  ];

  function getCharacterEnumOptions(fieldKey) {
    if (fieldKey === 'emotionSalience') return EMOTION_SALIENCE_OPTIONS;
    return null;
  }

  function getNestedValue(obj, dotPath) {
    var parts = dotPath.split('.');
    var current = obj;
    for (var i = 0; i < parts.length; i++) {
      if (current == null) return undefined;
      current = current[parts[i]];
    }
    return current;
  }

  function patchCharacterField(characterId, fieldPath, value) {
    fetch('/characters/api/' + encodeURIComponent(characterId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldPath: fieldPath, value: value }),
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (!data.success) {
          setError((data && data.error) || 'Failed to update field');
          return;
        }
        state.selectedCharacter = data.character;
        // Re-render list if name or coreTraits changed
        if (fieldPath === 'name' || fieldPath === 'coreTraits') {
          var idx = state.characters.findIndex(function (c) {
            return c.id === data.character.id;
          });
          if (idx !== -1) {
            state.characters[idx] = data.character;
          }
          renderCharacterList();
        }
        if (fieldPath === 'name' && selectedNameHeading) {
          selectedNameHeading.textContent = data.character.name || 'Unnamed';
        }
      })
      .catch(function (err) {
        setError(err instanceof Error ? err.message : 'Failed to update field');
      });
  }

  function renderField(label, value, fieldKey, fieldType) {
    var displayValue = value ? escapeHtml(String(value)) : '<em class="concept-list-empty">(click to add)</em>';
    var dataAttrs = '';
    if (fieldKey) {
      dataAttrs = ' data-field-key="' + escapeHtml(fieldKey) + '" data-field-type="' + escapeHtml(fieldType || 'text') + '"';
    }
    return (
      '<div class="spine-field"' + dataAttrs + '><span class="spine-label">' +
      escapeHtml(label) + ':</span> ' +
      '<span class="concept-field-value">' + displayValue + '</span>' +
      '</div>'
    );
  }

  function renderArrayField(label, items, fieldKey) {
    var hasItems = Array.isArray(items) && items.length > 0;
    var dataAttrs = '';
    if (fieldKey) {
      dataAttrs = ' data-field-key="' + escapeHtml(fieldKey) + '" data-field-type="list"';
    }
    var innerHtml;
    if (hasItems) {
      innerHtml =
        '<ul class="char-detail-list">' +
        items.map(function (item) {
          return '<li>' + escapeHtml(String(item)) + '</li>';
        }).join('') +
        '</ul>';
    } else {
      innerHtml = '<em class="concept-list-empty">(click to add)</em>';
    }
    return (
      '<div class="spine-field"' + dataAttrs + '><span class="spine-label">' +
      escapeHtml(label) + ':</span>' +
      '<span class="concept-field-value">' + innerHtml + '</span>' +
      '</div>'
    );
  }

  function renderSection(title, contentHtml, openByDefault) {
    if (!contentHtml) {
      return '';
    }
    return (
      '<details class="form-section-collapsible"' +
      (openByDefault ? ' open' : '') + '>' +
      '<summary>' + escapeHtml(title) + '</summary>' +
      '<div class="form-section-collapsible__body">' +
      contentHtml +
      '</div></details>'
    );
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

    var allSections = [];

    // ── Section 1: Identity & Appearance ──
    var identityHtml =
      renderField('Name', character.name, 'name', 'text') +
      renderField('Appearance', character.appearance, 'appearance', 'text') +
      renderArrayField('Core Traits', character.coreTraits, 'coreTraits') +
      renderField('Emotion Salience', character.emotionSalience, 'emotionSalience', 'enum');
    allSections.push(renderSection('Identity & Appearance', identityHtml, true));

    // ── Section 2: Psychology & Beliefs ──
    var psychologyHtml =
      renderField('Super-Objective', character.superObjective, 'superObjective', 'text') +
      renderArrayField('Core Beliefs', character.coreBeliefs, 'coreBeliefs') +
      renderField('Decision Pattern', character.decisionPattern, 'decisionPattern', 'text') +
      renderField('Conflict Priority', character.conflictPriority, 'conflictPriority', 'text') +
      renderField('Knowledge Boundaries', character.knowledgeBoundaries, 'knowledgeBoundaries', 'text') +
      renderArrayField('False Beliefs', character.falseBeliefs, 'falseBeliefs') +
      renderField('Pressure Point', character.pressurePoint, 'pressurePoint', 'text') +
      renderField('Misbelief', character.misbelief, 'misbelief', 'text');
    allSections.push(renderSection('Psychology & Beliefs', psychologyHtml, true));

    // ── Section 3: Speech & Voice ──
    var sf = character.speechFingerprint || {};
    var speechHtml =
      renderField('Vocabulary Profile', sf.vocabularyProfile, 'speechFingerprint.vocabularyProfile', 'text') +
      renderField('Sentence Patterns', sf.sentencePatterns, 'speechFingerprint.sentencePatterns', 'text') +
      renderField('Metaphor Frames', sf.metaphorFrames, 'speechFingerprint.metaphorFrames', 'text') +
      renderField('Register Shifts', sf.registerShifts, 'speechFingerprint.registerShifts', 'text') +
      renderArrayField('Catchphrases', sf.catchphrases, 'speechFingerprint.catchphrases') +
      renderArrayField('Verbal Tics', sf.verbalTics, 'speechFingerprint.verbalTics') +
      renderArrayField('Dialogue Samples', sf.dialogueSamples, 'speechFingerprint.dialogueSamples') +
      renderArrayField('Anti-Examples', sf.antiExamples, 'speechFingerprint.antiExamples') +
      renderArrayField('Discourse Markers', sf.discourseMarkers, 'speechFingerprint.discourseMarkers');
    allSections.push(renderSection('Speech & Voice', speechHtml, true));

    // ── Section 4: Stakes & Vulnerabilities ──
    var stakesHtml =
      renderArrayField('Stakes', character.stakes, 'stakes') +
      renderArrayField('Personal Dilemmas', character.personalDilemmas, 'personalDilemmas') +
      renderArrayField('Secrets Kept', character.secretsKept, 'secretsKept') +
      renderField('Moral Line', character.moralLine, 'moralLine', 'text') +
      renderField('Worst Fear', character.worstFear, 'worstFear', 'text') +
      renderField('Formative Wound', character.formativeWound, 'formativeWound', 'text');
    allSections.push(renderSection('Stakes & Vulnerabilities', stakesHtml, true));

    // ── Section 5: Stress & Behavior ──
    var sv = character.stressVariants || {};
    var ff = character.focalizationFilter || {};
    var stressHtml =
      renderField('Under Threat', sv.underThreat, 'stressVariants.underThreat', 'text') +
      renderField('In Intimacy', sv.inIntimacy, 'stressVariants.inIntimacy', 'text') +
      renderField('When Lying', sv.whenLying, 'stressVariants.whenLying', 'text') +
      renderField('When Ashamed', sv.whenAshamed, 'stressVariants.whenAshamed', 'text') +
      renderField('When Winning', sv.whenWinning, 'stressVariants.whenWinning', 'text') +
      renderField('Notices First', ff.noticesFirst, 'focalizationFilter.noticesFirst', 'text') +
      renderField('Systematically Misses', ff.systematicallyMisses, 'focalizationFilter.systematicallyMisses', 'text') +
      renderField('Misreads As', ff.misreadsAs, 'focalizationFilter.misreadsAs', 'text') +
      renderArrayField('Escalation Ladder', character.escalationLadder, 'escalationLadder');
    allSections.push(renderSection('Stress & Behavior', stressHtml, false));

    // ── Section 6: Original Description (collapsed by default) ──
    var rawHtml = renderField('Description', character.rawDescription, 'rawDescription', 'text');
    allSections.push(renderSection('Original Description', rawHtml, false));

    detailContent.innerHTML = allSections.join('');
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

  // ── Click delegation for inline editing ──
  if (detailContent) {
    detailContent.addEventListener('click', function (e) {
      var target = e.target;
      if (!(target instanceof HTMLElement)) return;

      var valueEl = target.closest('.concept-field-value');
      if (!valueEl) return;
      if (valueEl.querySelector('input, textarea, select, .concept-inline-list-editor')) return;

      var fieldDiv = valueEl.closest('.spine-field');
      if (!fieldDiv) return;

      var fieldKey = fieldDiv.dataset.fieldKey;
      var fieldType = fieldDiv.dataset.fieldType;
      if (!fieldKey || !fieldType) return;
      if (!state.selectedCharacter) return;

      function commitEdit(newValue) {
        patchCharacterField(state.selectedCharacter.id, fieldKey, newValue);
      }

      if (fieldType === 'enum') {
        var opts = getCharacterEnumOptions(fieldKey);
        if (!opts) return;
        createInlineSelectEditor(valueEl, getNestedValue(state.selectedCharacter, fieldKey) || '', opts, commitEdit);
      } else if (fieldType === 'list') {
        createInlineListEditor(valueEl, getNestedValue(state.selectedCharacter, fieldKey) || [], commitEdit);
      } else {
        createInlineTextEditor(valueEl, getNestedValue(state.selectedCharacter, fieldKey) || '', commitEdit);
      }
    });
  }

  void refreshCharacters();
}
