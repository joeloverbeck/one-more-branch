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
            + '</span>'
            + detailsHtml;

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

          initActIndicator();
          if (actChanged) {
            expandActStructureDetails();
          }
          previousActNumber = newActNumber;
        } else if (existingWrapper) {
          existingWrapper.remove();
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
    const generateSpineBtn = document.getElementById('generate-spine-btn');
    const regenerateSpineBtn = document.getElementById('regenerate-spines-btn');
    const spineContainer = document.getElementById('spine-options');
    const spineSection = document.getElementById('spine-section');
    const errorDiv = document.querySelector('.alert-error');

    if (!form || !loading || !generateSpineBtn) {
      return;
    }
    const loadingProgress = createLoadingProgressController(loading);

    initNpcControls();

    function collectFormData() {
      var formData = new FormData(form);
      var npcs = collectNpcEntries();
      return {
        title: formData.get('title'),
        characterConcept: formData.get('characterConcept'),
        worldbuilding: formData.get('worldbuilding'),
        tone: formData.get('tone'),
        npcs: npcs.length > 0 ? npcs : undefined,
        startingSituation: formData.get('startingSituation'),
        apiKey: formData.get('apiKey'),
      };
    }

    async function fetchSpineOptions() {
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }

      generateSpineBtn.disabled = true;
      if (regenerateSpineBtn) regenerateSpineBtn.disabled = true;
      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var formValues = collectFormData();
        var response = await fetch('/stories/generate-spines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterConcept: formValues.characterConcept,
            worldbuilding: formValues.worldbuilding,
            tone: formValues.tone,
            npcs: formValues.npcs,
            startingSituation: formValues.startingSituation,
            apiKey: formValues.apiKey,
            progressId: progressId,
          }),
        });

        var data = await response.json();

        if (!response.ok || !data.success) {
          if (data.code) {
            console.error('Error code:', data.code, '| Retryable:', data.retryable);
          }
          throw new Error(data.error || 'Failed to generate spine options');
        }

        setApiKey(formValues.apiKey);

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
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }

      generateSpineBtn.disabled = true;
      if (regenerateSpineBtn) regenerateSpineBtn.disabled = true;
      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var formValues = collectFormData();
        var response = await fetch('/stories/create-ajax', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formValues.title,
            characterConcept: formValues.characterConcept,
            worldbuilding: formValues.worldbuilding,
            tone: formValues.tone,
            npcs: formValues.npcs,
            startingSituation: formValues.startingSituation,
            apiKey: formValues.apiKey,
            spine: spine,
            progressId: progressId,
          }),
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

    // Phase A: Generate Spine on button click
    generateSpineBtn.addEventListener('click', function (event) {
      event.preventDefault();
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
  });
