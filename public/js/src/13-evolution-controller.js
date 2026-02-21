  // ── Evolution Page Controller ────────────────────────────────────

  function initEvolutionPage() {
    var page = document.getElementById('evolution-page');
    if (!page) {
      return;
    }

    var kernelSelector = document.getElementById('evolution-kernel-selector');
    var kernelSummary = document.getElementById('evolution-selected-kernel-summary');
    var kernelThesis = document.getElementById('evolution-kernel-dramatic-thesis');
    var kernelValue = document.getElementById('evolution-kernel-value-at-stake');
    var kernelOpposingForce = document.getElementById('evolution-kernel-opposing-force');
    var kernelQuestion = document.getElementById('evolution-kernel-thematic-question');
    var kernelScore = document.getElementById('evolution-kernel-overall-score');
    var parentSection = document.getElementById('evolution-parent-concepts-section');
    var parentContainer = document.getElementById('evolution-parent-concepts');
    var selectionCounter = document.getElementById('evolution-selection-counter');
    var apiKeyInput = document.getElementById('evolutionApiKey');
    var evolveBtn = document.getElementById('evolve-btn');
    var loading = document.getElementById('evolution-loading');
    var resultsSection = document.getElementById('evolution-results-section');
    var resultsContainer = document.getElementById('evolution-cards');

    if (
      !(kernelSelector instanceof HTMLSelectElement) ||
      !(apiKeyInput instanceof HTMLInputElement) ||
      !(evolveBtn instanceof HTMLButtonElement) ||
      !(loading instanceof HTMLElement)
    ) {
      return;
    }

    var loadingProgress = createLoadingProgressController(loading);
    var selectedKernelId = '';
    var selectedParentIds = [];
    var evolvedConcepts = [];
    var verifications = [];
    var kernelSummaryFields = {
      thesis: kernelThesis,
      valueAtStake: kernelValue,
      opposingForce: kernelOpposingForce,
      thematicQuestion: kernelQuestion,
      overallScore: kernelScore,
    };

    function showError(message) {
      if (typeof showFormError === 'function') {
        showFormError(message);
      } else {
        alert(message);
      }
    }

    function getEvolutionApiKey() {
      var value = typeof apiKeyInput.value === 'string' ? apiKeyInput.value.trim() : '';
      return value || (getApiKey() || '').trim();
    }

    function isApiKeyValid() {
      return getEvolutionApiKey().length >= 10;
    }

    function updateEvolveButtonState() {
      evolveBtn.disabled = !(
        selectedKernelId &&
        selectedParentIds.length >= 2 &&
        selectedParentIds.length <= 3 &&
        isApiKeyValid()
      );
    }

    function updateSelectionCounter() {
      if (!selectionCounter) {
        return;
      }
      selectionCounter.textContent =
        'Selected: ' + selectedParentIds.length + '/3 (select 2-3 concepts)';
    }

    function syncParentSelectionClasses() {
      if (!parentContainer) {
        return;
      }

      var cards = parentContainer.querySelectorAll('.concept-card[data-concept-id]');
      cards.forEach(function (card) {
        var conceptId = card.getAttribute('data-concept-id') || '';
        if (selectedParentIds.indexOf(conceptId) >= 0) {
          card.classList.add('spine-card-selected');
        } else {
          card.classList.remove('spine-card-selected');
        }
      });
    }

    function clearParentSelection() {
      selectedParentIds = [];
      updateSelectionCounter();
      syncParentSelectionClasses();
      updateEvolveButtonState();
    }

    function renderParentConceptCards(concepts) {
      if (!parentContainer) {
        return;
      }

      parentContainer.innerHTML = '';
      clearParentSelection();

      if (!Array.isArray(concepts) || concepts.length === 0) {
        if (parentSection) {
          parentSection.style.display = 'block';
        }
        parentContainer.innerHTML =
          '<p class="spine-section-subtitle">No concepts found for this kernel. Save concepts first, then evolve.</p>';
        return;
      }

      concepts.forEach(function (savedConcept) {
        var evaluatedConcept = savedConcept && savedConcept.evaluatedConcept ? savedConcept.evaluatedConcept : null;
        var concept = evaluatedConcept && evaluatedConcept.concept ? evaluatedConcept.concept : {};
        var card = document.createElement('article');
        card.className = 'spine-card concept-card';
        card.setAttribute('data-concept-id', String(savedConcept.id || ''));
        card.innerHTML =
          '<div class="spine-badges">' +
            '<span class="spine-badge spine-badge-type">' +
              escapeHtml(String((concept.genreFrame || '')).replace(/_/g, ' ')) +
            '</span>' +
            '<span class="spine-badge spine-badge-conflict">' +
              escapeHtml(String((concept.conflictAxis || '')).replace(/_/g, ' ')) +
            '</span>' +
            '<span class="spine-badge spine-badge-arc">Score ' +
              escapeHtml(String(Math.round(Number(evaluatedConcept && evaluatedConcept.overallScore) || 0))) +
            '</span>' +
          '</div>' +
          '<h3 class="spine-cdq">' + escapeHtml(savedConcept.name || concept.oneLineHook || 'Untitled Concept') + '</h3>' +
          '<p class="spine-field">' + escapeHtml(concept.oneLineHook || '') + '</p>' +
          '<p class="spine-field">' + escapeHtml(concept.elevatorParagraph || '') + '</p>';
        parentContainer.appendChild(card);
      });

      if (parentSection) {
        parentSection.style.display = 'block';
      }
    }

    function renderVerificationBlock(verification) {
      if (!verification || typeof verification !== 'object') {
        return '';
      }

      var integrityScore = Number(verification.conceptIntegrityScore);
      var safeIntegrityScore = Number.isFinite(integrityScore)
        ? Math.max(0, Math.min(100, Math.round(integrityScore)))
        : null;
      var setpieces = Array.isArray(verification.escalatingSetpieces)
        ? verification.escalatingSetpieces
        : [];

      var html = '<div class="spine-field" style="margin-top: 0.75rem;">';
      if (verification.signatureScenario) {
        html +=
          '<div><span class="spine-label">Signature Scenario:</span> ' +
          escapeHtml(verification.signatureScenario) +
          '</div>';
      }
      if (verification.inevitabilityStatement) {
        html +=
          '<div><span class="spine-label">Inevitability:</span> ' +
          escapeHtml(verification.inevitabilityStatement) +
          '</div>';
      }
      if (safeIntegrityScore !== null) {
        html +=
          '<div><span class="spine-label">Integrity:</span> ' +
          escapeHtml(String(safeIntegrityScore)) +
          '/100</div>';
      }
      if (setpieces.length > 0) {
        html +=
          '<div><span class="spine-label">Setpieces:</span> ' +
          escapeHtml(String(setpieces.length)) +
          '</div>';
      }
      html += '</div>';
      return html;
    }

    function renderEvolvedConcepts(nextConcepts, nextVerifications) {
      evolvedConcepts = Array.isArray(nextConcepts) ? nextConcepts : [];
      verifications = Array.isArray(nextVerifications) ? nextVerifications : [];

      if (!resultsContainer || !resultsSection) {
        return;
      }

      resultsContainer.innerHTML = '';

      if (evolvedConcepts.length === 0) {
        resultsContainer.innerHTML =
          '<p class="spine-section-subtitle">No evolved concepts returned. Try different parent concepts.</p>';
        resultsSection.style.display = 'block';
        return;
      }

      evolvedConcepts.forEach(function (entry, index) {
        var card = document.createElement('article');
        card.className = 'spine-card concept-card';
        card.setAttribute('data-result-index', String(index));
        card.innerHTML =
          renderConceptCardBody(entry, { includeSelectionToggle: false, index: index }) +
          renderVerificationBlock(verifications[index]) +
          '<div class="form-actions" style="margin-top: 0.5rem;">' +
            '<button type="button" class="btn btn-primary btn-small evolution-save-btn" data-result-index="' + index + '">Save</button>' +
          '</div>';
        resultsContainer.appendChild(card);
      });

      resultsSection.style.display = 'block';
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    async function loadKernelOptions() {
      try {
        await loadKernelOptionsIntoSelect(kernelSelector);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to load kernels');
      }
    }

    async function handleKernelSelectionChange() {
      selectedKernelId = (kernelSelector.value || '').trim();

      if (resultsSection) {
        resultsSection.style.display = 'none';
      }
      if (resultsContainer) {
        resultsContainer.innerHTML = '';
      }

      if (!selectedKernelId) {
        hideSavedKernelSummary(kernelSummary, kernelSummaryFields);
        if (parentSection) {
          parentSection.style.display = 'none';
        }
        if (parentContainer) {
          parentContainer.innerHTML = '';
        }
        clearParentSelection();
        return;
      }

      try {
        var responses = await Promise.all([
          loadSavedKernelById(selectedKernelId),
          fetch('/evolve/api/concepts-by-kernel/' + encodeURIComponent(selectedKernelId), { method: 'GET' }),
        ]);

        var selectedKernel = responses[0];
        var conceptResponse = responses[1];
        var conceptData = await conceptResponse.json();
        if (!conceptResponse.ok || !conceptData.success || !Array.isArray(conceptData.concepts)) {
          throw new Error(conceptData.error || 'Failed to load concepts for selected kernel');
        }

        renderSavedKernelSummary(selectedKernel, kernelSummary, kernelSummaryFields);
        renderParentConceptCards(conceptData.concepts);
      } catch (error) {
        selectedKernelId = '';
        kernelSelector.value = '';
        hideSavedKernelSummary(kernelSummary, kernelSummaryFields);
        if (parentSection) {
          parentSection.style.display = 'none';
        }
        if (parentContainer) {
          parentContainer.innerHTML = '';
        }
        clearParentSelection();
        showError(error instanceof Error ? error.message : 'Failed to load selected kernel');
      } finally {
        updateEvolveButtonState();
      }
    }

    async function handleEvolve() {
      var apiKey = getEvolutionApiKey();
      if (apiKey.length < 10) {
        showError('OpenRouter API key is required');
        return;
      }
      if (!selectedKernelId) {
        showError('Select a story kernel before evolving concepts');
        return;
      }
      if (selectedParentIds.length < 2 || selectedParentIds.length > 3) {
        showError('Select 2-3 parent concepts');
        return;
      }

      evolveBtn.disabled = true;
      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var response = await fetch('/evolve/api/evolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conceptIds: selectedParentIds,
            kernelId: selectedKernelId,
            apiKey: apiKey,
            progressId: progressId,
          }),
        });

        var data = null;
        try {
          data = await response.json();
        } catch (_parseError) {
          data = null;
        }

        if (!response.ok || !data || !data.success) {
          throw new Error(data && data.error ? data.error : 'Failed to evolve concepts');
        }

        setApiKey(apiKey);
        renderEvolvedConcepts(data.evaluatedConcepts, data.verifications);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to evolve concepts');
      } finally {
        loadingProgress.stop();
        loading.style.display = 'none';
        updateEvolveButtonState();
      }
    }

    async function handleSaveResult(index, button) {
      var evaluatedConcept = evolvedConcepts[index];
      if (!evaluatedConcept) {
        return;
      }

      button.disabled = true;
      button.textContent = 'Saving...';

      try {
        var response = await fetch('/concepts/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evaluatedConcept: evaluatedConcept,
            name: evaluatedConcept.concept && evaluatedConcept.concept.oneLineHook
              ? evaluatedConcept.concept.oneLineHook
              : 'Untitled Concept',
            sourceKernelId: selectedKernelId,
            verificationResult: verifications[index] || undefined,
          }),
        });

        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to save concept');
        }

        button.textContent = 'Saved';
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Save';
        showError(error instanceof Error ? error.message : 'Failed to save concept');
      }
    }

    parentContainer && parentContainer.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      var card = target.closest('.concept-card[data-concept-id]');
      if (!card) {
        return;
      }

      var conceptId = card.getAttribute('data-concept-id') || '';
      if (!conceptId) {
        return;
      }

      var selectedIndex = selectedParentIds.indexOf(conceptId);
      if (selectedIndex >= 0) {
        selectedParentIds.splice(selectedIndex, 1);
      } else if (selectedParentIds.length >= 3) {
        showError('You can select up to 3 parent concepts');
        return;
      } else {
        selectedParentIds.push(conceptId);
      }

      updateSelectionCounter();
      syncParentSelectionClasses();
      updateEvolveButtonState();
    });

    resultsContainer && resultsContainer.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      var button = target.closest('.evolution-save-btn');
      if (!(button instanceof HTMLButtonElement) || button.disabled) {
        return;
      }

      var index = Number(button.getAttribute('data-result-index'));
      if (!Number.isFinite(index) || index < 0) {
        return;
      }

      void handleSaveResult(index, button);
    });

    kernelSelector.addEventListener('change', function () {
      void handleKernelSelectionChange();
    });
    apiKeyInput.addEventListener('input', updateEvolveButtonState);
    evolveBtn.addEventListener('click', function (event) {
      event.preventDefault();
      void handleEvolve();
    });

    var storedKey = getApiKey();
    if (storedKey && apiKeyInput.value.length === 0) {
      apiKeyInput.value = storedKey;
    }

    hideSavedKernelSummary(kernelSummary, kernelSummaryFields);
    updateSelectionCounter();
    updateEvolveButtonState();
    void loadKernelOptions();
  }
