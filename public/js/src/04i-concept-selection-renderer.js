// ── Concept Selection Renderer ─────────────────────────────────────

function buildSelectionFieldHtml(label, value, fieldKey, source, fieldType) {
  return '<div class="spine-field" data-field-key="' + fieldKey + '" data-field-source="' + source + '" data-field-type="' + fieldType + '">' +
    '<span class="spine-label">' + label + ':</span> ' +
    '<span class="concept-field-value">' + escapeHtml(fieldType === 'enum' ? formatConceptLabel(value) : value) + '</span>' +
    '</div>';
}

function buildSelectionListFieldHtml(label, items, fieldKey, source) {
  return '<div class="spine-field" data-field-key="' + fieldKey + '" data-field-source="' + source + '" data-field-type="list">' +
    '<span class="spine-label">' + label + ':</span>' +
    '<span class="concept-field-value"><ul>' + renderListItems(items) + '</ul></span>' +
    '</div>';
}

function renderConceptSelectionCards(seeds, characterWorlds, container, onFieldEdit) {
  if (!container) return;
  container.innerHTML = '';

  if (!Array.isArray(seeds) || seeds.length === 0) {
    container.innerHTML = '<p class="spine-section-subtitle">No concepts to select.</p>';
    return;
  }

  seeds.forEach(function (seed, index) {
    var cw = characterWorlds[index] || {};
    var card = document.createElement('article');
    card.className = 'spine-card concept-card concept-selection-card';
    card.dataset.selectionIndex = String(index);

    var conflictTypeBadge = seed.conflictType
      ? '<span class="spine-badge spine-badge-conflict" data-badge-field="conflictType">' + escapeHtml(formatConceptLabel(seed.conflictType)) + '</span>'
      : '';
    var settingScaleBadge = cw.settingScale
      ? '<span class="spine-badge spine-badge-type" data-badge-field="settingScale">' + escapeHtml(formatConceptLabel(cw.settingScale)) + '</span>'
      : '';

    // Toggle column
    var html =
      '<div class="concept-selection-card__toggle">' +
        '<label class="concept-selection-label">' +
          '<input type="checkbox" class="concept-selection-checkbox" data-selection-index="' + index + '" checked>' +
          '<span class="concept-selection-checkmark"></span>' +
        '</label>' +
      '</div>' +
      '<div class="concept-selection-card__body">';

    // ── Header zone (click = toggle selection) ──
    html +=
      '<div class="concept-selection-card__header">' +
        '<div class="spine-badges">' +
          '<span class="spine-badge spine-badge-type" data-badge-field="genreFrame">' + escapeHtml(formatConceptLabel(seed.genreFrame)) + '</span>' +
          '<span class="spine-badge spine-badge-conflict" data-badge-field="conflictAxis">' + escapeHtml(formatConceptLabel(seed.conflictAxis)) + '</span>' +
          conflictTypeBadge +
          settingScaleBadge +
        '</div>' +
        '<h3 class="spine-cdq">' + escapeHtml(seed.oneLineHook || '') + '</h3>' +
      '</div>';

    // ── Fields zone (click = inline edit) ──
    html += '<div class="concept-selection-card__fields">';

    // Seed text fields
    if (seed.oneLineHook) {
      html += buildSelectionFieldHtml('One-Line Hook', seed.oneLineHook, 'oneLineHook', 'seed', 'text');
    }
    if (seed.whatIfQuestion) {
      html += buildSelectionFieldHtml('What If', seed.whatIfQuestion, 'whatIfQuestion', 'seed', 'text');
    }
    if (seed.playerFantasy) {
      html += buildSelectionFieldHtml('Player Fantasy', seed.playerFantasy, 'playerFantasy', 'seed', 'text');
    }
    if (seed.genreSubversion) {
      html += buildSelectionFieldHtml('Genre Subversion', seed.genreSubversion, 'genreSubversion', 'seed', 'text');
    }

    // Seed enum fields
    html += buildSelectionFieldHtml('Genre Frame', seed.genreFrame, 'genreFrame', 'seed', 'enum');
    html += buildSelectionFieldHtml('Conflict Axis', seed.conflictAxis, 'conflictAxis', 'seed', 'enum');
    if (seed.conflictType) {
      html += buildSelectionFieldHtml('Conflict Type', seed.conflictType, 'conflictType', 'seed', 'enum');
    }

    // Seed list fields
    if (Array.isArray(seed.actionVerbs) && seed.actionVerbs.length > 0) {
      html += buildSelectionListFieldHtml('Action Verbs', seed.actionVerbs, 'actionVerbs', 'seed');
    }

    // Character fields from architect
    if (cw.protagonistRole) {
      html += buildSelectionFieldHtml('Protagonist', cw.protagonistRole, 'protagonistRole', 'cw', 'text');
    }
    if (cw.coreCompetence) {
      html += buildSelectionFieldHtml('Core Competence', cw.coreCompetence, 'coreCompetence', 'cw', 'text');
    }
    if (cw.coreFlaw) {
      html += buildSelectionFieldHtml('Core Flaw', cw.coreFlaw, 'coreFlaw', 'cw', 'text');
    }
    if (cw.coreConflictLoop) {
      html += buildSelectionFieldHtml('Conflict Loop', cw.coreConflictLoop, 'coreConflictLoop', 'cw', 'text');
    }

    // World fields from architect
    if (Array.isArray(cw.settingAxioms) && cw.settingAxioms.length > 0) {
      html += buildSelectionListFieldHtml('Setting Axioms', cw.settingAxioms, 'settingAxioms', 'cw');
    }
    if (Array.isArray(cw.constraintSet) && cw.constraintSet.length > 0) {
      html += buildSelectionListFieldHtml('Constraints', cw.constraintSet, 'constraintSet', 'cw');
    }
    if (Array.isArray(cw.keyInstitutions) && cw.keyInstitutions.length > 0) {
      html += buildSelectionListFieldHtml('Key Institutions', cw.keyInstitutions, 'keyInstitutions', 'cw');
    }
    if (cw.settingScale) {
      html += buildSelectionFieldHtml('Setting Scale', cw.settingScale, 'settingScale', 'cw', 'enum');
    }

    html += '</div>'; // end fields
    html += '</div>'; // end body
    card.innerHTML = html;

    // ── Checkbox toggle behavior ──
    var checkbox = card.querySelector('.concept-selection-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', function () {
        if (checkbox.checked) {
          card.classList.remove('concept-selection-card--excluded');
        } else {
          card.classList.add('concept-selection-card--excluded');
        }
      });

      checkbox.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }

    // ── Header click → toggle checkbox ──
    var headerEl = card.querySelector('.concept-selection-card__header');
    if (headerEl) {
      headerEl.addEventListener('click', function (e) {
        e.stopPropagation();
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        }
      });
    }

    // ── Toggle area click → toggle checkbox ──
    var toggleEl = card.querySelector('.concept-selection-card__toggle');
    if (toggleEl) {
      toggleEl.addEventListener('click', function (e) {
        e.stopPropagation();
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        }
      });
    }

    // ── Fields area click delegation → inline editing ──
    var fieldsEl = card.querySelector('.concept-selection-card__fields');
    if (fieldsEl && typeof onFieldEdit === 'function') {
      fieldsEl.addEventListener('click', function (e) {
        e.stopPropagation();

        var target = e.target;
        if (!(target instanceof HTMLElement)) return;

        // Find the closest field value span
        var valueEl = target.closest('.concept-field-value');
        if (!valueEl) return;

        // Don't open editor if one is already active
        if (valueEl.querySelector('input, textarea, select, .concept-inline-list-editor')) return;

        var fieldDiv = valueEl.closest('.spine-field');
        if (!fieldDiv) return;

        var fieldKey = fieldDiv.dataset.fieldKey;
        var fieldSource = fieldDiv.dataset.fieldSource;
        var fieldType = fieldDiv.dataset.fieldType;
        if (!fieldKey || !fieldSource || !fieldType) return;

        function commitEdit(newValue) {
          onFieldEdit(index, fieldSource, fieldKey, newValue);
          syncBadgeIfEnum(card, fieldKey, newValue);
        }

        if (fieldType === 'enum') {
          var opts = getEnumOptionsForField(fieldKey);
          if (!opts) return;
          var currentEnum = fieldSource === 'seed' ? (seed[fieldKey] || '') : (cw[fieldKey] || '');
          createInlineSelectEditor(valueEl, currentEnum, opts, commitEdit);
        } else if (fieldType === 'list') {
          var currentList = fieldSource === 'seed'
            ? (Array.isArray(seed[fieldKey]) ? seed[fieldKey] : [])
            : (Array.isArray(cw[fieldKey]) ? cw[fieldKey] : []);
          createInlineListEditor(valueEl, currentList, commitEdit);
        } else {
          var currentText = fieldSource === 'seed' ? (seed[fieldKey] || '') : (cw[fieldKey] || '');
          createInlineTextEditor(valueEl, currentText, commitEdit);
        }
      });
    }

    container.appendChild(card);
  });
}

function syncBadgeIfEnum(card, fieldKey, newValue) {
  var badge = card.querySelector('[data-badge-field="' + fieldKey + '"]');
  if (badge) {
    badge.textContent = formatConceptLabel(newValue);
  }
}

function getSelectedConceptIndices(container) {
  if (!container) return [];
  var checkboxes = container.querySelectorAll('.concept-selection-checkbox');
  var indices = [];
  for (var i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i].checked) {
      indices.push(Number(checkboxes[i].dataset.selectionIndex));
    }
  }
  return indices;
}

function getSelectedConceptCount(container) {
  return getSelectedConceptIndices(container).length;
}

function selectAllConcepts(container) {
  if (!container) return;
  var checkboxes = container.querySelectorAll('.concept-selection-checkbox');
  for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = true;
    var card = checkboxes[i].closest('.concept-selection-card');
    if (card) card.classList.remove('concept-selection-card--excluded');
  }
}

function deselectAllConcepts(container) {
  if (!container) return;
  var checkboxes = container.querySelectorAll('.concept-selection-checkbox');
  for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = false;
    var card = checkboxes[i].closest('.concept-selection-card');
    if (card) card.classList.add('concept-selection-card--excluded');
  }
}

function updateSelectionCounter(container, counterEl, continueBtn) {
  if (!container) return;
  var total = container.querySelectorAll('.concept-selection-checkbox').length;
  var selected = getSelectedConceptCount(container);
  if (counterEl) {
    counterEl.textContent = selected + ' of ' + total + ' selected';
  }
  if (continueBtn) {
    continueBtn.disabled = selected === 0;
  }
}
