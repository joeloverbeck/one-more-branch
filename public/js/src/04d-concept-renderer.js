  // ── Concept Renderer ───────────────────────────────────────────────

  var CONCEPT_SCORE_FIELDS = [
    { key: 'hookStrength', label: 'Hook' },
    { key: 'conflictEngine', label: 'Conflict' },
    { key: 'agencyBreadth', label: 'Agency' },
    { key: 'noveltyLeverage', label: 'Novelty' },
    { key: 'branchingFitness', label: 'Branching' },
    { key: 'llmFeasibility', label: 'Feasibility' },
  ];

  var selectedConceptIndex = -1;

  function clearSelectedConcept() {
    selectedConceptIndex = -1;
  }

  function getSelectedConceptIndex() {
    return selectedConceptIndex;
  }

  function formatConceptLabel(value) {
    return String(value || '').replace(/_/g, ' ');
  }

  function getScoreBarClass(score) {
    if (score < 3) {
      return 'concept-score-bar-fill-low';
    }
    if (score > 3) {
      return 'concept-score-bar-fill-high';
    }
    return 'concept-score-bar-fill-mid';
  }

  function renderScoreRows(scores) {
    return CONCEPT_SCORE_FIELDS.map(function (field) {
      var rawScore = Number(scores && scores[field.key]);
      var safeScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(5, rawScore)) : 0;
      var widthPct = (safeScore / 5) * 100;

      return (
        '<div class="concept-score-row">' +
          '<span class="concept-score-label">' + escapeHtml(field.label) + '</span>' +
          '<div class="concept-score-bar">' +
            '<div class="concept-score-bar-fill ' + getScoreBarClass(safeScore) + '" style="width:' + widthPct + '%"></div>' +
          '</div>' +
          '<span class="concept-score-value">' + safeScore.toFixed(1) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderListItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '<li class="concept-list-empty">None</li>';
    }

    return items.map(function (item) {
      return '<li>' + escapeHtml(String(item)) + '</li>';
    }).join('');
  }

  function renderConceptCards(evaluatedConcepts, container, onSelect) {
    if (!container) {
      return;
    }

    container.innerHTML = '';
    selectedConceptIndex = -1;

    if (!Array.isArray(evaluatedConcepts) || evaluatedConcepts.length === 0) {
      container.innerHTML = '<p class="spine-section-subtitle">No concept candidates returned. Adjust your seeds and try again.</p>';
      return;
    }

    evaluatedConcepts.forEach(function (entry, index) {
      var concept = entry && entry.concept ? entry.concept : {};
      var card = document.createElement('article');
      card.className = 'spine-card concept-card';
      card.dataset.index = String(index);

      var overallScore = Number(entry && entry.overallScore);
      var safeOverall = Number.isFinite(overallScore) ? Math.max(0, Math.min(100, overallScore)) : 0;

      card.innerHTML =
        '<div class="spine-badges">' +
          '<span class="spine-badge spine-badge-type">' + escapeHtml(formatConceptLabel(concept.genreFrame)) + '</span>' +
          '<span class="spine-badge spine-badge-conflict">' + escapeHtml(formatConceptLabel(concept.conflictAxis)) + '</span>' +
          '<span class="spine-badge spine-badge-arc">Score ' + escapeHtml(Math.round(safeOverall).toString()) + '</span>' +
        '</div>' +
        '<h3 class="spine-cdq">' + escapeHtml(concept.oneLineHook || '') + '</h3>' +
        '<p class="spine-field">' + escapeHtml(concept.elevatorParagraph || '') + '</p>' +
        '<div class="spine-field"><span class="spine-label">Protagonist:</span> ' + escapeHtml(concept.protagonistRole || '') + '</div>' +
        '<div class="concept-scores">' + renderScoreRows(entry && entry.scores) + '</div>' +
        '<div class="spine-field"><span class="spine-label">Tradeoff:</span> ' + escapeHtml(entry && entry.tradeoffSummary ? entry.tradeoffSummary : '') + '</div>' +
        '<div class="concept-feedback">' +
          '<div class="concept-feedback-block"><span class="spine-label">Strengths</span><ul>' + renderListItems(entry && entry.strengths) + '</ul></div>' +
          '<div class="concept-feedback-block"><span class="spine-label">Weaknesses</span><ul>' + renderListItems(entry && entry.weaknesses) + '</ul></div>' +
        '</div>' +
        '<label class="concept-harden-toggle">' +
          '<input type="checkbox" class="concept-harden-checkbox" data-concept-index="' + index + '"> Harden this concept' +
        '</label>';

      card.addEventListener('click', function () {
        var allCards = container.querySelectorAll('.concept-card');
        allCards.forEach(function (candidate) {
          candidate.classList.remove('spine-card-selected');
        });
        card.classList.add('spine-card-selected');
        selectedConceptIndex = index;

        if (typeof onSelect === 'function') {
          var hardenInput = card.querySelector('.concept-harden-checkbox');
          onSelect({
            evaluatedConcept: entry,
            index: index,
            hardenRequested: Boolean(hardenInput && hardenInput.checked),
          });
        }
      });

      var hardenCheckbox = card.querySelector('.concept-harden-checkbox');
      if (hardenCheckbox) {
        hardenCheckbox.addEventListener('click', function (event) {
          event.stopPropagation();
        });

        hardenCheckbox.addEventListener('change', function () {
          if (selectedConceptIndex !== index || typeof onSelect !== 'function') {
            return;
          }

          onSelect({
            evaluatedConcept: entry,
            index: index,
            hardenRequested: hardenCheckbox.checked,
          });
        });
      }

      container.appendChild(card);
    });
  }
