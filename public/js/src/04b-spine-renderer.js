  // ── Spine Renderer ──────────────────────────────────────────────────

  var SPINE_TYPE_LABELS = {
    QUEST: 'Quest',
    SURVIVAL: 'Survival',
    ESCAPE: 'Escape',
    REVENGE: 'Revenge',
    RESCUE: 'Rescue',
    RIVALRY: 'Rivalry',
    MYSTERY: 'Mystery',
    TEMPTATION: 'Temptation',
    TRANSFORMATION: 'Transformation',
    FORBIDDEN_LOVE: 'Forbidden Love',
    SACRIFICE: 'Sacrifice',
    FALL_FROM_GRACE: 'Fall from Grace',
    RISE_TO_POWER: 'Rise to Power',
    COMING_OF_AGE: 'Coming of Age',
    REBELLION: 'Rebellion',
  };

  var CONFLICT_TYPE_LABELS = {
    PERSON_VS_PERSON: 'Person vs Person',
    PERSON_VS_SELF: 'Person vs Self',
    PERSON_VS_SOCIETY: 'Person vs Society',
    PERSON_VS_NATURE: 'Person vs Nature',
    PERSON_VS_TECHNOLOGY: 'Person vs Technology',
    PERSON_VS_SUPERNATURAL: 'Person vs Supernatural',
    PERSON_VS_FATE: 'Person vs Fate',
  };

  var CONFLICT_AXIS_LABELS = {
    INDIVIDUAL_VS_SYSTEM: 'Individual vs System',
    TRUTH_VS_STABILITY: 'Truth vs Stability',
    DUTY_VS_DESIRE: 'Duty vs Desire',
    FREEDOM_VS_SAFETY: 'Freedom vs Safety',
    KNOWLEDGE_VS_INNOCENCE: 'Knowledge vs Innocence',
    POWER_VS_MORALITY: 'Power vs Morality',
    LOYALTY_VS_SURVIVAL: 'Loyalty vs Survival',
    IDENTITY_VS_BELONGING: 'Identity vs Belonging',
  };

  var ARC_TYPE_LABELS = {
    POSITIVE_CHANGE: 'Positive Change',
    FLAT: 'Flat Arc',
    DISILLUSIONMENT: 'Disillusionment',
    FALL: 'Fall',
    CORRUPTION: 'Corruption',
  };

  var DYNAMIC_LABELS = {
    CONVERGENT: 'Convergent',
    DIVERGENT: 'Divergent',
    SUBSTITUTIVE: 'Substitutive',
    IRRECONCILABLE: 'Irreconcilable',
  };

  var selectedSpine = null;

  function getSelectedSpine() {
    return selectedSpine;
  }

  function clearSelectedSpine() {
    selectedSpine = null;
  }

  function renderSpineOptions(options, container, onSelect) {
    container.innerHTML = '';
    selectedSpine = null;

    options.forEach(function (option, index) {
      var card = document.createElement('div');
      card.className = 'spine-card';
      card.dataset.index = String(index);

      var badges = document.createElement('div');
      badges.className = 'spine-badges';
      badges.innerHTML =
        '<span class="spine-badge spine-badge-type">' +
        escapeHtml(SPINE_TYPE_LABELS[option.storySpineType] || option.storySpineType) +
        '</span>' +
        '<span class="spine-badge spine-badge-conflict">' +
        escapeHtml(CONFLICT_AXIS_LABELS[option.conflictAxis] || option.conflictAxis || '') +
        '</span>' +
        '<span class="spine-badge spine-badge-conflict">' +
        escapeHtml(CONFLICT_TYPE_LABELS[option.conflictType] || option.conflictType) +
        '</span>' +
        '<span class="spine-badge spine-badge-arc">' +
        escapeHtml(ARC_TYPE_LABELS[option.characterArcType] || option.characterArcType) +
        '</span>';

      var cdq = document.createElement('h3');
      cdq.className = 'spine-cdq';
      cdq.textContent = option.centralDramaticQuestion;

      var needWant = document.createElement('div');
      needWant.className = 'spine-need-want';
      needWant.innerHTML =
        '<div class="spine-field">' +
        '<span class="spine-label">Need:</span> ' +
        escapeHtml(option.protagonistNeedVsWant.need) +
        '</div>' +
        '<div class="spine-field">' +
        '<span class="spine-label">Want:</span> ' +
        escapeHtml(option.protagonistNeedVsWant.want) +
        '</div>' +
        '<div class="spine-field">' +
        '<span class="spine-label">Dynamic:</span> ' +
        '<span class="spine-badge spine-badge-dynamic">' +
        escapeHtml(DYNAMIC_LABELS[option.protagonistNeedVsWant.dynamic] || option.protagonistNeedVsWant.dynamic) +
        '</span>' +
        '</div>';

      var antag = document.createElement('div');
      antag.className = 'spine-antagonist';
      antag.innerHTML =
        '<div class="spine-field">' +
        '<span class="spine-label">Opposition:</span> ' +
        escapeHtml(option.primaryAntagonisticForce.description) +
        '</div>' +
        '<div class="spine-field">' +
        '<span class="spine-label">Pressure:</span> ' +
        escapeHtml(option.primaryAntagonisticForce.pressureMechanism) +
        '</div>';

      var tone = document.createElement('div');
      tone.className = 'spine-tone';
      var toneHtml = '';
      if (option.toneFeel && option.toneFeel.length > 0) {
        toneHtml +=
          '<div class="spine-field">' +
          '<span class="spine-label">Feel:</span> ' +
          '<span class="spine-tone-pills">';
        option.toneFeel.forEach(function (kw) {
          toneHtml +=
            '<span class="spine-tone-pill spine-tone-pill-positive">' +
            escapeHtml(kw) +
            '</span>';
        });
        toneHtml += '</span></div>';
      }
      if (option.toneAvoid && option.toneAvoid.length > 0) {
        toneHtml +=
          '<div class="spine-field">' +
          '<span class="spine-label">Avoids:</span> ' +
          '<span class="spine-tone-pills">';
        option.toneAvoid.forEach(function (kw) {
          toneHtml +=
            '<span class="spine-tone-pill spine-tone-pill-negative">' +
            escapeHtml(kw) +
            '</span>';
        });
        toneHtml += '</span></div>';
      }
      tone.innerHTML = toneHtml;

      card.appendChild(badges);
      card.appendChild(cdq);
      card.appendChild(needWant);
      card.appendChild(antag);
      card.appendChild(tone);

      card.addEventListener('click', function () {
        var allCards = container.querySelectorAll('.spine-card');
        allCards.forEach(function (c) {
          c.classList.remove('spine-card-selected');
        });
        card.classList.add('spine-card-selected');
        selectedSpine = option;
        if (typeof onSelect === 'function') {
          onSelect(option);
        }
      });

      container.appendChild(card);
    });
  }

  function clearSpineOptions(container) {
    container.innerHTML = '';
    selectedSpine = null;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
