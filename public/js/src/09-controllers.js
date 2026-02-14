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
    const loreController = createLoreModalController(parseLoreDataFromDom());

    if (!storyId || !narrative || !loading || !apiKeyModal) {
      return;
    }

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
        });

        currentPageId = data.page.id;
        container.dataset.pageId = String(currentPageId);

        history.pushState({}, '', `/play/${storyId}?page=${currentPageId}`);

        narrative.innerHTML = `<div class="narrative-text">${escapeHtmlWithBreaks(data.page.narrativeText || '')}</div>`;
        var leftSidebarContainer = ensureLeftSidebarContainer();
        renderAffectPanel(data.page.protagonistAffect, leftSidebarContainer);
        renderInventoryPanel(data.page.inventory, data.page.inventoryOverflowSummary, leftSidebarContainer);
        renderHealthPanel(data.page.health, data.page.healthOverflowSummary, leftSidebarContainer);
        cleanupEmptyLeftSidebar();
        loreController.update(data.globalCanon || [], data.globalCharacterCanon || {});
        var sidebarContainer = ensureSidebarContainer();
        renderOpenThreadsPanel(data.page.openThreads, data.page.openThreadOverflowSummary, sidebarContainer);
        renderActiveThreatsPanel(data.page.activeThreats, data.page.threatsOverflowSummary, sidebarContainer);
        renderActiveConstraintsPanel(data.page.activeConstraints, data.page.constraintsOverflowSummary, sidebarContainer);
        cleanupEmptySidebar();
        renderStateChanges(data.page.stateChanges, narrative);
        renderDeviationBanner(data.deviationInfo, choicesSection);

        const pageIndicator = document.querySelector('.page-indicator');
        if (pageIndicator) {
          pageIndicator.textContent = `Page ${currentPageId}`;
        }

        // Update act indicator based on response
        const actIndicator = document.querySelector('.act-indicator');
        if (data.actDisplayInfo) {
          if (actIndicator) {
            actIndicator.textContent = data.actDisplayInfo.displayString;
          } else {
            // Create act indicator if it doesn't exist yet
            const storyTitleSection = document.querySelector('.story-title-section');
            if (storyTitleSection) {
              const newIndicator = document.createElement('span');
              newIndicator.className = 'act-indicator';
              newIndicator.textContent = data.actDisplayInfo.displayString;
              storyTitleSection.appendChild(newIndicator);
            }
          }
        } else if (actIndicator) {
          // Remove act indicator if no act info
          actIndicator.remove();
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
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    const errorDiv = document.querySelector('.alert-error');

    if (!form || !loading || !submitBtn) {
      return;
    }
    const loadingProgress = createLoadingProgressController(loading);

    initNpcControls();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (errorDiv) {
        errorDiv.style.display = 'none';
      }

      submitBtn.disabled = true;
      loading.style.display = 'flex';
      const progressId = createProgressId();
      loadingProgress.start(progressId);
      var shouldReenable = false;

      try {
        const formData = new FormData(form);
        const npcs = collectNpcEntries();
        const response = await fetch('/stories/create-ajax', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.get('title'),
            characterConcept: formData.get('characterConcept'),
            worldbuilding: formData.get('worldbuilding'),
            tone: formData.get('tone'),
            npcs: npcs.length > 0 ? npcs : undefined,
            startingSituation: formData.get('startingSituation'),
            apiKey: formData.get('apiKey'),
            progressId: progressId,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          // Log enhanced error details if available
          if (data.code) {
            console.error('Error code:', data.code, '| Retryable:', data.retryable);
          }
          if (data.debug) {
            console.error('Debug info:', data.debug);
          }
          throw new Error(data.error || 'Failed to create story');
        }

        setApiKey(formData.get('apiKey'));

        window.location.assign('/play/' + data.storyId + '/briefing');
      } catch (error) {
        console.error('Story creation error:', error);
        showFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
        shouldReenable = true;
      } finally {
        loadingProgress.stop();
        loading.style.display = 'none';
        if (shouldReenable) {
          submitBtn.disabled = false;
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initPlayPage();
    initNewStoryPage();
    initBriefingPage();
  });
