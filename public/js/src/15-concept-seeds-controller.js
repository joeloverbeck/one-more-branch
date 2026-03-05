  // ── Concept Seeds Page Controller ────────────────────────────────

  function initConceptSeedsPage() {
    var page = document.getElementById('concept-seeds-page');
    if (!page) return;

    var loading = document.getElementById('loading');
    var generateBtn = document.getElementById('generate-seeds-btn');
    var seedResultCards = document.getElementById('seed-result-cards');
    var seedResultsSection = document.getElementById('seed-results-section');
    var savedSeedsList = document.getElementById('saved-seeds-list');
    var kernelSelector = document.getElementById('kernel-selector');
    var kernelSummary = document.getElementById('selected-kernel-summary');
    var kernelThesis = document.getElementById('selected-kernel-dramatic-thesis');
    var kernelValue = document.getElementById('selected-kernel-value-at-stake');
    var kernelOpposingForce = document.getElementById('selected-kernel-opposing-force');
    var kernelQuestion = document.getElementById('selected-kernel-thematic-question');
    var kernelScore = document.getElementById('selected-kernel-overall-score');

    if (!loading || !generateBtn) return;

    var loadingProgress = createLoadingProgressController(loading);
    var selectedKernelId = '';
    var lastGeneratedSeeds = null;
    var lastGeneratedCharacterWorlds = null;
    var lastKernelId = '';
    var lastFormInputs = {};

    var kernelSummaryFields = {
      thesis: kernelThesis,
      valueAtStake: kernelValue,
      opposingForce: kernelOpposingForce,
      thematicQuestion: kernelQuestion,
      overallScore: kernelScore,
    };

    // ── Genre chip exclusion state ──────────────────────────────────
    var genreChipGrid = document.getElementById('genre-chip-grid');
    var genreChipCounter = document.getElementById('genre-chip-counter');
    var bannedGenres = {};
    var MIN_UNBANNED = 6;
    var genreChipToast = null;

    function getTotalGenreCount() {
      if (!genreChipGrid) return 0;
      return genreChipGrid.querySelectorAll('.genre-chip').length;
    }

    function getBannedCount() {
      var count = 0;
      for (var key in bannedGenres) {
        if (bannedGenres[key]) count++;
      }
      return count;
    }

    function updateGenreChipCounter() {
      if (!genreChipCounter) return;
      var total = getTotalGenreCount();
      var available = total - getBannedCount();
      genreChipCounter.textContent = '(' + available + ' of ' + total + ' available)';
    }

    function showGenreToast(message) {
      if (!genreChipToast) {
        genreChipToast = document.createElement('div');
        genreChipToast.className = 'genre-chip-toast';
        document.body.appendChild(genreChipToast);
      }
      genreChipToast.textContent = message;
      genreChipToast.classList.add('genre-chip-toast--visible');
      setTimeout(function () {
        genreChipToast.classList.remove('genre-chip-toast--visible');
      }, 2000);
    }

    function collectExcludedGenres() {
      var excluded = [];
      for (var key in bannedGenres) {
        if (bannedGenres[key]) excluded.push(key);
      }
      return excluded;
    }

    if (genreChipGrid) {
      genreChipGrid.addEventListener('click', function (event) {
        var chip = event.target;
        if (!(chip instanceof HTMLElement) || !chip.classList.contains('genre-chip')) return;
        var genre = chip.dataset.genre;
        if (!genre) return;

        if (bannedGenres[genre]) {
          bannedGenres[genre] = false;
          chip.classList.remove('genre-chip--banned');
        } else {
          var total = getTotalGenreCount();
          var available = total - getBannedCount();
          if (available <= MIN_UNBANNED) {
            showGenreToast('At least ' + MIN_UNBANNED + ' genres must remain available');
            return;
          }
          bannedGenres[genre] = true;
          chip.classList.add('genre-chip--banned');
        }
        updateGenreChipCounter();
      });
    }

    // Restore API key
    var storedKey = getApiKey();
    var apiKeyInput = document.getElementById('seedApiKey');
    if (apiKeyInput && storedKey && apiKeyInput.value.length === 0) {
      apiKeyInput.value = storedKey;
    }

    function getSeedApiKey() {
      var input = document.getElementById('seedApiKey');
      var val = input && typeof input.value === 'string' ? input.value.trim() : '';
      return val || (getApiKey() || '').trim();
    }

    function collectFormInputs() {
      var p = document.getElementById('protagonistDetails');
      var g = document.getElementById('genreVibes');
      var m = document.getElementById('moodKeywords');
      var c = document.getElementById('contentPreferences');
      return {
        protagonistDetails: p && typeof p.value === 'string' ? p.value.trim() : '',
        genreVibes: g && typeof g.value === 'string' ? g.value.trim() : '',
        moodKeywords: m && typeof m.value === 'string' ? m.value.trim() : '',
        contentPreferences: c && typeof c.value === 'string' ? c.value.trim() : '',
      };
    }

    function isFormValid() {
      var inputs = collectFormInputs();
      var apiKey = getSeedApiKey();
      return (
        apiKey.length >= 10 &&
        selectedKernelId.length > 0 &&
        inputs.protagonistDetails.length > 0 &&
        (inputs.genreVibes.length > 0 || inputs.moodKeywords.length > 0 || inputs.contentPreferences.length > 0)
      );
    }

    function updateGenerateButtonState() {
      generateBtn.disabled = !isFormValid();
    }

    function showError(message) {
      if (typeof showFormError === 'function') {
        showFormError(message);
      } else {
        alert(message);
      }
    }

    // ── Kernel selector ─────────────────────────────────────────────

    async function loadKernelOptions() {
      try {
        await loadKernelOptionsIntoSelect(kernelSelector);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to load kernels');
      }
    }

    async function handleKernelSelectionChange() {
      if (!(kernelSelector instanceof HTMLSelectElement)) return;

      selectedKernelId = (kernelSelector.value || '').trim();
      if (!selectedKernelId) {
        hideSavedKernelSummary(kernelSummary, kernelSummaryFields);
        updateGenerateButtonState();
        return;
      }

      try {
        var kernel = await loadSavedKernelById(selectedKernelId);
        renderSavedKernelSummary(kernel, kernelSummary, kernelSummaryFields);
      } catch (error) {
        selectedKernelId = '';
        kernelSelector.value = '';
        hideSavedKernelSummary(kernelSummary, kernelSummaryFields);
        showError(error instanceof Error ? error.message : 'Failed to load selected kernel');
      } finally {
        updateGenerateButtonState();
      }
    }

    // ── Generate seeds ──────────────────────────────────────────────

    async function handleGenerate() {
      var apiKey = getSeedApiKey();
      if (apiKey.length < 10) {
        showError('OpenRouter API key is required');
        return;
      }
      if (!selectedKernelId) {
        showError('Select a story kernel before generating seeds');
        return;
      }

      var inputs = collectFormInputs();
      if (!inputs.protagonistDetails) {
        showError('Protagonist details are required');
        return;
      }
      if (!inputs.genreVibes && !inputs.moodKeywords && !inputs.contentPreferences) {
        showError('At least one seed field (genre vibes, mood keywords, or content preferences) is required');
        return;
      }

      generateBtn.disabled = true;
      if (seedResultsSection) seedResultsSection.style.display = 'none';
      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var response = await fetch('/concept-seeds/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            protagonistDetails: inputs.protagonistDetails,
            genreVibes: inputs.genreVibes,
            moodKeywords: inputs.moodKeywords,
            contentPreferences: inputs.contentPreferences,
            excludedGenres: collectExcludedGenres(),
            kernelId: selectedKernelId,
            apiKey: apiKey,
            progressId: progressId,
          }),
        });

        var data = null;
        try { data = await response.json(); } catch (_e) { data = null; }

        if (!response.ok || !data || !data.success) {
          throw new Error(data && data.error ? data.error : 'Failed to generate seeds');
        }

        setApiKey(apiKey);
        lastGeneratedSeeds = data.seeds;
        lastGeneratedCharacterWorlds = data.characterWorlds;
        lastKernelId = data.kernelId || selectedKernelId;
        lastFormInputs = inputs;

        renderGeneratedSeeds(data.seeds, data.characterWorlds);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Something went wrong');
      } finally {
        loadingProgress.stop();
        loading.style.display = 'none';
        updateGenerateButtonState();
      }
    }

    function renderGeneratedSeeds(seeds, characterWorlds) {
      if (!seedResultCards || !seedResultsSection) return;

      seedResultCards.innerHTML = '';

      if (!Array.isArray(seeds) || seeds.length === 0) {
        seedResultCards.innerHTML = '<p class="spine-section-subtitle">No seeds generated. Adjust inputs and try again.</p>';
        seedResultsSection.style.display = 'block';
        return;
      }

      seeds.forEach(function (seed, index) {
        var cw = characterWorlds && characterWorlds[index] ? characterWorlds[index] : {};
        var card = document.createElement('article');
        card.className = 'spine-card';
        card.dataset.index = String(index);

        var genreLabel = (seed.genreFrame || '').replace(/_/g, ' ');
        var conflictLabel = (seed.conflictAxis || '').replace(/_/g, ' ');
        var conflictTypeLabel = seed.conflictType ? seed.conflictType.replace(/_/g, ' ') : '';
        var scaleLabel = cw.settingScale ? cw.settingScale.replace(/_/g, ' ') : '';

        var html =
          '<div class="spine-badges">' +
            '<span class="spine-badge spine-badge-type">' + escapeHtml(genreLabel) + '</span>' +
            '<span class="spine-badge spine-badge-conflict">' + escapeHtml(conflictLabel) + '</span>' +
            (conflictTypeLabel ? '<span class="spine-badge spine-badge-conflict">' + escapeHtml(conflictTypeLabel) + '</span>' : '') +
            (scaleLabel ? '<span class="spine-badge spine-badge-type">' + escapeHtml(scaleLabel) + '</span>' : '') +
          '</div>' +
          '<h3 class="spine-cdq">' + escapeHtml(seed.oneLineHook || 'Untitled') + '</h3>';

        if (cw.protagonistRole) html += '<div class="spine-field"><span class="spine-label">Protagonist:</span> ' + escapeHtml(cw.protagonistRole) + '</div>';
        if (cw.coreFlaw) html += '<div class="spine-field"><span class="spine-label">Core Flaw:</span> ' + escapeHtml(cw.coreFlaw) + '</div>';
        if (cw.coreConflictLoop) html += '<div class="spine-field"><span class="spine-label">Conflict Loop:</span> ' + escapeHtml(cw.coreConflictLoop) + '</div>';
        if (seed.whatIfQuestion) html += '<p class="spine-field"><span class="spine-label">What If:</span> <em>' + escapeHtml(seed.whatIfQuestion) + '</em></p>';
        if (seed.playerFantasy) html += '<p class="spine-field"><span class="spine-label">Player Fantasy:</span> <em>' + escapeHtml(seed.playerFantasy) + '</em></p>';
        if (seed.genreSubversion) html += '<div class="spine-field"><span class="spine-label">Genre Subversion:</span> ' + escapeHtml(seed.genreSubversion) + '</div>';
        if (Array.isArray(cw.settingAxioms) && cw.settingAxioms.length > 0) html += '<div class="spine-field"><span class="spine-label">Setting Axioms:</span><ul>' + renderListItems(cw.settingAxioms) + '</ul></div>';
        if (Array.isArray(cw.constraintSet) && cw.constraintSet.length > 0) html += '<div class="spine-field"><span class="spine-label">Constraints:</span><ul>' + renderListItems(cw.constraintSet) + '</ul></div>';
        if (Array.isArray(cw.keyInstitutions) && cw.keyInstitutions.length > 0) html += '<div class="spine-field"><span class="spine-label">Key Institutions:</span><ul>' + renderListItems(cw.keyInstitutions) + '</ul></div>';

        html +=
          '<div class="form-actions" style="margin-top: 0.5rem;">' +
            '<button type="button" class="btn btn-primary btn-small seed-save-generated-btn" data-gen-index="' + index + '">Save to Library</button>' +
          '</div>';

        card.innerHTML = html;
        seedResultCards.appendChild(card);
      });

      seedResultsSection.style.display = 'block';
      seedResultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // ── Save generated seed ─────────────────────────────────────────

    if (seedResultCards) {
      seedResultCards.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        var btn = target.closest('.seed-save-generated-btn');
        if (!btn) return;

        var index = Number(btn.dataset.genIndex);
        if (!Number.isFinite(index) || !lastGeneratedSeeds || !lastGeneratedSeeds[index]) return;

        btn.disabled = true;
        btn.textContent = 'Saving...';
        saveGeneratedSeed(index, btn);
      });
    }

    async function saveGeneratedSeed(index, btn) {
      var seed = lastGeneratedSeeds[index];
      var cw = lastGeneratedCharacterWorlds && lastGeneratedCharacterWorlds[index]
        ? lastGeneratedCharacterWorlds[index]
        : {};

      try {
        var response = await fetch('/concept-seeds/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seed: seed,
            characterWorld: cw,
            sourceKernelId: lastKernelId,
            protagonistDetails: lastFormInputs.protagonistDetails || '',
            genreVibes: lastFormInputs.genreVibes || '',
            moodKeywords: lastFormInputs.moodKeywords || '',
            contentPreferences: lastFormInputs.contentPreferences || '',
          }),
        });

        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to save seed');
        }

        btn.textContent = 'Saved!';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');

        appendSavedSeedCard(data.seed);
      } catch (error) {
        btn.disabled = false;
        btn.textContent = 'Save to Library';
        showError(error instanceof Error ? error.message : 'Failed to save');
      }
    }

    // ── Saved seeds list management ─────────────────────────────────

    function findOrCreateSeedGenreGroup(genre) {
      if (!savedSeedsList) return null;
      var existing = savedSeedsList.querySelector('details.genre-group[data-genre="' + genre + '"]');
      if (existing) return existing;

      var details = document.createElement('details');
      details.className = 'genre-group';
      details.setAttribute('data-genre', genre);

      var summary = document.createElement('summary');
      summary.className = 'genre-group__header';
      summary.innerHTML =
        '<span class="genre-group__label">' + escapeHtml(formatGenreDisplayLabel(genre)) + '</span>' +
        '<span class="genre-group__count">(0)</span>';

      details.appendChild(summary);

      var body = document.createElement('div');
      body.className = 'genre-group__body spine-options-container';
      details.appendChild(body);

      // Insert alphabetically
      var label = formatGenreDisplayLabel(genre).toLowerCase();
      var groups = savedSeedsList.querySelectorAll('details.genre-group');
      var inserted = false;
      for (var i = 0; i < groups.length; i++) {
        var groupLabel = (groups[i].getAttribute('data-genre') || '').replace(/_/g, ' ').toLowerCase();
        if (label < groupLabel) {
          savedSeedsList.insertBefore(details, groups[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        savedSeedsList.appendChild(details);
      }

      return details;
    }

    function updateSeedGenreGroupCount(genreGroup) {
      if (!genreGroup) return;
      var body = genreGroup.querySelector('.genre-group__body');
      var count = body ? body.querySelectorAll('.saved-seed-card').length : 0;
      var countSpan = genreGroup.querySelector('.genre-group__count');
      if (countSpan) countSpan.textContent = '(' + count + ')';
    }

    function appendSavedSeedCard(seed) {
      if (!savedSeedsList) return;

      // Remove "no saved seeds" message
      var section = savedSeedsList.closest('#saved-seeds-section');
      if (section) {
        var emptyP = section.querySelector('.spine-section-subtitle');
        if (emptyP) emptyP.remove();
      }

      var card = document.createElement('article');
      card.className = 'spine-card saved-seed-card';
      card.dataset.seedId = seed.id;

      var genreLabel = (seed.genreFrame || '').replace(/_/g, ' ');
      var conflictLabel = (seed.conflictAxis || '').replace(/_/g, ' ');
      var conflictTypeBadge = seed.conflictType
        ? '<span class="spine-badge spine-badge-conflict">' + escapeHtml(seed.conflictType.replace(/_/g, ' ')) + '</span>'
        : '';
      var scaleBadge = seed.settingScale
        ? '<span class="spine-badge spine-badge-type">' + escapeHtml(seed.settingScale.replace(/_/g, ' ')) + '</span>'
        : '';

      var html =
        '<div class="spine-badges">' +
          '<span class="spine-badge spine-badge-type">' + escapeHtml(genreLabel) + '</span>' +
          '<span class="spine-badge spine-badge-conflict">' + escapeHtml(conflictLabel) + '</span>' +
          conflictTypeBadge + scaleBadge +
        '</div>' +
        '<h3 class="spine-cdq">' + escapeHtml(seed.name) + '</h3>' +
        '<div class="spine-field"><span class="spine-label">Protagonist:</span> ' + escapeHtml(seed.protagonistRole || '') + '</div>';

      if (seed.coreFlaw) html += '<div class="spine-field"><span class="spine-label">Core Flaw:</span> ' + escapeHtml(seed.coreFlaw) + '</div>';
      if (seed.coreConflictLoop) html += '<div class="spine-field"><span class="spine-label">Conflict Loop:</span> ' + escapeHtml(seed.coreConflictLoop) + '</div>';
      if (seed.whatIfQuestion) html += '<p class="spine-field"><span class="spine-label">What If:</span> <em>' + escapeHtml(seed.whatIfQuestion) + '</em></p>';
      if (seed.playerFantasy) html += '<p class="spine-field"><span class="spine-label">Player Fantasy:</span> <em>' + escapeHtml(seed.playerFantasy) + '</em></p>';
      if (seed.genreSubversion) html += '<div class="spine-field"><span class="spine-label">Genre Subversion:</span> ' + escapeHtml(seed.genreSubversion) + '</div>';
      if (Array.isArray(seed.settingAxioms) && seed.settingAxioms.length > 0) html += '<div class="spine-field"><span class="spine-label">Setting Axioms:</span><ul>' + renderListItems(seed.settingAxioms) + '</ul></div>';
      if (Array.isArray(seed.constraintSet) && seed.constraintSet.length > 0) html += '<div class="spine-field"><span class="spine-label">Constraints:</span><ul>' + renderListItems(seed.constraintSet) + '</ul></div>';
      if (Array.isArray(seed.keyInstitutions) && seed.keyInstitutions.length > 0) html += '<div class="spine-field"><span class="spine-label">Key Institutions:</span><ul>' + renderListItems(seed.keyInstitutions) + '</ul></div>';

      html +=
        '<div class="spine-field"><span class="spine-label">Created:</span> ' + escapeHtml(new Date(seed.createdAt).toLocaleDateString()) + '</div>' +
        '<div class="form-actions" style="margin-top: 0.5rem;">' +
          '<button type="button" class="btn btn-secondary btn-small seed-edit-btn" data-seed-id="' + escapeHtml(seed.id) + '">Edit Name</button>' +
          '<button type="button" class="btn btn-danger btn-small seed-delete-btn" data-seed-id="' + escapeHtml(seed.id) + '">Delete</button>' +
        '</div>';

      card.innerHTML = html;

      var genre = seed.genreFrame || 'UNKNOWN';
      var genreGroup = findOrCreateSeedGenreGroup(genre);
      if (genreGroup) {
        var body = genreGroup.querySelector('.genre-group__body');
        if (body) body.prepend(card);
        updateSeedGenreGroupCount(genreGroup);
      } else {
        savedSeedsList.prepend(card);
      }
    }

    // ── Edit seed name & Delete ──────────────────────────────────────

    if (savedSeedsList) {
      savedSeedsList.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;

        var deleteBtn = target.closest('.seed-delete-btn');
        if (deleteBtn) {
          var seedId = deleteBtn.dataset.seedId;
          if (seedId && confirm('Delete this seed?')) {
            handleSeedDelete(seedId, deleteBtn);
          }
          return;
        }

        var editBtn = target.closest('.seed-edit-btn');
        if (editBtn) {
          var editSeedId = editBtn.dataset.seedId;
          if (editSeedId) handleSeedEditName(editSeedId, editBtn);
        }
      });
    }

    async function handleSeedDelete(seedId, btn) {
      btn.disabled = true;
      try {
        var response = await fetch('/concept-seeds/api/' + encodeURIComponent(seedId), {
          method: 'DELETE',
        });
        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to delete seed');
        }

        var card = btn.closest('.saved-seed-card');
        var parentGroup = card ? card.closest('.genre-group') : null;
        if (card) card.remove();
        if (parentGroup) {
          updateSeedGenreGroupCount(parentGroup);
          if (parentGroup.querySelectorAll('.saved-seed-card').length === 0) {
            parentGroup.remove();
          }
        }
      } catch (error) {
        btn.disabled = false;
        showError(error instanceof Error ? error.message : 'Failed to delete seed');
      }
    }

    async function handleSeedEditName(seedId, btn) {
      var card = btn.closest('.saved-seed-card');
      var titleEl = card ? card.querySelector('.spine-cdq') : null;
      var currentName = titleEl ? titleEl.textContent : '';
      var newName = prompt('Edit seed name:', currentName);
      if (newName === null || newName.trim() === currentName) return;

      btn.disabled = true;
      try {
        var response = await fetch('/concept-seeds/api/' + encodeURIComponent(seedId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim() }),
        });
        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to update seed');
        }
        if (titleEl && data.seed) {
          titleEl.textContent = data.seed.name;
        }
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to update seed name');
      } finally {
        btn.disabled = false;
      }
    }

    // ── Event binding ───────────────────────────────────────────────

    generateBtn.addEventListener('click', function (event) {
      event.preventDefault();
      handleGenerate();
    });

    if (apiKeyInput) {
      apiKeyInput.addEventListener('input', updateGenerateButtonState);
    }
    var protagonistInput = document.getElementById('protagonistDetails');
    if (protagonistInput) protagonistInput.addEventListener('input', updateGenerateButtonState);
    var genreVibesInput = document.getElementById('genreVibes');
    if (genreVibesInput) genreVibesInput.addEventListener('input', updateGenerateButtonState);
    var moodInput = document.getElementById('moodKeywords');
    if (moodInput) moodInput.addEventListener('input', updateGenerateButtonState);
    var contentInput = document.getElementById('contentPreferences');
    if (contentInput) contentInput.addEventListener('input', updateGenerateButtonState);

    if (kernelSelector instanceof HTMLSelectElement) {
      kernelSelector.addEventListener('change', function () {
        void handleKernelSelectionChange();
      });
    }

    hideSavedKernelSummary(kernelSummary, kernelSummaryFields);
    updateGenerateButtonState();
    void loadKernelOptions();
  }
