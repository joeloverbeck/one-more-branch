  // ── Kernel Renderer ──────────────────────────────────────────────

  var KERNEL_SCORE_FIELDS = [
    { key: 'dramaticClarity', label: 'Clarity' },
    { key: 'thematicUniversality', label: 'Universality' },
    { key: 'generativePotential', label: 'Potential' },
    { key: 'conflictTension', label: 'Tension' },
    { key: 'emotionalDepth', label: 'Depth' },
  ];

  function formatKernelLabel(value) {
    return String(value || '').replace(/_/g, ' ');
  }

  function getDirectionBadgeClass(direction) {
    if (direction === 'NEGATIVE') return 'spine-badge-conflict';
    if (direction === 'IRONIC') return 'spine-badge-arc';
    if (direction === 'AMBIGUOUS') return 'spine-badge-type';
    return 'spine-badge-type';
  }

  function renderKernelScoreGrid(scores) {
    var cells = KERNEL_SCORE_FIELDS.map(function (field) {
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

  function renderKernelCard(evaluatedKernel, options) {
    var opts = options || {};
    var kernel = evaluatedKernel && evaluatedKernel.kernel ? evaluatedKernel.kernel : {};
    var overallScore = Number(evaluatedKernel && evaluatedKernel.overallScore);
    var safeOverall = Number.isFinite(overallScore) ? Math.max(0, Math.min(100, overallScore)) : 0;
    var direction = formatKernelLabel(kernel.directionOfChange || 'POSITIVE');
    var directionBadgeClass = getDirectionBadgeClass(kernel.directionOfChange || 'POSITIVE');

    var title = opts.mode === 'saved' && opts.kernelName
      ? opts.kernelName
      : (kernel.dramaticThesis || 'Untitled Kernel');

    var actionsHtml = '';
    if (opts.mode === 'generated') {
      actionsHtml =
        '<button type="button" class="btn btn-primary btn-small kernel-save-generated-btn" data-gen-index="' +
          escapeHtml(String(opts.index || 0)) +
        '">Save to Library</button>';
    } else if (opts.mode === 'saved') {
      actionsHtml =
        '<button type="button" class="btn btn-secondary btn-small kernel-edit-btn" data-kernel-id="' +
          escapeHtml(opts.kernelId || '') +
        '">Edit</button>' +
        '<button type="button" class="btn btn-danger btn-small kernel-delete-btn" data-kernel-id="' +
          escapeHtml(opts.kernelId || '') +
        '">Delete</button>';
    }

    var createdAtHtml = '';
    if (opts.mode === 'saved' && opts.createdAt) {
      createdAtHtml =
        '<div class="spine-field"><span class="spine-label">Created:</span> ' +
        escapeHtml(new Date(opts.createdAt).toLocaleDateString()) +
        '</div>';
    }

    var passBadge = evaluatedKernel && typeof evaluatedKernel.passes === 'boolean'
      ? '<span class="spine-badge ' + (evaluatedKernel.passes ? 'spine-badge-pass' : 'spine-badge-fail') + '">' + (evaluatedKernel.passes ? 'PASS' : 'FAIL') + '</span>'
      : '';

    return (
      '<div class="spine-badges">' +
        '<span class="spine-badge ' + directionBadgeClass + '">' + escapeHtml(direction) + '</span>' +
        '<span class="spine-badge spine-badge-arc">Score ' + escapeHtml(Math.round(safeOverall).toString()) + '</span>' +
        passBadge +
      '</div>' +
      '<h3 class="spine-cdq">' + escapeHtml(title) + '</h3>' +
      '<div class="spine-field"><span class="spine-label">Dramatic Thesis:</span> ' + escapeHtml(kernel.dramaticThesis || '') + '</div>' +
      '<div class="spine-field"><span class="spine-label">Value at Stake:</span> ' + escapeHtml(kernel.valueAtStake || '') + '</div>' +
      '<div class="spine-field"><span class="spine-label">Opposing Force:</span> ' + escapeHtml(kernel.opposingForce || '') + '</div>' +
      '<div class="spine-field"><span class="spine-label">Thematic Question:</span> <em>' + escapeHtml(kernel.thematicQuestion || '') + '</em></div>' +
      '<div class="concept-scores">' + renderKernelScoreGrid(evaluatedKernel && evaluatedKernel.scores) + '</div>' +
      '<div class="spine-field"><span class="spine-label">Tradeoff:</span> ' + escapeHtml(evaluatedKernel && evaluatedKernel.tradeoffSummary ? evaluatedKernel.tradeoffSummary : '') + '</div>' +
      '<div class="concept-feedback">' +
        '<div class="concept-feedback-block"><span class="spine-label">Strengths</span><ul>' + renderListItems(evaluatedKernel && evaluatedKernel.strengths) + '</ul></div>' +
        '<div class="concept-feedback-block"><span class="spine-label">Weaknesses</span><ul>' + renderListItems(evaluatedKernel && evaluatedKernel.weaknesses) + '</ul></div>' +
      '</div>' +
      createdAtHtml +
      '<div class="form-actions" style="margin-top: 0.5rem;">' + actionsHtml + '</div>'
    );
  }
