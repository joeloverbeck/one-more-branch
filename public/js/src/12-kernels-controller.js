  // ── Kernels Page Controller ─────────────────────────────────────

  function initKernelsPage() {
    var page = document.getElementById('kernels-page');
    if (!page) {
      return;
    }

    var generateBtn = document.getElementById('generate-kernels-btn');
    var generateForm = document.getElementById('kernel-generate-form');
    var apiKeyInput = document.getElementById('kernelApiKey');
    var generatedSection = document.getElementById('generated-kernels-section');
    var generatedContainer = document.getElementById('generated-kernels');
    var savedContainer = document.getElementById('saved-kernels');
    var progressSection = document.getElementById('kernel-progress-section');
    var progressContent = document.getElementById('kernel-progress-content');

    if (!generateBtn || !apiKeyInput || !generatedContainer || !savedContainer || !progressSection || !progressContent) {
      return;
    }

    progressContent.classList.add('loading-overlay-content');

    if (!progressContent.querySelector('.loading-status')) {
      progressContent.innerHTML =
        '<div class="loading-stage" aria-live="polite"></div>' +
        '<div class="loading-spinner"></div>' +
        '<p class="loading-status">Generating kernels...</p>';
    }

    var loadingProgress = createLoadingProgressController(progressContent);
    var lastGeneratedKernels = [];
    var lastSeeds = null;
    var savedKernelsById = {};

    var storedKey = getApiKey();
    if (storedKey && typeof apiKeyInput.value === 'string' && apiKeyInput.value.length === 0) {
      apiKeyInput.value = storedKey;
    }

    function showError(message) {
      if (typeof showFormError === 'function') {
        showFormError(message);
      } else {
        alert(message);
      }
    }

    function formatGenerateErrorMessage(data) {
      var fallbackMessage = 'Failed to generate kernels';
      if (!data || typeof data !== 'object') {
        return fallbackMessage;
      }

      var message = typeof data.error === 'string' && data.error.trim() ? data.error.trim() : fallbackMessage;
      var details = [];

      if (typeof data.code === 'string' && data.code.trim()) {
        details.push('Code: ' + data.code.trim());
      }
      if (typeof data.retryable === 'boolean') {
        details.push('Retryable: ' + (data.retryable ? 'yes' : 'no'));
      }

      var debug = data.debug && typeof data.debug === 'object' ? data.debug : null;
      if (debug) {
        if (typeof debug.httpStatus === 'number') {
          details.push('HTTP status: ' + String(debug.httpStatus));
        }
        if (typeof debug.model === 'string' && debug.model.trim()) {
          details.push('Model: ' + debug.model.trim());
        }
        if (typeof debug.rawError === 'string' && debug.rawError.trim()) {
          var normalizedRawError = debug.rawError.replace(/\s+/g, ' ').trim();
          details.push('Provider detail: ' + normalizedRawError.slice(0, 240));
        }
      }

      return details.length > 0 ? message + ' | ' + details.join(' | ') : message;
    }

    function getKernelApiKey() {
      var raw = typeof apiKeyInput.value === 'string' ? apiKeyInput.value.trim() : '';
      return raw || (getApiKey() || '').trim();
    }

    function collectSeeds() {
      var thematicInterests = document.getElementById('thematicInterests');
      var emotionalCore = document.getElementById('emotionalCore');
      var sparkLine = document.getElementById('sparkLine');

      return {
        thematicInterests: thematicInterests && typeof thematicInterests.value === 'string' ? thematicInterests.value.trim() : '',
        emotionalCore: emotionalCore && typeof emotionalCore.value === 'string' ? emotionalCore.value.trim() : '',
        sparkLine: sparkLine && typeof sparkLine.value === 'string' ? sparkLine.value.trim() : '',
      };
    }

    function hasAtLeastOneSeed(seeds) {
      return Boolean(seeds.thematicInterests || seeds.emotionalCore || seeds.sparkLine);
    }

    function syncGenerateButtonState() {
      var seeds = collectSeeds();
      var validApi =
        typeof apiKeyInput.checkValidity === 'function'
          ? apiKeyInput.checkValidity()
          : getKernelApiKey().length >= 10;
      generateBtn.disabled = !validApi || !hasAtLeastOneSeed(seeds);
    }

    function createSavedCard(savedKernel) {
      var card = document.createElement('article');
      card.className = 'spine-card kernel-card saved-kernel-card';
      card.dataset.kernelId = savedKernel.id;
      card.innerHTML = renderKernelCard(savedKernel.evaluatedKernel, {
        mode: 'saved',
        kernelId: savedKernel.id,
        kernelName: savedKernel.name,
        createdAt: savedKernel.createdAt,
      });
      return card;
    }

    function createGeneratedCard(evaluatedKernel, index) {
      var card = document.createElement('article');
      card.className = 'spine-card kernel-card';
      card.dataset.index = String(index);
      card.innerHTML = renderKernelCard(evaluatedKernel, {
        mode: 'generated',
        index: index,
      });
      return card;
    }

    function renderGeneratedKernels(evaluatedKernels) {
      generatedContainer.innerHTML = '';

      if (!Array.isArray(evaluatedKernels) || evaluatedKernels.length === 0) {
        generatedContainer.innerHTML = '<p class="spine-section-subtitle">No kernels generated. Adjust seeds and try again.</p>';
        generatedSection.style.display = 'block';
        return;
      }

      evaluatedKernels.forEach(function (evaluatedKernel, index) {
        generatedContainer.appendChild(createGeneratedCard(evaluatedKernel, index));
      });
      generatedSection.style.display = 'block';
      generatedSection.scrollIntoView({ behavior: 'smooth' });
    }

    function renderSavedKernels(kernels) {
      savedContainer.innerHTML = '';
      savedKernelsById = {};

      if (!Array.isArray(kernels) || kernels.length === 0) {
        savedContainer.innerHTML = '<p class="spine-section-subtitle">No saved kernels yet. Generate some above!</p>';
        return;
      }

      kernels.forEach(function (savedKernel) {
        savedKernelsById[savedKernel.id] = savedKernel;
        savedContainer.appendChild(createSavedCard(savedKernel));
      });
    }

    async function loadSavedKernels() {
      var response = await fetch('/kernels/api/list', {
        method: 'GET',
        cache: 'no-store',
      });

      var data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.kernels)) {
        throw new Error(data.error || 'Failed to load kernels');
      }

      renderSavedKernels(data.kernels);
    }

    async function handleGenerate() {
      if (typeof apiKeyInput.checkValidity === 'function' && !apiKeyInput.checkValidity()) {
        apiKeyInput.reportValidity();
        return;
      }

      var apiKey = getKernelApiKey();
      if (apiKey.length < 10) {
        showError('OpenRouter API key is required');
        return;
      }

      var seeds = collectSeeds();
      if (!hasAtLeastOneSeed(seeds)) {
        showError('At least one kernel seed field is required');
        return;
      }

      generateBtn.disabled = true;
      progressSection.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var response = await fetch('/kernels/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thematicInterests: seeds.thematicInterests,
            emotionalCore: seeds.emotionalCore,
            sparkLine: seeds.sparkLine,
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

        if (!response.ok || !data.success || !Array.isArray(data.evaluatedKernels)) {
          if (data && typeof data === 'object') {
            if (data.code) {
              console.error('Kernel generation error code:', data.code, '| Retryable:', data.retryable);
            }
            if (data.debug) {
              console.error('Kernel generation debug info:', data.debug);
            }
          }

          throw new Error(formatGenerateErrorMessage(data));
        }

        setApiKey(apiKey);
        lastSeeds = seeds;
        lastGeneratedKernels = data.evaluatedKernels;
        renderGeneratedKernels(data.evaluatedKernels);
      } catch (error) {
        showError(error instanceof Error ? error.message : 'Failed to generate kernels');
      } finally {
        loadingProgress.stop();
        progressSection.style.display = 'none';
        syncGenerateButtonState();
      }
    }

    async function handleSaveGenerated(index, button) {
      if (!Array.isArray(lastGeneratedKernels) || !lastGeneratedKernels[index]) {
        return;
      }

      button.disabled = true;
      button.textContent = 'Saving...';

      try {
        var response = await fetch('/kernels/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evaluatedKernel: lastGeneratedKernels[index],
            seeds: lastSeeds || {},
          }),
        });

        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to save kernel');
        }

        button.textContent = 'Saved!';
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');

        await loadSavedKernels();
      } catch (error) {
        button.disabled = false;
        button.textContent = 'Save to Library';
        showError(error instanceof Error ? error.message : 'Failed to save kernel');
      }
    }

    function buildInlineEditForm(savedKernel) {
      var kernel = savedKernel.evaluatedKernel.kernel;
      var wrapper = document.createElement('div');
      wrapper.className = 'kernel-inline-edit';
      wrapper.dataset.kernelId = savedKernel.id;
      wrapper.innerHTML =
        '<div class="form-group"><label>Name</label><input type="text" class="kernel-edit-name" value="' + escapeHtml(savedKernel.name || '') + '"></div>' +
        '<div class="form-group"><label>Dramatic Thesis</label><textarea class="kernel-edit-dramaticThesis" rows="2">' + escapeHtml(kernel.dramaticThesis || '') + '</textarea></div>' +
        '<div class="form-group"><label>Value at Stake</label><input type="text" class="kernel-edit-valueAtStake" value="' + escapeHtml(kernel.valueAtStake || '') + '"></div>' +
        '<div class="form-group"><label>Opposing Force</label><textarea class="kernel-edit-opposingForce" rows="2">' + escapeHtml(kernel.opposingForce || '') + '</textarea></div>' +
        '<div class="form-group"><label>Thematic Question</label><input type="text" class="kernel-edit-thematicQuestion" value="' + escapeHtml(kernel.thematicQuestion || '') + '"></div>' +
        '<div class="form-group"><label>Direction of Change</label>' +
          '<select class="kernel-edit-directionOfChange">' +
            '<option value="POSITIVE"' + (kernel.directionOfChange === 'POSITIVE' ? ' selected' : '') + '>POSITIVE</option>' +
            '<option value="NEGATIVE"' + (kernel.directionOfChange === 'NEGATIVE' ? ' selected' : '') + '>NEGATIVE</option>' +
            '<option value="IRONIC"' + (kernel.directionOfChange === 'IRONIC' ? ' selected' : '') + '>IRONIC</option>' +
            '<option value="AMBIGUOUS"' + (kernel.directionOfChange === 'AMBIGUOUS' ? ' selected' : '') + '>AMBIGUOUS</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-actions" style="margin-top: 0.5rem;">' +
          '<button type="button" class="btn btn-primary btn-small kernel-edit-save-btn" data-kernel-id="' + escapeHtml(savedKernel.id) + '">Save Changes</button>' +
          '<button type="button" class="btn btn-secondary btn-small kernel-edit-cancel-btn">Cancel</button>' +
        '</div>';
      return wrapper;
    }

    function readInlineEditValues(editForm) {
      function getInputValue(selector) {
        var el = editForm.querySelector(selector);
        return el && typeof el.value === 'string' ? el.value.trim() : '';
      }

      return {
        name: getInputValue('.kernel-edit-name'),
        kernelFields: {
          dramaticThesis: getInputValue('.kernel-edit-dramaticThesis'),
          valueAtStake: getInputValue('.kernel-edit-valueAtStake'),
          opposingForce: getInputValue('.kernel-edit-opposingForce'),
          thematicQuestion: getInputValue('.kernel-edit-thematicQuestion'),
          directionOfChange: getInputValue('.kernel-edit-directionOfChange'),
        },
      };
    }

    function validateInlineEditPayload(payload) {
      return (
        payload.name.length > 0 &&
        payload.kernelFields.dramaticThesis.length > 0 &&
        payload.kernelFields.valueAtStake.length > 0 &&
        payload.kernelFields.opposingForce.length > 0 &&
        payload.kernelFields.thematicQuestion.length > 0 &&
        payload.kernelFields.directionOfChange.length > 0
      );
    }

    async function handleEditSave(kernelId, editForm, saveButton) {
      var payload = readInlineEditValues(editForm);
      if (!validateInlineEditPayload(payload)) {
        showError('All kernel edit fields are required');
        return;
      }

      saveButton.disabled = true;

      try {
        var response = await fetch('/kernels/api/' + encodeURIComponent(kernelId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to update kernel');
        }

        await loadSavedKernels();
      } catch (error) {
        saveButton.disabled = false;
        showError(error instanceof Error ? error.message : 'Failed to update kernel');
      }
    }

    async function handleDelete(kernelId, deleteButton) {
      deleteButton.disabled = true;

      try {
        var response = await fetch('/kernels/api/' + encodeURIComponent(kernelId), {
          method: 'DELETE',
        });
        var data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to delete kernel');
        }

        await loadSavedKernels();
      } catch (error) {
        deleteButton.disabled = false;
        showError(error instanceof Error ? error.message : 'Failed to delete kernel');
      }
    }

    generatedContainer.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) return;

      var saveButton = target.closest('.kernel-save-generated-btn');
      if (!saveButton || saveButton.disabled) {
        return;
      }

      var index = Number(saveButton.dataset.genIndex);
      if (!Number.isFinite(index) || index < 0) {
        return;
      }

      void handleSaveGenerated(index, saveButton);
    });

    savedContainer.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) return;

      var deleteButton = target.closest('.kernel-delete-btn');
      if (deleteButton) {
        var deleteKernelId = deleteButton.dataset.kernelId;
        if (deleteKernelId && confirm('Delete this kernel?')) {
          void handleDelete(deleteKernelId, deleteButton);
        }
        return;
      }

      var editButton = target.closest('.kernel-edit-btn');
      if (editButton) {
        var editKernelId = editButton.dataset.kernelId;
        if (!editKernelId) {
          return;
        }

        var currentCard = editButton.closest('.saved-kernel-card');
        if (!currentCard || currentCard.querySelector('.kernel-inline-edit')) {
          return;
        }

        var savedKernel = savedKernelsById[editKernelId];
        if (!savedKernel) {
          showError('Kernel data is unavailable. Refresh and try again.');
          return;
        }

        currentCard.appendChild(buildInlineEditForm(savedKernel));
        return;
      }

      var cancelButton = target.closest('.kernel-edit-cancel-btn');
      if (cancelButton) {
        var editSection = cancelButton.closest('.kernel-inline-edit');
        if (editSection) {
          editSection.remove();
        }
        return;
      }

      var saveEditButton = target.closest('.kernel-edit-save-btn');
      if (saveEditButton) {
        var saveKernelId = saveEditButton.dataset.kernelId;
        var editForm = saveEditButton.closest('.kernel-inline-edit');

        if (!saveKernelId || !editForm) {
          return;
        }

        void handleEditSave(saveKernelId, editForm, saveEditButton);
      }
    });

    generateBtn.addEventListener('click', function (event) {
      event.preventDefault();
      void handleGenerate();
    });

    if (generateForm) {
      generateForm.addEventListener('submit', function (event) {
        event.preventDefault();
      });
    }

    page.addEventListener('input', function () {
      syncGenerateButtonState();
    });

    syncGenerateButtonState();

    void loadSavedKernels().catch(function (error) {
      showError(error instanceof Error ? error.message : 'Failed to load saved kernels');
    });
  }
