  // ── Concept Selection Renderer ─────────────────────────────────────

  function renderConceptSelectionCards(seeds, characterWorlds, container) {
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
        ? '<span class="spine-badge spine-badge-conflict">' + escapeHtml(formatConceptLabel(seed.conflictType)) + '</span>'
        : '';

      var html =
        '<div class="concept-selection-card__toggle">' +
          '<label class="concept-selection-label">' +
            '<input type="checkbox" class="concept-selection-checkbox" data-selection-index="' + index + '" checked>' +
            '<span class="concept-selection-checkmark"></span>' +
          '</label>' +
        '</div>' +
        '<div class="concept-selection-card__body">' +
          '<div class="spine-badges">' +
            '<span class="spine-badge spine-badge-type">' + escapeHtml(formatConceptLabel(seed.genreFrame)) + '</span>' +
            '<span class="spine-badge spine-badge-conflict">' + escapeHtml(formatConceptLabel(seed.conflictAxis)) + '</span>' +
            conflictTypeBadge +
          '</div>' +
          '<h3 class="spine-cdq">' + escapeHtml(seed.oneLineHook || '') + '</h3>';

      // Seed identity fields
      if (seed.whatIfQuestion) {
        html += '<p class="spine-field concept-what-if"><span class="spine-label">What If:</span> <em>' + escapeHtml(seed.whatIfQuestion) + '</em></p>';
      }
      if (seed.playerFantasy) {
        html += '<p class="spine-field"><span class="spine-label">Player Fantasy:</span> <em>' + escapeHtml(seed.playerFantasy) + '</em></p>';
      }
      if (seed.genreSubversion) {
        html += '<div class="spine-field"><span class="spine-label">Genre Subversion:</span> ' + escapeHtml(seed.genreSubversion) + '</div>';
      }

      // Character fields from architect
      if (cw.protagonistRole) {
        html += '<div class="spine-field"><span class="spine-label">Protagonist:</span> ' + escapeHtml(cw.protagonistRole) + '</div>';
      }
      if (cw.coreCompetence) {
        html += '<div class="spine-field"><span class="spine-label">Core Competence:</span> ' + escapeHtml(cw.coreCompetence) + '</div>';
      }
      if (cw.coreFlaw) {
        html += '<div class="spine-field"><span class="spine-label">Core Flaw:</span> ' + escapeHtml(cw.coreFlaw) + '</div>';
      }
      if (cw.coreConflictLoop) {
        html += '<div class="spine-field"><span class="spine-label">Conflict Loop:</span> ' + escapeHtml(cw.coreConflictLoop) + '</div>';
      }

      // World fields from architect
      if (Array.isArray(cw.settingAxioms) && cw.settingAxioms.length > 0) {
        html += '<div class="spine-field"><span class="spine-label">Setting Axioms:</span><ul>' + renderListItems(cw.settingAxioms) + '</ul></div>';
      }
      if (Array.isArray(cw.constraintSet) && cw.constraintSet.length > 0) {
        html += '<div class="spine-field"><span class="spine-label">Constraints:</span><ul>' + renderListItems(cw.constraintSet) + '</ul></div>';
      }
      if (Array.isArray(cw.keyInstitutions) && cw.keyInstitutions.length > 0) {
        html += '<div class="spine-field"><span class="spine-label">Key Institutions:</span><ul>' + renderListItems(cw.keyInstitutions) + '</ul></div>';
      }
      if (cw.settingScale) {
        html += '<div class="spine-field"><span class="spine-label">Setting Scale:</span> ' + escapeHtml(formatConceptLabel(cw.settingScale)) + '</div>';
      }

      html += '</div>';
      card.innerHTML = html;

      // Toggle card visual state on checkbox change
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

      // Toggle checkbox on card click
      card.addEventListener('click', function () {
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change'));
        }
      });

      container.appendChild(card);
    });
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
