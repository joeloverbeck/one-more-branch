/**
 * One More Branch - Client-side JavaScript
 */

(function() {
  'use strict';

  const API_KEY_STORAGE_KEY = 'omb_api_key';
  const PROGRESS_POLL_INTERVAL_MS = 1200;
  const PHRASE_ROTATION_MIN_MS = 3500;
  const PHRASE_ROTATION_MAX_MS = 4500;

  const STAGE_PHRASE_POOLS = {
    PLANNING_PAGE: [
      'Consulting the crystal flowchart...',
      'Drawing arrows between dramatic possibilities...',
      'Balancing destiny on a clipboard...',
      'Whispering to the page planner gremlins...',
      'Calling a meeting of the tiny committee in the wall...',
      'Spinning the wheel of plausible chaos...',
      'Asking the couch cushions for strategic advice...',
      'Filing a permit for emotional turbulence...',
      'Color-coding fate with suspicious confidence...',
      'Unfolding the emergency roadmap of maybes...',
      'Negotiating with the timeline using snacks...',
      'Pinning red string to absolutely everything...',
      'Rolling percentile dice for narrative nonsense...',
      'Drafting plans in invisible ink and optimism...',
      'Testing three plans and a backup plan for the backup...',
      'Summoning a brainstorming thundercloud...',
      'Aligning plot magnets to true north drama...',
      'Cross-referencing vibes with hard evidence...',
      'Sharpening pencils to a tactical point...',
      'Budgeting exactly seven units of suspense...',
    ],
    WRITING_OPENING_PAGE: [
      'Rolling out the opening scene carpet...',
      'Polishing first impressions with glitter...',
      'Cueing the cinematic entrance music...',
      'Placing the camera at maximum drama angle...',
      'Turning on the fog machine for ambience...',
      'Teaching the narrator to make eye contact...',
      'Warming up the dialogue with tongue twisters...',
      'Deploying tasteful thunder in the distance...',
      'Adjusting the spotlight to "mysterious but friendly"...',
      'Setting out fresh metaphors in a neat row...',
      'Tuning the opening line to perfect pitch...',
      'Adding one dramatic pause for seasoning...',
      'Sweeping confetti off the exposition runway...',
      'Calibrating the first sentence launch sequence...',
      'Installing mood lighting in paragraph one...',
      'Bribing the hook to land cleanly...',
      'Giving the protagonist a very determined eyebrow...',
      'Pressing record on the cinematic narrator voice...',
      'Rehearsing the first reveal with jazz hands...',
      'Opening the curtain on controlled narrative chaos...',
    ],
    WRITING_CONTINUING_PAGE: [
      'Stitching consequences into the timeline...',
      'Keeping the plot train barely on the rails...',
      'Handing the scene to the next narrator...',
      'Adding one more suspiciously perfect twist...',
      'Refueling the momentum engine with cliffhangers...',
      'Untangling side quests from the chandelier...',
      'Passing notes between cause and effect...',
      'Patching continuity leaks with narrative gum...',
      'Setting the stakes to "gently terrifying"...',
      'Rotating the mystery box for better suspense...',
      'Escorting loose ends toward responsible adulthood...',
      'Threading foreshadowing through a tiny needle...',
      'Bolting the midpoint together with dramatic screws...',
      'Checking the subplot humidity levels...',
      'Giving consequences room to breathe ominously...',
      'Synchronizing character arcs with the moon phase...',
      'Reheating tension until pleasantly unstable...',
      'Guiding the pacing with a traffic baton...',
      'Sliding the dominoes into place with tweezers...',
      'Issuing plot passports for cross-scene travel...',
    ],
    ANALYZING_SCENE: [
      'Checking the scene for narrative wobble...',
      'Comparing outcomes with the prophecy chart...',
      'Scanning for hidden cause-and-effect crumbs...',
      'Measuring tension levels with a tiny ruler...',
      'Dusting the clues for emotional fingerprints...',
      'Listening for suspiciously meaningful silence...',
      'Highlighting motifs in five shades of concern...',
      'Interrogating the subtext under bright lights...',
      'Charting who knows what on a corkboard...',
      'Running diagnostics on dramatic timing...',
      'Counting unresolved questions on both hands...',
      'Testing each beat for maximum narrative bounce...',
      'Inspecting dialogue for secret trapdoors...',
      'Triangulating intent, action, and fallout...',
      'Separating facts from very confident guesses...',
      'Scanning the room for Chekhov objects...',
      'Stress-testing the logic with a rubber hammer...',
      'Weighing emotional impact on calibrated scales...',
      'Decoding facial expressions into strategic data...',
      'Marking potential plot potholes with neon flags...',
    ],
    RESTRUCTURING_STORY: [
      'Rearranging story beams without waking dragons...',
      'Tightening bolts on the adventure skeleton...',
      'Re-threading plot cables behind the walls...',
      'Deploying emergency structure duct tape...',
      'Moving chapter furniture with narrative dollies...',
      'Replacing squeaky scenes with reinforced tension...',
      'Installing support arcs under weak spots...',
      'Rerouting character traffic to reduce pileups...',
      'Welding the midpoint to the ending frame...',
      'Stacking stakes where they can do the most damage...',
      'Refitting transitions with smoother gears...',
      'Laying fresh track for the final act train...',
      'Demolishing one wobbly beat at a safe distance...',
      'Reinforcing the foundation with consequence cement...',
      'Hoisting the payoff into load-bearing position...',
      'Rebalancing the structure for emotional wind...',
      'Rewiring callbacks to the main power grid...',
      'Swapping in a sturdier sequence of events...',
      'Labeling every moving part "fragile but important"...',
      'Running final inspections with a hard hat...',
    ],
  };

  function getApiKey() {
    return sessionStorage.getItem(API_KEY_STORAGE_KEY);
  }

  function setApiKey(key) {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
  }

  function createProgressId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    return 'progress-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function getRandomInt(minInclusive, maxInclusive) {
    return Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive;
  }

  function pickRandomPhrase(phrases, previousPhrase) {
    if (!Array.isArray(phrases) || phrases.length === 0) {
      return '';
    }

    if (phrases.length === 1) {
      return phrases[0];
    }

    var selected = phrases[getRandomInt(0, phrases.length - 1)];
    while (selected === previousPhrase) {
      selected = phrases[getRandomInt(0, phrases.length - 1)];
    }
    return selected;
  }

  function createLoadingProgressController(loadingElement) {
    var statusTextElement = loadingElement ? loadingElement.querySelector('p') : null;
    var fallbackText = statusTextElement && statusTextElement.textContent
      ? statusTextElement.textContent
      : 'Loading...';
    var stopped = true;
    var progressId = '';
    var currentStage = null;
    var currentPhrase = '';
    var pollTimeout = null;
    var phraseTimeout = null;

    function setStatusText(text) {
      if (statusTextElement) {
        statusTextElement.textContent = text;
      }
    }

    function clearTimers() {
      if (pollTimeout !== null) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
      }
      if (phraseTimeout !== null) {
        clearTimeout(phraseTimeout);
        phraseTimeout = null;
      }
    }

    function setFallbackText() {
      currentStage = null;
      currentPhrase = '';
      if (phraseTimeout !== null) {
        clearTimeout(phraseTimeout);
        phraseTimeout = null;
      }
      setStatusText(fallbackText);
    }

    function schedulePhraseRotation() {
      if (stopped || !currentStage) {
        return;
      }

      var phrases = STAGE_PHRASE_POOLS[currentStage];
      if (!Array.isArray(phrases) || phrases.length === 0) {
        return;
      }

      var delay = getRandomInt(PHRASE_ROTATION_MIN_MS, PHRASE_ROTATION_MAX_MS);
      phraseTimeout = window.setTimeout(function() {
        if (stopped || !currentStage) {
          return;
        }
        currentPhrase = pickRandomPhrase(phrases, currentPhrase);
        setStatusText(currentPhrase);
        schedulePhraseRotation();
      }, delay);
    }

    function applyStage(stage) {
      var phrases = STAGE_PHRASE_POOLS[stage];
      if (!Array.isArray(phrases) || phrases.length === 0) {
        setFallbackText();
        return;
      }

      if (currentStage !== stage) {
        currentStage = stage;
        currentPhrase = '';
        if (phraseTimeout !== null) {
          clearTimeout(phraseTimeout);
          phraseTimeout = null;
        }
      }

      currentPhrase = pickRandomPhrase(phrases, currentPhrase);
      setStatusText(currentPhrase);
      schedulePhraseRotation();
    }

    async function pollProgress() {
      if (stopped || !progressId) {
        return;
      }

      try {
        var response = await fetch('/generation-progress/' + encodeURIComponent(progressId), {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Progress polling failed');
        }

        var snapshot = await response.json();
        if (snapshot.status === 'running') {
          if (typeof snapshot.activeStage === 'string') {
            applyStage(snapshot.activeStage);
          } else {
            setFallbackText();
          }
        } else if (snapshot.status === 'unknown') {
          setFallbackText();
        } else if (snapshot.status === 'completed' || snapshot.status === 'failed') {
          stop();
          return;
        } else {
          setFallbackText();
        }
      } catch (_error) {
        setFallbackText();
      }

      if (!stopped) {
        pollTimeout = window.setTimeout(pollProgress, PROGRESS_POLL_INTERVAL_MS);
      }
    }

    function start(newProgressId) {
      stop();
      progressId = newProgressId;
      stopped = false;
      setFallbackText();
      void pollProgress();
    }

    function stop() {
      stopped = true;
      progressId = '';
      currentStage = null;
      currentPhrase = '';
      clearTimers();
      setStatusText(fallbackText);
    }

    return {
      start: start,
      stop: stop,
    };
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  }

  function escapeHtmlWithBreaks(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function enumToIconName(enumValue) {
    if (typeof enumValue !== 'string' || enumValue.length === 0) {
      return '';
    }
    return enumValue.toLowerCase().replace(/_/g, '-');
  }

  function getIconPath(enumValue) {
    var name = enumToIconName(enumValue);
    return name ? '/images/icons/' + name + '.png' : '';
  }

  function renderThreadBadgePill(threadType, urgency) {
    var threadTypeIconPath = getIconPath('thread_type_' + threadType);
    var urgencyIconPath = getIconPath('thread_urgency_' + urgency);
    var html = '<span class="thread-icon-pill" aria-hidden="true">';

    html += '<span class="thread-icon-badge thread-icon-badge--type">';
    if (threadTypeIconPath) {
      html += '<img class="thread-icon thread-icon--type"'
        + ' src="' + escapeHtml(threadTypeIconPath) + '"'
        + ' alt="" title="' + escapeHtml(threadType) + '"'
        + ' loading="lazy"'
        + " onerror=\"this.style.display='none'\">";
    }
    html += '</span>';

    html += '<span class="thread-icon-badge thread-icon-badge--urgency">';
    if (urgencyIconPath) {
      html += '<img class="thread-icon thread-icon--urgency"'
        + ' src="' + escapeHtml(urgencyIconPath) + '"'
        + ' alt="" title="' + escapeHtml(urgency) + '"'
        + ' loading="lazy"'
        + " onerror=\"this.style.display='none'\">";
    }
    html += '</span>';

    html += '</span>';
    return html;
  }

  function getOpenThreadUrgencyClass(urgency) {
    if (urgency === 'HIGH') {
      return 'open-threads-text--high';
    }
    if (urgency === 'MEDIUM') {
      return 'open-threads-text--medium';
    }
    if (urgency === 'LOW') {
      return 'open-threads-text--low';
    }
    return 'open-threads-text--low';
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

    if (!storyId || !choicesSection || !choices || !narrative || !loading || !apiKeyModal) {
      return;
    }
    const loadingProgress = createLoadingProgressController(loading);

    function getUrgencyPriority(urgency) {
      if (urgency === 'HIGH') {
        return 0;
      }
      if (urgency === 'MEDIUM') {
        return 1;
      }
      if (urgency === 'LOW') {
        return 2;
      }
      return 3;
    }

    function renderOpenThreadsPanel(openThreads) {
      const existingPanel = document.getElementById('open-threads-panel');

      if (!Array.isArray(openThreads) || openThreads.length === 0) {
        if (existingPanel) {
          existingPanel.remove();
        }
        return;
      }

      const normalizedThreads = openThreads
        .map(function(thread, index) {
          if (!thread || typeof thread !== 'object') {
            return null;
          }

          var id = typeof thread.id === 'string' ? thread.id : '';
          var text = typeof thread.text === 'string' ? thread.text : '';
          var threadType = typeof thread.threadType === 'string' ? thread.threadType : '';
          var urgency = typeof thread.urgency === 'string' ? thread.urgency : '';

          if (!id || !text || !threadType || !urgency) {
            return null;
          }

          return { id: id, text: text, threadType: threadType, urgency: urgency, index: index };
        })
        .filter(function(thread) {
          return thread !== null;
        })
        .sort(function(left, right) {
          var urgencyDelta = getUrgencyPriority(left.urgency) - getUrgencyPriority(right.urgency);
          if (urgencyDelta !== 0) {
            return urgencyDelta;
          }
          return left.index - right.index;
        });

      if (normalizedThreads.length === 0) {
        if (existingPanel) {
          existingPanel.remove();
        }
        return;
      }

      const listHtml = normalizedThreads.map(function(thread) {
        var urgencyClass = getOpenThreadUrgencyClass(thread.urgency);
        return '<li class="open-threads-item">'
          + renderThreadBadgePill(thread.threadType, thread.urgency)
          + '<span class="open-threads-text ' + urgencyClass + '">' + escapeHtml(thread.text) + '</span>'
          + '</li>';
      }).join('');

      if (existingPanel) {
        const list = existingPanel.querySelector('#open-threads-list');
        if (list) {
          list.innerHTML = listHtml;
        }
        return;
      }

      const panel = document.createElement('aside');
      panel.className = 'open-threads-panel';
      panel.id = 'open-threads-panel';
      panel.setAttribute('aria-labelledby', 'open-threads-title');
      panel.innerHTML = '<h3 class="open-threads-title" id="open-threads-title">Active Threads</h3>'
        + '<ul class="open-threads-list" id="open-threads-list">'
        + listHtml
        + '</ul>';

      narrative.before(panel);
    }

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

    function renderChoiceButtons(choiceList) {
      return choiceList.map(function(choice, index) {
        var isExplored = Boolean(choice.nextPageId);
        var choiceText = typeof choice.text === 'string' ? choice.text : '';
        var choiceType = typeof choice.choiceType === 'string' ? choice.choiceType : '';
        var primaryDelta = typeof choice.primaryDelta === 'string' ? choice.primaryDelta : '';

        var typeIconPath = getIconPath(choiceType);
        var deltaIconPath = getIconPath(primaryDelta);
        var typeLabel = CHOICE_TYPE_LABEL_MAP[choiceType] || '';
        var deltaLabel = PRIMARY_DELTA_LABEL_MAP[primaryDelta] || '';

        var pillHtml = '';
        if (typeIconPath || deltaIconPath) {
          pillHtml = '<span class="choice-icon-pill" aria-hidden="true">';
          if (typeIconPath) {
            pillHtml += '<img class="choice-icon choice-icon--type"'
              + ' src="' + escapeHtml(typeIconPath) + '"'
              + ' alt="" title="' + escapeHtml(typeLabel) + '"'
              + ' width="32" height="32" loading="lazy"'
              + " onerror=\"this.style.display='none'\">";
          }
          if (deltaIconPath) {
            pillHtml += '<img class="choice-icon choice-icon--delta"'
              + ' src="' + escapeHtml(deltaIconPath) + '"'
              + ' alt="" title="' + escapeHtml(deltaLabel) + '"'
              + ' width="32" height="32" loading="lazy"'
              + " onerror=\"this.style.display='none'\">";
          }
          pillHtml += '</span>';
        }

        return '<div class="choice-row">'
          + pillHtml
          + '<button'
          + ' class="choice-btn"'
          + ' data-choice-index="' + index + '"'
          + ' data-choice-type="' + escapeHtml(choiceType) + '"'
          + ' data-primary-delta="' + escapeHtml(primaryDelta) + '"'
          + (isExplored ? ' data-explored="true"' : '')
          + '>'
          + '<span class="choice-text">' + escapeHtml(choiceText) + '</span>'
          + '</button>'
          + (isExplored ? '<span class="explored-marker" title="Previously explored">&#8617;</span>' : '')
          + '</div>';
      }).join('');
    }

    var CHOICE_TYPES = [
      { value: 'TACTICAL_APPROACH', label: 'Method/Tactic' },
      { value: 'MORAL_DILEMMA', label: 'Moral Choice' },
      { value: 'IDENTITY_EXPRESSION', label: 'Define Yourself' },
      { value: 'RELATIONSHIP_SHIFT', label: 'Relationship' },
      { value: 'RESOURCE_COMMITMENT', label: 'Spend/Risk' },
      { value: 'INVESTIGATION', label: 'Investigate' },
      { value: 'PATH_DIVERGENCE', label: 'Change Direction' },
      { value: 'CONFRONTATION', label: 'Confront/Fight' },
      { value: 'AVOIDANCE_RETREAT', label: 'Avoid/Flee' },
    ];

    var PRIMARY_DELTAS = [
      { value: 'LOCATION_CHANGE', label: 'Location' },
      { value: 'GOAL_SHIFT', label: 'Goal' },
      { value: 'RELATIONSHIP_CHANGE', label: 'Relationship' },
      { value: 'URGENCY_CHANGE', label: 'Time Pressure' },
      { value: 'ITEM_CONTROL', label: 'Item' },
      { value: 'EXPOSURE_CHANGE', label: 'Attention' },
      { value: 'CONDITION_CHANGE', label: 'Condition' },
      { value: 'INFORMATION_REVEALED', label: 'Information' },
      { value: 'THREAT_SHIFT', label: 'Danger' },
      { value: 'CONSTRAINT_CHANGE', label: 'Limitation' },
    ];

    var CHOICE_TYPE_LABEL_MAP = {};
    CHOICE_TYPES.forEach(function(ct) { CHOICE_TYPE_LABEL_MAP[ct.value] = ct.label; });

    var PRIMARY_DELTA_LABEL_MAP = {};
    PRIMARY_DELTAS.forEach(function(pd) { PRIMARY_DELTA_LABEL_MAP[pd.value] = pd.label; });

    function renderSelectOptions(items) {
      return items.map(function(item) {
        return '<option value="' + escapeHtml(item.value) + '">' + escapeHtml(item.label) + '</option>';
      }).join('');
    }

    function renderCustomChoiceInput() {
      return `
        <div class="custom-choice-container">
          <input type="text" class="custom-choice-input"
                 placeholder="Introduce your own custom choice..."
                 maxlength="500" />
          <button type="button" class="custom-choice-btn">Add</button>
        </div>
        <div class="custom-choice-enums">
          <select class="custom-choice-type">
            ${renderSelectOptions(CHOICE_TYPES)}
          </select>
          <select class="custom-choice-delta">
            ${renderSelectOptions(PRIMARY_DELTAS)}
          </select>
        </div>
        <div class="alert alert-error play-error" id="play-error" style="display: none;" role="alert" aria-live="polite"></div>
      `;
    }

    function rebuildChoicesSection(choiceList) {
      choices.innerHTML = renderChoiceButtons(choiceList);
      const existingCustom = choicesSection.querySelector('.custom-choice-container');
      if (existingCustom) {
        existingCustom.remove();
      }
      const existingEnums = choicesSection.querySelector('.custom-choice-enums');
      if (existingEnums) {
        existingEnums.remove();
      }
      choices.insertAdjacentHTML('afterend', renderCustomChoiceInput());
      bindCustomChoiceEvents();
    }

    function setChoicesDisabled(disabled) {
      const allButtons = choices.querySelectorAll('.choice-btn');
      allButtons.forEach((button) => {
        button.disabled = disabled;
      });
    }

    function showPlayError(message) {
      var errorBlock = choicesSection.querySelector('#play-error');
      if (!errorBlock) {
        errorBlock = document.createElement('div');
        errorBlock.className = 'alert alert-error play-error';
        errorBlock.id = 'play-error';
        errorBlock.setAttribute('role', 'alert');
        errorBlock.setAttribute('aria-live', 'polite');
        const customChoiceEnums = choicesSection.querySelector('.custom-choice-enums');
        if (customChoiceEnums) {
          customChoiceEnums.insertAdjacentElement('afterend', errorBlock);
        } else {
          choicesSection.appendChild(errorBlock);
        }
      }

      errorBlock.textContent = message;
      errorBlock.style.display = 'block';
    }

    function clearPlayError() {
      var errorBlock = choicesSection.querySelector('#play-error');
      if (!errorBlock) {
        return;
      }

      errorBlock.textContent = '';
      errorBlock.style.display = 'none';
    }

    function renderStateChanges(changes) {
      let stateChangesElement = document.getElementById('state-changes');

      if (Array.isArray(changes) && changes.length > 0) {
        const items = changes.map((change) => `<li>${escapeHtml(change)}</li>`).join('');
        const stateHtml = `<h4>What happened:</h4><ul>${items}</ul>`;

        if (stateChangesElement) {
          stateChangesElement.innerHTML = stateHtml;
          stateChangesElement.style.display = 'block';
        } else {
          stateChangesElement = document.createElement('aside');
          stateChangesElement.className = 'state-changes';
          stateChangesElement.id = 'state-changes';
          stateChangesElement.innerHTML = stateHtml;
          narrative.after(stateChangesElement);
        }
      } else if (stateChangesElement) {
        stateChangesElement.style.display = 'none';
        stateChangesElement.innerHTML = '';
      }
    }

    function renderDeviationBanner(deviationInfo) {
      const existingBanner = document.getElementById('deviation-banner');
      if (existingBanner) {
        existingBanner.remove();
      }

      if (!deviationInfo || !deviationInfo.detected) {
        return;
      }

      const beatsText = deviationInfo.beatsInvalidated
        ? ` (${deviationInfo.beatsInvalidated} story beat${deviationInfo.beatsInvalidated > 1 ? 's' : ''} replanned)`
        : '';

      const banner = document.createElement('aside');
      banner.className = 'deviation-banner';
      banner.id = 'deviation-banner';
      banner.innerHTML = `
        <div class="deviation-icon">&#x1F504;</div>
        <div class="deviation-content">
          <h4>Story Path Shifted</h4>
          <p>${escapeHtml(deviationInfo.reason)}${beatsText}</p>
        </div>
      `;

      if (choicesSection) {
        choicesSection.parentNode.insertBefore(banner, choicesSection);
      }
    }

    function handleCustomChoiceSubmit() {
      const input = choicesSection.querySelector('.custom-choice-input');
      if (!input) return;

      const text = input.value.trim();
      if (!text) return;
      clearPlayError();

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
          rebuildChoicesSection(data.choices);
        })
        .catch(function(error) {
          showPlayError(error instanceof Error ? error.message : 'Failed to add custom choice');
          if (addBtn) addBtn.disabled = false;
          if (input) input.disabled = false;
        });
    }

    function bindCustomChoiceEvents() {
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

    // Bind events for the initial custom choice input rendered by the server
    bindCustomChoiceEvents();

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
        clearPlayError();
        const isExplored = button.dataset.explored === 'true';
        const apiKey = isExplored ? getApiKey() : await ensureApiKey();

        setChoicesDisabled(true);
        loading.style.display = 'flex';

        const body = {
          pageId: currentPageId,
          choiceIndex,
          progressId: createProgressId(),
        };
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

        currentPageId = data.page.id;
        container.dataset.pageId = String(currentPageId);

        history.pushState({}, '', `/play/${storyId}?page=${currentPageId}`);

        narrative.innerHTML = `<div class="narrative-text">${escapeHtmlWithBreaks(data.page.narrativeText || '')}</div>`;
        renderOpenThreadsPanel(data.page.openThreads);
        renderStateChanges(data.page.stateChanges);
        renderDeviationBanner(data.deviationInfo);

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
          rebuildChoicesSection(data.page.choices);
        }

        narrative.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Error:', error);
        // Log additional debug info if available
        if (error && typeof error === 'object' && 'debug' in error) {
          console.error('Debug info:', error.debug);
        }
        showPlayError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
        setChoicesDisabled(false);
      } finally {
        loadingProgress.stop();
        loading.style.display = 'none';
      }
    });

    window.addEventListener('popstate', () => {
      location.reload();
    });
  }

  function showFormError(message) {
    let errorDiv = document.querySelector('.alert-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-error';
      const form = document.querySelector('.story-form');
      if (form && form.parentNode) {
        form.parentNode.insertBefore(errorDiv, form);
      }
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  function collectNpcEntries() {
    var entries = document.querySelectorAll('#npc-entries .npc-entry');
    var npcs = [];
    entries.forEach(function(entry) {
      var name = entry.querySelector('.npc-entry-header strong');
      var desc = entry.querySelector('.npc-entry-description');
      if (name && desc) {
        npcs.push({ name: name.textContent, description: desc.textContent });
      }
    });
    return npcs;
  }

  function addNpcEntry(name, description) {
    var container = document.getElementById('npc-entries');
    if (!container) return;

    var entry = document.createElement('div');
    entry.className = 'npc-entry';

    var header = document.createElement('div');
    header.className = 'npc-entry-header';

    var strong = document.createElement('strong');
    strong.textContent = name;

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-small btn-danger npc-remove-btn';
    removeBtn.textContent = '\u00D7';
    removeBtn.addEventListener('click', function() {
      entry.remove();
    });

    header.appendChild(strong);
    header.appendChild(removeBtn);

    var descP = document.createElement('p');
    descP.className = 'npc-entry-description';
    descP.textContent = description;

    entry.appendChild(header);
    entry.appendChild(descP);
    container.appendChild(entry);
  }

  function initNpcControls() {
    var addBtn = document.getElementById('npc-add-btn');
    var nameInput = document.getElementById('npc-name-input');
    var descInput = document.getElementById('npc-desc-input');

    if (!addBtn || !nameInput || !descInput) return;

    addBtn.addEventListener('click', function() {
      var name = nameInput.value.trim();
      var desc = descInput.value.trim();
      if (!name || !desc) return;

      addNpcEntry(name, desc);
      nameInput.value = '';
      descInput.value = '';
      nameInput.focus();
    });

    // Bind remove buttons for server-rendered entries (validation error re-render)
    document.querySelectorAll('.npc-remove-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var entry = btn.closest('.npc-entry');
        if (entry) entry.remove();
      });
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

        window.location.href = '/play/' + data.storyId + '?page=1&newStory=true';
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
  });
})();
