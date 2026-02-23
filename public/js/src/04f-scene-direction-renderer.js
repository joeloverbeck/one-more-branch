  // ── Scene Direction Renderer ─────────────────────────────────────

  var SCENE_PURPOSE_LABELS = {
    EXPOSITION: 'Exposition',
    INCITING_INCIDENT: 'Inciting Incident',
    RISING_COMPLICATION: 'Rising Complication',
    REVERSAL: 'Reversal',
    REVELATION: 'Revelation',
    CONFRONTATION: 'Confrontation',
    NEGOTIATION: 'Negotiation',
    INVESTIGATION: 'Investigation',
    PREPARATION: 'Preparation',
    ESCAPE: 'Escape',
    PURSUIT: 'Pursuit',
    SACRIFICE: 'Sacrifice',
    BETRAYAL: 'Betrayal',
    REUNION: 'Reunion',
    TRANSFORMATION: 'Transformation',
    CLIMACTIC_CHOICE: 'Climactic Choice',
    AFTERMATH: 'Aftermath',
  };

  var VALUE_POLARITY_SHIFT_LABELS = {
    POSITIVE_TO_NEGATIVE: 'Positive \u2192 Negative',
    NEGATIVE_TO_POSITIVE: 'Negative \u2192 Positive',
    POSITIVE_TO_DOUBLE_NEGATIVE: 'Positive \u2192 Double Negative',
    NEGATIVE_TO_DOUBLE_POSITIVE: 'Negative \u2192 Double Positive',
    IRONIC_SHIFT: 'Ironic Shift',
  };

  var PACING_MODE_LABELS = {
    ACCELERATING: 'Accelerating',
    DECELERATING: 'Decelerating',
    SUSTAINED_HIGH: 'Sustained High',
    OSCILLATING: 'Oscillating',
    BUILDING_SLOW: 'Building Slow',
  };

  var selectedSceneDirection = null;

  function getSelectedSceneDirection() {
    return selectedSceneDirection;
  }

  function clearSelectedSceneDirection() {
    selectedSceneDirection = null;
  }

  function captureSceneDirectionEdits(container) {
    if (!selectedSceneDirection || !container) {
      return selectedSceneDirection;
    }

    var selectedCard = container.querySelector('.scene-direction-card-selected');
    if (!selectedCard) {
      return selectedSceneDirection;
    }

    var directionTextarea = selectedCard.querySelector('.scene-direction-text');
    var justificationTextarea = selectedCard.querySelector('.scene-direction-justification');

    var editedDirection = directionTextarea
      ? directionTextarea.value.trim()
      : selectedSceneDirection.sceneDirection;
    var editedJustification = justificationTextarea
      ? justificationTextarea.value.trim()
      : selectedSceneDirection.dramaticJustification;

    return {
      scenePurpose: selectedSceneDirection.scenePurpose,
      valuePolarityShift: selectedSceneDirection.valuePolarityShift,
      pacingMode: selectedSceneDirection.pacingMode,
      sceneDirection: editedDirection || selectedSceneDirection.sceneDirection,
      dramaticJustification: editedJustification || selectedSceneDirection.dramaticJustification,
    };
  }

  function renderSceneDirectionOptions(options, container, onSelect) {
    container.innerHTML = '';
    selectedSceneDirection = null;

    options.forEach(function (option, index) {
      var card = document.createElement('div');
      card.className = 'scene-direction-card';
      card.dataset.index = String(index);

      var badges = document.createElement('div');
      badges.className = 'scene-direction-badges';
      badges.innerHTML =
        '<span class="scene-direction-badge scene-direction-badge-purpose">' +
        escapeHtml(SCENE_PURPOSE_LABELS[option.scenePurpose] || option.scenePurpose) +
        '</span>' +
        '<span class="scene-direction-badge scene-direction-badge-polarity">' +
        escapeHtml(VALUE_POLARITY_SHIFT_LABELS[option.valuePolarityShift] || option.valuePolarityShift) +
        '</span>' +
        '<span class="scene-direction-badge scene-direction-badge-pacing">' +
        escapeHtml(PACING_MODE_LABELS[option.pacingMode] || option.pacingMode) +
        '</span>';

      var directionSection = document.createElement('div');
      directionSection.className = 'scene-direction-field';
      directionSection.innerHTML =
        '<span class="scene-direction-label">Direction:</span>' +
        '<div class="scene-direction-text-display">' +
        escapeHtml(option.sceneDirection) +
        '</div>' +
        '<textarea class="scene-direction-text scene-direction-editable" ' +
        'style="display:none" rows="3">' +
        escapeHtml(option.sceneDirection) +
        '</textarea>';

      var justificationSection = document.createElement('div');
      justificationSection.className = 'scene-direction-field';
      justificationSection.innerHTML =
        '<span class="scene-direction-label">Justification:</span>' +
        '<div class="scene-direction-justification-display">' +
        escapeHtml(option.dramaticJustification) +
        '</div>' +
        '<textarea class="scene-direction-justification scene-direction-editable" ' +
        'style="display:none" rows="3">' +
        escapeHtml(option.dramaticJustification) +
        '</textarea>';

      card.appendChild(badges);
      card.appendChild(directionSection);
      card.appendChild(justificationSection);

      card.addEventListener('click', function () {
        var allCards = container.querySelectorAll('.scene-direction-card');
        allCards.forEach(function (c) {
          c.classList.remove('scene-direction-card-selected');
          // Hide editable fields on deselected cards
          c.querySelectorAll('.scene-direction-editable').forEach(function (el) {
            el.style.display = 'none';
          });
          c.querySelectorAll('.scene-direction-text-display, .scene-direction-justification-display')
            .forEach(function (el) {
              el.style.display = '';
            });
        });

        card.classList.add('scene-direction-card-selected');

        // Show editable fields on selected card
        card.querySelectorAll('.scene-direction-editable').forEach(function (el) {
          el.style.display = '';
        });
        card.querySelectorAll('.scene-direction-text-display, .scene-direction-justification-display')
          .forEach(function (el) {
            el.style.display = 'none';
          });

        selectedSceneDirection = option;
        if (typeof onSelect === 'function') {
          onSelect(option);
        }
      });

      container.appendChild(card);
    });
  }

  function clearSceneDirectionOptions(container) {
    container.innerHTML = '';
    selectedSceneDirection = null;
  }
