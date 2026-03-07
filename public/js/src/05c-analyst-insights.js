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
  STASIS: { css: 'momentum-badge--stasis', label: '\u23F8 Stasis' },
  INCREMENTAL_PROGRESS: { css: 'momentum-badge--incremental', label: '\uD83D\uDCC8 Incremental Progress' },
  MAJOR_PROGRESS: { css: 'momentum-badge--major', label: '\uD83D\uDE80 Major Progress' },
  REVERSAL_OR_SETBACK: { css: 'momentum-badge--reversal', label: '\u21A9\uFE0F Reversal' },
  SCOPE_SHIFT: { css: 'momentum-badge--scope-shift', label: '\uD83D\uDD00 Scope Shift' },
};
var COMPLETION_GATE_FILL = { PENDING: 0, SATISFIED: 100 };
var URGENCY_CLASS = { LOW: 'urgency-low', MEDIUM: 'urgency-medium', HIGH: 'urgency-high' };
var PAYOFF_CLASS = {
  RUSHED: 'payoff-rushed',
  ADEQUATE: 'payoff-adequate',
  WELL_EARNED: 'payoff-well-earned',
};

var HUMANIZED_LABELS = {
  NONE: 'None',
  WEAK_IMPLICIT: 'Weak Implicit',
  CLEAR_EXPLICIT: 'Clear Explicit',
  TENTATIVE: 'Tentative',
  EXPLICIT_REVERSIBLE: 'Explicit Reversible',
  EXPLICIT_IRREVERSIBLE: 'Explicit Irreversible',
  NOT_READY: 'Not Ready',
  PARTIAL: 'Partial',
  READY: 'Ready',
  WITHIN_ACTIVE_BEAT: 'Within Active Beat',
  BRIDGING_TO_NEXT_BEAT: 'Bridging',
  CLEARLY_IN_NEXT_BEAT: 'Next Beat',
  PENDING: 'Pending',
  SATISFIED: 'Satisfied',
  STRUCTURAL_SUPERSESSION: 'Structure Evolved',
  NATURAL_CONCLUSION: 'Natural Conclusion',
  DRAMATIC_INTERRUPTION: 'Dramatic Interruption',
  FORCED_TRANSITION: 'Forced Transition',
  RUSHED: 'Rushed',
  ADEQUATE: 'Adequate',
  WELL_EARNED: 'Well Earned',
};

var SATISFACTION_ICONS = {
  RUSHED: '\u26A1',
  ADEQUATE: '\u2713',
  WELL_EARNED: '\u2728',
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
  if (HUMANIZED_LABELS[value]) {
    return HUMANIZED_LABELS[value];
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

function renderInsightsEmpty(msg) {
  return '<p class="insights-empty">' + escapeHtml(msg) + '</p>';
}

// ── Tab: Structure ───────────────────────────────────────────────

function renderStructureTab(ar) {
  var completionGateSatisfied = ar.completionGateSatisfied === true;
  var completionGateReason = typeof ar.completionGateFailureReason === 'string'
    ? ar.completionGateFailureReason
    : '';
  var completionGateValue = completionGateSatisfied ? 'SATISFIED' : 'PENDING';
  var momentum = MOMENTUM_META[ar.sceneMomentum] || MOMENTUM_META.STASIS;

  var html = '<details class="insights-section" open>'
    + '<summary><h4>Beat Progress</h4></summary>'
    + '<div class="beat-gauge">'
    + renderGaugeRow('Objective Evidence', ar.objectiveEvidenceStrength, OBJECTIVE_EVIDENCE_FILL)
    + renderGaugeRow('Commitment', ar.commitmentStrength, COMMITMENT_FILL)
    + renderGaugeRow('Entry Readiness', ar.entryConditionReadiness, ENTRY_READINESS_FILL)
    + renderGaugeRow('Structural Position', ar.structuralPositionSignal, STRUCTURAL_POSITION_FILL)
    + renderGaugeRow('Completion Gate', completionGateValue, COMPLETION_GATE_FILL)
    + '</div>'
    + (completionGateReason
      ? '<p class="completion-gate-reason">' + escapeHtml(completionGateReason) + '</p>'
      : '')
    + '</details>';

  // Beat Resolution
  if (typeof ar.beatResolution === 'string' && ar.beatResolution.length > 0) {
    html += '<details class="insights-section">'
      + '<summary><h4>Beat Resolution</h4></summary>'
      + '<p class="insights-copy">' + escapeHtml(formatAnalystEnum(ar.beatResolution)) + '</p>'
      + '</details>';
  }

  // Objective Anchors & Evidence
  var anchors = Array.isArray(ar.objectiveAnchors) ? ar.objectiveAnchors : [];
  var evidence = Array.isArray(ar.anchorEvidence) ? ar.anchorEvidence : [];
  if (anchors.length > 0 || evidence.length > 0) {
    var anchorsHtml = '<details class="insights-section">'
      + '<summary><h4>Objective Anchors &amp; Evidence</h4></summary>';
    if (anchors.length > 0) {
      anchorsHtml += '<ul class="insights-bullet-list">';
      for (var i = 0; i < anchors.length; i++) {
        var ev = i < evidence.length ? evidence[i] : '';
        anchorsHtml += '<li class="insights-anchor-item">'
          + '<span class="insights-anchor-text">' + escapeHtml(anchors[i]) + '</span>'
          + (ev ? '<span class="insights-anchor-evidence">' + escapeHtml(ev) + '</span>' : '')
          + '</li>';
      }
      anchorsHtml += '</ul>';
    }
    anchorsHtml += '</details>';
    html += anchorsHtml;
  }

  // Momentum
  html += '<details class="insights-section" open>'
    + '<summary><h4>Momentum</h4></summary>'
    + '<span class="momentum-badge ' + momentum.css + '">' + escapeHtml(momentum.label) + '</span>'
    + '</details>';

  return html;
}

// ── Tab: Narrative ───────────────────────────────────────────────

function renderNarrativeTab(ar) {
  var hasContent = false;
  var html = '';

  // Thematic Charge
  var chargeMeta = THEMATIC_CHARGE_META[ar.thematicCharge];
  if (chargeMeta) {
    hasContent = true;
    html += '<details class="insights-section" open>'
      + '<summary><h4>Thematic Charge</h4></summary>'
      + '<span class="thematic-badge ' + chargeMeta.css + '">' + escapeHtml(chargeMeta.label) + '</span>';
    if (typeof ar.thematicChargeDescription === 'string' && ar.thematicChargeDescription.length > 0) {
      html += '<p class="insights-copy" style="margin-top:0.4rem">'
        + escapeHtml(ar.thematicChargeDescription) + '</p>';
    }
    html += '</details>';
  }

  // Narrative Focus
  var focusMeta = NARRATIVE_FOCUS_META[ar.narrativeFocus];
  if (focusMeta) {
    hasContent = true;
    html += '<details class="insights-section" open>'
      + '<summary><h4>Narrative Focus</h4></summary>'
      + '<span class="narrative-focus-badge ' + focusMeta.css + '">'
      + escapeHtml(focusMeta.label) + '</span>'
      + '</details>';
  }

  // Pacing Alert
  if (ar.pacingIssueDetected === true) {
    hasContent = true;
    html += '<details class="pacing-alert" open role="status">'
      + '<summary><h4>Pacing Alert</h4></summary>'
      + '<p class="insights-copy">' + escapeHtml(ar.pacingIssueReason || '') + '</p>'
      + '<span class="insights-chip">Recommended: '
      + escapeHtml(formatAnalystEnum(ar.recommendedAction))
      + '</span>'
      + '</details>';
  }

  // Tone Warning
  if (ar.toneAdherent === false) {
    hasContent = true;
    html += '<details class="tone-warning" open role="status">'
      + '<summary><h4>Tone Warning</h4></summary>'
      + '<p class="insights-copy">' + escapeHtml(ar.toneDriftDescription || '') + '</p>'
      + '</details>';
  }

  return hasContent ? html : renderInsightsEmpty('Nothing to report.');
}

// ── Tab: NPCs ────────────────────────────────────────────────────

function renderNpcsTab(ar) {
  var hasContent = false;
  var html = '';

  // NPC Coherence
  var coherenceKey = String(ar.npcCoherenceAdherent);
  var coherenceMeta = NPC_COHERENCE_META[coherenceKey];
  if (coherenceMeta) {
    hasContent = true;
    html += '<details class="insights-section" open>'
      + '<summary><h4>NPC Coherence</h4></summary>'
      + '<span class="npc-coherence-indicator ' + coherenceMeta.css + '">'
      + escapeHtml(coherenceMeta.label) + '</span>';
    if (ar.npcCoherenceAdherent === false
      && typeof ar.npcCoherenceIssues === 'string'
      && ar.npcCoherenceIssues.length > 0) {
      html += '<p class="insights-copy" style="margin-top:0.4rem">'
        + escapeHtml(ar.npcCoherenceIssues) + '</p>';
    }
    html += '</details>';
  }

  // Relationship Shifts
  var shifts = Array.isArray(ar.relationshipShiftsDetected) ? ar.relationshipShiftsDetected : [];
  if (shifts.length > 0) {
    hasContent = true;
    var shiftItems = shifts.map(function(s) {
      var valence = typeof s.suggestedValenceChange === 'number' ? s.suggestedValenceChange : 0;
      var arrow = valence > 0 ? '&#9650;' : valence < 0 ? '&#9660;' : '&#9644;';
      var arrowClass = valence > 0 ? 'shift-positive' : valence < 0 ? 'shift-negative' : 'shift-neutral';
      return '<li class="relationship-shift-item">'
        + '<span class="shift-npc-name">' + escapeHtml(s.npcName || '') + '</span>'
        + '<span class="shift-arrow ' + arrowClass + '">' + arrow + '</span>'
        + '<span class="shift-description">' + escapeHtml(s.shiftDescription || '') + '</span>'
        + '</li>';
    }).join('');
    html += '<details class="insights-section" open>'
      + '<summary><h4>Relationship Shifts</h4></summary>'
      + '<ul class="relationship-shift-list">' + shiftItems + '</ul>'
      + '</details>';
  }

  // Dramatic Irony Opportunities
  var irony = Array.isArray(ar.dramaticIronyOpportunities) ? ar.dramaticIronyOpportunities : [];
  if (irony.length > 0) {
    hasContent = true;
    var ironyItems = irony.map(function(item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join('');
    html += '<details class="insights-section">'
      + '<summary><h4>Dramatic Irony Opportunities</h4></summary>'
      + '<ul class="insights-bullet-list">' + ironyItems + '</ul>'
      + '</details>';
  }

  return hasContent ? html : renderInsightsEmpty('No NPC data for this page.');
}

// ── Tab: Payoffs ─────────────────────────────────────────────────

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
    if (meta && typeof meta.promiseType === 'string' && typeof meta.urgency === 'string') {
      badgeHtml = '<span class="promise-payoff-badge">'
        + renderPromiseBadgePill(meta.promiseType, meta.urgency)
        + '</span>';
    }

    var satIcon = SATISFACTION_ICONS[satisfaction] || '';
    var satLabel = HUMANIZED_LABELS[satisfaction] || formatAnalystEnum(satisfaction);

    return '<li class="promise-payoff-item">'
      + badgeHtml
      + '<p class="payoff-thread-label">\uD83D\uDD2E Promise</p>'
      + '<p class="payoff-thread-text" title="' + escapeHtml(description) + '">' + escapeHtml(description) + '</p>'
      + '<span class="payoff-satisfaction-badge payoff-satisfaction-badge--centered ' + payoffClass + '">'
      + (satIcon ? satIcon + ' ' : '') + escapeHtml(satLabel)
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

    var satIcon = SATISFACTION_ICONS[satisfaction] || '';
    var satLabel = HUMANIZED_LABELS[satisfaction] || formatAnalystEnum(satisfaction);

    return '<li class="payoff-item">'
      + badgeHtml
      + '<p class="payoff-thread-label">\uD83E\uDDF5 Thread</p>'
      + '<p class="payoff-thread-text" title="' + escapeHtml(threadText) + '">' + escapeHtml(threadText) + '</p>'
      + '<span class="payoff-satisfaction-badge payoff-satisfaction-badge--centered ' + payoffClass + '">'
      + (satIcon ? satIcon + ' ' : '') + escapeHtml(satLabel)
      + '</span>'
      + '<p class="insights-copy payoff-reasoning">' + escapeHtml(reasoning) + '</p>'
      + '</li>';
  }).join('');

  return '<details class="insights-section" open>'
    + '<summary><h4>Thread Payoffs</h4></summary>'
    + '<ul class="payoff-list">' + items + '</ul>'
    + '</details>';
}

function renderDeviationSection(label, detected, reason) {
  if (detected !== true) {
    return '';
  }
  return '<details class="deviation-alert" open>'
    + '<summary><h4>' + escapeHtml(label) + '</h4></summary>'
    + '<p class="insights-copy">' + escapeHtml(reason || '') + '</p>'
    + '</details>';
}

function renderPayoffsTab(ar, ctx) {
  var hasContent = false;
  var html = '';

  var promiseHtml = renderPromisePayoffs(ar.promisePayoffAssessments, ctx.resolvedPromiseMeta || {});
  if (promiseHtml) {
    hasContent = true;
    html += promiseHtml;
  }

  var threadHtml = renderThreadPayoffs(ar.threadPayoffAssessments, ctx.resolvedThreadMeta || {});
  if (threadHtml) {
    hasContent = true;
    html += threadHtml;
  }

  var devHtml = renderDeviationSection('Structural Deviation', ar.deviationDetected, ar.deviationReason);
  if (devHtml) {
    hasContent = true;
    html += devHtml;
  }

  var spineDevHtml = renderDeviationSection('Spine Deviation', ar.spineDeviationDetected, ar.spineDeviationReason);
  if (spineDevHtml) {
    hasContent = true;
    html += spineDevHtml;
  }

  return hasContent ? html : renderInsightsEmpty('Nothing to report.');
}

// ── Tab infrastructure ───────────────────────────────────────────

var INSIGHTS_TABS = [
  { id: 'structure', label: 'Structure' },
  { id: 'narrative', label: 'Narrative' },
  { id: 'npcs', label: 'NPCs' },
  { id: 'payoffs', label: 'Payoffs' },
];

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

  // Tab bar
  var tabBarHtml = '<div class="insights-tabs" role="tablist">';
  for (var t = 0; t < INSIGHTS_TABS.length; t++) {
    var tab = INSIGHTS_TABS[t];
    var isActive = t === 0;
    tabBarHtml += '<button type="button" role="tab" class="insights-tab'
      + (isActive ? ' insights-tab--active' : '') + '"'
      + ' aria-selected="' + (isActive ? 'true' : 'false') + '"'
      + ' data-insights-tab="' + tab.id + '">'
      + escapeHtml(tab.label)
      + '</button>';
  }
  tabBarHtml += '</div>';

  // Tab panels
  var panels = {
    structure: renderStructureTab(analystResult),
    narrative: renderNarrativeTab(analystResult),
    npcs: renderNpcsTab(analystResult),
    payoffs: renderPayoffsTab(analystResult, ctx),
  };

  var panelsHtml = '';
  for (var p = 0; p < INSIGHTS_TABS.length; p++) {
    var panelTab = INSIGHTS_TABS[p];
    var panelActive = p === 0;
    panelsHtml += '<div class="insights-tab-panel'
      + (panelActive ? ' insights-tab-panel--active' : '') + '"'
      + ' role="tabpanel" data-insights-panel="' + panelTab.id + '"'
      + (panelActive ? '' : ' hidden')
      + '>'
      + panels[panelTab.id]
      + '</div>';
  }

  return headerHtml + tabBarHtml + panelsHtml;
}

function attachTabListeners(container) {
  var tabs = container.querySelectorAll('[data-insights-tab]');
  var panels = container.querySelectorAll('[data-insights-panel]');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var targetId = tab.getAttribute('data-insights-tab');
      tabs.forEach(function(t) {
        var isTarget = t.getAttribute('data-insights-tab') === targetId;
        t.classList.toggle('insights-tab--active', isTarget);
        t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      });
      panels.forEach(function(panel) {
        var isTarget = panel.getAttribute('data-insights-panel') === targetId;
        panel.classList.toggle('insights-tab-panel--active', isTarget);
        if (isTarget) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', '');
        }
      });
    });
  });
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
  var headerActions = document.getElementById('story-actions-strip');
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
    attachTabListeners(modalBody);
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
