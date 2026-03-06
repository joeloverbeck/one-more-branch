  // ── Concepts Page Controller ─────────────────────────────────────

  function initConceptsPage() {
    var page = document.getElementById('concepts-page');
    if (!page) return;

    var loading = document.getElementById('loading');
    var developBtn = document.getElementById('develop-concept-btn');
    var seedSelector = document.getElementById('seed-selector');
    var selectedSeedSummary = document.getElementById('selected-seed-summary');
    var selectedSeedHook = document.getElementById('selected-seed-hook');
    var selectedSeedBadges = document.getElementById('selected-seed-badges');
    var selectedSeedFields = document.getElementById('selected-seed-fields');
    var conceptCardsContainer = document.getElementById('concept-cards');
    var conceptResultsSection = document.getElementById('concept-results-section');
    var savedConceptsList = document.getElementById('saved-concepts-list');
    var editModal = document.getElementById('concept-edit-modal');
    var editCloseBtn = document.getElementById('concept-edit-close');
    var editSaveBtn = document.getElementById('concept-edit-save');
    var editCancelBtn = document.getElementById('concept-edit-cancel');

    if (!loading || !developBtn) return;

    var loadingProgress = createLoadingProgressController(loading);
    var currentEditConceptId = null;
    var lastEvaluatedConcept = null;
    var lastVerification = null;
    var lastSourceKernelId = null;
    var selectedSeedId = '';

    // Restore API key
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

    function updateDevelopButtonState() {
      developBtn.disabled = !(getConceptApiKey().length >= 10 && selectedSeedId);
    }

    function showError(message) {
      if (typeof showFormError === 'function') {
        showFormError(message);
      } else {
        alert(message);
      }
    }

    // ── Seed selector ───────────────────────────────────────────────

    async function handleSeedSelectionChange() {
      if (!(seedSelector instanceof HTMLSelectElement)) return;

      selectedSeedId = (seedSelector.value || '').trim();
      if (!selectedSeedId) {
        if (selectedSeedSummary) selectedSeedSummary.style.display = 'none';
        updateDevelopButtonState();
        return;
      }

      try {
        var response = await fetch('/concept-seeds/api/' + encodeURIComponent(selectedSeedId));
        var data = await response.json();
        if (!response.ok || !data.success || !data.seed) {
          throw new Error(data.error || 'Failed to load seed');
        }

        renderSeedSummary(data.seed);
      } catch (error) {
        selectedSeedId = '';
        seedSelector.value = '';
        if (selectedSeedSummary) selectedSeedSummary.style.display = 'none';
        showError(error instanceof Error ? error.message : 'Failed to load selected seed');
      } finally {
        updateDevelopButtonState();
      }
    }

    function renderSeedSummary(seed) {
      if (!selectedSeedSummary) return;

      if (selectedSeedHook) {
        selectedSeedHook.textContent = seed.oneLineHook || seed.name || 'Untitled';
      }

      if (selectedSeedBadges) {
        var badgesHtml =
          '<span class="spine-badge spine-badge-type">' + escapeHtml((seed.genreFrame || '').replace(/_/g, ' ')) + '</span>' +
          '<span class="spine-badge spine-badge-conflict">' + escapeHtml((seed.conflictAxis || '').replace(/_/g, ' ')) + '</span>';
        if (seed.conflictType) {
          badgesHtml += '<span class="spine-badge spine-badge-conflict">' + escapeHtml(seed.conflictType.replace(/_/g, ' ')) + '</span>';
        }
        if (seed.settingScale) {
          badgesHtml += '<span class="spine-badge spine-badge-type">' + escapeHtml(seed.settingScale.replace(/_/g, ' ')) + '</span>';
        }
        selectedSeedBadges.innerHTML = badgesHtml;
      }

      if (selectedSeedFields) {
        var fieldsHtml = '';
        if (seed.protagonistRole) fieldsHtml += '<div class="spine-field"><span class="spine-label">Protagonist:</span> ' + escapeHtml(seed.protagonistRole) + '</div>';
        if (seed.coreFlaw) fieldsHtml += '<div class="spine-field"><span class="spine-label">Core Flaw:</span> ' + escapeHtml(seed.coreFlaw) + '</div>';
        if (seed.coreConflictLoop) fieldsHtml += '<div class="spine-field"><span class="spine-label">Conflict Loop:</span> ' + escapeHtml(seed.coreConflictLoop) + '</div>';
        if (seed.whatIfQuestion) fieldsHtml += '<p class="spine-field"><span class="spine-label">What If:</span> <em>' + escapeHtml(seed.whatIfQuestion) + '</em></p>';
        if (seed.playerFantasy) fieldsHtml += '<p class="spine-field"><span class="spine-label">Player Fantasy:</span> <em>' + escapeHtml(seed.playerFantasy) + '</em></p>';
        if (seed.genreSubversion) fieldsHtml += '<div class="spine-field"><span class="spine-label">Genre Subversion:</span> ' + escapeHtml(seed.genreSubversion) + '</div>';
        selectedSeedFields.innerHTML = fieldsHtml;
      }

      selectedSeedSummary.style.display = 'block';
    }

    // ── Develop concept ─────────────────────────────────────────────

    async function handleDevelop() {
      var apiKey = getConceptApiKey();
      if (apiKey.length < 10) {
        showError('OpenRouter API key is required');
        return;
      }
      if (!selectedSeedId) {
        showError('Select a concept seed first');
        return;
      }

      developBtn.disabled = true;
      if (conceptResultsSection) conceptResultsSection.style.display = 'none';
      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var response = await fetch('/concepts/api/generate/develop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seedId: selectedSeedId,
            apiKey: apiKey,
            progressId: progressId,
          }),
        });

        var data = null;
        try { data = await response.json(); } catch (_e) { data = null; }

        if (!response.ok || !data || !data.success) {
          throw new Error(data && data.error ? data.error : 'Failed to develop concept');
        }

        setApiKey(apiKey);
        lastEvaluatedConcept = data.evaluatedConcept;
        lastVerification = data.verification || null;
        lastSourceKernelId = data.sourceKernelId || null;

        renderDevelopedConcept(data.evaluatedConcept, data.verification);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Something went wrong');
      } finally {
        loadingProgress.stop();
        loading.style.display = 'none';
        updateDevelopButtonState();
      }
    }

    function renderDevelopedConcept(evaluatedConcept, verification) {
      if (!conceptCardsContainer || !conceptResultsSection) return;

      conceptCardsContainer.innerHTML = '';

      if (!evaluatedConcept || !evaluatedConcept.concept) {
        conceptCardsContainer.innerHTML = '<p class="spine-section-subtitle">No concept generated. Try again.</p>';
        conceptResultsSection.style.display = 'block';
        return;
      }

      var card = document.createElement('article');
      card.className = 'spine-card concept-card';

      card.innerHTML =
        renderConceptCardBody(evaluatedConcept, { includeSelectionToggle: false, index: 0, verification: verification }) +
        '<div class="form-actions" style="margin-top: 0.5rem;">' +
          '<button type="button" class="btn btn-primary btn-small concept-save-generated-btn">Save to Library</button>' +
        '</div>';

      conceptCardsContainer.appendChild(card);
      conceptResultsSection.style.display = 'block';
      conceptResultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // ── Save generated concept ──────────────────────────────────────

    if (conceptCardsContainer) {
      conceptCardsContainer.addEventListener('click', function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        var btn = target.closest('.concept-save-generated-btn');
        if (!btn || !lastEvaluatedConcept) return;

        btn.disabled = true;
        btn.textContent = 'Saving...';
        saveGeneratedConcept(btn);
      });
    }

    async function saveGeneratedConcept(btn) {
      try {
        var saveBody = {
          evaluatedConcept: lastEvaluatedConcept,
          seeds: {},
        };
        if (lastVerification) {
          saveBody.verificationResult = lastVerification;
        }
        if (lastSourceKernelId) {
          saveBody.sourceKernelId = lastSourceKernelId;
        }

        var response = await fetch('/concepts/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveBody),
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

    // ── Saved concepts list management ──────────────────────────────

    function findOrCreateGenreGroup(genre) {
      if (!savedConceptsList) return null;
      var existing = savedConceptsList.querySelector('details.genre-group[data-genre="' + genre + '"]');
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

      var conventions = GENRE_CONVENTIONS_GLOSSES[genre] || [];
      var obligations = GENRE_OBLIGATIONS_GLOSSES[genre] || [];
      var panelHtml = renderGenreInfoPanelHtml(conventions, obligations);
      if (panelHtml) {
        details.insertAdjacentHTML('beforeend', panelHtml);
      }

      var body = document.createElement('div');
      body.className = 'genre-group__body spine-options-container';
      details.appendChild(body);

      var label = formatGenreDisplayLabel(genre).toLowerCase();
      var groups = savedConceptsList.querySelectorAll('details.genre-group');
      var inserted = false;
      for (var i = 0; i < groups.length; i++) {
        var groupLabel = (groups[i].getAttribute('data-genre') || '').replace(/_/g, ' ').toLowerCase();
        if (label < groupLabel) {
          savedConceptsList.insertBefore(details, groups[i]);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        savedConceptsList.appendChild(details);
      }

      return details;
    }

    function updateGenreGroupCount(genreGroup) {
      if (!genreGroup) return;
      var body = genreGroup.querySelector('.genre-group__body');
      var count = body ? body.querySelectorAll('.saved-concept-card').length : 0;
      var countSpan = genreGroup.querySelector('.genre-group__count');
      if (countSpan) countSpan.textContent = '(' + count + ')';
    }

    function appendSavedConceptCard(concept) {
      if (!savedConceptsList) return;

      var emptyMsg = savedConceptsList.closest('#saved-concepts-section');
      if (emptyMsg) {
        var emptyP = emptyMsg.querySelector('.spine-section-subtitle');
        if (emptyP) emptyP.remove();
      }

      var card = document.createElement('article');
      card.className = 'spine-card concept-card saved-concept-card';
      card.dataset.conceptId = concept.id;

      var c = concept.evaluatedConcept.concept;
      var conflictTypeBadge = c.conflictType
        ? '<span class="spine-badge spine-badge-conflict">' + escapeHtml(String(c.conflictType).replace(/_/g, ' ')) + '</span>'
        : '';
      var settingScaleBadge = c.settingScale
        ? '<span class="spine-badge spine-badge-type">' + escapeHtml(String(c.settingScale).replace(/_/g, ' ')) + '</span>'
        : '';

      var cardHtml =
        '<div class="spine-badges">' +
          '<span class="spine-badge spine-badge-type">' + escapeHtml((c.genreFrame || '').replace(/_/g, ' ')) + '</span>' +
          '<span class="spine-badge spine-badge-conflict">' + escapeHtml((c.conflictAxis || '').replace(/_/g, ' ')) + '</span>' +
          conflictTypeBadge + settingScaleBadge +
          '<span class="spine-badge spine-badge-arc">Score ' + escapeHtml(Math.round(concept.evaluatedConcept.overallScore || 0).toString()) + '</span>' +
        '</div>' +
        '<h3 class="spine-cdq">' + escapeHtml(concept.name) + '</h3>' +
        '<p class="spine-field">' + escapeHtml(c.elevatorParagraph || '') + '</p>' +
        '<div class="spine-field"><span class="spine-label">Protagonist:</span> ' + escapeHtml(c.protagonistRole || '') + '</div>';

      if (c.coreCompetence) cardHtml += '<div class="spine-field"><span class="spine-label">Core Competence:</span> ' + escapeHtml(c.coreCompetence) + '</div>';
      if (c.coreFlaw) cardHtml += '<div class="spine-field"><span class="spine-label">Core Flaw:</span> ' + escapeHtml(c.coreFlaw) + '</div>';
      if (c.coreConflictLoop) cardHtml += '<div class="spine-field"><span class="spine-label">Conflict Loop:</span> ' + escapeHtml(c.coreConflictLoop) + '</div>';
      if (c.pressureSource) cardHtml += '<div class="spine-field"><span class="spine-label">Pressure Source:</span> ' + escapeHtml(c.pressureSource) + '</div>';
      if (c.stakesPersonal) cardHtml += '<div class="spine-field"><span class="spine-label">Personal Stakes:</span> ' + escapeHtml(c.stakesPersonal) + '</div>';
      if (c.stakesSystemic) cardHtml += '<div class="spine-field"><span class="spine-label">Systemic Stakes:</span> ' + escapeHtml(c.stakesSystemic) + '</div>';
      if (c.deadlineMechanism) cardHtml += '<div class="spine-field"><span class="spine-label">Deadline Mechanism:</span> ' + escapeHtml(c.deadlineMechanism) + '</div>';
      if (c.genreSubversion) cardHtml += '<div class="spine-field"><span class="spine-label">Genre Subversion:</span> ' + escapeHtml(c.genreSubversion) + '</div>';
      if (c.whatIfQuestion) cardHtml += '<p class="spine-field concept-what-if"><span class="spine-label">What If:</span> <em>' + escapeHtml(c.whatIfQuestion) + '</em></p>';
      if (c.ironicTwist) cardHtml += '<div class="spine-field"><span class="spine-label">Ironic Twist:</span> ' + escapeHtml(c.ironicTwist) + '</div>';
      if (c.playerFantasy) cardHtml += '<p class="spine-field"><span class="spine-label">Player Fantasy:</span> <em>' + escapeHtml(c.playerFantasy) + '</em></p>';
      if (c.incitingDisruption) cardHtml += '<div class="spine-field"><span class="spine-label">Inciting Disruption:</span> ' + escapeHtml(c.incitingDisruption) + '</div>';
      if (c.escapeValve) cardHtml += '<div class="spine-field"><span class="spine-label">Escape Valve:</span> ' + escapeHtml(c.escapeValve) + '</div>';
      if (c.protagonistLie) cardHtml += '<div class="spine-field"><span class="spine-label">Protagonist Lie:</span> ' + escapeHtml(c.protagonistLie) + '</div>';
      if (c.protagonistTruth) cardHtml += '<div class="spine-field"><span class="spine-label">Protagonist Truth:</span> ' + escapeHtml(c.protagonistTruth) + '</div>';
      if (c.protagonistGhost) cardHtml += '<div class="spine-field"><span class="spine-label">Protagonist Ghost:</span> ' + escapeHtml(c.protagonistGhost) + '</div>';
      if (c.wantNeedCollisionSketch) cardHtml += '<div class="spine-field"><span class="spine-label">Want/Need Collision:</span> ' + escapeHtml(c.wantNeedCollisionSketch) + '</div>';
      if (Array.isArray(c.actionVerbs) && c.actionVerbs.length > 0) cardHtml += '<div class="spine-field"><span class="spine-label">Action Verbs:</span> ' + escapeHtml(c.actionVerbs.join(', ')) + '</div>';
      if (Array.isArray(c.settingAxioms) && c.settingAxioms.length > 0) cardHtml += '<div class="spine-field"><span class="spine-label">Setting Axioms:</span><ul>' + renderListItems(c.settingAxioms) + '</ul></div>';
      if (Array.isArray(c.constraintSet) && c.constraintSet.length > 0) cardHtml += '<div class="spine-field"><span class="spine-label">Constraints:</span><ul>' + renderListItems(c.constraintSet) + '</ul></div>';
      if (Array.isArray(c.keyInstitutions) && c.keyInstitutions.length > 0) cardHtml += '<div class="spine-field"><span class="spine-label">Key Institutions:</span><ul>' + renderListItems(c.keyInstitutions) + '</ul></div>';

      var ev = concept.evaluatedConcept;
      cardHtml += '<div class="concept-scores">' + renderScoreGrid(ev.scores) + '</div>';
      if (ev.tradeoffSummary) cardHtml += '<div class="spine-field"><span class="spine-label">Tradeoff:</span> ' + escapeHtml(ev.tradeoffSummary) + '</div>';
      cardHtml +=
        '<div class="concept-feedback">' +
          '<div class="concept-feedback-block"><span class="spine-label">Strengths</span><ul>' + renderListItems(ev.strengths) + '</ul></div>' +
          '<div class="concept-feedback-block"><span class="spine-label">Weaknesses</span><ul>' + renderListItems(ev.weaknesses) + '</ul></div>' +
        '</div>';

      if (concept.verificationResult) {
        cardHtml += renderVerificationSection(concept.verificationResult);
      }

      if (concept.stressTestResult) {
        cardHtml += renderStressTestSection(concept.stressTestResult);
      }

      cardHtml +=
        '<div class="spine-field"><span class="spine-label">Created:</span> ' + escapeHtml(new Date(concept.createdAt).toLocaleDateString()) + '</div>' +
        '<div class="form-actions" style="margin-top: 0.5rem;">' +
          '<button type="button" class="btn btn-secondary btn-small concept-edit-btn" data-concept-id="' + escapeHtml(concept.id) + '">Edit</button>' +
          '<button type="button" class="btn btn-primary btn-small concept-harden-btn" data-concept-id="' + escapeHtml(concept.id) + '">Harden</button>' +
          '<button type="button" class="btn btn-danger btn-small concept-delete-btn" data-concept-id="' + escapeHtml(concept.id) + '">Delete</button>' +
        '</div>';

      card.innerHTML = cardHtml;

      var genre = c.genreFrame || 'UNKNOWN';
      var genreGroup = findOrCreateGenreGroup(genre);
      if (genreGroup) {
        var body = genreGroup.querySelector('.genre-group__body');
        if (body) body.prepend(card);
        updateGenreGroupCount(genreGroup);
      } else {
        savedConceptsList.prepend(card);
      }
    }

    // ── Delete concept ──────────────────────────────────────────────

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
        var parentGroup = card ? card.closest('.genre-group') : null;
        if (card) card.remove();
        if (parentGroup) {
          updateGenreGroupCount(parentGroup);
          if (parentGroup.querySelectorAll('.saved-concept-card').length === 0) {
            parentGroup.remove();
          }
        }
      } catch (error) {
        btn.disabled = false;
        showError(error instanceof Error ? error.message : 'Failed to delete');
      }
    }

    // ── Harden concept ──────────────────────────────────────────────

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

          var stressResult = data.driftRisks || data.playerBreaks
            ? { driftRisks: data.driftRisks || [], playerBreaks: data.playerBreaks || [] }
            : null;
          if (stressResult) {
            var stressHtml = renderStressTestSection(stressResult);
            if (stressHtml) {
              var timestampField = card.querySelector('.form-actions');
              if (timestampField) {
                timestampField.insertAdjacentHTML('beforebegin', stressHtml);
              } else {
                card.insertAdjacentHTML('beforeend', stressHtml);
              }
            }
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

    // ── Edit modal ──────────────────────────────────────────────────

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
        setEditValue('settingScale', c.settingScale);
        setEditValue('actionVerbs', Array.isArray(c.actionVerbs) ? c.actionVerbs.join('\n') : '');
        setEditValue('settingAxioms', Array.isArray(c.settingAxioms) ? c.settingAxioms.join('\n') : '');
        setEditValue('constraintSet', Array.isArray(c.constraintSet) ? c.constraintSet.join('\n') : '');
        setEditValue('keyInstitutions', Array.isArray(c.keyInstitutions) ? c.keyInstitutions.join('\n') : '');
        setEditValue('incitingDisruption', c.incitingDisruption);
        setEditValue('escapeValve', c.escapeValve);
        setEditValue('conflictType', c.conflictType);
        setEditValue('protagonistLie', c.protagonistLie);
        setEditValue('protagonistTruth', c.protagonistTruth);
        setEditValue('protagonistGhost', c.protagonistGhost);
        setEditValue('wantNeedCollisionSketch', c.wantNeedCollisionSketch);
        setEditValue('whatIfQuestion', c.whatIfQuestion);
        setEditValue('ironicTwist', c.ironicTwist);
        setEditValue('playerFantasy', c.playerFantasy);

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
        protagonistLie: getEditValue('protagonistLie'),
        protagonistTruth: getEditValue('protagonistTruth'),
        protagonistGhost: getEditValue('protagonistGhost'),
        wantNeedCollisionSketch: getEditValue('wantNeedCollisionSketch'),
        incitingDisruption: getEditValue('incitingDisruption'),
        escapeValve: getEditValue('escapeValve'),
        genreSubversion: getEditValue('genreSubversion'),
        whatIfQuestion: getEditValue('whatIfQuestion'),
        ironicTwist: getEditValue('ironicTwist'),
        playerFantasy: getEditValue('playerFantasy'),
        genreFrame: getEditValue('genreFrame'),
        conflictAxis: getEditValue('conflictAxis'),
        conflictType: getEditValue('conflictType'),
        settingScale: getEditValue('settingScale'),
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

    // ── Event binding ───────────────────────────────────────────────

    developBtn.addEventListener('click', function (event) {
      event.preventDefault();
      handleDevelop();
    });

    if (apiKeyInput) {
      apiKeyInput.addEventListener('input', updateDevelopButtonState);
    }

    if (seedSelector instanceof HTMLSelectElement) {
      seedSelector.addEventListener('change', function () {
        void handleSeedSelectionChange();
      });
    }

    if (editCloseBtn) editCloseBtn.addEventListener('click', closeEditModal);
    if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);
    if (editSaveBtn) editSaveBtn.addEventListener('click', handleEditSave);

    updateDevelopButtonState();
  }
