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
  var worldbuildingSelector = document.getElementById('character-web-worldbuilding-selector');
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
    !worldbuildingSelector ||
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

  function getStagePayload(stageNumber) {
    if (!state.selectedCharacter) return null;
    var fieldMap = { 1: 'characterKernel', 2: 'tridimensionalProfile', 3: 'agencyModel', 4: 'deepRelationships', 5: 'textualPresentation' };
    return state.selectedCharacter[fieldMap[stageNumber]] || null;
  }

  function onStageSaved(updatedCharacter) {
    state.selectedCharacter = updatedCharacter;
  }

  async function patchWeb(payload) {
    if (!state.selectedWeb || !state.selectedWeb.web) {
      return;
    }

    var data = await fetchJson(
      '/character-webs/api/' + encodeURIComponent(state.selectedWeb.web.id),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Failed to save web changes'
    );

    if (data && data.web) {
      state.selectedWeb.web = data.web;
    }
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

  function renderAssignmentsReadOnly(web) {
    return web.assignments
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

  function renderAssignments(web) {
    if (!Array.isArray(web.assignments) || web.assignments.length === 0) {
      assignmentsContainer.innerHTML =
        '<p class="form-help">Generate the web to populate cast assignments.</p>';
      return;
    }

    assignmentsContainer.innerHTML =
      '<div class="stage-block-toolbar">' +
      '<button type="button" class="btn btn-secondary btn-sm web-assignments-edit-btn">Edit</button>' +
      '</div>' +
      '<div class="web-assignments-content">' +
      renderAssignmentsReadOnly(web) +
      '</div>';

    assignmentsContainer.querySelector('.web-assignments-edit-btn').addEventListener('click', function () {
      var contentEl = assignmentsContainer.querySelector('.web-assignments-content');
      var toolbar = assignmentsContainer.querySelector('.stage-block-toolbar');
      if (!contentEl) return;

      var editors = [];
      contentEl.innerHTML = '';

      web.assignments.forEach(function (assignment) {
        var card = document.createElement('article');
        card.className = 'spine-card';

        var heading = document.createElement('h4');
        heading.textContent = assignment.characterName;
        if (assignment.isProtagonist) {
          heading.innerHTML += ' <span class="spine-badge spine-badge-type">Protagonist</span>';
        }
        card.appendChild(heading);

        var fnField = document.createElement('div');
        fnField.className = 'spine-field';
        fnField.innerHTML = '<span class="spine-label">Story Function:</span> ' +
          escapeHtml(String(assignment.storyFunction || '').replace(/_/g, ' '));
        card.appendChild(fnField);

        var depthField = document.createElement('div');
        depthField.className = 'spine-field';
        depthField.innerHTML = '<span class="spine-label">Depth:</span> ' +
          escapeHtml(String(assignment.characterDepth || '').replace(/_/g, ' '));
        card.appendChild(depthField);

        var roleLabel = document.createElement('label');
        roleLabel.className = 'stage-field-label';
        roleLabel.textContent = 'Narrative Role:';
        card.appendChild(roleLabel);

        var roleTextarea = document.createElement('textarea');
        roleTextarea.className = 'concept-inline-textarea';
        roleTextarea.rows = 3;
        roleTextarea.value = assignment.narrativeRole || '';
        card.appendChild(roleTextarea);

        var conflictLabel = document.createElement('label');
        conflictLabel.className = 'stage-field-label';
        conflictLabel.textContent = 'Conflict Relationship:';
        card.appendChild(conflictLabel);

        var conflictTextarea = document.createElement('textarea');
        conflictTextarea.className = 'concept-inline-textarea';
        conflictTextarea.rows = 3;
        conflictTextarea.value = assignment.conflictRelationship || '';
        card.appendChild(conflictTextarea);

        contentEl.appendChild(card);

        editors.push({
          characterName: assignment.characterName,
          roleTextarea: roleTextarea,
          conflictTextarea: conflictTextarea,
        });
      });

      var actions = document.createElement('div');
      actions.className = 'stage-edit-actions';

      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary btn-sm';
      saveBtn.textContent = 'Save Changes';

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-secondary btn-sm';
      cancelBtn.textContent = 'Cancel';

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      contentEl.appendChild(actions);
      if (toolbar) toolbar.style.display = 'none';

      cancelBtn.addEventListener('click', function () {
        renderAssignments(web);
      });

      saveBtn.addEventListener('click', function () {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        var assignmentsPayload = editors.map(function (ed) {
          return {
            characterName: ed.characterName,
            narrativeRole: ed.roleTextarea.value.trim(),
            conflictRelationship: ed.conflictTextarea.value.trim(),
          };
        });

        patchWeb({ assignments: assignmentsPayload })
          .then(function () {
            renderAssignments(state.selectedWeb.web);
          })
          .catch(function (err) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
            window.alert('Save failed: ' + (err.message || 'Unknown error'));
          });
      });
    });
  }

  function renderRelationshipsReadOnly(web) {
    return web.relationshipArchetypes
      .map(function (relationship) {
        return (
          '<article class="spine-card">' +
          '<h4>' +
          escapeHtml(relationship.fromCharacter) +
          ' \u2192 ' +
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

  function renderRelationships(web) {
    if (!Array.isArray(web.relationshipArchetypes) || web.relationshipArchetypes.length === 0) {
      relationshipsContainer.innerHTML =
        '<p class="form-help">Generate the web to populate relationship archetypes.</p>';
      return;
    }

    relationshipsContainer.innerHTML =
      '<div class="stage-block-toolbar">' +
      '<button type="button" class="btn btn-secondary btn-sm web-relationships-edit-btn">Edit</button>' +
      '</div>' +
      '<div class="web-relationships-content">' +
      renderRelationshipsReadOnly(web) +
      '</div>';

    relationshipsContainer.querySelector('.web-relationships-edit-btn').addEventListener('click', function () {
      var contentEl = relationshipsContainer.querySelector('.web-relationships-content');
      var toolbar = relationshipsContainer.querySelector('.stage-block-toolbar');
      if (!contentEl) return;

      var editors = [];
      contentEl.innerHTML = '';

      web.relationshipArchetypes.forEach(function (relationship) {
        var card = document.createElement('article');
        card.className = 'spine-card';

        var heading = document.createElement('h4');
        heading.textContent = relationship.fromCharacter + ' \u2192 ' + relationship.toCharacter;
        card.appendChild(heading);

        var typeField = document.createElement('div');
        typeField.className = 'spine-field';
        typeField.innerHTML = '<span class="spine-label">Type:</span> ' +
          escapeHtml(String(relationship.relationshipType || '').replace(/_/g, ' '));
        card.appendChild(typeField);

        var valenceField = document.createElement('div');
        valenceField.className = 'spine-field';
        valenceField.innerHTML = '<span class="spine-label">Valence:</span> ' +
          escapeHtml(String(relationship.valence || '').replace(/_/g, ' '));
        card.appendChild(valenceField);

        var tensionLabel = document.createElement('label');
        tensionLabel.className = 'stage-field-label';
        tensionLabel.textContent = 'Essential Tension:';
        card.appendChild(tensionLabel);

        var tensionTextarea = document.createElement('textarea');
        tensionTextarea.className = 'concept-inline-textarea';
        tensionTextarea.rows = 3;
        tensionTextarea.value = relationship.essentialTension || '';
        card.appendChild(tensionTextarea);

        contentEl.appendChild(card);

        editors.push({
          fromCharacter: relationship.fromCharacter,
          toCharacter: relationship.toCharacter,
          tensionTextarea: tensionTextarea,
        });
      });

      var actions = document.createElement('div');
      actions.className = 'stage-edit-actions';

      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary btn-sm';
      saveBtn.textContent = 'Save Changes';

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-secondary btn-sm';
      cancelBtn.textContent = 'Cancel';

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      contentEl.appendChild(actions);
      if (toolbar) toolbar.style.display = 'none';

      cancelBtn.addEventListener('click', function () {
        renderRelationships(web);
      });

      saveBtn.addEventListener('click', function () {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        var archetypesPayload = editors.map(function (ed) {
          return {
            fromCharacter: ed.fromCharacter,
            toCharacter: ed.toCharacter,
            essentialTension: ed.tensionTextarea.value.trim(),
          };
        });

        patchWeb({ relationshipArchetypes: archetypesPayload })
          .then(function () {
            renderRelationships(state.selectedWeb.web);
          })
          .catch(function (err) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
            window.alert('Save failed: ' + (err.message || 'Unknown error'));
          });
      });
    });
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
    var summaryBlock = document.getElementById('character-web-summary-block');
    if (webSummary && summaryBlock) {
      webSummary.textContent =
        web.castDynamicsSummary || 'Generate the web to discover the cast dynamics.';

      var existingToolbar = summaryBlock.querySelector('.stage-block-toolbar');
      if (existingToolbar) {
        existingToolbar.remove();
      }

      if (web.castDynamicsSummary) {
        var summaryToolbar = document.createElement('div');
        summaryToolbar.className = 'stage-block-toolbar';

        var summaryEditBtn = document.createElement('button');
        summaryEditBtn.type = 'button';
        summaryEditBtn.className = 'btn btn-secondary btn-sm';
        summaryEditBtn.textContent = 'Edit';

        summaryToolbar.appendChild(summaryEditBtn);
        summaryBlock.insertBefore(summaryToolbar, webSummary);

        summaryEditBtn.addEventListener('click', function () {
          summaryToolbar.style.display = 'none';
          webSummary.style.display = 'none';

          var textarea = document.createElement('textarea');
          textarea.className = 'concept-inline-textarea';
          textarea.rows = 5;
          textarea.value = web.castDynamicsSummary || '';

          var actions = document.createElement('div');
          actions.className = 'stage-edit-actions';

          var saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn btn-primary btn-sm';
          saveBtn.textContent = 'Save Changes';

          var cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'btn btn-secondary btn-sm';
          cancelBtn.textContent = 'Cancel';

          actions.appendChild(saveBtn);
          actions.appendChild(cancelBtn);

          summaryBlock.appendChild(textarea);
          summaryBlock.appendChild(actions);

          cancelBtn.addEventListener('click', function () {
            textarea.remove();
            actions.remove();
            summaryToolbar.style.display = '';
            webSummary.style.display = '';
          });

          saveBtn.addEventListener('click', function () {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            patchWeb({ castDynamicsSummary: textarea.value.trim() })
              .then(function () {
                textarea.remove();
                actions.remove();
                summaryToolbar.style.display = '';
                webSummary.style.display = '';
                webSummary.textContent = state.selectedWeb.web.castDynamicsSummary;
              })
              .catch(function (err) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
                window.alert('Save failed: ' + (err.message || 'Unknown error'));
              });
          });
        });
      }
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
          ' \u2022 ' +
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
          renderStageBlock(definition.stage, payload, character.id, character.characterName) +
          '</div>' +
          '</details>'
        );
      })
      .join('');

    attachStageBlockListeners(stageList, getStagePayload, onStageSaved);

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
        state.selectedWeb = null;
        renderWebDetails();
        return;
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

    var worldbuildingId =
      worldbuildingSelector instanceof HTMLSelectElement ? (worldbuildingSelector.value || '').trim() : '';
    if (!worldbuildingId) {
      setError('A worldbuilding entry must be selected');
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
            sourceWorldbuildingId: worldbuildingId,
          }),
        },
        'Failed to create character web'
      );
      webNameInput.value = '';
      userNotesInput.value = '';
      if (conceptSelector instanceof HTMLSelectElement) {
        conceptSelector.value = '';
      }
      if (worldbuildingSelector instanceof HTMLSelectElement) {
        worldbuildingSelector.value = '';
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
      state.selectedWeb = null;
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

    if (worldbuildingSelector instanceof HTMLSelectElement) {
      try {
        var wbResponse = await fetch('/worldbuilding/api/list');
        var wbData = await wbResponse.json();
        if (wbResponse.ok && wbData.success && Array.isArray(wbData.worldbuildings)) {
          wbData.worldbuildings.forEach(function (entry) {
            var option = document.createElement('option');
            option.value = entry.id;
            option.textContent = entry.name || 'Untitled Worldbuilding';
            worldbuildingSelector.appendChild(option);
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
