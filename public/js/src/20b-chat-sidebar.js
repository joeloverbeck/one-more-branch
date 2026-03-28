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

  function renderBulletList(container, items, emptyLabel) {
    if (!container) {
      return;
    }

    var safeItems = Array.isArray(items) ? items.filter(function (item) {
      return typeof item === 'string' && item.trim().length > 0;
    }) : [];

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
      listItem.textContent = item;
      container.appendChild(listItem);
    });
  }

  function getGaugeBounds(name) {
    if (name === 'valence') {
      return { min: -5, max: 5 };
    }

    return { min: 0, max: 10 };
  }

  function renderGauge(root, name, value) {
    var gauge = root.querySelector('[data-chat-gauge="' + name + '"]');
    if (!gauge) {
      return;
    }

    var marker = gauge.querySelector('.chat-gauge__marker');
    if (!marker) {
      return;
    }

    var bounds = getGaugeBounds(name);
    var normalized = clamp((value - bounds.min) / (bounds.max - bounds.min), 0, 1);
    marker.style.left = String(normalized * 100) + '%';
    gauge.setAttribute('aria-valuemin', String(bounds.min));
    gauge.setAttribute('aria-valuemax', String(bounds.max));
    gauge.setAttribute('aria-valuenow', String(value));
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

    var polyline = document.createElementNS(SVG_NS, 'polyline');
    polyline.setAttribute('points', buildSparklinePoints(values, bounds.min, bounds.max));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', name === 'valence' ? '#7ae7ba' : '#ff8f6b');
    polyline.setAttribute('stroke-width', '2');
    polyline.setAttribute('stroke-linecap', 'round');
    polyline.setAttribute('stroke-linejoin', 'round');
    sparkline.appendChild(polyline);
  }

  function buildNextHistory(existingHistory, relationshipState) {
    var history = Array.isArray(existingHistory) ? existingHistory.slice() : [];
    if (!relationshipState) {
      return history;
    }

    var lastPoint = history.length > 0 ? history[history.length - 1] : null;
    if (
      lastPoint &&
      lastPoint.valence === relationshipState.valence &&
      lastPoint.tension === relationshipState.tension &&
      lastPoint.dynamic === relationshipState.dynamic
    ) {
      return history;
    }

    history.push({
      turnNumber: lastPoint ? lastPoint.turnNumber + 1 : 0,
      valence: relationshipState.valence,
      tension: relationshipState.tension,
      dynamic: relationshipState.dynamic || '',
    });
    return history;
  }

  function readDelta(history, name) {
    if (!Array.isArray(history) || history.length < 2) {
      return 0;
    }

    var previousPoint = history[history.length - 2];
    var currentPoint = history[history.length - 1];
    return currentPoint[name] - previousPoint[name];
  }

  function updateRelationshipVisuals(root, history, relationshipState) {
    var valence = relationshipState && typeof relationshipState.valence === 'number'
      ? relationshipState.valence
      : 0;
    var tension = relationshipState && typeof relationshipState.tension === 'number'
      ? relationshipState.tension
      : 0;

    renderGauge(root, 'valence', valence);
    renderGauge(root, 'tension', tension);
    renderSparkline(root, 'valence', history);
    renderSparkline(root, 'tension', history);

    var valenceValue = root.querySelector('[data-chat-gauge-value="valence"]');
    var tensionValue = root.querySelector('[data-chat-gauge-value="tension"]');
    var valenceDelta = root.querySelector('[data-chat-gauge-delta="valence"]');
    var tensionDelta = root.querySelector('[data-chat-gauge-delta="tension"]');

    if (valenceValue) {
      valenceValue.textContent = String(valence);
    }
    if (tensionValue) {
      tensionValue.textContent = String(tension);
    }
    if (valenceDelta) {
      valenceDelta.textContent = formatSignedNumber(readDelta(history, 'valence'));
    }
    if (tensionDelta) {
      tensionDelta.textContent = formatSignedNumber(readDelta(history, 'tension'));
    }
  }

  function update(root, session, options) {
    if (!root || !session) {
      return;
    }

    var physicalContext = session.physicalContext || {};
    var relationshipState = session.relationshipState || {};
    var leadInContext = session.leadInContext || {};
    var history = options && Array.isArray(options.relationshipHistory)
      ? options.relationshipHistory
      : buildNextHistory(root.__chatRelationshipHistory, relationshipState);

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
    updateField(root, 'dynamic', relationshipState.dynamic, 'Unformed');
    updateField(root, 'valence', String(relationshipState.valence != null ? relationshipState.valence : 0), '0');
    updateField(root, 'tension', String(relationshipState.tension != null ? relationshipState.tension : 0), '0');
    updateField(root, 'leverage', relationshipState.leverage, 'None');
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

    updateRelationshipVisuals(root, history, relationshipState);
    root.__chatRelationshipHistory = history;
  }

  function init(root, session) {
    if (!root) {
      return;
    }

    var bootstrap = readBootstrap();
    var relationshipHistory = bootstrap && Array.isArray(bootstrap.relationshipHistory)
      ? bootstrap.relationshipHistory
      : [];

    update(root, session, { relationshipHistory: relationshipHistory });
  }

  return {
    init: init,
    update: update,
  };
})();
