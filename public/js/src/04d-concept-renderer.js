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

  function getScoreColorClass(score) {
    if (score <= 2) return 'low';
    if (score <= 3) return 'mid';
    return 'high';
  }

  function renderScoreGrid(scores) {
    var cells = CONCEPT_SCORE_FIELDS.map(function (field) {
      var rawScore = Number(scores && scores[field.key]);
      var safeScore = Number.isFinite(rawScore) ? Math.max(0, Math.min(5, rawScore)) : 0;
      var colorClass = getScoreColorClass(safeScore);
      var fullCount = Math.floor(safeScore);
      var hasHalf = (safeScore % 1) >= 0.25;
      var pips = '';

      for (var i = 0; i < 5; i++) {
        if (i < fullCount) {
          pips += '<span class="concept-pip concept-pip--filled concept-pip--' + colorClass + '"></span>';
        } else if (i === fullCount && hasHalf) {
          pips += '<span class="concept-pip concept-pip--half concept-pip--' + colorClass + '"></span>';
        } else {
          pips += '<span class="concept-pip concept-pip--empty"></span>';
        }
      }

      return (
        '<div class="concept-score-cell">' +
          '<span class="concept-score-label">' + escapeHtml(field.label) + '</span>' +
          '<span class="concept-score-value concept-score-value--' + colorClass + '">' + safeScore.toFixed(1) + '</span>' +
          '<div class="concept-score-pips">' + pips + '</div>' +
        '</div>'
      );
    }).join('');

    return '<div class="concept-scores-grid">' + cells + '</div>';
  }

  function renderListItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '<li class="concept-list-empty">None</li>';
    }

    return items.map(function (item) {
      return '<li>' + escapeHtml(String(item)) + '</li>';
    }).join('');
  }

  function renderConceptEnrichment(concept) {
    var parts = '';

    if (concept && typeof concept.whatIfQuestion === 'string' && concept.whatIfQuestion.trim()) {
      parts +=
        '<p class="spine-field concept-what-if"><span class="spine-label">What If:</span> <em>' +
        escapeHtml(concept.whatIfQuestion.trim()) +
        '</em></p>';
    }

    if (concept && typeof concept.ironicTwist === 'string' && concept.ironicTwist.trim()) {
      parts +=
        '<div class="spine-field"><span class="spine-label">Ironic Twist:</span> ' +
        escapeHtml(concept.ironicTwist.trim()) +
        '</div>';
    }

    if (concept && typeof concept.playerFantasy === 'string' && concept.playerFantasy.trim()) {
      parts +=
        '<p class="spine-field"><span class="spine-label">Player Fantasy:</span> <em>' +
        escapeHtml(concept.playerFantasy.trim()) +
        '</em></p>';
    }

    return parts;
  }

  function renderConceptCardBody(entry, options) {
    var concept = entry && entry.concept ? entry.concept : {};
    var includeSelectionToggle = !options || options.includeSelectionToggle !== false;
    var index = options && Number.isFinite(options.index) ? options.index : 0;

    var overallScore = Number(entry && entry.overallScore);
    var safeOverall = Number.isFinite(overallScore) ? Math.max(0, Math.min(100, overallScore)) : 0;

    var html =
      '<div class="spine-badges">' +
        '<span class="spine-badge spine-badge-type">' + escapeHtml(formatConceptLabel(concept.genreFrame)) + '</span>' +
        '<span class="spine-badge spine-badge-conflict">' + escapeHtml(formatConceptLabel(concept.conflictAxis)) + '</span>' +
        '<span class="spine-badge spine-badge-arc">Score ' + escapeHtml(Math.round(safeOverall).toString()) + '</span>' +
      '</div>' +
      '<h3 class="spine-cdq">' + escapeHtml(concept.oneLineHook || '') + '</h3>' +
      '<p class="spine-field">' + escapeHtml(concept.elevatorParagraph || '') + '</p>' +
      '<div class="spine-field"><span class="spine-label">Protagonist:</span> ' + escapeHtml(concept.protagonistRole || '') + '</div>' +
      renderConceptEnrichment(concept) +
      '<div class="concept-scores">' + renderScoreGrid(entry && entry.scores) + '</div>' +
      '<div class="spine-field"><span class="spine-label">Tradeoff:</span> ' + escapeHtml(entry && entry.tradeoffSummary ? entry.tradeoffSummary : '') + '</div>' +
      '<div class="concept-feedback">' +
        '<div class="concept-feedback-block"><span class="spine-label">Strengths</span><ul>' + renderListItems(entry && entry.strengths) + '</ul></div>' +
        '<div class="concept-feedback-block"><span class="spine-label">Weaknesses</span><ul>' + renderListItems(entry && entry.weaknesses) + '</ul></div>' +
      '</div>';

    if (includeSelectionToggle) {
      html +=
        '<label class="concept-harden-toggle">' +
          '<input type="checkbox" class="concept-harden-checkbox" data-concept-index="' + index + '"> Harden this concept' +
        '</label>';
    }

    return html;
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
      var card = document.createElement('article');
      card.className = 'spine-card concept-card';
      card.dataset.index = String(index);

      card.innerHTML = renderConceptCardBody(entry, { includeSelectionToggle: true, index: index });

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
