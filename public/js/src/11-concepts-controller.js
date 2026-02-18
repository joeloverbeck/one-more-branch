  // ── Concepts Page Controller ─────────────────────────────────────

  function initConceptsPage() {
    var page = document.getElementById('concepts-page');
    if (!page) {
      return;
    }

    var loading = document.getElementById('loading');
    var generateBtn = document.getElementById('generate-concepts-btn');
    var conceptCardsContainer = document.getElementById('concept-cards');
    var conceptResultsSection = document.getElementById('concept-results-section');
    var savedConceptsList = document.getElementById('saved-concepts-list');
    var editModal = document.getElementById('concept-edit-modal');
    var editCloseBtn = document.getElementById('concept-edit-close');
    var editSaveBtn = document.getElementById('concept-edit-save');
    var editCancelBtn = document.getElementById('concept-edit-cancel');

    if (!loading || !generateBtn) {
      return;
    }

    var loadingProgress = createLoadingProgressController(loading);
    var currentEditConceptId = null;
    var lastGeneratedConcepts = null;
    var lastSeeds = null;

    // Restore API key from session storage
    var storedKey = getApiKey();
    var apiKeyInput = document.getElementById('conceptApiKey');
    if (apiKeyInput && storedKey && apiKeyInput.value.length === 0) {
      apiKeyInput.value = storedKey;
    }

    function getConceptApiKey() {
      var input = document.getElementById('conceptApiKey');
      var val = input && typeof input.value === 'string' ? input.value.trim() : '';
      return val || (getApiKey() || '').trim();
    }

    function collectSeeds() {
      var g = document.getElementById('genreVibes');
      var m = document.getElementById('moodKeywords');
      var c = document.getElementById('contentPreferences');
      var t = document.getElementById('thematicInterests');
      var s = document.getElementById('sparkLine');
      return {
        genreVibes: g && typeof g.value === 'string' ? g.value.trim() : '',
        moodKeywords: m && typeof m.value === 'string' ? m.value.trim() : '',
        contentPreferences: c && typeof c.value === 'string' ? c.value.trim() : '',
        thematicInterests: t && typeof t.value === 'string' ? t.value.trim() : '',
        sparkLine: s && typeof s.value === 'string' ? s.value.trim() : '',
      };
    }

    function showError(message) {
      if (typeof showFormError === 'function') {
        showFormError(message);
      } else {
        alert(message);
      }
    }

    // ── Generate concepts ──────────────────────────────────────────

    async function handleGenerate() {
      var conceptApiKeyInput = document.getElementById('conceptApiKey');
      if (
        conceptApiKeyInput &&
        typeof conceptApiKeyInput.checkValidity === 'function' &&
        !conceptApiKeyInput.checkValidity()
      ) {
        conceptApiKeyInput.reportValidity();
        return;
      }

      var apiKey = getConceptApiKey();
      if (apiKey.length < 10) {
        showError('OpenRouter API key is required');
        return;
      }

      var seeds = collectSeeds();
      if (!seeds.genreVibes && !seeds.moodKeywords && !seeds.contentPreferences && !seeds.thematicInterests && !seeds.sparkLine) {
        showError('At least one concept seed field is required');
        return;
      }

      generateBtn.disabled = true;
      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var response = await fetch('/concepts/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            genreVibes: seeds.genreVibes,
            moodKeywords: seeds.moodKeywords,
            contentPreferences: seeds.contentPreferences,
            thematicInterests: seeds.thematicInterests,
            sparkLine: seeds.sparkLine,
            apiKey: apiKey,
            progressId: progressId,
          }),
        });

        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate concepts');
        }

        setApiKey(apiKey);
        lastGeneratedConcepts = data.evaluatedConcepts;
        lastSeeds = seeds;

        renderGeneratedConcepts(data.evaluatedConcepts, seeds);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Something went wrong');
      } finally {
        loadingProgress.stop();
        loading.style.display = 'none';
        generateBtn.disabled = false;
      }
    }

    function renderGeneratedConcepts(evaluatedConcepts, seeds) {
      if (!conceptCardsContainer || !conceptResultsSection) {
        return;
      }

      conceptCardsContainer.innerHTML = '';

      if (!Array.isArray(evaluatedConcepts) || evaluatedConcepts.length === 0) {
        conceptCardsContainer.innerHTML = '<p class="spine-section-subtitle">No concepts generated. Adjust seeds and try again.</p>';
        conceptResultsSection.style.display = 'block';
        return;
      }

      evaluatedConcepts.forEach(function (entry, index) {
        var concept = entry && entry.concept ? entry.concept : {};
        var card = document.createElement('article');
        card.className = 'spine-card concept-card';
        card.dataset.index = String(index);

        var overallScore = Number(entry && entry.overallScore);
        var safeOverall = Number.isFinite(overallScore) ? Math.max(0, Math.min(100, overallScore)) : 0;

        card.innerHTML =
          '<div class="spine-badges">' +
            '<span class="spine-badge spine-badge-type">' + escapeHtml((concept.genreFrame || '').replace(/_/g, ' ')) + '</span>' +
            '<span class="spine-badge spine-badge-conflict">' + escapeHtml((concept.conflictAxis || '').replace(/_/g, ' ')) + '</span>' +
            '<span class="spine-badge spine-badge-arc">Score ' + escapeHtml(Math.round(safeOverall).toString()) + '</span>' +
          '</div>' +
          '<h3 class="spine-cdq">' + escapeHtml(concept.oneLineHook || '') + '</h3>' +
          '<p class="spine-field">' + escapeHtml(concept.elevatorParagraph || '') + '</p>' +
          '<div class="spine-field"><span class="spine-label">Protagonist:</span> ' + escapeHtml(concept.protagonistRole || '') + '</div>' +
          '<div class="concept-scores">' + renderScoreGrid(entry && entry.scores) + '</div>' +
          '<div class="spine-field"><span class="spine-label">Tradeoff:</span> ' + escapeHtml(entry && entry.tradeoffSummary ? entry.tradeoffSummary : '') + '</div>' +
          '<div class="concept-feedback">' +
            '<div class="concept-feedback-block"><span class="spine-label">Strengths</span><ul>' + renderListItems(entry && entry.strengths) + '</ul></div>' +
            '<div class="concept-feedback-block"><span class="spine-label">Weaknesses</span><ul>' + renderListItems(entry && entry.weaknesses) + '</ul></div>' +
          '</div>' +
          '<div class="form-actions" style="margin-top: 0.5rem;">' +
            '<button type="button" class="btn btn-primary btn-small concept-save-generated-btn" data-gen-index="' + index + '">Save to Library</button>' +
          '</div>';

        conceptCardsContainer.appendChild(card);
      });

      conceptResultsSection.style.display = 'block';
      conceptResultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // ── Save generated concept ─────────────────────────────────────

    if (conceptCardsContainer) {
      conceptCardsContainer.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        var btn = target.closest('.concept-save-generated-btn');
        if (!btn) return;

        var index = Number(btn.dataset.genIndex);
        if (!Number.isFinite(index) || !lastGeneratedConcepts || !lastGeneratedConcepts[index]) return;

        btn.disabled = true;
        btn.textContent = 'Saving...';
        saveGeneratedConcept(lastGeneratedConcepts[index], lastSeeds, btn);
      });
    }

    async function saveGeneratedConcept(evaluatedConcept, seeds, btn) {
      try {
        var response = await fetch('/concepts/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evaluatedConcept: evaluatedConcept,
            seeds: seeds || {},
          }),
        });

        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to save concept');
        }

        btn.textContent = 'Saved!';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');

        appendSavedConceptCard(data.concept);
      } catch (error) {
        btn.disabled = false;
        btn.textContent = 'Save to Library';
        showError(error instanceof Error ? error.message : 'Failed to save');
      }
    }

    function appendSavedConceptCard(concept) {
      if (!savedConceptsList) return;

      // Remove "no saved concepts" message if present
      var emptyMsg = savedConceptsList.closest('#saved-concepts-section');
      if (emptyMsg) {
        var emptyP = emptyMsg.querySelector('.spine-section-subtitle');
        if (emptyP) emptyP.remove();
      }

      var card = document.createElement('article');
      card.className = 'spine-card concept-card saved-concept-card';
      card.dataset.conceptId = concept.id;

      var c = concept.evaluatedConcept.concept;
      card.innerHTML =
        '<div class="spine-badges">' +
          '<span class="spine-badge spine-badge-type">' + escapeHtml((c.genreFrame || '').replace(/_/g, ' ')) + '</span>' +
          '<span class="spine-badge spine-badge-conflict">' + escapeHtml((c.conflictAxis || '').replace(/_/g, ' ')) + '</span>' +
          '<span class="spine-badge spine-badge-arc">Score ' + escapeHtml(Math.round(concept.evaluatedConcept.overallScore || 0).toString()) + '</span>' +
        '</div>' +
        '<h3 class="spine-cdq">' + escapeHtml(concept.name) + '</h3>' +
        '<p class="spine-field">' + escapeHtml(c.elevatorParagraph || '') + '</p>' +
        '<div class="spine-field"><span class="spine-label">Created:</span> ' + escapeHtml(new Date(concept.createdAt).toLocaleDateString()) + '</div>' +
        '<div class="form-actions" style="margin-top: 0.5rem;">' +
          '<button type="button" class="btn btn-secondary btn-small concept-edit-btn" data-concept-id="' + escapeHtml(concept.id) + '">Edit</button>' +
          '<button type="button" class="btn btn-primary btn-small concept-harden-btn" data-concept-id="' + escapeHtml(concept.id) + '">Harden</button>' +
          '<button type="button" class="btn btn-danger btn-small concept-delete-btn" data-concept-id="' + escapeHtml(concept.id) + '">Delete</button>' +
        '</div>';

      savedConceptsList.prepend(card);
    }

    // ── Delete concept ─────────────────────────────────────────────

    if (savedConceptsList) {
      savedConceptsList.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;

        var deleteBtn = target.closest('.concept-delete-btn');
        if (deleteBtn) {
          var conceptId = deleteBtn.dataset.conceptId;
          if (conceptId && confirm('Delete this concept?')) {
            handleDelete(conceptId, deleteBtn);
          }
          return;
        }

        var editBtn = target.closest('.concept-edit-btn');
        if (editBtn) {
          var editId = editBtn.dataset.conceptId;
          if (editId) openEditModal(editId);
          return;
        }

        var hardenBtn = target.closest('.concept-harden-btn');
        if (hardenBtn && !hardenBtn.disabled) {
          var hardenId = hardenBtn.dataset.conceptId;
          if (hardenId) handleHarden(hardenId, hardenBtn);
        }
      });
    }

    async function handleDelete(conceptId, btn) {
      btn.disabled = true;
      try {
        var response = await fetch('/concepts/api/' + encodeURIComponent(conceptId), {
          method: 'DELETE',
        });

        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to delete');
        }

        var card = btn.closest('.saved-concept-card');
        if (card) card.remove();
      } catch (error) {
        btn.disabled = false;
        showError(error instanceof Error ? error.message : 'Failed to delete');
      }
    }

    // ── Harden concept ─────────────────────────────────────────────

    async function handleHarden(conceptId, btn) {
      var apiKey = getConceptApiKey();
      if (apiKey.length < 10) {
        showError('OpenRouter API key is required to harden a concept');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Hardening...';
      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var response = await fetch('/concepts/api/' + encodeURIComponent(conceptId) + '/harden', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: apiKey,
            progressId: progressId,
          }),
        });

        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to harden concept');
        }

        setApiKey(apiKey);
        btn.textContent = 'Already Hardened';

        // Update the card badges to show hardened status
        var card = btn.closest('.saved-concept-card');
        if (card) {
          var badges = card.querySelector('.spine-badges');
          if (badges) {
            var hardenBadge = document.createElement('span');
            hardenBadge.className = 'spine-badge spine-badge-type';
            hardenBadge.style.background = 'var(--accent-green, #2ecc71)';
            hardenBadge.textContent = 'Hardened';
            badges.appendChild(hardenBadge);
          }
        }
      } catch (error) {
        btn.disabled = false;
        btn.textContent = 'Harden';
        showError(error instanceof Error ? error.message : 'Failed to harden');
      } finally {
        loadingProgress.stop();
        loading.style.display = 'none';
      }
    }

    // ── Edit modal ─────────────────────────────────────────────────

    function getEditField(id) {
      return document.getElementById('edit-' + id);
    }

    function setEditValue(id, value) {
      var el = getEditField(id);
      if (el && typeof el.value === 'string') {
        el.value = value || '';
      }
    }

    function getEditValue(id) {
      var el = getEditField(id);
      return el && typeof el.value === 'string' ? el.value.trim() : '';
    }

    function linesToArray(text) {
      return text
        .split('\n')
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length > 0; });
    }

    async function openEditModal(conceptId) {
      if (!editModal) return;

      loading.style.display = 'flex';
      try {
        var response = await fetch('/concepts/api/' + encodeURIComponent(conceptId));
        var data = await response.json();
        if (!response.ok || !data.success || !data.concept) {
          throw new Error(data.error || 'Failed to load concept');
        }

        currentEditConceptId = conceptId;
        var c = data.concept.evaluatedConcept.concept;

        setEditValue('name', data.concept.name);
        setEditValue('oneLineHook', c.oneLineHook);
        setEditValue('elevatorParagraph', c.elevatorParagraph);
        setEditValue('protagonistRole', c.protagonistRole);
        setEditValue('coreCompetence', c.coreCompetence);
        setEditValue('coreFlaw', c.coreFlaw);
        setEditValue('coreConflictLoop', c.coreConflictLoop);
        setEditValue('pressureSource', c.pressureSource);
        setEditValue('stakesPersonal', c.stakesPersonal);
        setEditValue('stakesSystemic', c.stakesSystemic);
        setEditValue('deadlineMechanism', c.deadlineMechanism);
        setEditValue('genreSubversion', c.genreSubversion);
        setEditValue('genreFrame', c.genreFrame);
        setEditValue('conflictAxis', c.conflictAxis);
        setEditValue('branchingPosture', c.branchingPosture);
        setEditValue('settingScale', c.settingScale);
        setEditValue('stateComplexity', c.stateComplexity);
        setEditValue('actionVerbs', Array.isArray(c.actionVerbs) ? c.actionVerbs.join('\n') : '');
        setEditValue('settingAxioms', Array.isArray(c.settingAxioms) ? c.settingAxioms.join('\n') : '');
        setEditValue('constraintSet', Array.isArray(c.constraintSet) ? c.constraintSet.join('\n') : '');
        setEditValue('keyInstitutions', Array.isArray(c.keyInstitutions) ? c.keyInstitutions.join('\n') : '');

        editModal.style.display = 'flex';
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to load concept for editing');
      } finally {
        loading.style.display = 'none';
      }
    }

    function closeEditModal() {
      if (editModal) editModal.style.display = 'none';
      currentEditConceptId = null;
    }

    async function handleEditSave() {
      if (!currentEditConceptId) return;

      var conceptFields = {
        oneLineHook: getEditValue('oneLineHook'),
        elevatorParagraph: getEditValue('elevatorParagraph'),
        protagonistRole: getEditValue('protagonistRole'),
        coreCompetence: getEditValue('coreCompetence'),
        coreFlaw: getEditValue('coreFlaw'),
        coreConflictLoop: getEditValue('coreConflictLoop'),
        pressureSource: getEditValue('pressureSource'),
        stakesPersonal: getEditValue('stakesPersonal'),
        stakesSystemic: getEditValue('stakesSystemic'),
        deadlineMechanism: getEditValue('deadlineMechanism'),
        genreSubversion: getEditValue('genreSubversion'),
        genreFrame: getEditValue('genreFrame'),
        conflictAxis: getEditValue('conflictAxis'),
        branchingPosture: getEditValue('branchingPosture'),
        settingScale: getEditValue('settingScale'),
        stateComplexity: getEditValue('stateComplexity'),
        actionVerbs: linesToArray(getEditValue('actionVerbs')),
        settingAxioms: linesToArray(getEditValue('settingAxioms')),
        constraintSet: linesToArray(getEditValue('constraintSet')),
        keyInstitutions: linesToArray(getEditValue('keyInstitutions')),
      };

      var name = getEditValue('name');

      if (editSaveBtn) editSaveBtn.disabled = true;

      try {
        var response = await fetch('/concepts/api/' + encodeURIComponent(currentEditConceptId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, conceptFields: conceptFields }),
        });

        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to save changes');
        }

        // Update the card in the list
        var card = savedConceptsList
          ? savedConceptsList.querySelector('[data-concept-id="' + currentEditConceptId + '"]')
          : null;
        if (card && data.concept) {
          var c = data.concept.evaluatedConcept.concept;
          var titleEl = card.querySelector('.spine-cdq');
          if (titleEl) titleEl.textContent = data.concept.name;
          var paraEl = card.querySelector('.spine-field');
          if (paraEl) paraEl.textContent = c.elevatorParagraph || '';
        }

        closeEditModal();
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to save changes');
      } finally {
        if (editSaveBtn) editSaveBtn.disabled = false;
      }
    }

    // ── Event binding ──────────────────────────────────────────────

    generateBtn.addEventListener('click', function (event) {
      event.preventDefault();
      handleGenerate();
    });

    if (editCloseBtn) editCloseBtn.addEventListener('click', closeEditModal);
    if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);
    if (editSaveBtn) editSaveBtn.addEventListener('click', handleEditSave);
  }
