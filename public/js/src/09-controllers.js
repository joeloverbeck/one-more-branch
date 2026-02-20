  // ── Controllers ───────────────────────────────────────────────────

  function initPlayPage() {
    const container = document.querySelector('.play-container');
    if (!container) {
      return;
    }

    const storyId = container.dataset.storyId;
    let currentPageId = Number.parseInt(container.dataset.pageId || '1', 10);
    if (!Number.isFinite(currentPageId) || currentPageId < 1) {
      currentPageId = 1;
    }

    const choicesSection = document.getElementById('choices-section');
    const choices = document.getElementById('choices');
    const narrative = document.getElementById('narrative');
    const loading = document.getElementById('loading');
    const apiKeyModal = document.getElementById('api-key-modal');
    const initialInsightsContext = parseInsightsContextFromDom();
    const insightsController = createAnalystInsightsController(parseAnalystDataFromDom(), initialInsightsContext);
    const recapController = createRecapModalController(parseRecapDataFromDom());
    const loreController = createLoreModalController(parseLoreDataFromDom());

    if (!storyId || !narrative || !loading || !apiKeyModal) {
      return;
    }

    var initialRelPanel = document.getElementById('npc-relationships-panel');
    if (initialRelPanel) {
      bindNpcRelationshipCardToggles(initialRelPanel);
    }

    var previousActNumber = null;
    var initialActIndicator = document.getElementById('act-indicator');
    if (initialActIndicator) {
      var initialWrapper = document.getElementById('act-indicator-wrapper');
      if (initialWrapper) {
        previousActNumber = Number(initialWrapper.dataset.actNumber || '0') || null;
      }
    }
    initActIndicator();

    const hasChoicesUi = choicesSection instanceof HTMLElement && choices instanceof HTMLElement;
    const loadingProgress = createLoadingProgressController(loading);

    function ensureApiKey() {
      return new Promise((resolve, reject) => {
        const key = getApiKey();
        if (key) {
          resolve(key);
          return;
        }

        const form = document.getElementById('api-key-form');
        const input = document.getElementById('modal-api-key');

        if (!(form instanceof HTMLFormElement) || !input) {
          reject(new Error('API key prompt is unavailable.'));
          return;
        }

        apiKeyModal.style.display = 'flex';

        const handleSubmit = (event) => {
          event.preventDefault();
          const newKey = input.value.trim();
          if (newKey.length < 10) {
            alert('Please enter a valid API key');
            return;
          }

          form.removeEventListener('submit', handleSubmit);
          setApiKey(newKey);
          apiKeyModal.style.display = 'none';
          resolve(newKey);
        };

        form.addEventListener('submit', handleSubmit);
      });
    }

    function getProtagonistGuidanceValues() {
      if (!choicesSection) {
        return { emotions: '', thoughts: '', speech: '' };
      }

      const emotionsEl = choicesSection.querySelector('#guidance-emotions');
      const thoughtsEl = choicesSection.querySelector('#guidance-thoughts');
      const speechEl = choicesSection.querySelector('#guidance-speech');

      return {
        emotions: emotionsEl instanceof HTMLTextAreaElement ? emotionsEl.value : '',
        thoughts: thoughtsEl instanceof HTMLTextAreaElement ? thoughtsEl.value : '',
        speech: speechEl instanceof HTMLTextAreaElement ? speechEl.value : '',
      };
    }

    function setChoicesDisabled(disabled) {
      if (!choices) {
        return;
      }
      const allButtons = choices.querySelectorAll('.choice-btn');
      allButtons.forEach((button) => {
        button.disabled = disabled;
      });
    }

    function handleCustomChoiceSubmit() {
      if (!choicesSection || !choices) {
        return;
      }
      const input = choicesSection.querySelector('.custom-choice-input');
      if (!input) return;

      const text = input.value.trim();
      if (!text) return;
      clearPlayError(choicesSection);

      const addBtn = choicesSection.querySelector('.custom-choice-btn');
      if (addBtn) addBtn.disabled = true;
      input.disabled = true;

      const choiceTypeSelect = choicesSection.querySelector('.custom-choice-type');
      const primaryDeltaSelect = choicesSection.querySelector('.custom-choice-delta');
      const choiceType = choiceTypeSelect ? choiceTypeSelect.value : 'TACTICAL_APPROACH';
      const primaryDelta = primaryDeltaSelect ? primaryDeltaSelect.value : 'GOAL_SHIFT';

      fetch(`/play/${storyId}/custom-choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: currentPageId, choiceText: text, choiceType: choiceType, primaryDelta: primaryDelta }),
      })
        .then(function(response) {
          return response.json().then(function(data) {
            if (!response.ok) {
              throw new Error(data.error || 'Failed to add custom choice');
            }
            return data;
          });
        })
        .then(function(data) {
          rebuildChoicesSection(
            data.choices,
            getProtagonistGuidanceValues(),
            choices,
            choicesSection,
            bindCustomChoiceEvents
          );
        })
        .catch(function(error) {
          showPlayError(error instanceof Error ? error.message : 'Failed to add custom choice', choicesSection);
          if (addBtn) addBtn.disabled = false;
          if (input) input.disabled = false;
        });
    }

    function bindCustomChoiceEvents() {
      if (!choicesSection) {
        return;
      }
      const addBtn = choicesSection.querySelector('.custom-choice-btn');
      const input = choicesSection.querySelector('.custom-choice-input');

      if (addBtn) {
        addBtn.addEventListener('click', handleCustomChoiceSubmit);
      }
      if (input) {
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleCustomChoiceSubmit();
          }
        });
      }
    }

    if (hasChoicesUi) {
      // Bind events for the initial custom choice input rendered by the server
      bindCustomChoiceEvents();
    }

    if (hasChoicesUi) {
      choices.addEventListener('click', async (event) => {
        const clickedElement = event.target;
        if (!(clickedElement instanceof HTMLElement)) {
          return;
        }

        const button = clickedElement.closest('.choice-btn');
        if (!button || button.disabled) {
          return;
        }

        const choiceIndex = Number.parseInt(button.dataset.choiceIndex || '', 10);
        if (!Number.isFinite(choiceIndex) || choiceIndex < 0) {
          return;
        }

        try {
          clearPlayError(choicesSection);
          const isExplored = button.dataset.explored === 'true';
          const apiKey = isExplored ? getApiKey() : await ensureApiKey();

        setChoicesDisabled(true);
        loading.style.display = 'flex';

        const body = {
          pageId: currentPageId,
          choiceIndex,
          progressId: createProgressId(),
        };
        const guidanceValues = getProtagonistGuidanceValues();
        const protagonistGuidance = {};
        if (guidanceValues.emotions.trim().length > 0) {
          protagonistGuidance.suggestedEmotions = guidanceValues.emotions.trim();
        }
        if (guidanceValues.thoughts.trim().length > 0) {
          protagonistGuidance.suggestedThoughts = guidanceValues.thoughts.trim();
        }
        if (guidanceValues.speech.trim().length > 0) {
          protagonistGuidance.suggestedSpeech = guidanceValues.speech.trim();
        }
        if (Object.keys(protagonistGuidance).length > 0) {
          body.protagonistGuidance = protagonistGuidance;
        }
        if (apiKey) {
          body.apiKey = apiKey;
        }
        loadingProgress.start(body.progressId);

        const response = await fetch(`/play/${storyId}/choice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
          // Log enhanced error details if available
          if (data.code) {
            console.error('Error code:', data.code, '| Retryable:', data.retryable);
          }
          if (data.debug) {
            console.error('Debug info:', data.debug);
          }
          throw new Error(data.error || 'Failed to process choice');
        }

        if (!data.page) {
          throw new Error('Invalid response from server');
        }
        insightsController.update(data.page.analystResult, {
          actDisplayInfo: data.actDisplayInfo ? data.actDisplayInfo.displayString : null,
          sceneSummary: data.page.sceneSummary || null,
          resolvedThreadMeta: data.page.resolvedThreadMeta || {},
          resolvedPromiseMeta: data.page.resolvedPromiseMeta || {},
        });
        recapController.update(data.recapSummaries || []);

        currentPageId = data.page.id;
        container.dataset.pageId = String(currentPageId);

        history.pushState({}, '', `/play/${storyId}?page=${currentPageId}`);

        narrative.innerHTML = `<div class="narrative-text">${escapeHtmlWithBreaks(data.page.narrativeText || '')}</div>`;
        var leftSidebarContainer = ensureLeftSidebarContainer();
        renderAffectPanel(data.page.protagonistAffect, leftSidebarContainer);
        renderNpcRelationshipsPanel(data.page.npcRelationships, leftSidebarContainer);
        renderInventoryPanel(data.page.inventory, data.page.inventoryOverflowSummary, leftSidebarContainer);
        renderHealthPanel(data.page.health, data.page.healthOverflowSummary, leftSidebarContainer);
        cleanupEmptyLeftSidebar();
        loreController.update(data.globalCanon || [], data.globalCharacterCanon || {});
        var sidebarContainer = ensureSidebarContainer();
        renderOpenThreadsPanel(data.page.openThreads, data.page.openThreadOverflowSummary, sidebarContainer);
        renderActiveThreatsPanel(data.page.activeThreats, data.page.threatsOverflowSummary, sidebarContainer);
        renderActiveConstraintsPanel(data.page.activeConstraints, data.page.constraintsOverflowSummary, sidebarContainer);
        renderTrackedPromisesPanel(data.page.trackedPromises, data.page.trackedPromisesOverflowSummary, sidebarContainer);
        cleanupEmptySidebar();
        renderStateChanges(data.page.stateChanges, narrative);
        renderMilestoneBanner(data.milestoneInfo, narrative);
        renderDeviationBanner(data.deviationInfo, choicesSection);

        const pageIndicator = document.querySelector('.page-indicator');
        if (pageIndicator) {
          pageIndicator.textContent = `Page ${currentPageId}`;
        }

        // Update act indicator based on response
        var existingWrapper = document.getElementById('act-indicator-wrapper');
        if (data.actDisplayInfo) {
          var newActNumber = data.actDisplayInfo.actNumber;
          var actChanged = previousActNumber !== null && newActNumber !== previousActNumber;

          var detailsHtml = '';
          if (data.actDisplayInfo.actObjective || data.actDisplayInfo.actStakes || data.actDisplayInfo.beatObjective) {
            detailsHtml = '<div class="act-structure-details" id="act-structure-details" hidden>';
            if (data.actDisplayInfo.actObjective) {
              detailsHtml += '<div class="act-structure-details__item">'
                + '<span class="act-structure-details__label">Act Objective</span>'
                + '<span class="act-structure-details__text">' + escapeHtml(data.actDisplayInfo.actObjective) + '</span>'
                + '</div>';
            }
            if (data.actDisplayInfo.actStakes) {
              detailsHtml += '<div class="act-structure-details__item">'
                + '<span class="act-structure-details__label">Stakes</span>'
                + '<span class="act-structure-details__text">' + escapeHtml(data.actDisplayInfo.actStakes) + '</span>'
                + '</div>';
            }
            if (data.actDisplayInfo.beatObjective) {
              detailsHtml += '<div class="act-structure-details__item">'
                + '<span class="act-structure-details__label">Beat Objective</span>'
                + '<span class="act-structure-details__text">' + escapeHtml(data.actDisplayInfo.beatObjective) + '</span>'
                + '</div>';
            }
            detailsHtml += '</div>';
          }

          var wrapperHtml = '<span class="act-indicator act-indicator--clickable" id="act-indicator"'
            + ' role="button" tabindex="0" aria-expanded="false"'
            + ' aria-controls="act-structure-details">'
            + '<span class="act-indicator__arrow" aria-hidden="true">&#x25B8;</span>'
            + escapeHtml(data.actDisplayInfo.displayString)
            + '</span>';

          if (existingWrapper) {
            existingWrapper.innerHTML = wrapperHtml;
            existingWrapper.dataset.actNumber = String(newActNumber);
          } else {
            var storyTitleSection = document.querySelector('.story-title-section');
            if (storyTitleSection) {
              var newWrapper = document.createElement('div');
              newWrapper.className = 'act-indicator-wrapper';
              newWrapper.id = 'act-indicator-wrapper';
              newWrapper.dataset.actNumber = String(newActNumber);
              newWrapper.innerHTML = wrapperHtml;
              storyTitleSection.appendChild(newWrapper);
            }
          }

          // Place details panel after .story-header (outside the flex row)
          var existingDetails = document.getElementById('act-structure-details');
          if (existingDetails) {
            existingDetails.remove();
          }
          if (detailsHtml) {
            var storyHeader = document.getElementById('story-header');
            if (storyHeader) {
              storyHeader.insertAdjacentHTML('afterend', detailsHtml);
            }
          }

          initActIndicator();
          if (actChanged) {
            expandActStructureDetails();
          }
          previousActNumber = newActNumber;
        } else if (existingWrapper) {
          existingWrapper.remove();
          var orphanedDetails = document.getElementById('act-structure-details');
          if (orphanedDetails) {
            orphanedDetails.remove();
          }
          previousActNumber = null;
        }

        if (data.page.isEnding) {
          choicesSection.innerHTML = `
            <div class="ending-banner">
              <h3>THE END</h3>
              <div class="ending-actions">
                <a href="/play/${storyId}/restart" class="btn btn-primary">Play Again</a>
                <a href="/" class="btn btn-secondary">Back to Stories</a>
              </div>
            </div>
          `;
        } else {
          const guidanceForRebuild = data.wasGenerated === true
            ? { emotions: '', thoughts: '', speech: '' }
            : getProtagonistGuidanceValues();
          rebuildChoicesSection(
            data.page.choices,
            guidanceForRebuild,
            choices,
            choicesSection,
            bindCustomChoiceEvents
          );
        }

        var storyHeader = document.getElementById('story-header');
        if (storyHeader) {
          storyHeader.scrollIntoView({ behavior: 'smooth' });
        } else {
          narrative.scrollIntoView({ behavior: 'smooth' });
        }
        } catch (error) {
          console.error('Error:', error);
          // Log additional debug info if available
          if (error && typeof error === 'object' && 'debug' in error) {
            console.error('Debug info:', error.debug);
          }
          if (choicesSection) {
            showPlayError(
              error instanceof Error ? error.message : 'Something went wrong. Please try again.',
              choicesSection
            );
          }
          setChoicesDisabled(false);
        } finally {
          loadingProgress.stop();
          loading.style.display = 'none';
        }
      });
    }

    window.addEventListener('popstate', () => {
      location.reload();
    });
  }

  function initNewStoryPage() {
    const form = document.querySelector('.story-form');
    const loading = document.getElementById('loading');
    const conceptSelectorSection = document.getElementById('concept-selector-section');
    const manualStorySection = document.getElementById('manual-story-section');
    const conceptSelector = document.getElementById('concept-selector');
    const useConceptBtn = document.getElementById('use-concept-btn');
    const skipConceptBtn = document.getElementById('skip-concept-btn');
    const generateSpineBtn = document.getElementById('generate-spine-btn');
    const regenerateSpineBtn = document.getElementById('regenerate-spines-btn');
    const spineContainer = document.getElementById('spine-options');
    const spineSection = document.getElementById('spine-section');
    const kernelSelectorStory = document.getElementById('kernel-selector-story');
    const kernelDisplayPanel = document.getElementById('kernel-display-panel');
    const errorDiv = document.querySelector('.alert-error');

    if (!form || !loading || !generateSpineBtn) {
      return;
    }
    const loadingProgress = createLoadingProgressController(loading);
    var selectedConceptSpec = null;
    var selectedKernelForStory = null;
    var loadedConceptsMap = {};

    initNpcControls();
    initDynamicLists();

    function toTrimmedString(value) {
      return typeof value === 'string' ? value.trim() : '';
    }

    function getValueById(id) {
      var field = document.getElementById(id);
      return field && typeof field.value === 'string' ? field.value.trim() : '';
    }

    function hideExistingError() {
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }
    }

    function revealManualStorySection() {
      if (conceptSelectorSection) {
        conceptSelectorSection.style.display = 'none';
      }
      if (manualStorySection) {
        manualStorySection.style.display = 'block';
      }
    }

    function setValueById(id, value) {
      var field = document.getElementById(id);
      if (!field || typeof field.value !== 'string') {
        return;
      }

      field.value = value;
    }

    function setSelectedById(id, value) {
      var field = document.getElementById(id);
      if (!(field instanceof HTMLSelectElement)) return;
      var strVal = String(value || '');
      for (var i = 0; i < field.options.length; i++) {
        if (field.options[i].value === strVal) {
          field.selectedIndex = i;
          return;
        }
      }
    }

    function openAllCollapsibleSections() {
      document.querySelectorAll('.form-section-collapsible').forEach(function (details) {
        details.open = true;
      });
    }

    function prefillFromConceptSpec(conceptSpec) {
      if (!conceptSpec) return;

      // Narrative Identity
      setValueById('oneLineHook', conceptSpec.oneLineHook || '');
      setValueById('elevatorParagraph', conceptSpec.elevatorParagraph || '');
      setValueById('whatIfQuestion', conceptSpec.whatIfQuestion || '');
      setValueById('ironicTwist', conceptSpec.ironicTwist || '');
      setValueById('playerFantasy', conceptSpec.playerFantasy || '');

      // Genre & Tone
      setSelectedById('genreFrame', conceptSpec.genreFrame);
      setValueById('genreSubversion', conceptSpec.genreSubversion || '');
      var genreLabel = String(conceptSpec.genreFrame || '').replace(/_/g, ' ');
      var subversion = toTrimmedString(conceptSpec.genreSubversion);
      setValueById('tone', genreLabel + (subversion ? ' - ' + subversion : ''));

      // Protagonist
      setValueById('protagonistRole', conceptSpec.protagonistRole || '');
      setValueById('coreCompetence', conceptSpec.coreCompetence || '');
      setValueById('coreFlaw', conceptSpec.coreFlaw || '');
      var role = toTrimmedString(conceptSpec.protagonistRole);
      var competence = toTrimmedString(conceptSpec.coreCompetence);
      var flaw = toTrimmedString(conceptSpec.coreFlaw);
      setValueById('characterConcept', 'Role: ' + role + '. Competence: ' + competence + '. Flaw: ' + flaw + '.');
      populateDynamicList('actionVerbs', conceptSpec.actionVerbs);

      // Conflict Engine
      setValueById('coreConflictLoop', conceptSpec.coreConflictLoop || '');
      setSelectedById('conflictAxis', conceptSpec.conflictAxis);
      setSelectedById('conflictType', conceptSpec.conflictType);
      setValueById('pressureSource', conceptSpec.pressureSource || '');
      setValueById('stakesPersonal', conceptSpec.stakesPersonal || '');
      setValueById('stakesSystemic', conceptSpec.stakesSystemic || '');
      setValueById('deadlineMechanism', conceptSpec.deadlineMechanism || '');

      // World
      populateDynamicList('settingAxioms', conceptSpec.settingAxioms);
      populateDynamicList('constraintSet', conceptSpec.constraintSet);
      populateDynamicList('keyInstitutions', conceptSpec.keyInstitutions);
      setSelectedById('settingScale', conceptSpec.settingScale);

      // Structure & Design
      setSelectedById('branchingPosture', conceptSpec.branchingPosture);
      setSelectedById('stateComplexity', conceptSpec.stateComplexity);

      openAllCollapsibleSections();
    }

    function buildConceptSpecFromFields() {
      var oneLineHook = getValueById('oneLineHook');
      var elevatorParagraph = getValueById('elevatorParagraph');
      var genreFrame = getValueById('genreFrame');
      var protagonistRole = getValueById('protagonistRole');
      var coreCompetence = getValueById('coreCompetence');
      var coreFlaw = getValueById('coreFlaw');
      var actionVerbs = collectDynamicListEntries('actionVerbs');
      var coreConflictLoop = getValueById('coreConflictLoop');
      var conflictAxis = getValueById('conflictAxis');
      var conflictType = getValueById('conflictType');
      var pressureSource = getValueById('pressureSource');
      var stakesPersonal = getValueById('stakesPersonal');
      var stakesSystemic = getValueById('stakesSystemic');
      var deadlineMechanism = getValueById('deadlineMechanism');

      // Only build a conceptSpec if we have enough meaningful fields
      if (!oneLineHook && !coreConflictLoop && !conflictAxis) {
        return null;
      }

      return {
        oneLineHook: oneLineHook,
        elevatorParagraph: elevatorParagraph,
        genreFrame: genreFrame,
        genreSubversion: getValueById('genreSubversion'),
        protagonistRole: protagonistRole,
        coreCompetence: coreCompetence,
        coreFlaw: coreFlaw,
        actionVerbs: actionVerbs,
        coreConflictLoop: coreConflictLoop,
        conflictAxis: conflictAxis,
        conflictType: conflictType,
        pressureSource: pressureSource,
        stakesPersonal: stakesPersonal,
        stakesSystemic: stakesSystemic,
        deadlineMechanism: deadlineMechanism,
        settingAxioms: collectDynamicListEntries('settingAxioms'),
        constraintSet: collectDynamicListEntries('constraintSet'),
        keyInstitutions: collectDynamicListEntries('keyInstitutions'),
        settingScale: getValueById('settingScale'),
        branchingPosture: getValueById('branchingPosture'),
        stateComplexity: getValueById('stateComplexity'),
        whatIfQuestion: getValueById('whatIfQuestion'),
        ironicTwist: getValueById('ironicTwist'),
        playerFantasy: getValueById('playerFantasy'),
      };
    }

    function collectFormData() {
      var formData = new FormData(form);
      var npcs = collectNpcEntries();

      // Build characterConcept from structured fields if the free-text is the default prefill
      var characterConcept = toTrimmedString(formData.get('characterConcept'));

      // Build worldbuilding — merge free text with structured lists
      var worldbuildingFreeText = toTrimmedString(formData.get('worldbuilding'));

      // Build tone from genre + free text
      var toneFreeText = toTrimmedString(formData.get('tone'));

      return {
        title: toTrimmedString(formData.get('title')),
        characterConcept: characterConcept,
        worldbuilding: worldbuildingFreeText,
        tone: toneFreeText,
        npcs: npcs.length > 0 ? npcs : undefined,
        startingSituation: toTrimmedString(formData.get('startingSituation')),
        apiKey: toTrimmedString(formData.get('apiKey')),
      };
    }

    function validateBeforeGeneratingSpines() {
      hideExistingError();

      var titleInput = document.getElementById('title');
      var characterConceptInput = document.getElementById('characterConcept');
      var apiKeyInput = document.getElementById('apiKey');

      if (titleInput && typeof titleInput.checkValidity === 'function' && !titleInput.checkValidity()) {
        titleInput.reportValidity();
        return false;
      }

      if (
        characterConceptInput &&
        typeof characterConceptInput.checkValidity === 'function' &&
        !characterConceptInput.checkValidity()
      ) {
        characterConceptInput.reportValidity();
        return false;
      }

      var apiKeyValue =
        apiKeyInput && typeof apiKeyInput.value === 'string' ? apiKeyInput.value.trim() : '';
      if (!apiKeyValue) {
        showFormError('OpenRouter API key is required');
        return false;
      }

      return true;
    }

    // ── Kernel selector logic (for story creation) ─────────────────

    function renderStoryKernelDisplay(kernel) {
      if (!kernelDisplayPanel) return;

      if (!kernel) {
        kernelDisplayPanel.style.display = 'none';
        selectedKernelForStory = null;
        return;
      }

      selectedKernelForStory = kernel;
      var thesisEl = document.getElementById('kernel-disp-thesis');
      var valueEl = document.getElementById('kernel-disp-value');
      var opposingEl = document.getElementById('kernel-disp-opposing');
      var directionEl = document.getElementById('kernel-disp-direction');
      var questionEl = document.getElementById('kernel-disp-question');

      if (thesisEl) thesisEl.textContent = kernel.dramaticThesis || '';
      if (valueEl) valueEl.textContent = kernel.valueAtStake || '';
      if (opposingEl) opposingEl.textContent = kernel.opposingForce || '';
      if (directionEl) directionEl.textContent = String(kernel.directionOfChange || '').replace(/_/g, ' ');
      if (questionEl) questionEl.textContent = kernel.thematicQuestion || '';

      kernelDisplayPanel.style.display = 'block';
    }

    async function loadStoryKernelOptions() {
      if (!(kernelSelectorStory instanceof HTMLSelectElement)) return;

      try {
        var response = await fetch('/kernels/api/list', { method: 'GET' });
        var data = await response.json();
        if (!response.ok || !data.success || !Array.isArray(data.kernels)) return;

        data.kernels.forEach(function (kernel) {
          var option = document.createElement('option');
          option.value = kernel.id;
          option.textContent = kernel.name || 'Untitled Kernel';
          kernelSelectorStory.appendChild(option);
        });
      } catch (e) {
        // Non-fatal
      }
    }

    async function handleStoryKernelChange() {
      if (!(kernelSelectorStory instanceof HTMLSelectElement)) return;

      var kernelId = (kernelSelectorStory.value || '').trim();
      if (!kernelId) {
        renderStoryKernelDisplay(null);
        return;
      }

      try {
        var response = await fetch('/kernels/api/' + encodeURIComponent(kernelId));
        var data = await response.json();
        if (!response.ok || !data.success || !data.kernel) {
          throw new Error(data.error || 'Failed to load kernel');
        }

        renderStoryKernelDisplay(data.kernel.evaluatedKernel.kernel);
      } catch (e) {
        kernelSelectorStory.value = '';
        renderStoryKernelDisplay(null);
      }
    }

    if (kernelSelectorStory instanceof HTMLSelectElement) {
      loadStoryKernelOptions();
      kernelSelectorStory.addEventListener('change', function () {
        void handleStoryKernelChange();
      });
    }

    // ── Concept selector logic ─────────────────────────────────────

    async function loadConceptList() {
      try {
        var response = await fetch('/concepts/api/list');
        var data = await response.json();
        if (!response.ok || !data.success) return;

        if (conceptSelector && Array.isArray(data.concepts)) {
          data.concepts.forEach(function (c) {
            loadedConceptsMap[c.id] = c;
            var option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.name + ' (' + Math.round(c.evaluatedConcept.overallScore || 0) + ')';
            conceptSelector.appendChild(option);
          });
        }
      } catch (e) {
        // Non-fatal: concepts list unavailable
      }
    }

    if (conceptSelector) {
      loadConceptList();

      conceptSelector.addEventListener('change', function () {
        var conceptId = conceptSelector.value;
        if (useConceptBtn) {
          useConceptBtn.disabled = !conceptId;
        }
      });
    }

    if (useConceptBtn) {
      useConceptBtn.addEventListener('click', function (event) {
        event.preventDefault();
        var conceptId = conceptSelector ? conceptSelector.value : '';
        if (!conceptId) return;

        var savedConcept = loadedConceptsMap[conceptId];
        if (savedConcept && savedConcept.evaluatedConcept && savedConcept.evaluatedConcept.concept) {
          selectedConceptSpec = savedConcept.evaluatedConcept.concept;
          prefillFromConceptSpec(selectedConceptSpec);

          // Auto-load linked kernel if available
          if (savedConcept.sourceKernelId && kernelSelectorStory instanceof HTMLSelectElement) {
            kernelSelectorStory.value = savedConcept.sourceKernelId;
            void handleStoryKernelChange();
          }

          revealManualStorySection();
          if (manualStorySection && typeof manualStorySection.scrollIntoView === 'function') {
            manualStorySection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }

    async function fetchSpineOptions() {
      hideExistingError();

      generateSpineBtn.disabled = true;
      if (regenerateSpineBtn) regenerateSpineBtn.disabled = true;
      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var formValues = collectFormData();
        var conceptSpecFromFields = buildConceptSpecFromFields();
        var spineBody = {
          characterConcept: formValues.characterConcept,
          worldbuilding: formValues.worldbuilding,
          tone: formValues.tone,
          npcs: formValues.npcs,
          startingSituation: formValues.startingSituation,
          apiKey: formValues.apiKey,
          conceptSpec: conceptSpecFromFields || undefined,
          progressId: progressId,
        };
        if (selectedKernelForStory) {
          spineBody.storyKernel = selectedKernelForStory;
        }

        var response = await fetch('/stories/generate-spines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(spineBody),
        });

        var data = await response.json();

        if (!response.ok || !data.success) {
          if (data.code) {
            console.error('Error code:', data.code, '| Retryable:', data.retryable);
          }
          throw new Error(data.error || 'Failed to generate spine options');
        }

        if (formValues.apiKey.length >= 10) {
          setApiKey(formValues.apiKey);
        }

        if (spineContainer && spineSection) {
          renderSpineOptions(data.options, spineContainer, function (option) {
            createStoryWithSpine(option);
          });
          spineSection.style.display = 'block';
          if (regenerateSpineBtn) regenerateSpineBtn.style.display = 'inline-block';
          spineSection.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (error) {
        console.error('Spine generation error:', error);
        showFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      } finally {
        loadingProgress.stop();
        loading.style.display = 'none';
        generateSpineBtn.disabled = false;
        if (regenerateSpineBtn) regenerateSpineBtn.disabled = false;
      }
    }

    async function createStoryWithSpine(spine) {
      hideExistingError();

      generateSpineBtn.disabled = true;
      if (regenerateSpineBtn) regenerateSpineBtn.disabled = true;
      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var formValues = collectFormData();
        var conceptSpecFromFields = buildConceptSpecFromFields();
        var createBody = {
          title: formValues.title,
          characterConcept: formValues.characterConcept,
          worldbuilding: formValues.worldbuilding,
          tone: formValues.tone,
          npcs: formValues.npcs,
          startingSituation: formValues.startingSituation,
          apiKey: formValues.apiKey,
          conceptSpec: conceptSpecFromFields || undefined,
          spine: spine,
          progressId: progressId,
        };
        if (selectedKernelForStory) {
          createBody.storyKernel = selectedKernelForStory;
        }

        var response = await fetch('/stories/create-ajax', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createBody),
        });

        var data = await response.json();

        if (!response.ok || !data.success) {
          if (data.code) {
            console.error('Error code:', data.code, '| Retryable:', data.retryable);
          }
          if (data.debug) {
            console.error('Debug info:', data.debug);
          }
          throw new Error(data.error || 'Failed to create story');
        }

        window.location.assign('/play/' + data.storyId + '/briefing');
      } catch (error) {
        console.error('Story creation error:', error);
        showFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
        generateSpineBtn.disabled = false;
        if (regenerateSpineBtn) regenerateSpineBtn.disabled = false;
      } finally {
        loadingProgress.stop();
        loading.style.display = 'none';
      }
    }

    var storedApiKey = getApiKey();
    var apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput && storedApiKey && typeof apiKeyInput.value === 'string' && apiKeyInput.value.length === 0) {
      apiKeyInput.value = storedApiKey;
    }

    if (skipConceptBtn) {
      skipConceptBtn.addEventListener('click', function (event) {
        event.preventDefault();
        selectedConceptSpec = null;
        revealManualStorySection();
      });
    }

    // Phase A: Generate Spine on button click
    generateSpineBtn.addEventListener('click', function (event) {
      event.preventDefault();
      if (!validateBeforeGeneratingSpines()) {
        return;
      }
      fetchSpineOptions();
    });

    // Regenerate button
    if (regenerateSpineBtn) {
      regenerateSpineBtn.addEventListener('click', function (event) {
        event.preventDefault();
        if (spineContainer) clearSpineOptions(spineContainer);
        clearSelectedSpine();
        fetchSpineOptions();
      });
    }

    // Prevent default form submit (no longer a submit button)
    form.addEventListener('submit', function (event) {
      event.preventDefault();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPlayPage();
    initNewStoryPage();
    initBriefingPage();
    initConceptsPage();
    initKernelsPage();
  });
