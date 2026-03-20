// ── Spine Page Controller ────────────────────────────────────────

function initSpinesPage() {
  var page = document.getElementById('spines-page');
  if (!page) return;

  var form = document.getElementById('spine-generate-form');
  var generateBtn = document.getElementById('generate-spines-btn');
  var progressSection = document.getElementById('spine-progress-section');
  var progressContent = document.getElementById('spine-progress-content');
  var generatedSection = document.getElementById('generated-spines-section');
  var generatedContainer = document.getElementById('generated-spines');
  var savedContainer = document.getElementById('saved-spines');

  var conceptSelect = document.getElementById('spineConceptId');
  var protagonistSelect = document.getElementById('spineProtagonistId');
  var worldbuildingSelect = document.getElementById('spineWorldbuildingId');
  var apiKeyInput = document.getElementById('spineApiKey');
  var toneInput = document.getElementById('spineTone');
  var startingSituationInput = document.getElementById('spineStartingSituation');
  var npcSelect = document.getElementById('spineNpcIds');

  if (!form || !generateBtn) return;

  var loadingProgress = createLoadingProgressController(progressContent);

  // Restore API key
  var storedApiKey = getApiKey();
  if (storedApiKey && apiKeyInput && apiKeyInput.value.length === 0) {
    apiKeyInput.value = storedApiKey;
  }

  function updateGenerateButton() {
    var hasApiKey = apiKeyInput && apiKeyInput.value.trim().length >= 10;
    var hasConcept = conceptSelect && conceptSelect.value;
    var hasProtagonist = protagonistSelect && protagonistSelect.value;
    var hasWorldbuilding = worldbuildingSelect && worldbuildingSelect.value;
    generateBtn.disabled = !(hasApiKey && hasConcept && hasProtagonist && hasWorldbuilding);
  }

  if (apiKeyInput) apiKeyInput.addEventListener('input', updateGenerateButton);
  if (conceptSelect) conceptSelect.addEventListener('change', updateGenerateButton);
  if (protagonistSelect) protagonistSelect.addEventListener('change', updateGenerateButton);
  if (worldbuildingSelect) worldbuildingSelect.addEventListener('change', updateGenerateButton);
  updateGenerateButton();

  // Track current form context for saving
  var currentFormContext = {};

  function collectFormContext() {
    return {
      conceptId: conceptSelect ? conceptSelect.value : '',
      protagonistCharacterId: protagonistSelect ? protagonistSelect.value : '',
      npcCharacterIds: npcSelect
        ? Array.from(npcSelect.selectedOptions).map(function (o) { return o.value; })
        : [],
      worldbuildingId: worldbuildingSelect ? worldbuildingSelect.value : '',
      tone: toneInput ? toneInput.value.trim() : '',
      startingSituation: startingSituationInput ? startingSituationInput.value.trim() : '',
    };
  }

  function renderSpineCard(option, index, isSaved) {
    var card = document.createElement('div');
    card.className = 'spine-option-card';

    var html =
      '<h3>' + escapeHtml(option.storySpineType) + '</h3>' +
      '<p><strong>Dramatic Question:</strong> ' + escapeHtml(option.centralDramaticQuestion) + '</p>' +
      '<p><strong>Conflict:</strong> ' + escapeHtml(option.conflictAxis) + ' / ' + escapeHtml(option.conflictType) + '</p>' +
      '<p><strong>Arc:</strong> ' + escapeHtml(option.characterArcType) + '</p>' +
      '<p><strong>Need:</strong> ' + escapeHtml(option.protagonistNeedVsWant.need) + '</p>' +
      '<p><strong>Want:</strong> ' + escapeHtml(option.protagonistNeedVsWant.want) + '</p>' +
      '<p><strong>Antagonistic Force:</strong> ' + escapeHtml(option.primaryAntagonisticForce.description) + '</p>';

    if (option.toneFeel && option.toneFeel.length > 0) {
      html += '<p><strong>Tone Feel:</strong> ' + option.toneFeel.map(escapeHtml).join(', ') + '</p>';
    }
    if (option.toneAvoid && option.toneAvoid.length > 0) {
      html += '<p><strong>Tone Avoid:</strong> ' + option.toneAvoid.map(escapeHtml).join(', ') + '</p>';
    }
    if (option.wantNeedCollisionPoint) {
      html += '<p><strong>Collision Point:</strong> ' + escapeHtml(option.wantNeedCollisionPoint) + '</p>';
    }
    if (option.protagonistDeepestFear) {
      html += '<p><strong>Deepest Fear:</strong> ' + escapeHtml(option.protagonistDeepestFear) + '</p>';
    }

    if (!isSaved) {
      html += '<div class="form-actions">' +
        '<button type="button" class="btn btn-primary save-spine-btn" data-index="' + index + '">Save</button>' +
        '</div>';
    }

    card.innerHTML = html;
    return card;
  }

  async function loadSavedSpines() {
    var response = await fetch('/spines/api/list', {
      method: 'GET',
      cache: 'no-store',
    });

    var data = await response.json();
    if (!response.ok || !data.success || !Array.isArray(data.spines)) {
      throw new Error(data.error || 'Failed to load spines');
    }

    savedContainer.innerHTML = '';

    if (data.spines.length === 0) {
      var msg = document.createElement('p');
      msg.className = 'spine-section-subtitle';
      msg.textContent = 'No saved spines yet. Generate some above!';
      savedContainer.appendChild(msg);
      return;
    }

    data.spines.forEach(function (spine) {
      savedContainer.appendChild(renderSavedSpineCard(spine));
    });
  }

  function renderSavedSpineCard(spine) {
    var card = document.createElement('div');
    card.className = 'spine-option-card';
    card.dataset.spineId = spine.id;

    var opt = spine.spineOption;
    var html =
      '<h3>' + escapeHtml(spine.name) + '</h3>' +
      '<p><strong>Type:</strong> ' + escapeHtml(opt.storySpineType) + '</p>' +
      '<p><strong>Dramatic Question:</strong> ' + escapeHtml(opt.centralDramaticQuestion) + '</p>' +
      '<p><strong>Conflict:</strong> ' + escapeHtml(opt.conflictAxis) + ' / ' + escapeHtml(opt.conflictType) + '</p>' +
      '<p><strong>Arc:</strong> ' + escapeHtml(opt.characterArcType) + '</p>' +
      '<div class="form-actions">' +
      '<button type="button" class="btn btn-danger delete-spine-btn" data-spine-id="' + spine.id + '">Delete</button>' +
      '</div>';

    card.innerHTML = html;
    return card;
  }

  var generatedOptions = [];

  async function fetchSpineOptions() {
    generateBtn.disabled = true;
    progressSection.style.display = 'flex';
    generatedSection.style.display = 'none';
    generatedContainer.innerHTML = '';

    currentFormContext = collectFormContext();

    var progressId = createProgressId();
    loadingProgress.start(progressId);

    try {
      var apiKey = apiKeyInput.value.trim();
      setApiKey(apiKey);

      var response = await fetch('/spines/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: currentFormContext.conceptId,
          protagonistCharacterId: currentFormContext.protagonistCharacterId,
          npcCharacterIds: currentFormContext.npcCharacterIds,
          worldbuildingId: currentFormContext.worldbuildingId,
          tone: currentFormContext.tone,
          startingSituation: currentFormContext.startingSituation,
          apiKey: apiKey,
          progressId: progressId,
        }),
      });

      var data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate spines');
      }

      generatedOptions = data.options;

      data.options.forEach(function (option, i) {
        generatedContainer.appendChild(renderSpineCard(option, i, false));
      });

      generatedSection.style.display = '';
    } catch (error) {
      var errorEl = document.createElement('p');
      errorEl.className = 'form-error';
      errorEl.textContent = error instanceof Error ? error.message : 'Generation failed';
      generatedContainer.appendChild(errorEl);
      generatedSection.style.display = '';
    } finally {
      loadingProgress.stop();
      progressSection.style.display = 'none';
      updateGenerateButton();
    }
  }

  // Save button delegation
  generatedContainer.addEventListener('click', async function (event) {
    var saveBtn = event.target.closest('.save-spine-btn');
    if (!saveBtn) return;

    var index = parseInt(saveBtn.dataset.index, 10);
    var option = generatedOptions[index];
    if (!option) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      var response = await fetch('/spines/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spineOption: option,
          sourceConceptId: currentFormContext.conceptId,
          protagonistCharacterId: currentFormContext.protagonistCharacterId,
          npcCharacterIds: currentFormContext.npcCharacterIds,
          worldbuildingId: currentFormContext.worldbuildingId,
          tone: currentFormContext.tone,
          startingSituation: currentFormContext.startingSituation,
        }),
      });

      var data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save spine');
      }

      saveBtn.textContent = 'Saved!';
      saveBtn.classList.remove('btn-primary');
      saveBtn.classList.add('btn-success');

      await loadSavedSpines();
    } catch (error) {
      saveBtn.textContent = 'Error';
      saveBtn.disabled = false;
    }
  });

  // Delete button delegation
  savedContainer.addEventListener('click', async function (event) {
    var deleteBtn = event.target.closest('.delete-spine-btn');
    if (!deleteBtn) return;

    var spineId = deleteBtn.dataset.spineId;
    if (!spineId) return;

    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';

    try {
      var response = await fetch('/spines/api/' + spineId, {
        method: 'DELETE',
      });

      var data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete spine');
      }

      var card = savedContainer.querySelector('[data-spine-id="' + spineId + '"]');
      if (card) card.remove();

      if (savedContainer.children.length === 0) {
        var msg = document.createElement('p');
        msg.className = 'spine-section-subtitle';
        msg.textContent = 'No saved spines yet. Generate some above!';
        savedContainer.appendChild(msg);
      }
    } catch (error) {
      deleteBtn.textContent = 'Error';
      deleteBtn.disabled = false;
    }
  });

  generateBtn.addEventListener('click', function (event) {
    event.preventDefault();
    fetchSpineOptions();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
  });

  void loadSavedSpines().catch(function (error) {
    console.error('Failed to load saved spines:', error);
  });
}
