  // ── Kernel Evolution Page Controller ────────────────────────────

  function initKernelEvolutionPage() {
    var page = document.getElementById('kernel-evolution-page');
    if (!page) {
      return;
    }

    var parentContainer = document.getElementById('kernel-evo-parent-cards');
    var selectionCounter = document.getElementById('kernel-evo-selection-counter');
    var apiKeyInput = document.getElementById('kernelEvoApiKey');
    var evolveBtn = document.getElementById('kernel-evo-btn');
    var loading = document.getElementById('kernel-evo-loading');
    var resultsSection = document.getElementById('kernel-evo-results-section');
    var resultsContainer = document.getElementById('kernel-evo-cards');

    if (
      !(apiKeyInput instanceof HTMLInputElement) ||
      !(evolveBtn instanceof HTMLButtonElement) ||
      !(loading instanceof HTMLElement)
    ) {
      return;
    }

    var loadingProgress = createLoadingProgressController(loading);
    var selectedParentIds = [];
    var evolvedKernels = [];
    var allSavedKernels = [];

    function showError(message) {
      if (typeof showFormError === 'function') {
        showFormError(message);
      } else {
        alert(message);
      }
    }

    function getEvoApiKey() {
      var value = typeof apiKeyInput.value === 'string' ? apiKeyInput.value.trim() : '';
      return value || (getApiKey() || '').trim();
    }

    function isApiKeyValid() {
      return getEvoApiKey().length >= 10;
    }

    function updateEvolveButtonState() {
      evolveBtn.disabled = !(
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
        'Selected: ' + selectedParentIds.length + '/3 (select 2-3 kernels)';
    }

    function syncParentSelectionClasses() {
      if (!parentContainer) {
        return;
      }

      var cards = parentContainer.querySelectorAll('.spine-card[data-kernel-id]');
      cards.forEach(function (card) {
        var kernelId = card.getAttribute('data-kernel-id') || '';
        if (selectedParentIds.indexOf(kernelId) >= 0) {
          card.classList.add('spine-card-selected');
        } else {
          card.classList.remove('spine-card-selected');
        }
      });
    }

    function renderParentKernelCards(kernels) {
      if (!parentContainer) {
        return;
      }

      parentContainer.innerHTML = '';
      selectedParentIds = [];

      if (!Array.isArray(kernels) || kernels.length === 0) {
        parentContainer.innerHTML =
          '<p class="spine-section-subtitle">No saved kernels found. Generate and save kernels first.</p>';
        updateSelectionCounter();
        updateEvolveButtonState();
        return;
      }

      allSavedKernels = kernels;

      kernels.forEach(function (savedKernel) {
        var evaluatedKernel = savedKernel && savedKernel.evaluatedKernel
          ? savedKernel.evaluatedKernel
          : null;
        var card = document.createElement('article');
        card.className = 'spine-card';
        card.setAttribute('data-kernel-id', String(savedKernel.id || ''));
        card.style.cursor = 'pointer';
        card.innerHTML = renderKernelCard(evaluatedKernel, {
          mode: 'generated',
          index: 0,
          kernelName: savedKernel.name || undefined,
        }).replace(/<div class="form-actions"[^]*<\/div>$/, '');
        parentContainer.appendChild(card);
      });

      updateSelectionCounter();
      updateEvolveButtonState();
    }

    function renderEvolvedKernels(nextKernels) {
      evolvedKernels = Array.isArray(nextKernels) ? nextKernels : [];

      if (!resultsContainer || !resultsSection) {
        return;
      }

      resultsContainer.innerHTML = '';

      if (evolvedKernels.length === 0) {
        resultsContainer.innerHTML =
          '<p class="spine-section-subtitle">No evolved kernels returned. Try different parent kernels.</p>';
        resultsSection.style.display = 'block';
        return;
      }

      evolvedKernels.forEach(function (entry, index) {
        var card = document.createElement('article');
        card.className = 'spine-card';
        card.setAttribute('data-result-index', String(index));
        card.innerHTML = renderKernelCard(entry, { mode: 'generated', index: index });
        var saveBtn = card.querySelector('.kernel-save-generated-btn');
        if (saveBtn) {
          saveBtn.classList.add('kernel-evo-save-btn');
          saveBtn.setAttribute('data-result-index', String(index));
        }
        resultsContainer.appendChild(card);
      });

      resultsSection.style.display = 'block';
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    async function loadParentKernels() {
      try {
        var response = await fetch('/kernels/api/list', { method: 'GET' });
        var data = await response.json();
        if (!response.ok || !data.success || !Array.isArray(data.kernels)) {
          throw new Error(data.error || 'Failed to load kernels');
        }

        renderParentKernelCards(data.kernels);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to load kernels');
      }
    }

    async function handleEvolve() {
      var apiKey = getEvoApiKey();
      if (apiKey.length < 10) {
        showError('OpenRouter API key is required');
        return;
      }
      if (selectedParentIds.length < 2 || selectedParentIds.length > 3) {
        showError('Select 2-3 parent kernels');
        return;
      }

      evolveBtn.disabled = true;
      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var response = await fetch('/evolve-kernels/api/evolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kernelIds: selectedParentIds,
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
          throw new Error(data && data.error ? data.error : 'Failed to evolve kernels');
        }

        setApiKey(apiKey);
        renderEvolvedKernels(data.evaluatedKernels);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to evolve kernels');
      } finally {
        loadingProgress.stop();
        loading.style.display = 'none';
        updateEvolveButtonState();
      }
    }

    async function handleSaveResult(index, button) {
      var evaluatedKernel = evolvedKernels[index];
      if (!evaluatedKernel) {
        return;
      }

      button.disabled = true;
      button.textContent = 'Saving...';

      try {
        var response = await fetch('/kernels/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evaluatedKernel: evaluatedKernel,
            name: evaluatedKernel.kernel && evaluatedKernel.kernel.dramaticThesis
              ? evaluatedKernel.kernel.dramaticThesis
              : 'Untitled Kernel',
          }),
        });

        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to save kernel');
        }

        button.textContent = 'Saved';
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Save to Library';
        showError(error instanceof Error ? error.message : 'Failed to save kernel');
      }
    }

    parentContainer && parentContainer.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      var card = target.closest('.spine-card[data-kernel-id]');
      if (!card) {
        return;
      }

      var kernelId = card.getAttribute('data-kernel-id') || '';
      if (!kernelId) {
        return;
      }

      var selectedIndex = selectedParentIds.indexOf(kernelId);
      if (selectedIndex >= 0) {
        selectedParentIds.splice(selectedIndex, 1);
      } else if (selectedParentIds.length >= 3) {
        showError('You can select up to 3 parent kernels');
        return;
      } else {
        selectedParentIds.push(kernelId);
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

      var button = target.closest('.kernel-evo-save-btn');
      if (!(button instanceof HTMLButtonElement) || button.disabled) {
        return;
      }

      var index = Number(button.getAttribute('data-result-index'));
      if (!Number.isFinite(index) || index < 0) {
        return;
      }

      void handleSaveResult(index, button);
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

    updateSelectionCounter();
    updateEvolveButtonState();
    void loadParentKernels();
  }
