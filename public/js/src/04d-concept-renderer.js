  // ── Concept Renderer ───────────────────────────────────────────────

  var CONCEPT_SCORE_FIELDS = [
    { key: 'hookStrength', label: 'Hook' },
    { key: 'conflictEngine', label: 'Conflict' },
    { key: 'agencyBreadth', label: 'Agency' },
    { key: 'noveltyLeverage', label: 'Novelty' },
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

    if (concept && typeof concept.incitingDisruption === 'string' && concept.incitingDisruption.trim()) {
      parts +=
        '<div class="spine-field"><span class="spine-label">Inciting Disruption:</span> ' +
        escapeHtml(concept.incitingDisruption.trim()) +
        '</div>';
    }

    if (concept && typeof concept.escapeValve === 'string' && concept.escapeValve.trim()) {
      parts +=
        '<div class="spine-field"><span class="spine-label">Escape Valve:</span> ' +
        escapeHtml(concept.escapeValve.trim()) +
        '</div>';
    }

    return parts;
  }

  function renderVerificationSection(verification) {
    if (!verification || typeof verification !== 'object') {
      return '';
    }

    var html = '<div class="concept-verification-section" style="margin-top: 0.75rem; border-top: 1px solid var(--border-subtle, #333); padding-top: 0.75rem;">';
    html += '<div class="spine-label" style="margin-bottom: 0.5rem; font-weight: 600;">Verification</div>';

    if (verification.signatureScenario) {
      html +=
        '<div class="spine-field"><span class="spine-label">Signature Scenario:</span> ' +
        escapeHtml(verification.signatureScenario) +
        '</div>';
    }

    if (verification.logline) {
      var compBadge = typeof verification.loglineCompressible === 'boolean'
        ? (verification.loglineCompressible
          ? ' <span class="spine-badge spine-badge-pass" style="font-size: 0.75rem;">PASS</span>'
          : ' <span class="spine-badge spine-badge-fail" style="font-size: 0.75rem;">FAIL</span>')
        : '';
      html +=
        '<div class="spine-field"><span class="spine-label">Logline:</span> <em>' +
        escapeHtml(verification.logline) +
        '</em>' + compBadge + '</div>';
    }

    if (verification.inevitabilityStatement) {
      html +=
        '<div class="spine-field"><span class="spine-label">Inevitability:</span> ' +
        escapeHtml(verification.inevitabilityStatement) +
        '</div>';
    }

    var premisePromises = Array.isArray(verification.premisePromises) ? verification.premisePromises : [];
    if (premisePromises.length > 0) {
      html +=
        '<div class="spine-field"><span class="spine-label">Premise Promises:</span>' +
        '<ul style="margin: 0.25rem 0 0 1.25rem; padding: 0;">' +
        renderListItems(premisePromises) +
        '</ul></div>';
    }

    var integrityScore = Number(verification.conceptIntegrityScore);
    if (Number.isFinite(integrityScore)) {
      var safeScore = Math.max(0, Math.min(100, Math.round(integrityScore)));
      html +=
        '<div class="spine-field"><span class="spine-label">Integrity Score:</span> ' +
        escapeHtml(String(safeScore)) +
        '/100</div>';
    }

    var setpieces = Array.isArray(verification.escalatingSetpieces) ? verification.escalatingSetpieces : [];
    if (setpieces.length > 0) {
      html +=
        '<div class="spine-field"><span class="spine-label">Escalating Setpieces:</span>' +
        '<ol style="margin: 0.25rem 0 0 1.25rem; padding: 0;">';
      setpieces.forEach(function (sp) {
        html += '<li>' + escapeHtml(String(sp)) + '</li>';
      });
      html += '</ol></div>';
    }

    var causalLinks = Array.isArray(verification.setpieceCausalLinks) ? verification.setpieceCausalLinks : [];
    if (causalLinks.length > 0) {
      var chainBadge = typeof verification.setpieceCausalChainBroken === 'boolean'
        ? (verification.setpieceCausalChainBroken
          ? ' <span class="spine-badge spine-badge-fail" style="font-size: 0.75rem;">BROKEN</span>'
          : ' <span class="spine-badge spine-badge-pass" style="font-size: 0.75rem;">PASS</span>')
        : '';
      html +=
        '<div class="spine-field"><span class="spine-label">Causal Links:</span>' + chainBadge +
        '<ol style="margin: 0.25rem 0 0 1.25rem; padding: 0;">';
      causalLinks.forEach(function (link) {
        html += '<li>' + escapeHtml(String(link)) + '</li>';
      });
      html += '</ol></div>';
    }

    var lbc = verification.loadBearingCheck;
    if (lbc && typeof lbc === 'object') {
      var passFail = typeof lbc.passes === 'boolean'
        ? (lbc.passes
          ? '<span class="spine-badge spine-badge-pass" style="font-size: 0.75rem;">PASS</span>'
          : '<span class="spine-badge spine-badge-fail" style="font-size: 0.75rem;">GENERIC RISK</span>')
        : '';
      html +=
        '<div class="spine-field"><span class="spine-label">Load-Bearing Check:</span> ' + passFail + '</div>';
      if (lbc.reasoning) {
        html +=
          '<div class="spine-field" style="margin-left: 0.5rem;"><span class="spine-label">Reasoning:</span> ' +
          escapeHtml(lbc.reasoning) +
          '</div>';
      }
      if (lbc.genericCollapse) {
        html +=
          '<div class="spine-field" style="margin-left: 0.5rem;"><span class="spine-label">Generic Collapse:</span> ' +
          escapeHtml(lbc.genericCollapse) +
          '</div>';
      }
    }

    var kfc = verification.kernelFidelityCheck;
    if (kfc && typeof kfc === 'object') {
      var kfcBadge = typeof kfc.passes === 'boolean'
        ? (kfc.passes
          ? '<span class="spine-badge spine-badge-pass" style="font-size: 0.75rem;">PASS</span>'
          : '<span class="spine-badge spine-badge-fail" style="font-size: 0.75rem;">FAIL</span>')
        : '';
      html +=
        '<div class="spine-field"><span class="spine-label">Kernel Fidelity Check:</span> ' + kfcBadge + '</div>';
      if (kfc.reasoning) {
        html +=
          '<div class="spine-field" style="margin-left: 0.5rem;"><span class="spine-label">Reasoning:</span> ' +
          escapeHtml(kfc.reasoning) +
          '</div>';
      }
      if (kfc.kernelDrift) {
        html +=
          '<div class="spine-field" style="margin-left: 0.5rem;"><span class="spine-label">Kernel Drift:</span> ' +
          escapeHtml(kfc.kernelDrift) +
          '</div>';
      }
    }

    html += '</div>';
    return html;
  }

  function renderStressTestSection(stressTestResult) {
    if (!stressTestResult || typeof stressTestResult !== 'object') {
      return '';
    }

    var driftRisks = Array.isArray(stressTestResult.driftRisks) ? stressTestResult.driftRisks : [];
    var playerBreaks = Array.isArray(stressTestResult.playerBreaks) ? stressTestResult.playerBreaks : [];

    if (driftRisks.length === 0 && playerBreaks.length === 0) {
      return '';
    }

    var html = '<div class="concept-verification-section" style="margin-top: 0.75rem; border-top: 1px solid var(--border-subtle, #333); padding-top: 0.75rem;">';
    html += '<div class="spine-label" style="margin-bottom: 0.5rem; font-weight: 600;">Stress Test Results</div>';

    if (driftRisks.length > 0) {
      html += '<div class="spine-field"><span class="spine-label">Drift Risks:</span></div>';
      driftRisks.forEach(function (dr) {
        var typeBadge = dr.mitigationType
          ? ' <span class="spine-badge spine-badge-type" style="font-size: 0.75rem;">' + escapeHtml(formatConceptLabel(dr.mitigationType)) + '</span>'
          : '';
        html +=
          '<div class="spine-field" style="margin-left: 0.5rem; margin-bottom: 0.5rem;">' +
            '<div><span class="spine-label">Risk:</span> ' + escapeHtml(String(dr.risk || '')) + '</div>' +
            '<div><span class="spine-label">Mitigation:</span> ' + escapeHtml(String(dr.mitigation || '')) + typeBadge + '</div>' +
          '</div>';
      });
    }

    if (playerBreaks.length > 0) {
      html += '<div class="spine-field"><span class="spine-label">Player Breaks:</span></div>';
      playerBreaks.forEach(function (pb) {
        html +=
          '<div class="spine-field" style="margin-left: 0.5rem; margin-bottom: 0.5rem;">' +
            '<div><span class="spine-label">Scenario:</span> ' + escapeHtml(String(pb.scenario || '')) + '</div>' +
            '<div><span class="spine-label">Handling:</span> ' + escapeHtml(String(pb.handling || '')) + '</div>' +
            '<div><span class="spine-label">Constraint Used:</span> ' + escapeHtml(String(pb.constraintUsed || '')) + '</div>' +
          '</div>';
      });
    }

    html += '</div>';
    return html;
  }

  function renderConceptCardBody(entry, options) {
    var concept = entry && entry.concept ? entry.concept : {};
    var includeSelectionToggle = !options || options.includeSelectionToggle !== false;
    var index = options && Number.isFinite(options.index) ? options.index : 0;

    var overallScore = Number(entry && entry.overallScore);
    var safeOverall = Number.isFinite(overallScore) ? Math.max(0, Math.min(100, overallScore)) : 0;

    var passBadge = entry && typeof entry.passes === 'boolean'
      ? '<span class="spine-badge ' + (entry.passes ? 'spine-badge-pass' : 'spine-badge-fail') + '">' + (entry.passes ? 'PASS' : 'FAIL') + '</span>'
      : '';

    var conflictTypeBadge = concept.conflictType
      ? '<span class="spine-badge spine-badge-conflict">' + escapeHtml(formatConceptLabel(concept.conflictType)) + '</span>'
      : '';
    var settingScaleBadge = concept.settingScale
      ? '<span class="spine-badge spine-badge-type">' + escapeHtml(formatConceptLabel(concept.settingScale)) + '</span>'
      : '';

    var html =
      '<div class="spine-badges">' +
        '<span class="spine-badge spine-badge-type">' + escapeHtml(formatConceptLabel(concept.genreFrame)) + '</span>' +
        '<span class="spine-badge spine-badge-conflict">' + escapeHtml(formatConceptLabel(concept.conflictAxis)) + '</span>' +
        conflictTypeBadge +
        settingScaleBadge +
        '<span class="spine-badge spine-badge-arc">Score ' + escapeHtml(Math.round(safeOverall).toString()) + '</span>' +
        passBadge +
      '</div>' +
      '<h3 class="spine-cdq">' + escapeHtml(concept.oneLineHook || '') + '</h3>' +
      '<p class="spine-field">' + escapeHtml(concept.elevatorParagraph || '') + '</p>' +
      '<div class="spine-field"><span class="spine-label">Protagonist:</span> ' + escapeHtml(concept.protagonistRole || '') + '</div>';

    if (concept.coreCompetence) {
      html += '<div class="spine-field"><span class="spine-label">Core Competence:</span> ' + escapeHtml(concept.coreCompetence) + '</div>';
    }
    if (concept.coreFlaw) {
      html += '<div class="spine-field"><span class="spine-label">Core Flaw:</span> ' + escapeHtml(concept.coreFlaw) + '</div>';
    }
    if (concept.coreConflictLoop) {
      html += '<div class="spine-field"><span class="spine-label">Conflict Loop:</span> ' + escapeHtml(concept.coreConflictLoop) + '</div>';
    }
    if (concept.pressureSource) {
      html += '<div class="spine-field"><span class="spine-label">Pressure Source:</span> ' + escapeHtml(concept.pressureSource) + '</div>';
    }
    if (concept.stakesPersonal) {
      html += '<div class="spine-field"><span class="spine-label">Personal Stakes:</span> ' + escapeHtml(concept.stakesPersonal) + '</div>';
    }
    if (concept.stakesSystemic) {
      html += '<div class="spine-field"><span class="spine-label">Systemic Stakes:</span> ' + escapeHtml(concept.stakesSystemic) + '</div>';
    }
    if (concept.deadlineMechanism) {
      html += '<div class="spine-field"><span class="spine-label">Deadline Mechanism:</span> ' + escapeHtml(concept.deadlineMechanism) + '</div>';
    }
    if (concept.genreSubversion) {
      html += '<div class="spine-field"><span class="spine-label">Genre Subversion:</span> ' + escapeHtml(concept.genreSubversion) + '</div>';
    }

    html += renderConceptEnrichment(concept);

    if (Array.isArray(concept.actionVerbs) && concept.actionVerbs.length > 0) {
      html += '<div class="spine-field"><span class="spine-label">Action Verbs:</span> ' + escapeHtml(concept.actionVerbs.join(', ')) + '</div>';
    }
    if (Array.isArray(concept.settingAxioms) && concept.settingAxioms.length > 0) {
      html += '<div class="spine-field"><span class="spine-label">Setting Axioms:</span><ul>' + renderListItems(concept.settingAxioms) + '</ul></div>';
    }
    if (Array.isArray(concept.constraintSet) && concept.constraintSet.length > 0) {
      html += '<div class="spine-field"><span class="spine-label">Constraints:</span><ul>' + renderListItems(concept.constraintSet) + '</ul></div>';
    }
    if (Array.isArray(concept.keyInstitutions) && concept.keyInstitutions.length > 0) {
      html += '<div class="spine-field"><span class="spine-label">Key Institutions:</span><ul>' + renderListItems(concept.keyInstitutions) + '</ul></div>';
    }

    html +=
      '<div class="concept-scores">' + renderScoreGrid(entry && entry.scores) + '</div>' +
      '<div class="spine-field"><span class="spine-label">Tradeoff:</span> ' + escapeHtml(entry && entry.tradeoffSummary ? entry.tradeoffSummary : '') + '</div>' +
      '<div class="concept-feedback">' +
        '<div class="concept-feedback-block"><span class="spine-label">Strengths</span><ul>' + renderListItems(entry && entry.strengths) + '</ul></div>' +
        '<div class="concept-feedback-block"><span class="spine-label">Weaknesses</span><ul>' + renderListItems(entry && entry.weaknesses) + '</ul></div>' +
      '</div>';

    if (options && options.verification) {
      html += renderVerificationSection(options.verification);
    }

    if (options && options.stressTestResult) {
      html += renderStressTestSection(options.stressTestResult);
    }

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
