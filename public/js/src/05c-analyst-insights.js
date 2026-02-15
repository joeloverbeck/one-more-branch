// ── Analyst insights modal ───────────────────────────────────────

var OBJECTIVE_EVIDENCE_FILL = { NONE: 0, WEAK_IMPLICIT: 33, CLEAR_EXPLICIT: 100 };
var COMMITMENT_FILL = {
  NONE: 0,
  TENTATIVE: 25,
  EXPLICIT_REVERSIBLE: 60,
  EXPLICIT_IRREVERSIBLE: 100,
};
var ENTRY_READINESS_FILL = { NOT_READY: 0, PARTIAL: 50, READY: 100 };
var STRUCTURAL_POSITION_FILL = {
  WITHIN_ACTIVE_BEAT: 20,
  BRIDGING_TO_NEXT_BEAT: 60,
  CLEARLY_IN_NEXT_BEAT: 100,
};
var MOMENTUM_META = {
  STASIS: { css: 'momentum-badge--stasis', label: 'Stasis' },
  INCREMENTAL_PROGRESS: { css: 'momentum-badge--incremental', label: 'Incremental Progress' },
  MAJOR_PROGRESS: { css: 'momentum-badge--major', label: 'Major Progress' },
  REVERSAL_OR_SETBACK: { css: 'momentum-badge--reversal', label: 'Reversal' },
  SCOPE_SHIFT: { css: 'momentum-badge--scope-shift', label: 'Scope Shift' },
};
var COMPLETION_GATE_FILL = { PENDING: 0, SATISFIED: 100 };
var URGENCY_CLASS = { LOW: 'urgency-low', MEDIUM: 'urgency-medium', HIGH: 'urgency-high' };
var PAYOFF_CLASS = {
  RUSHED: 'payoff-rushed',
  ADEQUATE: 'payoff-adequate',
  WELL_EARNED: 'payoff-well-earned',
};

function parseAnalystDataFromDom() {
  var node = document.getElementById('analyst-data');
  if (!node || typeof node.textContent !== 'string') {
    return null;
  }

  try {
    var parsed = JSON.parse(node.textContent);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
}

function parseInsightsContextFromDom() {
  var node = document.getElementById('insights-context');
  if (!node || typeof node.textContent !== 'string') {
    return { actDisplayInfo: null, sceneSummary: null };
  }

  try {
    var parsed = JSON.parse(node.textContent);
    return parsed && typeof parsed === 'object'
      ? parsed
      : { actDisplayInfo: null, sceneSummary: null };
  } catch (_) {
    return { actDisplayInfo: null, sceneSummary: null };
  }
}

function formatAnalystEnum(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return 'Unknown';
  }
  return value.toLowerCase().split('_').map(function(part) {
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(' ');
}

function gaugeClass(fillPct) {
  if (fillPct <= 33) {
    return 'beat-gauge__fill--low';
  }
  if (fillPct <= 66) {
    return 'beat-gauge__fill--mid';
  }
  return 'beat-gauge__fill--high';
}

function renderGaugeRow(label, value, fillMap) {
  var fillPct = fillMap[value] || 0;
  return '<div class="beat-gauge__row">'
    + '<span class="beat-gauge__label">' + escapeHtml(label) + '</span>'
    + '<div class="beat-gauge__track">'
    + '<span class="beat-gauge__fill ' + gaugeClass(fillPct) + '" style="width:' + fillPct + '%"></span>'
    + '</div>'
    + '<span class="beat-gauge__level">' + escapeHtml(formatAnalystEnum(value)) + '</span>'
    + '</div>';
}

function renderPromisePayoffs(assessments, resolvedPromiseMeta) {
  if (!Array.isArray(assessments) || assessments.length === 0) {
    return '';
  }

  var metaMap = resolvedPromiseMeta && typeof resolvedPromiseMeta === 'object'
    ? resolvedPromiseMeta
    : {};

  var items = assessments.map(function(assessment) {
    var satisfaction = typeof assessment?.satisfactionLevel === 'string'
      ? assessment.satisfactionLevel
      : 'ADEQUATE';
    var payoffClass = PAYOFF_CLASS[satisfaction] || PAYOFF_CLASS.ADEQUATE;
    var description = typeof assessment?.description === 'string' ? assessment.description : '';
    var reasoning = typeof assessment?.reasoning === 'string' ? assessment.reasoning : '';
    var promiseId = typeof assessment?.promiseId === 'string' ? assessment.promiseId : '';

    var badgeHtml = '';
    var meta = promiseId ? metaMap[promiseId] : null;
    if (meta && typeof meta.promiseType === 'string') {
      badgeHtml = '<span class="promise-payoff-badge">'
        + '<span class="promise-type-text-badge">' + escapeHtml(formatAnalystEnum(meta.promiseType)) + '</span>'
        + '</span>';
    }

    return '<li class="promise-payoff-item">'
      + badgeHtml
      + '<p class="payoff-thread-label">Promise</p>'
      + '<p class="payoff-thread-text" title="' + escapeHtml(description) + '">' + escapeHtml(description) + '</p>'
      + '<span class="payoff-satisfaction-badge payoff-satisfaction-badge--centered ' + payoffClass + '">'
      + escapeHtml(satisfaction)
      + '</span>'
      + '<p class="insights-copy payoff-reasoning">' + escapeHtml(reasoning) + '</p>'
      + '</li>';
  }).join('');

  return '<details class="insights-section" open>'
    + '<summary><h4>Promise Payoffs</h4></summary>'
    + '<ul class="payoff-list">' + items + '</ul>'
    + '</details>';
}

function renderThreadPayoffs(assessments, resolvedThreadMeta) {
  if (!Array.isArray(assessments) || assessments.length === 0) {
    return '';
  }

  var metaMap = resolvedThreadMeta && typeof resolvedThreadMeta === 'object'
    ? resolvedThreadMeta
    : {};

  var items = assessments.map(function(assessment) {
    var satisfaction = typeof assessment?.satisfactionLevel === 'string'
      ? assessment.satisfactionLevel
      : 'ADEQUATE';
    var payoffClass = PAYOFF_CLASS[satisfaction] || PAYOFF_CLASS.ADEQUATE;
    var threadText = typeof assessment?.threadText === 'string' ? assessment.threadText : '';
    var reasoning = typeof assessment?.reasoning === 'string' ? assessment.reasoning : '';
    var threadId = typeof assessment?.threadId === 'string' ? assessment.threadId : '';

    var badgeHtml = '';
    var meta = threadId ? metaMap[threadId] : null;
    if (meta && typeof meta.threadType === 'string' && typeof meta.urgency === 'string') {
      badgeHtml = '<span class="payoff-thread-badge">'
        + renderThreadBadgePill(meta.threadType, meta.urgency)
        + '</span>';
    }

    return '<li class="payoff-item">'
      + badgeHtml
      + '<p class="payoff-thread-label">Thread</p>'
      + '<p class="payoff-thread-text" title="' + escapeHtml(threadText) + '">' + escapeHtml(threadText) + '</p>'
      + '<span class="payoff-satisfaction-badge payoff-satisfaction-badge--centered ' + payoffClass + '">'
      + escapeHtml(satisfaction)
      + '</span>'
      + '<p class="insights-copy payoff-reasoning">' + escapeHtml(reasoning) + '</p>'
      + '</li>';
  }).join('');

  return '<details class="insights-section" open>'
    + '<summary><h4>Thread Payoffs</h4></summary>'
    + '<ul class="payoff-list">' + items + '</ul>'
    + '</details>';
}

function renderInsightsBody(analystResult, context) {
  if (!analystResult || typeof analystResult !== 'object') {
    return '<p class="insights-copy">No analyst insights are available for this page yet.</p>';
  }

  var ctx = context && typeof context === 'object' ? context : {};
  var headerHtml = '';

  if (typeof ctx.actDisplayInfo === 'string' && ctx.actDisplayInfo.length > 0) {
    headerHtml += '<p class="insights-beat-subtitle">' + escapeHtml(ctx.actDisplayInfo) + '</p>';
  }

  if (typeof ctx.sceneSummary === 'string' && ctx.sceneSummary.length > 0) {
    headerHtml += '<p class="insights-scene-summary">' + escapeHtml(ctx.sceneSummary) + '</p>';
  }

  var momentum = MOMENTUM_META[analystResult.sceneMomentum] || MOMENTUM_META.STASIS;
  var completionGateSatisfied = analystResult.completionGateSatisfied === true;
  var completionGateReason = typeof analystResult.completionGateFailureReason === 'string'
    ? analystResult.completionGateFailureReason
    : '';
  var completionGateValue = completionGateSatisfied ? 'SATISFIED' : 'PENDING';

  var pacingHtml = '';
  if (analystResult.pacingIssueDetected === true) {
    pacingHtml = '<details class="pacing-alert" open role="status">'
      + '<summary><h4>Pacing Alert</h4></summary>'
      + '<p class="insights-copy">' + escapeHtml(analystResult.pacingIssueReason || '') + '</p>'
      + '<span class="insights-chip">Recommended: '
      + escapeHtml(formatAnalystEnum(analystResult.recommendedAction))
      + '</span>'
      + '</details>';
  }

  var toneHtml = '';
  if (analystResult.toneAdherent === false) {
    toneHtml = '<details class="tone-warning" open role="status">'
      + '<summary><h4>Tone Warning</h4></summary>'
      + '<p class="insights-copy">' + escapeHtml(analystResult.toneDriftDescription || '') + '</p>'
      + '</details>';
  }

  return headerHtml
    + '<details class="insights-section" open>'
    + '<summary><h4>Beat Progress</h4></summary>'
    + '<div class="beat-gauge">'
    + renderGaugeRow('Objective Evidence', analystResult.objectiveEvidenceStrength, OBJECTIVE_EVIDENCE_FILL)
    + renderGaugeRow('Commitment', analystResult.commitmentStrength, COMMITMENT_FILL)
    + renderGaugeRow('Entry Readiness', analystResult.entryConditionReadiness, ENTRY_READINESS_FILL)
    + renderGaugeRow('Structural Position', analystResult.structuralPositionSignal, STRUCTURAL_POSITION_FILL)
    + renderGaugeRow('Completion Gate', completionGateValue, COMPLETION_GATE_FILL)
    + '</div>'
    + (completionGateReason
      ? '<p class="completion-gate-reason">' + escapeHtml(completionGateReason) + '</p>'
      : '')
    + '</details>'
    + '<details class="insights-section" open>'
    + '<summary><h4>Momentum</h4></summary>'
    + '<span class="momentum-badge ' + momentum.css + '">' + escapeHtml(momentum.label) + '</span>'
    + '</details>'
    + pacingHtml
    + renderPromisePayoffs(analystResult.promisePayoffAssessments, ctx.resolvedPromiseMeta || {})
    + renderThreadPayoffs(analystResult.threadPayoffAssessments, ctx.resolvedThreadMeta || {})
    + toneHtml;
}

function createInsightsButton() {
  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'insights-btn';
  button.id = 'insights-btn';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', 'insights-modal');
  button.innerHTML = '<span class="insights-btn__icon" aria-hidden="true">🔍</span>'
    + '<span class="insights-btn__label">Story Insights</span>';
  return button;
}

function createAnalystInsightsController(initialAnalystResult, initialContext) {
  var analystResult = initialAnalystResult && typeof initialAnalystResult === 'object'
    ? initialAnalystResult
    : null;
  var insightsContext = initialContext && typeof initialContext === 'object'
    ? initialContext
    : { actDisplayInfo: null, sceneSummary: null };
  var modal = document.getElementById('insights-modal');
  var modalBody = document.getElementById('insights-modal-body');
  var closeButton = document.getElementById('insights-close-btn');
  var headerActions = document.getElementById('story-header-actions');
  var button = document.getElementById('insights-btn');

  if (!modal || !modalBody || !closeButton || !headerActions) {
    return {
      update: function() {},
    };
  }

  if (!button) {
    button = createInsightsButton();
    headerActions.insertBefore(button, headerActions.firstChild);
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  function openModal() {
    if (!analystResult) {
      return;
    }
    modal.style.display = 'flex';
  }

  function render() {
    modalBody.innerHTML = renderInsightsBody(analystResult, insightsContext);
    button.style.display = analystResult ? 'inline-flex' : 'none';
    if (!analystResult) {
      closeModal();
    }
  }

  button.addEventListener('click', openModal);
  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeModal();
    }
  });
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  });

  render();

  return {
    update: function(nextAnalystResult, nextContext) {
      analystResult =
        nextAnalystResult && typeof nextAnalystResult === 'object' ? nextAnalystResult : null;
      if (nextContext && typeof nextContext === 'object') {
        insightsContext = nextContext;
      }
      render();
    },
  };
}
