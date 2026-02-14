  // ── Choice renderers ──────────────────────────────────────────────

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

  function renderSelectOptions(items) {
    return items.map(function(item) {
      return '<option value="' + escapeHtml(item.value) + '">' + escapeHtml(item.label) + '</option>';
    }).join('');
  }

  function renderProtagonistGuidanceAndCustomChoice(guidanceValues) {
    const safeEmotions = typeof guidanceValues.emotions === 'string'
      ? guidanceValues.emotions
      : '';
    const safeThoughts = typeof guidanceValues.thoughts === 'string'
      ? guidanceValues.thoughts
      : '';
    const safeSpeech = typeof guidanceValues.speech === 'string'
      ? guidanceValues.speech
      : '';

    return `
        <details class="protagonist-guidance">
          <summary class="protagonist-guidance__summary">Guide Your Protagonist</summary>
          <div class="protagonist-guidance__fields">
            <div class="protagonist-guidance__field">
              <label class="protagonist-guidance__label" for="guidance-emotions">Emotions</label>
              <textarea
                id="guidance-emotions"
                class="protagonist-guidance__textarea"
                name="suggestedEmotions"
                placeholder="e.g. Furious but hiding it behind a thin smile..."
                maxlength="500"
                rows="2"
              >${escapeHtml(safeEmotions)}</textarea>
            </div>
            <div class="protagonist-guidance__field">
              <label class="protagonist-guidance__label" for="guidance-thoughts">Thoughts</label>
              <textarea
                id="guidance-thoughts"
                class="protagonist-guidance__textarea"
                name="suggestedThoughts"
                placeholder="e.g. Wondering if the stranger recognized them..."
                maxlength="500"
                rows="2"
              >${escapeHtml(safeThoughts)}</textarea>
            </div>
            <div class="protagonist-guidance__field">
              <label class="protagonist-guidance__label" for="guidance-speech">Speech</label>
              <textarea
                id="guidance-speech"
                class="protagonist-guidance__textarea"
                name="suggestedSpeech"
                placeholder="e.g. 'Wake up, Alicia! We don't have much time.'"
                maxlength="500"
                rows="2"
              >${escapeHtml(safeSpeech)}</textarea>
            </div>
          </div>
        </details>
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

  function rebuildChoicesSection(choiceList, guidanceValues, choicesEl, choicesSectionEl, bindFn) {
    choicesEl.innerHTML = renderChoiceButtons(choiceList);
    const existingGuidance = choicesSectionEl.querySelector('.protagonist-guidance');
    if (existingGuidance) {
      existingGuidance.remove();
    }
    const existingCustom = choicesSectionEl.querySelector('.custom-choice-container');
    if (existingCustom) {
      existingCustom.remove();
    }
    const existingEnums = choicesSectionEl.querySelector('.custom-choice-enums');
    if (existingEnums) {
      existingEnums.remove();
    }
    choicesEl.insertAdjacentHTML('afterend', renderProtagonistGuidanceAndCustomChoice(guidanceValues));
    bindFn();
  }
