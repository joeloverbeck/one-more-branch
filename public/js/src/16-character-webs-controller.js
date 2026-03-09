// ── Character Webs Page Controller ───────────────────────────────

function initCharacterWebsPage() {
  var page = document.getElementById('character-webs-page');
  if (!page) {
    return;
  }

  var loading = document.getElementById('loading');
  var errorBlock = document.getElementById('character-webs-error');
  var apiKeyForm = document.getElementById('character-webs-api-key-form');
  var apiKeyInput = document.getElementById('character-webs-api-key');
  var createBtn = document.getElementById('character-web-create-btn');
  var webNameInput = document.getElementById('character-web-name');
  var conceptSelector = document.getElementById('character-web-concept-selector');
  var userNotesInput = document.getElementById('character-web-user-notes');
  var webList = document.getElementById('character-web-list');
  var webDetailsSection = document.getElementById('character-web-details');
  var webNameHeading = document.getElementById('selected-character-web-name');
  var webMeta = document.getElementById('selected-character-web-meta');
  var webSummary = document.getElementById('selected-character-web-summary');
  var generateWebBtn = document.getElementById('character-web-generate-btn');
  var regenerateWebBtn = document.getElementById('character-web-regenerate-btn');
  var deleteWebBtn = document.getElementById('character-web-delete-btn');
  var assignmentsContainer = document.getElementById('character-web-assignments');
  var relationshipsContainer = document.getElementById('character-web-relationships');
  var charactersContainer = document.getElementById('character-web-characters');
  var characterSection = document.getElementById('character-development-section');
  var characterNameHeading = document.getElementById('selected-character-name');
  var characterMeta = document.getElementById('selected-character-meta');
  var characterStatus = document.getElementById('selected-character-status');
  var stageList = document.getElementById('character-stage-list');

  if (
    !loading ||
    !createBtn ||
    !webNameInput ||
    !userNotesInput ||
    !webList ||
    !webDetailsSection ||
    !assignmentsContainer ||
    !relationshipsContainer ||
    !charactersContainer ||
    !characterSection ||
    !stageList
  ) {
    return;
  }

  if (apiKeyForm) {
    apiKeyForm.addEventListener('submit', function (event) {
      event.preventDefault();
    });
  }

  var loadingProgress = createLoadingProgressController(loading);
  var stageDefinitions = [
    { stage: 1, label: 'Character Kernel', field: 'characterKernel' },
    { stage: 2, label: 'Tridimensional Profile', field: 'tridimensionalProfile' },
    { stage: 3, label: 'Agency Model', field: 'agencyModel' },
    { stage: 4, label: 'Deep Relationships', field: 'deepRelationships' },
    { stage: 5, label: 'Textual Presentation', field: 'textualPresentation' },
  ];
  var state = {
    webs: [],
    selectedWeb: null,
    selectedCharacter: null,
  };

  var storedKey = getApiKey();
  if (
    apiKeyInput &&
    storedKey &&
    typeof apiKeyInput.value === 'string' &&
    apiKeyInput.value.length === 0
  ) {
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

  function getApiKeyFromPage() {
    var apiKey =
      apiKeyInput && typeof apiKeyInput.value === 'string' ? apiKeyInput.value.trim() : '';
    if (apiKey.length < 10) {
      throw new Error('OpenRouter API key is required');
    }
    setApiKey(apiKey);
    return apiKey;
  }

  function getCharacterByName(name) {
    if (!state.selectedWeb || !Array.isArray(state.selectedWeb.characters)) {
      return null;
    }

    for (var i = 0; i < state.selectedWeb.characters.length; i++) {
      var character = state.selectedWeb.characters[i];
      if (character && character.characterName === name) {
        return character;
      }
    }

    return null;
  }

  function getCompletedStageCount(character) {
    return Array.isArray(character && character.completedStages)
      ? character.completedStages.length
      : 0;
  }

  function resetCharacterPanel() {
    state.selectedCharacter = null;
    characterSection.style.display = 'none';
    stageList.innerHTML = '';
    if (characterNameHeading) {
      characterNameHeading.textContent = '';
    }
    if (characterMeta) {
      characterMeta.textContent = '';
    }
    if (characterStatus) {
      characterStatus.textContent = '';
    }
  }

  function renderStagePayload(value) {
    if (value === null || value === undefined) {
      return '<p class="form-help">Not generated yet.</p>';
    }

    if (typeof value === 'string') {
      return '<p>' + escapeHtmlWithBreaks(value) + '</p>';
    }

    return '<pre>' + escapeHtml(JSON.stringify(value, null, 2)) + '</pre>';
  }

  function renderWebList() {
    if (!Array.isArray(state.webs) || state.webs.length === 0) {
      webList.innerHTML = '<p class="form-help">No character webs yet.</p>';
      return;
    }

    webList.innerHTML = state.webs
      .map(function (web) {
        var isSelected =
          state.selectedWeb && state.selectedWeb.web && state.selectedWeb.web.id === web.id;
        var assignmentCount = Array.isArray(web.assignments) ? web.assignments.length : 0;
        return (
          '<article class="spine-card' +
          (isSelected ? ' spine-card-selected' : '') +
          '" data-web-id="' +
          escapeHtml(web.id) +
          '">' +
          '<div class="story-card-content">' +
          '<h4>' +
          escapeHtml(web.name || 'Untitled Character Web') +
          '</h4>' +
          '<div class="spine-field"><span class="spine-label">Updated:</span> ' +
          escapeHtml(formatDate(web.updatedAt)) +
          '</div>' +
          '<div class="spine-field"><span class="spine-label">Characters:</span> ' +
          escapeHtml(String(assignmentCount)) +
          '</div>' +
          '</div>' +
          '<div class="story-card-actions">' +
          '<button type="button" class="btn btn-secondary character-web-select-btn" data-web-id="' +
          escapeHtml(web.id) +
          '">Open</button>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');

    webList.querySelectorAll('.character-web-select-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        var webId = button.getAttribute('data-web-id') || '';
        if (webId) {
          void selectWeb(webId);
        }
      });
    });
  }

  function renderAssignments(web) {
    if (!Array.isArray(web.assignments) || web.assignments.length === 0) {
      assignmentsContainer.innerHTML =
        '<p class="form-help">Generate the web to populate cast assignments.</p>';
      return;
    }

    assignmentsContainer.innerHTML = web.assignments
      .map(function (assignment) {
        return (
          '<article class="spine-card">' +
          '<h4>' +
          escapeHtml(assignment.characterName) +
          (assignment.isProtagonist
            ? ' <span class="spine-badge spine-badge-type">Protagonist</span>'
            : '') +
          '</h4>' +
          '<div class="spine-field"><span class="spine-label">Story Function:</span> ' +
          escapeHtml(String(assignment.storyFunction || '').replace(/_/g, ' ')) +
          '</div>' +
          '<div class="spine-field"><span class="spine-label">Depth:</span> ' +
          escapeHtml(String(assignment.characterDepth || '').replace(/_/g, ' ')) +
          '</div>' +
          '<p>' +
          escapeHtml(assignment.narrativeRole || '') +
          '</p>' +
          '<p class="form-help">' +
          escapeHtml(assignment.conflictRelationship || '') +
          '</p>' +
          '</article>'
        );
      })
      .join('');
  }

  function renderRelationships(web) {
    if (!Array.isArray(web.relationshipArchetypes) || web.relationshipArchetypes.length === 0) {
      relationshipsContainer.innerHTML =
        '<p class="form-help">Generate the web to populate relationship archetypes.</p>';
      return;
    }

    relationshipsContainer.innerHTML = web.relationshipArchetypes
      .map(function (relationship) {
        return (
          '<article class="spine-card">' +
          '<h4>' +
          escapeHtml(relationship.fromCharacter) +
          ' → ' +
          escapeHtml(relationship.toCharacter) +
          '</h4>' +
          '<div class="spine-field"><span class="spine-label">Type:</span> ' +
          escapeHtml(String(relationship.relationshipType || '').replace(/_/g, ' ')) +
          '</div>' +
          '<div class="spine-field"><span class="spine-label">Valence:</span> ' +
          escapeHtml(String(relationship.valence || '').replace(/_/g, ' ')) +
          '</div>' +
          '<p>' +
          escapeHtml(relationship.essentialTension || '') +
          '</p>' +
          '</article>'
        );
      })
      .join('');
  }

  function renderCharacters() {
    var web = state.selectedWeb && state.selectedWeb.web;
    if (!web) {
      charactersContainer.innerHTML = '';
      return;
    }

    if (!Array.isArray(web.assignments) || web.assignments.length === 0) {
      charactersContainer.innerHTML =
        '<p class="form-help">Character development becomes available after the web is generated.</p>';
      return;
    }

    charactersContainer.innerHTML = web.assignments
      .map(function (assignment) {
        var character = getCharacterByName(assignment.characterName);
        var completedCount = character ? getCompletedStageCount(character) : 0;
        var isSelected =
          state.selectedCharacter &&
          state.selectedCharacter.characterName === assignment.characterName;
        return (
          '<article class="spine-card' +
          (isSelected ? ' spine-card-selected' : '') +
          '">' +
          '<h4>' +
          escapeHtml(assignment.characterName) +
          '</h4>' +
          '<div class="spine-field"><span class="spine-label">Progress:</span> ' +
          escapeHtml(String(completedCount)) +
          '/5</div>' +
          '<div class="story-card-actions">' +
          (character
            ? '<button type="button" class="btn btn-secondary character-open-btn" data-char-id="' +
              escapeHtml(character.id) +
              '">Open</button>'
            : '<button type="button" class="btn btn-primary character-init-btn" data-character-name="' +
              escapeHtml(assignment.characterName) +
              '">Initialize</button>') +
          '</div>' +
          '</article>'
        );
      })
      .join('');

    charactersContainer.querySelectorAll('.character-init-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        var characterName = button.getAttribute('data-character-name') || '';
        if (characterName) {
          void initializeCharacter(characterName);
        }
      });
    });

    charactersContainer.querySelectorAll('.character-open-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        var charId = button.getAttribute('data-char-id') || '';
        if (charId) {
          void loadCharacter(charId);
        }
      });
    });
  }

  function renderWebDetails() {
    var selected = state.selectedWeb;
    if (!selected || !selected.web) {
      webDetailsSection.style.display = 'none';
      resetCharacterPanel();
      return;
    }

    var web = selected.web;
    webDetailsSection.style.display = 'block';
    if (webNameHeading) {
      webNameHeading.textContent = web.name || 'Untitled Character Web';
    }
    if (webMeta) {
      webMeta.textContent =
        'Created ' +
        formatDate(web.createdAt) +
        ' • Updated ' +
        formatDate(web.updatedAt) +
        (web.protagonistName ? ' • Protagonist: ' + web.protagonistName : '');
    }
    if (webSummary) {
      webSummary.textContent =
        web.castDynamicsSummary || 'Generate the web to discover the cast dynamics.';
    }

    renderAssignments(web);
    renderRelationships(web);
    renderCharacters();
    renderWebList();
  }

  function renderCharacterDetails() {
    var character = state.selectedCharacter;
    if (!character) {
      resetCharacterPanel();
      renderCharacters();
      return;
    }

    characterSection.style.display = 'block';
    if (characterNameHeading) {
      characterNameHeading.textContent = character.characterName;
    }
    if (characterMeta) {
      characterMeta.textContent =
        character.sourceWebName + ' • Updated ' + formatDate(character.updatedAt);
    }
    if (characterStatus) {
      characterStatus.textContent = 'Completed stages: ' + getCompletedStageCount(character) + '/5';
    }

    stageList.innerHTML = stageDefinitions
      .map(function (definition) {
        var payload = character[definition.field];
        var isComplete =
          Array.isArray(character.completedStages) &&
          character.completedStages.indexOf(definition.stage) >= 0;
        var previousComplete =
          definition.stage === 1 ||
          (Array.isArray(character.completedStages) &&
            character.completedStages.indexOf(definition.stage - 1) >= 0);
        return (
          '<details class="form-section-collapsible" open>' +
          '<summary>' +
          escapeHtml(definition.label) +
          ' • ' +
          escapeHtml(isComplete ? 'Complete' : previousComplete ? 'Ready' : 'Locked') +
          '</summary>' +
          '<div class="form-section-collapsible__body">' +
          '<div class="story-card-actions">' +
          '<button type="button" class="btn btn-' +
          (isComplete ? 'secondary' : 'primary') +
          ' character-stage-btn" data-char-id="' +
          escapeHtml(character.id) +
          '" data-stage="' +
          escapeHtml(String(definition.stage)) +
          '" data-mode="' +
          (isComplete ? 'regenerate' : 'generate') +
          '"' +
          (previousComplete ? '' : ' disabled') +
          '>' +
          (isComplete ? 'Regenerate' : 'Generate') +
          '</button>' +
          '</div>' +
          renderStagePayload(payload) +
          '</div>' +
          '</details>'
        );
      })
      .join('');

    stageList.querySelectorAll('.character-stage-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        var charId = button.getAttribute('data-char-id') || '';
        var stage = Number(button.getAttribute('data-stage') || '0');
        var mode = button.getAttribute('data-mode') || 'generate';
        if (charId && stage >= 1 && stage <= 5) {
          void runCharacterStageAction(charId, stage, mode);
        }
      });
    });

    renderCharacters();
  }

  async function fetchJson(url, init, fallbackMessage) {
    var response = await fetch(url, init);
    if (response.status === 204) {
      return null;
    }

    var data = await response.json();
    if (!response.ok || (data && data.success === false)) {
      throw new Error((data && data.error) || fallbackMessage);
    }

    return data;
  }

  async function withProgress(action) {
    clearError();
    loading.style.display = 'flex';
    try {
      return await action();
    } finally {
      loadingProgress.stop();
      loading.style.display = 'none';
    }
  }

  async function selectWeb(webId, preferredCharacterId) {
    return withProgress(async function () {
      var data = await fetchJson(
        '/character-webs/api/' + encodeURIComponent(webId),
        { method: 'GET' },
        'Failed to load character web'
      );
      state.selectedWeb = data;
      renderWebDetails();

      if (preferredCharacterId) {
        await loadCharacter(preferredCharacterId);
        return;
      }

      if (state.selectedCharacter && state.selectedCharacter.sourceWebId === data.web.id) {
        var refreshedCharacter = getCharacterByName(state.selectedCharacter.characterName);
        if (refreshedCharacter) {
          await loadCharacter(refreshedCharacter.id);
          return;
        }
      }

      resetCharacterPanel();
    }).catch(function (error) {
      setError(error instanceof Error ? error.message : 'Failed to load character web');
    });
  }

  async function refreshWebs(preferredWebId, preferredCharacterId) {
    return withProgress(async function () {
      var data = await fetchJson(
        '/character-webs/api/list',
        { method: 'GET' },
        'Failed to load character webs'
      );
      state.webs = Array.isArray(data && data.webs) ? data.webs : [];
      renderWebList();

      if (state.webs.length === 0) {
        state.selectedWeb = null;
        renderWebDetails();
        return;
      }

      var targetWebId = preferredWebId;
      if (!targetWebId && state.selectedWeb && state.selectedWeb.web) {
        targetWebId = state.selectedWeb.web.id;
      }
      if (!targetWebId) {
        targetWebId = state.webs[0].id;
      }

      await fetchJson(
        '/character-webs/api/' + encodeURIComponent(targetWebId),
        { method: 'GET' },
        'Failed to load character web'
      ).then(function (selected) {
        state.selectedWeb = selected;
        renderWebDetails();
        if (preferredCharacterId) {
          return loadCharacter(preferredCharacterId);
        }
        resetCharacterPanel();
      });
    }).catch(function (error) {
      setError(error instanceof Error ? error.message : 'Failed to load character webs');
    });
  }

  async function createWeb() {
    clearError();
    var name = typeof webNameInput.value === 'string' ? webNameInput.value.trim() : '';
    if (!name) {
      setError('Character web name is required');
      return;
    }

    var conceptId =
      conceptSelector instanceof HTMLSelectElement ? (conceptSelector.value || '').trim() : '';
    if (!conceptId) {
      setError('A saved concept must be selected');
      return;
    }

    try {
      var data = await fetchJson(
        '/character-webs/api/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            sourceConceptId: conceptId,
            userNotes:
              typeof userNotesInput.value === 'string' ? userNotesInput.value.trim() : '',
          }),
        },
        'Failed to create character web'
      );
      webNameInput.value = '';
      userNotesInput.value = '';
      if (conceptSelector instanceof HTMLSelectElement) {
        conceptSelector.value = '';
      }
      await refreshWebs(data.web.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create character web');
    }
  }

  async function runWebAction(mode) {
    if (!state.selectedWeb || !state.selectedWeb.web) {
      return;
    }

    try {
      var apiKey = getApiKeyFromPage();
      var progressId = createProgressId();
      loading.style.display = 'flex';
      loadingProgress.start(progressId);
      await fetchJson(
        '/character-webs/api/' +
          encodeURIComponent(state.selectedWeb.web.id) +
          '/' +
          (mode === 'regenerate' ? 'regenerate' : 'generate'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKey, progressId: progressId }),
        },
        'Failed to update character web'
      );
      await refreshWebs(state.selectedWeb.web.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update character web');
    } finally {
      loadingProgress.stop();
      loading.style.display = 'none';
    }
  }

  async function deleteCurrentWeb() {
    if (!state.selectedWeb || !state.selectedWeb.web) {
      return;
    }

    if (!window.confirm('Delete this character web and all developed characters?')) {
      return;
    }

    try {
      await fetchJson(
        '/character-webs/api/' + encodeURIComponent(state.selectedWeb.web.id),
        { method: 'DELETE' },
        'Failed to delete character web'
      );
      await refreshWebs();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete character web');
    }
  }

  async function initializeCharacter(characterName) {
    if (!state.selectedWeb || !state.selectedWeb.web) {
      return;
    }

    try {
      var data = await fetchJson(
        '/character-webs/api/' + encodeURIComponent(state.selectedWeb.web.id) + '/characters/init',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterName: characterName }),
        },
        'Failed to initialize character'
      );
      await refreshWebs(state.selectedWeb.web.id, data.character.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to initialize character');
    }
  }

  async function loadCharacter(charId) {
    try {
      var data = await fetchJson(
        '/character-webs/api/characters/' + encodeURIComponent(charId),
        { method: 'GET' },
        'Failed to load character'
      );
      state.selectedCharacter = data.character;
      renderCharacterDetails();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load character');
    }
  }

  async function runCharacterStageAction(charId, stage, mode) {
    try {
      var apiKey = getApiKeyFromPage();
      var progressId = createProgressId();
      loading.style.display = 'flex';
      loadingProgress.start(progressId);
      var data = await fetchJson(
        '/character-webs/api/characters/' +
          encodeURIComponent(charId) +
          '/' +
          (mode === 'regenerate' ? 'regenerate' : 'generate'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: stage, apiKey: apiKey, progressId: progressId }),
        },
        'Failed to run character stage'
      );
      state.selectedCharacter = data.character;
      await refreshWebs(data.character.sourceWebId, data.character.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to run character stage');
    } finally {
      loadingProgress.stop();
      loading.style.display = 'none';
    }
  }

  async function loadSelectorOptions() {
    if (conceptSelector instanceof HTMLSelectElement) {
      try {
        var response = await fetch('/concepts/api/list');
        var data = await response.json();
        if (response.ok && data.success && Array.isArray(data.concepts)) {
          data.concepts.forEach(function (concept) {
            var option = document.createElement('option');
            option.value = concept.id;
            option.textContent = concept.name || 'Untitled Concept';
            conceptSelector.appendChild(option);
          });
        }
      } catch (_error) {
        // Non-fatal
      }
    }
  }

  createBtn.addEventListener('click', function () {
    void createWeb();
  });

  if (generateWebBtn) {
    generateWebBtn.addEventListener('click', function () {
      void runWebAction('generate');
    });
  }

  if (regenerateWebBtn) {
    regenerateWebBtn.addEventListener('click', function () {
      void runWebAction('regenerate');
    });
  }

  if (deleteWebBtn) {
    deleteWebBtn.addEventListener('click', function () {
      void deleteCurrentWeb();
    });
  }

  void loadSelectorOptions();
  void refreshWebs();
}
