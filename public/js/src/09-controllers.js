// ── Controllers ───────────────────────────────────────────────────

function buildInsightsContext(playStructureInfo, sceneSummary, resolvedThreadMeta, resolvedPromiseMeta) {
  return {
    playStructureInfo: playStructureInfo || null,
    sceneSummary: sceneSummary || null,
    resolvedThreadMeta: resolvedThreadMeta || {},
    resolvedPromiseMeta: resolvedPromiseMeta || {},
  };
}

function buildPlayStructureFieldHtml(label, text) {
  if (!text) {
    return '';
  }

  return (
    '<div class="play-structure-details__item">' +
    '<span class="play-structure-details__label">' +
    escapeHtml(label) +
    '</span>' +
    '<span class="play-structure-details__text">' +
    escapeHtml(text) +
    '</span>' +
    '</div>'
  );
}

function buildPlayStructureSummaryPillHtml(label, text, extraClass) {
  if (!text) {
    return '';
  }

  return (
    '<span class="play-structure-summary__pill ' +
    extraClass +
    '">' +
    '<span class="play-structure-summary__label">' +
    escapeHtml(label) +
    '</span>' +
    '<span class="play-structure-summary__text">' +
    escapeHtml(text) +
    '</span>' +
    '</span>'
  );
}

function buildPlayStructureStaticCardHtml(eyebrow, title, extraClass) {
  return (
    '<section class="play-structure-card play-structure-card--static ' +
    extraClass +
    '">' +
    '<div class="play-structure-card__eyebrow">' +
    escapeHtml(eyebrow) +
    '</div>' +
    '<div class="play-structure-card__title">' +
    escapeHtml(title) +
    '</div>' +
    '</section>'
  );
}

function buildPlayStructureAccordionCardHtml(eyebrow, title, fields, extraClass) {
  if (!fields) {
    return buildPlayStructureStaticCardHtml(eyebrow, title, extraClass);
  }

  return (
    '<details class="play-structure-card play-structure-card--accordion ' +
    extraClass +
    '">' +
    '<summary class="play-structure-card__summary">' +
    '<div class="play-structure-card__summary-main">' +
    '<div class="play-structure-card__eyebrow">' +
    escapeHtml(eyebrow) +
    '</div>' +
    '<div class="play-structure-card__title">' +
    escapeHtml(title) +
    '</div>' +
    '</div>' +
    '<span class="play-structure-card__toggle-hint">Details</span>' +
    '</summary>' +
    '<div class="play-structure-card__body">' +
    fields +
    '</div>' +
    '</details>'
  );
}

function buildPlayStructureDetailsHtml(playStructureInfo, options) {
  if (!playStructureInfo || !playStructureInfo.pageStructure || !playStructureInfo.nextStructureTarget) {
    return '';
  }

  var pageStructure = playStructureInfo.pageStructure;
  var nextStructureTarget = playStructureInfo.nextStructureTarget;
  var actArc = nextStructureTarget || pageStructure;
  var isExpanded = Boolean(options && options.expanded);

  var nextFields =
    buildPlayStructureFieldHtml('Milestone Objective', nextStructureTarget.milestoneObjective) +
    buildPlayStructureFieldHtml(
      'Milestone Exit Criteria',
      nextStructureTarget.milestoneExitCriteria
    );

  var actFields =
    buildPlayStructureFieldHtml('Act Objective', actArc.actObjective) +
    buildPlayStructureFieldHtml('Stakes', actArc.actStakes) +
    buildPlayStructureFieldHtml('Act Question', actArc.actQuestion) +
    buildPlayStructureFieldHtml('Act-End Reversal', actArc.actEndReversal);

  var summaryPills =
    buildPlayStructureSummaryPillHtml(
      'This Page',
      pageStructure.milestoneName || pageStructure.displayString,
      'play-structure-summary__pill--page'
    ) +
    buildPlayStructureSummaryPillHtml(
      'Next Objective',
      nextStructureTarget.milestoneName || nextStructureTarget.displayString,
      'play-structure-summary__pill--target'
    ) +
    buildPlayStructureSummaryPillHtml(
      'Act Arc',
      'Act ' + actArc.actNumber + ': ' + (actArc.actName || ''),
      'play-structure-summary__pill--act'
    );

  var cards =
    buildPlayStructureStaticCardHtml(
      'This Page',
      pageStructure.displayString,
      'play-structure-card--page'
    ) +
    buildPlayStructureAccordionCardHtml(
      'Next Objective',
      nextStructureTarget.displayString,
      nextFields,
      'play-structure-card--target'
    ) +
    buildPlayStructureAccordionCardHtml(
      'Act Arc',
      'Act ' + actArc.actNumber + ': ' + (actArc.actName || ''),
      actFields,
      'play-structure-card--act'
    );

  return (
    '<div class="play-structure-panel" id="play-structure-panel" data-act-number="' +
    escapeHtml(String(pageStructure.actNumber || 0)) +
    '">' +
    '<details class="play-structure-shell" id="play-structure-shell"' +
    (isExpanded ? ' open' : '') +
    '>' +
    '<summary class="act-indicator" id="act-indicator" aria-controls="play-structure-details" aria-expanded="' +
    (isExpanded ? 'true' : 'false') +
    '">' +
    '<span class="act-indicator__lead">' +
    '<span class="act-indicator__arrow" aria-hidden="true">&#x25B8;</span>' +
    '<span class="act-indicator__label">Story Compass</span>' +
    '</span>' +
    '<span class="act-indicator__current">' +
    escapeHtml(pageStructure.displayString) +
    '</span>' +
    '<span class="play-structure-summary">' +
    summaryPills +
    '</span>' +
    '</summary>' +
    '<div class="play-structure-details play-structure-details--stacked" id="play-structure-details">' +
    cards +
    '</div>' +
    '</details>' +
    '</div>'
  );
}

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
  const insightsController = createAnalystInsightsController(
    parseAnalystDataFromDom(),
    initialInsightsContext
  );
  const recapController = createRecapModalController(parseRecapDataFromDom());
  const loreController = createLoreModalController(parseLoreDataFromDom());

  if (!storyId || !narrative || !loading || !apiKeyModal) {
    return;
  }

  var initialRelPanel = document.getElementById('npc-relationships-panel');
  if (initialRelPanel) {
    bindNpcRelationshipCardToggles(initialRelPanel);
  }

  var initialAgendaPanel = document.getElementById('npc-agendas-panel');
  if (initialAgendaPanel) {
    bindNpcAgendaCardToggles(initialAgendaPanel);
  }

  var initialKnowledgePanel = document.getElementById('knowledge-state-panel');
  if (initialKnowledgePanel) {
    bindKnowledgeStateCardToggles(initialKnowledgePanel);
  }

  var previousActNumber = null;
  var initialStructurePanel = document.getElementById('play-structure-panel');
  if (initialStructurePanel) {
    previousActNumber = Number(initialStructurePanel.dataset.actNumber || '0') || null;
    if (previousActNumber === 0) {
      previousActNumber = null;
    }
  }
  initActIndicator();

  const hasChoicesUi = choicesSection instanceof HTMLElement && choices instanceof HTMLElement;
  const loadingProgress = createLoadingProgressController(loading);
  var ideationCtrl = createSceneIdeationController(storyId, loading, loadingProgress);

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
    if (!choicesSection) {
      return;
    }
    const allButtons = choicesSection.querySelectorAll('.choice-btn');
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
      body: JSON.stringify({
        pageId: currentPageId,
        choiceText: text,
        choiceType: choiceType,
        primaryDelta: primaryDelta,
      }),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) {
            throw new Error(data.error || 'Failed to add custom choice');
          }
          return data;
        });
      })
      .then(function (data) {
        rebuildChoicesSection(
          data.choices,
          getProtagonistGuidanceValues(),
          choices,
          choicesSection,
          bindCustomChoiceEvents
        );
      })
      .catch(function (error) {
        showPlayError(
          error instanceof Error ? error.message : 'Failed to add custom choice',
          choicesSection
        );
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
      input.addEventListener('keydown', function (e) {
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

  bindPacingRewriteButton(storyId, currentPageId, loading, loadingProgress, ensureApiKey);

  async function proceedWithChoice(apiKey, choiceIndex, protagonistGuidance, selectedDirection) {
    loading.style.display = 'flex';
    var ideationWrapper = choicesSection.querySelector('.scene-ideation-wrapper');
    if (ideationWrapper) {
      ideationWrapper.remove();
    }
    var body = {
      pageId: currentPageId,
      choiceIndex: choiceIndex,
      progressId: createProgressId(),
    };
    if (protagonistGuidance && Object.keys(protagonistGuidance).length > 0) {
      body.protagonistGuidance = protagonistGuidance;
    }
    if (selectedDirection) {
      body.selectedSceneDirection = selectedDirection;
    }
    if (apiKey) {
      body.apiKey = apiKey;
    }
    loadingProgress.start(body.progressId);

    try {
      var response = await fetch('/play/' + storyId + '/choice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      var data = await response.json();

      if (!response.ok) {
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

      handleChoiceSuccess(data);
    } catch (error) {
      console.error('Error:', error);
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
  }

  function handleChoiceSuccess(data) {
    insightsController.update(
      data.page.analystResult,
      buildInsightsContext(
        data.playStructureInfo,
        data.page.sceneSummary,
        data.page.resolvedThreadMeta,
        data.page.resolvedPromiseMeta
      )
    );
    recapController.update(data.recapSummaries || []);

    currentPageId = data.page.id;
    container.dataset.pageId = String(currentPageId);

    history.pushState({}, '', '/play/' + storyId + '?page=' + currentPageId);

    narrative.innerHTML =
      '<div class="narrative-text">' +
      escapeHtmlWithBreaks(data.page.narrativeText || '') +
      '</div>';
    var leftSidebarContainer = ensureLeftSidebarContainer();
    renderAffectPanel(data.page.protagonistAffect, leftSidebarContainer);
    renderNpcRelationshipsPanel(data.page.npcRelationships, leftSidebarContainer);
    renderNpcAgendasPanel(data.page.npcAgendas, leftSidebarContainer);
    renderKnowledgeStatePanel(data.page.knowledgeState, leftSidebarContainer);
    renderInventoryPanel(
      data.page.inventory,
      data.page.inventoryOverflowSummary,
      leftSidebarContainer
    );
    renderHealthPanel(data.page.health, data.page.healthOverflowSummary, leftSidebarContainer);
    cleanupEmptyLeftSidebar();
    loreController.update(data.globalCanon || [], data.globalCharacterCanon || {});
    var sidebarContainer = ensureSidebarContainer();
    renderOpenThreadsPanel(
      data.page.openThreads,
      data.page.openThreadOverflowSummary,
      sidebarContainer
    );
    renderActiveThreatsPanel(
      data.page.activeThreats,
      data.page.threatsOverflowSummary,
      sidebarContainer
    );
    renderActiveConstraintsPanel(
      data.page.activeConstraints,
      data.page.constraintsOverflowSummary,
      sidebarContainer
    );
    renderTrackedPromisesPanel(
      data.page.trackedPromises,
      data.page.trackedPromisesOverflowSummary,
      sidebarContainer
    );
    cleanupEmptySidebar();
    renderStateChanges(data.page.stateChanges, narrative);
    renderMilestoneBanner(data.milestoneInfo, narrative);
    renderDeviationBanner(data.deviationInfo, choicesSection);

    var pageIndicator = document.querySelector('.page-indicator');
    if (pageIndicator) {
      pageIndicator.textContent = 'Page ' + currentPageId;
    }

    // Update act indicator based on response
    var pageStructure = data.playStructureInfo ? data.playStructureInfo.pageStructure : null;
    if (pageStructure) {
      var newActNumber = pageStructure.actNumber;
      var actChanged = previousActNumber !== null && newActNumber !== previousActNumber;
      var existingPanel = document.getElementById('play-structure-panel');
      var existingShell = document.getElementById('play-structure-shell');
      var shouldExpandStructure = Boolean(existingShell && existingShell.open) || actChanged;
      var detailsHtml = buildPlayStructureDetailsHtml(data.playStructureInfo, {
        expanded: shouldExpandStructure,
      });

      if (existingPanel) {
        existingPanel.remove();
      }
      if (detailsHtml) {
        var storyHeader = document.getElementById('story-header');
        if (storyHeader) {
          storyHeader.insertAdjacentHTML('afterend', detailsHtml);
        }
      }

      initActIndicator();
      previousActNumber = newActNumber;
    } else {
      var orphanedPanel = document.getElementById('play-structure-panel');
      if (orphanedPanel) {
        orphanedPanel.remove();
      }
      previousActNumber = null;
    }

    if (data.page.isEnding) {
      choicesSection.innerHTML =
        '<div class="ending-banner">' +
        '<h3>THE END</h3>' +
        '<div class="ending-actions">' +
        '<a href="/play/' +
        storyId +
        '/restart" class="btn btn-primary">Play Again</a>' +
        '<a href="/" class="btn btn-secondary">Back to Stories</a>' +
        '</div></div>';
    } else {
      var guidanceForRebuild =
        data.wasGenerated === true
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

    var scrollTarget = document.getElementById('story-header') || narrative;
    if (scrollTarget) {
      scrollTarget.scrollIntoView({ behavior: 'smooth' });
    }
  }

  if (hasChoicesUi) {
    choicesSection.addEventListener('click', async (event) => {
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

      var ideationHandled = false;

      try {
        clearPlayError(choicesSection);
        const isExplored = button.dataset.explored === 'true';
        const apiKey = isExplored ? getApiKey() : await ensureApiKey();

        // Capture guidance values before any DOM swap
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

        // For unexplored choices, intercept with scene ideation
        if (!isExplored) {
          setChoicesDisabled(true);
          loading.style.display = 'flex';
          var ideationProgressId = createProgressId();
          loadingProgress.start(ideationProgressId);
          try {
            var ideationOptions = await ideationCtrl.fetchSceneOptions(
              apiKey,
              'continuation',
              currentPageId,
              choiceIndex,
              protagonistGuidance,
              ideationProgressId
            );
            loadingProgress.stop();
            loading.style.display = 'none';

            var selectedDirection = await new Promise(function (resolveIdeation) {
              ideationCtrl.renderIdeationUI(
                choicesSection,
                ideationOptions,
                function onConfirm(dir) {
                  resolveIdeation(dir);
                },
                function onRegenerate() {
                  loading.style.display = 'flex';
                  var regenProgressId = createProgressId();
                  loadingProgress.start(regenProgressId);
                  ideationCtrl
                    .fetchSceneOptions(
                      apiKey,
                      'continuation',
                      currentPageId,
                      choiceIndex,
                      protagonistGuidance,
                      regenProgressId
                    )
                    .then(function (newOptions) {
                      loadingProgress.stop();
                      loading.style.display = 'none';
                      ideationCtrl.renderIdeationUI(
                        choicesSection,
                        newOptions,
                        function onConfirm2(dir) {
                          resolveIdeation(dir);
                        },
                        function () {
                          /* nested regenerate handled by UI re-render */
                        }
                      );
                    })
                    .catch(function (err) {
                      loadingProgress.stop();
                      loading.style.display = 'none';
                      showPlayError(
                        err instanceof Error ? err.message : 'Regeneration failed',
                        choicesSection
                      );
                    });
                }
              );
            });

            // Mark ideation as handled so the finally block does not interfere
            // with proceedWithChoice's own loading/cleanup lifecycle
            ideationHandled = true;
            await proceedWithChoice(apiKey, choiceIndex, protagonistGuidance, selectedDirection);
            return;
          } catch (ideationErr) {
            loadingProgress.stop();
            if (!ideationHandled) {
              loading.style.display = 'none';
              setChoicesDisabled(false);
            }
            showPlayError(
              ideationErr instanceof Error ? ideationErr.message : 'Scene ideation failed',
              choicesSection
            );
            return;
          }
        }

        // Explored choice - skip ideation, go directly
        setChoicesDisabled(true);
        loading.style.display = 'flex';

        const body = {
          pageId: currentPageId,
          choiceIndex,
          progressId: createProgressId(),
        };
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

        handleChoiceSuccess(data);
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
        if (!ideationHandled) {
          loadingProgress.stop();
          loading.style.display = 'none';
        }
      }
    });
  }

  window.addEventListener('popstate', () => {
    location.reload();
  });
}


document.addEventListener('DOMContentLoaded', () => {
  initPlayPage();
  initBriefingPage();
  initConceptsPage();
  initConceptSeedsPage();
  initKernelsPage();
  initEvolutionPage();
  initKernelEvolutionPage();
  initCharacterWebsPage();
  initCharactersPage();
  initCharacterBrainstormerPage();
  initSpinesPage();
  initCreateStoryPage();
});
