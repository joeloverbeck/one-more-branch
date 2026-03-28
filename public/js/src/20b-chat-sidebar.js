window.ChatSidebar = (function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatSignedNumber(value) {
    if (typeof value !== 'number' || !isFinite(value) || value === 0) {
      return String(value || 0);
    }

    return (value > 0 ? '+' : '') + String(value);
  }

  function readBootstrap() {
    var script = document.getElementById('chat-ui-bootstrap');
    if (!script || !script.textContent) {
      return null;
    }

    try {
      return JSON.parse(script.textContent);
    } catch (_error) {
      return null;
    }
  }

  function updateField(root, name, value, fallback) {
    root.querySelectorAll('[data-chat-field="' + name + '"]').forEach(function (field) {
      field.textContent = value || fallback || '';
    });
  }

  function normalizeText(value, fallback) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
  }

  function sanitizeItems(items) {
    return Array.isArray(items)
      ? items.filter(function (item) {
          return typeof item === 'string' && item.trim().length > 0;
        })
      : [];
  }

  function pluralizeCount(count, singular, plural) {
    return String(count) + ' ' + (count === 1 ? singular : plural);
  }

  function buildKnowledgeSummary(knowledgeState) {
    var knownFacts = sanitizeItems(knowledgeState && knowledgeState.knownFacts);
    var suspicions = sanitizeItems(knowledgeState && knowledgeState.suspicions);
    return pluralizeCount(knownFacts.length, 'fact', 'facts') + ', ' +
      pluralizeCount(suspicions.length, 'suspicion', 'suspicions');
  }

  function buildConversationSummary(chatBible) {
    var activeThreads = sanitizeItems(chatBible && chatBible.conversationNow && chatBible.conversationNow.activeThreads);
    var commitments = sanitizeItems(chatBible && chatBible.conversationNow && chatBible.conversationNow.commitments);
    return pluralizeCount(activeThreads.length, 'thread', 'threads') + ', ' +
      pluralizeCount(commitments.length, 'commitment', 'commitments');
  }

  function buildGuardrailsSummary(chatBible) {
    var guardrails = sanitizeItems(chatBible && chatBible.continuityGuardrails);
    var constraints = sanitizeItems(chatBible && chatBible.responseConstraints);
    return pluralizeCount(guardrails.length, 'guardrail', 'guardrails') + ', ' +
      pluralizeCount(constraints.length, 'constraint', 'constraints');
  }

  function truncateSummary(value, maxLength, fallback) {
    var normalized = normalizeText(value, fallback || '');
    if (normalized.length === 0 || normalized === (fallback || '')) {
      return normalized || fallback || '';
    }

    return normalized.length > maxLength
      ? normalized.slice(0, Math.max(maxLength - 3, 1)).replace(/\s+$/, '') + '...'
      : normalized;
  }

  function renderPillList(container, items, emptyLabel) {
    if (!container) {
      return;
    }

    var safeItems = Array.isArray(items) ? items.filter(function (item) {
      return typeof item === 'string' && item.trim().length > 0;
    }) : [];

    container.innerHTML = '';

    if (safeItems.length === 0) {
      var emptyPill = document.createElement('span');
      emptyPill.className = 'chat-pill chat-pill--empty';
      emptyPill.textContent = emptyLabel;
      container.appendChild(emptyPill);
      return;
    }

    safeItems.forEach(function (item) {
      var pill = document.createElement('span');
      pill.className = 'chat-pill';
      pill.textContent = item;
      container.appendChild(pill);
    });
  }

  function renderBulletList(container, items, emptyLabel, options) {
    if (!container) {
      return;
    }

    var safeItems = sanitizeItems(items);
    var settings = options || {};

    container.innerHTML = '';

    if (safeItems.length === 0) {
      var emptyItem = document.createElement('li');
      emptyItem.className = 'chat-sidebar-list__empty';
      emptyItem.textContent = emptyLabel;
      container.appendChild(emptyItem);
      return;
    }

    safeItems.forEach(function (item) {
      var listItem = document.createElement('li');
      if (settings.itemClass) {
        listItem.className = settings.itemClass;
      }

      if (settings.prefixText) {
        var prefix = document.createElement('span');
        prefix.className = settings.prefixClass || '';
        prefix.textContent = settings.prefixText;
        prefix.setAttribute('aria-hidden', 'true');
        listItem.appendChild(prefix);

        var text = document.createElement('span');
        text.textContent = item;
        listItem.appendChild(text);
      } else {
        listItem.textContent = item;
      }
      container.appendChild(listItem);
    });
  }

  function getGaugeBounds(name) {
    if (name === 'valence') {
      return { min: -5, max: 5 };
    }

    return { min: 0, max: 10 };
  }

  function getMetricBand(name, value) {
    if (name === 'valence') {
      if (value <= -3) {
        return 'Hostile';
      }
      if (value < 0) {
        return 'Frayed';
      }
      if (value === 0) {
        return 'Neutral';
      }
      if (value < 3) {
        return 'Open';
      }
      return 'Loyal';
    }

    if (value <= 2) {
      return 'Calm';
    }
    if (value <= 6) {
      return 'Strained';
    }
    return 'Breaking';
  }

  function getMetricTrend(name, delta) {
    if (typeof delta !== 'number' || !isFinite(delta) || delta === 0) {
      return 'steady';
    }

    if (name === 'valence') {
      return delta > 0 ? 'warming' : 'cooling';
    }

    return delta > 0 ? 'rising' : 'easing';
  }

  function buildMetricSummary(name, value, delta) {
    return getMetricBand(name, value) + ' and ' + getMetricTrend(name, delta);
  }

  function buildGaugeAriaLabel(name, value, delta) {
    var bounds = getGaugeBounds(name);
    var title = name === 'valence' ? 'Valence' : 'Tension';
    return title + ': ' + buildMetricSummary(name, value, delta) + '. Current value ' + String(value) +
      ' on a scale from ' + String(bounds.min) + ' to ' + String(bounds.max) + '.';
  }

  function buildSparklineAriaLabel(name, value, delta, pointCount) {
    var title = name === 'valence' ? 'Valence' : 'Tension';
    var turns = typeof pointCount === 'number' && pointCount > 0 ? pointCount : 0;
    return title + ' trend: ' + buildMetricSummary(name, value, delta) + ' across ' +
      String(turns) + ' recorded ' + (turns === 1 ? 'turn' : 'turns') + '.';
  }

  function normalizeGaugePosition(name, value) {
    var bounds = getGaugeBounds(name);
    return clamp((value - bounds.min) / (bounds.max - bounds.min), 0, 1);
  }

  function renderGauge(root, name, value, previousValue) {
    var gauge = root.querySelector('[data-chat-gauge="' + name + '"]');
    if (!gauge) {
      return;
    }

    var marker = gauge.querySelector('.chat-gauge__marker');
    var ghost = gauge.querySelector('.chat-gauge__ghost');
    if (!marker) {
      return;
    }

    var bounds = getGaugeBounds(name);
    var normalized = normalizeGaugePosition(name, value);
    marker.style.left = String(normalized * 100) + '%';

    if (ghost) {
      if (typeof previousValue === 'number' && isFinite(previousValue)) {
        ghost.style.left = String(normalizeGaugePosition(name, previousValue) * 100) + '%';
        ghost.style.display = 'block';
      } else {
        ghost.style.display = 'none';
        ghost.style.left = '';
      }
    }

    gauge.setAttribute('aria-valuemin', String(bounds.min));
    gauge.setAttribute('aria-valuemax', String(bounds.max));
    gauge.setAttribute('aria-valuenow', String(value));
    gauge.setAttribute(
      'aria-label',
      buildGaugeAriaLabel(
        name,
        value,
        typeof previousValue === 'number' && isFinite(previousValue) ? value - previousValue : 0
      )
    );
  }

  function buildSparklinePoints(values, min, max) {
    if (!Array.isArray(values) || values.length === 0) {
      return '';
    }

    if (values.length === 1) {
      var singleY = 26 - (((values[0] - min) / (max - min || 1)) * 20);
      return '60,' + String(singleY);
    }

    return values.map(function (value, index) {
      var x = (index / (values.length - 1)) * 120;
      var y = 26 - (((value - min) / (max - min || 1)) * 20);
      return String(Math.round(x * 100) / 100) + ',' + String(Math.round(y * 100) / 100);
    }).join(' ');
  }

  function renderSparkline(root, name, history) {
    var sparkline = root.querySelector('[data-chat-sparkline="' + name + '"]');
    if (!sparkline) {
      return;
    }

    var values = Array.isArray(history)
      ? history.map(function (point) {
          return point && typeof point[name] === 'number' ? point[name] : null;
        }).filter(function (value) {
          return value !== null;
        })
      : [];
    var bounds = getGaugeBounds(name);

    sparkline.innerHTML = '';
    sparkline.setAttribute('preserveAspectRatio', 'none');

    if (values.length === 0) {
      return;
    }

    var currentValue = values[values.length - 1];
    var previousValue = values.length > 1 ? values[values.length - 2] : currentValue;
    var polyline = document.createElementNS(SVG_NS, 'polyline');
    polyline.setAttribute('points', buildSparklinePoints(values, bounds.min, bounds.max));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', name === 'valence' ? '#7ae7ba' : '#ff8f6b');
    polyline.setAttribute('stroke-width', '2');
    polyline.setAttribute('stroke-linecap', 'round');
    polyline.setAttribute('stroke-linejoin', 'round');
    sparkline.appendChild(polyline);

    var currentDot = document.createElementNS(SVG_NS, 'circle');
    currentDot.setAttribute('class', 'chat-sparkline__current-dot');
    currentDot.setAttribute('r', '3.5');
    currentDot.setAttribute('cx', values.length === 1 ? '60' : '120');
    currentDot.setAttribute(
      'cy',
      String(26 - (((currentValue - bounds.min) / (bounds.max - bounds.min || 1)) * 20))
    );
    currentDot.setAttribute('fill', '#f7f9ff');
    currentDot.setAttribute('stroke', name === 'valence' ? '#7ae7ba' : '#ff8f6b');
    currentDot.setAttribute('stroke-width', '2');
    sparkline.appendChild(currentDot);
    sparkline.setAttribute('role', 'img');
    sparkline.setAttribute('aria-label', buildSparklineAriaLabel(name, currentValue, currentValue - previousValue, values.length));
  }

  function getLatestRelationshipSnapshot(relationshipTimeline) {
    if (!Array.isArray(relationshipTimeline) || relationshipTimeline.length === 0) {
      return null;
    }

    var latestPoint = relationshipTimeline[relationshipTimeline.length - 1];
    return latestPoint && latestPoint.snapshot ? latestPoint.snapshot : null;
  }

  function buildRelationshipHistory(relationshipTimeline) {
    var history = [{
      turnNumber: 0,
      valence: 0,
      tension: 0,
      dynamic: '',
    }];

    if (!Array.isArray(relationshipTimeline)) {
      return history;
    }

    relationshipTimeline.forEach(function (point) {
      if (!point || !point.snapshot) {
        return;
      }

      history.push({
        turnNumber: typeof point.turnNumber === 'number' ? point.turnNumber : history.length,
        valence: typeof point.snapshot.valence === 'number' ? point.snapshot.valence : 0,
        tension: typeof point.snapshot.tension === 'number' ? point.snapshot.tension : 0,
        dynamic: point.snapshot.dynamic || '',
      });
    });

    return history;
  }

  function buildNextRelationshipTimeline(existingTimeline, latestRelationshipSnapshot, latestTurnNumber) {
    var timeline = Array.isArray(existingTimeline) ? existingTimeline.slice() : [];
    if (!latestRelationshipSnapshot || typeof latestTurnNumber !== 'number') {
      return timeline;
    }

    var lastPoint = timeline.length > 0 ? timeline[timeline.length - 1] : null;
    if (lastPoint && lastPoint.turnNumber === latestTurnNumber) {
      timeline[timeline.length - 1] = {
        turnNumber: latestTurnNumber,
        snapshot: latestRelationshipSnapshot,
      };
      return timeline;
    }

    timeline.push({
      turnNumber: latestTurnNumber,
      snapshot: latestRelationshipSnapshot,
    });
    return timeline;
  }

  function resolveRelationshipMetric(relationshipSnapshot, relationshipState, name) {
    var absoluteValue = relationshipSnapshot && relationshipSnapshot[name];
    if (typeof absoluteValue === 'number' && isFinite(absoluteValue)) {
      return absoluteValue;
    }

    var fallbackValue = relationshipState && relationshipState[name];
    return typeof fallbackValue === 'number' && isFinite(fallbackValue) ? fallbackValue : 0;
  }

  function readDelta(history, name) {
    if (!Array.isArray(history) || history.length < 2) {
      return 0;
    }

    var previousPoint = history[history.length - 2];
    var currentPoint = history[history.length - 1];
    return currentPoint[name] - previousPoint[name];
  }

  function updateRelationshipVisuals(root, relationshipTimeline, relationshipState) {
    var relationshipSnapshot = getLatestRelationshipSnapshot(relationshipTimeline);
    var history = buildRelationshipHistory(relationshipTimeline);
    var valence = resolveRelationshipMetric(relationshipSnapshot, relationshipState, 'valence');
    var tension = resolveRelationshipMetric(relationshipSnapshot, relationshipState, 'tension');
    var previousPoint = Array.isArray(history) && history.length > 1 ? history[history.length - 2] : null;
    var valenceDeltaValue = readDelta(history, 'valence');
    var tensionDeltaValue = readDelta(history, 'tension');

    renderGauge(
      root,
      'valence',
      valence,
      previousPoint && typeof previousPoint.valence === 'number' ? previousPoint.valence : null
    );
    renderGauge(
      root,
      'tension',
      tension,
      previousPoint && typeof previousPoint.tension === 'number' ? previousPoint.tension : null
    );
    renderSparkline(root, 'valence', history);
    renderSparkline(root, 'tension', history);

    var valenceValue = root.querySelector('[data-chat-gauge-value="valence"]');
    var tensionValue = root.querySelector('[data-chat-gauge-value="tension"]');
    var valenceDelta = root.querySelector('[data-chat-gauge-delta="valence"]');
    var tensionDelta = root.querySelector('[data-chat-gauge-delta="tension"]');
    var valenceSummary = root.querySelector('[data-chat-gauge-summary="valence"]');
    var tensionSummary = root.querySelector('[data-chat-gauge-summary="tension"]');
    var valenceTrend = root.querySelector('[data-chat-gauge-trend="valence"]');
    var tensionTrend = root.querySelector('[data-chat-gauge-trend="tension"]');

    if (valenceValue) {
      valenceValue.textContent = String(valence);
    }
    if (tensionValue) {
      tensionValue.textContent = String(tension);
    }
    if (valenceDelta) {
      valenceDelta.textContent = formatSignedNumber(valenceDeltaValue);
    }
    if (tensionDelta) {
      tensionDelta.textContent = formatSignedNumber(tensionDeltaValue);
    }
    if (valenceSummary) {
      valenceSummary.textContent = buildMetricSummary('valence', valence, valenceDeltaValue);
    }
    if (tensionSummary) {
      tensionSummary.textContent = buildMetricSummary('tension', tension, tensionDeltaValue);
    }
    if (valenceTrend) {
      valenceTrend.textContent = getMetricTrend('valence', valenceDeltaValue);
    }
    if (tensionTrend) {
      tensionTrend.textContent = getMetricTrend('tension', tensionDeltaValue);
    }
  }

  function update(root, session, options) {
    if (!root || !session) {
      return;
    }

    var priorState = root.__chatSidebarState || {};
    var physicalContext = session.physicalContext || {};
    var relationshipState = session.relationshipState || {};
    var leadInContext = session.leadInContext || {};
    var hasKnowledgeState = Object.prototype.hasOwnProperty.call(session, 'knowledgeState');
    var hasChatBible = Object.prototype.hasOwnProperty.call(session, 'chatBible');
    var hasRollingSummary = Object.prototype.hasOwnProperty.call(session, 'rollingSummary');
    var knowledgeState = hasKnowledgeState ? (session.knowledgeState || {}) : (priorState.knowledgeState || {});
    var chatBible = hasChatBible ? session.chatBible : (priorState.chatBible || null);
    var rollingSummary = hasRollingSummary ? session.rollingSummary : (priorState.rollingSummary || null);
    var relationshipTimeline = options && Array.isArray(options.relationshipTimeline)
      ? options.relationshipTimeline
      : buildNextRelationshipTimeline(
        root.__chatRelationshipTimeline,
        options && options.latestRelationshipSnapshot,
        options && options.latestTurnNumber
      );
    var relationshipSnapshot = getLatestRelationshipSnapshot(relationshipTimeline);

    updateField(root, 'location', physicalContext.location, '');
    updateField(root, 'microLocation', physicalContext.microLocation, '');
    updateField(root, 'timeOfDay', physicalContext.timeOfDay, '');
    updateField(root, 'privacy', physicalContext.privacy, '');
    updateField(root, 'distanceBand', physicalContext.distanceBand, '');
    updateField(root, 'characterActivity', physicalContext.characterActivity, '');
    updateField(
      root,
      'interactableObjects',
      Array.isArray(physicalContext.interactableObjects) && physicalContext.interactableObjects.length > 0
        ? physicalContext.interactableObjects.join(', ')
        : 'None',
      'None'
    );
    updateField(
      root,
      'ambientConditions',
      Array.isArray(physicalContext.ambientConditions) && physicalContext.ambientConditions.length > 0
        ? physicalContext.ambientConditions.join(', ')
        : 'None',
      'None'
    );
    updateField(root, 'dynamic', relationshipSnapshot && relationshipSnapshot.dynamic, relationshipState.dynamic || 'Unformed');
    updateField(root, 'valence', String(resolveRelationshipMetric(relationshipSnapshot, relationshipState, 'valence')), '0');
    updateField(root, 'tension', String(resolveRelationshipMetric(relationshipSnapshot, relationshipState, 'tension')), '0');
    updateField(root, 'leverage', relationshipSnapshot && relationshipSnapshot.leverage, relationshipState.leverage || 'None');
    updateField(root, 'whyNow', leadInContext.whyNow, '');

    renderPillList(
      root.querySelector('[data-chat-list="interactableObjects"]'),
      physicalContext.interactableObjects,
      'None'
    );
    renderBulletList(
      root.querySelector('[data-chat-list="ambientConditions"]'),
      physicalContext.ambientConditions,
      'None'
    );
    updateField(root, 'knowledgeSummary', buildKnowledgeSummary(knowledgeState), '0 facts, 0 suspicions');
    renderBulletList(root.querySelector('[data-chat-list="knownFacts"]'), knowledgeState.knownFacts, 'No facts tracked.');
    renderBulletList(root.querySelector('[data-chat-list="suspicions"]'), knowledgeState.suspicions, 'No suspicions tracked.');
    renderBulletList(
      root.querySelector('[data-chat-list="falseBeliefs"]'),
      knowledgeState.falseBeliefs,
      'No false beliefs tracked.'
    );
    renderBulletList(
      root.querySelector('[data-chat-list="secretsRevealed"]'),
      knowledgeState.secretsRevealed,
      'No secrets revealed.'
    );

    updateField(
      root,
      'currentObjectiveSummary',
      truncateSummary(chatBible && chatBible.characterNow && chatBible.characterNow.currentObjective, 60, 'No objective available'),
      'No objective available'
    );
    updateField(
      root,
      'currentObjective',
      normalizeText(chatBible && chatBible.characterNow && chatBible.characterNow.currentObjective, 'No current objective available.'),
      'No current objective available.'
    );
    updateField(
      root,
      'immediateNeedFromConversation',
      normalizeText(
        chatBible && chatBible.characterNow && chatBible.characterNow.immediateNeedFromConversation,
        'No immediate need available.'
      ),
      'No immediate need available.'
    );
    updateField(
      root,
      'emotionalState',
      normalizeText(chatBible && chatBible.characterNow && chatBible.characterNow.emotionalState, 'No emotional state available.'),
      'No emotional state available.'
    );
    updateField(
      root,
      'willingnessToEngage',
      normalizeText(chatBible && chatBible.characterNow && chatBible.characterNow.willingnessToEngage, 'Unknown'),
      'Unknown'
    );
    renderBulletList(
      root.querySelector('[data-chat-list="topicsToAdvance"]'),
      chatBible && chatBible.characterNow && chatBible.characterNow.topicsToAdvance,
      'No active advance topics.'
    );
    renderBulletList(
      root.querySelector('[data-chat-list="topicsToProtect"]'),
      chatBible && chatBible.characterNow && chatBible.characterNow.topicsToProtect,
      'No protected topics.',
      { prefixText: 'Lock', prefixClass: 'chat-list-prefix' }
    );
    renderBulletList(
      root.querySelector('[data-chat-list="beliefsAboutInterlocutor"]'),
      relationshipSnapshot && relationshipSnapshot.whatCharacterBelievesAboutInterlocutor,
      'No beliefs recorded.'
    );
    renderBulletList(
      root.querySelector('[data-chat-list="secretsKept"]'),
      chatBible && chatBible.knowledgeNow && chatBible.knowledgeNow.secretsKept,
      'No secrets currently kept.'
    );
    renderBulletList(
      root.querySelector('[data-chat-list="knowledgeBoundaries"]'),
      chatBible && chatBible.knowledgeNow && chatBible.knowledgeNow.knowledgeBoundaries,
      'No active knowledge boundaries.'
    );
    updateField(root, 'conversationSummary', buildConversationSummary(chatBible), '0 threads, 0 commitments');
    updateField(
      root,
      'lastTurnPressure',
      normalizeText(chatBible && chatBible.conversationNow && chatBible.conversationNow.lastTurnPressure, 'No active last-turn pressure.'),
      'No active last-turn pressure.'
    );
    updateField(
      root,
      'conversationRollingSummary',
      normalizeText(rollingSummary && rollingSummary.compressedSummary, 'No rolling summary available.'),
      'No rolling summary available.'
    );
    renderBulletList(
      root.querySelector('[data-chat-list="activeThreads"]'),
      chatBible && chatBible.conversationNow && chatBible.conversationNow.activeThreads,
      'No active threads.'
    );
    renderBulletList(
      root.querySelector('[data-chat-list="commitments"]'),
      chatBible && chatBible.conversationNow && chatBible.conversationNow.commitments,
      'No commitments tracked.'
    );
    renderBulletList(
      root.querySelector('[data-chat-list="sensitiveTopics"]'),
      chatBible && chatBible.conversationNow && chatBible.conversationNow.sensitiveTopics,
      'No sensitive topics noted.'
    );
    updateField(root, 'guardrailsSummary', buildGuardrailsSummary(chatBible), '0 guardrails, 0 constraints');
    renderBulletList(
      root.querySelector('[data-chat-list="continuityGuardrails"]'),
      chatBible && chatBible.continuityGuardrails,
      'No continuity guardrails.'
    );
    renderBulletList(
      root.querySelector('[data-chat-list="responseConstraints"]'),
      chatBible && chatBible.responseConstraints,
      'No response constraints.'
    );

    updateRelationshipVisuals(root, relationshipTimeline, relationshipState);
    root.__chatRelationshipTimeline = relationshipTimeline;
    root.__chatSidebarState = {
      physicalContext: physicalContext,
      relationshipState: relationshipState,
      leadInContext: leadInContext,
      knowledgeState: knowledgeState,
      rollingSummary: rollingSummary,
      chatBible: chatBible,
    };
  }

  function init(root, session) {
    if (!root) {
      return;
    }

    var bootstrap = readBootstrap();
    var relationshipTimeline = bootstrap && Array.isArray(bootstrap.relationshipTimeline)
      ? bootstrap.relationshipTimeline
      : [];
    var initialSession = Object.assign({}, session, {
      knowledgeState: bootstrap && bootstrap.knowledgeState ? bootstrap.knowledgeState : undefined,
      rollingSummary: bootstrap && Object.prototype.hasOwnProperty.call(bootstrap, 'rollingSummary')
        ? bootstrap.rollingSummary
        : undefined,
      chatBible: bootstrap && Object.prototype.hasOwnProperty.call(bootstrap, 'chatBible')
        ? bootstrap.chatBible
        : undefined,
    });

    update(root, initialSession, { relationshipTimeline: relationshipTimeline });
  }

  return {
    init: init,
    update: update,
  };
})();
