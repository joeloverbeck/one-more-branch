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

  function renderCustomChoiceInput(suggestedSpeechValue) {
    const safeSuggestedSpeechValue = typeof suggestedSpeechValue === 'string'
      ? suggestedSpeechValue
      : '';

    return `
        <div class="suggested-protagonist-speech-container">
          <label for="suggested-protagonist-speech-input" class="suggested-protagonist-speech-label">
            Optional: Suggested protagonist speech
          </label>
          <input
            type="text"
            id="suggested-protagonist-speech-input"
            class="suggested-protagonist-speech-input"
            placeholder="Something your protagonist might say..."
            maxlength="500"
            value="${escapeHtml(safeSuggestedSpeechValue)}"
          />
        </div>
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

  function rebuildChoicesSection(choiceList, suggestedSpeechValue, choicesEl, choicesSectionEl, bindFn) {
    choicesEl.innerHTML = renderChoiceButtons(choiceList);
    const existingSuggestedSpeech = choicesSectionEl.querySelector('.suggested-protagonist-speech-container');
    if (existingSuggestedSpeech) {
      existingSuggestedSpeech.remove();
    }
    const existingCustom = choicesSectionEl.querySelector('.custom-choice-container');
    if (existingCustom) {
      existingCustom.remove();
    }
    const existingEnums = choicesSectionEl.querySelector('.custom-choice-enums');
    if (existingEnums) {
      existingEnums.remove();
    }
    choicesEl.insertAdjacentHTML('afterend', renderCustomChoiceInput(suggestedSpeechValue));
    bindFn();
  }

