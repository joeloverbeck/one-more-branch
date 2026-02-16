  // ── Thread renderers ──────────────────────────────────────────────

  function renderThreadBadgePill(threadType, urgency) {
    var iconPath = getThreadIconPath(threadType, urgency);
    var html = '<span class="thread-icon-pill" aria-hidden="true">';

    html += '<span class="thread-icon-badge">';
    if (iconPath) {
      html += '<img class="thread-icon"'
        + ' src="' + escapeHtml(iconPath) + '"'
        + ' alt="" title="' + escapeHtml(threadType + ' (' + urgency + ')') + '"'
        + ' loading="lazy"'
        + " onerror=\"this.style.display='none'\">";
    }
    html += '</span>';

    html += '</span>';
    return html;
  }

  function renderThreatBadgePill(threatType) {
    var threatTypeIconPath = getIconPath('threat_' + threatType);
    var html = '<span class="thread-icon-pill" aria-hidden="true">';

    html += '<span class="thread-icon-badge thread-icon-badge--type thread-icon-badge--threat">';
    if (threatTypeIconPath) {
      html += '<img class="thread-icon thread-icon--type thread-icon--threat"'
        + ' src="' + escapeHtml(threatTypeIconPath) + '"'
        + ' alt="" title="' + escapeHtml(threatType) + '"'
        + ' loading="lazy"'
        + " onerror=\"this.style.display='none'\">";
    }
    html += '</span>';

    html += '</span>';
    return html;
  }

  function renderConstraintBadgePill(constraintType) {
    var constraintTypeIconPath = getIconPath('constraint_' + constraintType);
    var html = '<span class="thread-icon-pill" aria-hidden="true">';

    html += '<span class="thread-icon-badge thread-icon-badge--type">';
    if (constraintTypeIconPath) {
      html += '<img class="thread-icon thread-icon--type"'
        + ' src="' + escapeHtml(constraintTypeIconPath) + '"'
        + ' alt="" title="' + escapeHtml(constraintType) + '"'
        + ' loading="lazy"'
        + " onerror=\"this.style.display='none'\">";
    }
    html += '</span>';

    html += '</span>';
    return html;
  }

  function renderPromiseBadgePill(promiseType, urgency) {
    var iconPath = getPromiseIconPath(promiseType, urgency);
    var html = '<span class="thread-icon-pill" aria-hidden="true">';

    html += '<span class="thread-icon-badge thread-icon-badge--type thread-icon-badge--promise">';
    if (iconPath) {
      html += '<img class="thread-icon thread-icon--type thread-icon--promise"'
        + ' src="' + escapeHtml(iconPath) + '"'
        + ' alt="" title="' + escapeHtml(promiseType + ' (' + urgency + ')') + '"'
        + ' loading="lazy"'
        + " onerror=\"this.style.display='none'\">";
    }
    html += '</span>';

    html += '</span>';
    return html;
  }

  function getOpenThreadUrgencyClass(urgency) {
    if (urgency === 'HIGH') {
      return 'open-threads-text--high';
    }
    if (urgency === 'MEDIUM') {
      return 'open-threads-text--medium';
    }
    if (urgency === 'LOW') {
      return 'open-threads-text--low';
    }
    return 'open-threads-text--low';
  }

  function getUrgencyPriority(urgency) {
    if (urgency === 'HIGH') {
      return 0;
    }
    if (urgency === 'MEDIUM') {
      return 1;
    }
    if (urgency === 'LOW') {
      return 2;
    }
    return 3;
  }

  function buildOpenThreadOverflowSummary(hiddenThreads) {
    if (!Array.isArray(hiddenThreads) || hiddenThreads.length === 0) {
      return null;
    }

    var highCount = 0;
    var mediumCount = 0;
    var lowCount = 0;

    hiddenThreads.forEach(function(thread) {
      if (thread.urgency === 'HIGH') {
        highCount += 1;
        return;
      }
      if (thread.urgency === 'MEDIUM') {
        mediumCount += 1;
        return;
      }
      if (thread.urgency === 'LOW') {
        lowCount += 1;
      }
    });

    var parts = [];
    if (highCount > 0) {
      parts.push(highCount + ' (high)');
    }
    if (mediumCount > 0) {
      parts.push(mediumCount + ' (medium)');
    }
    if (lowCount > 0) {
      parts.push(lowCount + ' (low)');
    }

    if (parts.length === 0) {
      return null;
    }

    return 'Not shown: ' + parts.join(', ');
  }

  function ensureSidebarContainer() {
    return document.getElementById('sidebar-widgets');
  }

  function cleanupEmptySidebar() {
    // Container is a grid cell; never remove it
  }

  function renderOpenThreadsPanel(openThreads, openThreadOverflowSummary, sidebarContainer) {
    const existingPanel = document.getElementById('open-threads-panel');

    if (!Array.isArray(openThreads) || openThreads.length === 0) {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    const normalizedThreads = openThreads
      .map(function(thread, index) {
        if (!thread || typeof thread !== 'object') {
          return null;
        }

        var id = typeof thread.id === 'string' ? thread.id : '';
        var text = typeof thread.text === 'string' ? thread.text : '';
        var threadType = typeof thread.threadType === 'string' ? thread.threadType : '';
        var urgency = typeof thread.urgency === 'string' ? thread.urgency : '';

        if (!id || !text || !threadType || !urgency) {
          return null;
        }

        return { id: id, text: text, threadType: threadType, urgency: urgency, index: index };
      })
      .filter(function(thread) {
        return thread !== null;
      })
      .sort(function(left, right) {
        var urgencyDelta = getUrgencyPriority(left.urgency) - getUrgencyPriority(right.urgency);
        if (urgencyDelta !== 0) {
          return urgencyDelta;
        }
        return left.index - right.index;
      });

    if (normalizedThreads.length === 0) {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    const visibleThreads = normalizedThreads.slice(0, OPEN_THREADS_PANEL_LIMIT);
    const hiddenThreads = normalizedThreads.slice(OPEN_THREADS_PANEL_LIMIT);
    const normalizedOverflowSummary =
      typeof openThreadOverflowSummary === 'string' && openThreadOverflowSummary.trim().length > 0
        ? openThreadOverflowSummary.trim()
        : buildOpenThreadOverflowSummary(hiddenThreads);

    const listHtml = visibleThreads.map(function(thread) {
      var urgencyClass = getOpenThreadUrgencyClass(thread.urgency);
      return '<li class="open-threads-item">'
        + renderThreadBadgePill(thread.threadType, thread.urgency)
        + '<span class="open-threads-text ' + urgencyClass + '">' + escapeHtml(thread.text) + '</span>'
        + '</li>';
    }).join('');

    if (existingPanel) {
      const list = existingPanel.querySelector('#open-threads-list');
      if (list) {
        list.innerHTML = listHtml;
      }
      const existingSummary = existingPanel.querySelector('#open-threads-overflow-summary');
      if (normalizedOverflowSummary) {
        if (existingSummary) {
          existingSummary.textContent = normalizedOverflowSummary;
        } else {
          const summary = document.createElement('div');
          summary.className = 'open-threads-overflow-summary';
          summary.id = 'open-threads-overflow-summary';
          summary.textContent = normalizedOverflowSummary;
          existingPanel.appendChild(summary);
        }
      } else if (existingSummary) {
        existingSummary.remove();
      }
      return;
    }

    const summaryHtml = normalizedOverflowSummary
      ? '<div class="open-threads-overflow-summary" id="open-threads-overflow-summary">'
          + escapeHtml(normalizedOverflowSummary)
          + '</div>'
      : '';
    const panel = document.createElement('aside');
    panel.className = 'open-threads-panel';
    panel.id = 'open-threads-panel';
    panel.setAttribute('aria-labelledby', 'open-threads-title');
    panel.innerHTML = '<h3 class="open-threads-title" id="open-threads-title">Active Threads</h3>'
      + '<ul class="open-threads-list" id="open-threads-list">'
      + listHtml
      + '</ul>'
      + summaryHtml;

    sidebarContainer.appendChild(panel);
  }

  function renderKeyedEntryPanel(config) {
    var existingPanel = document.getElementById(config.panelId);

    if (!Array.isArray(config.entries) || config.entries.length === 0) {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    var normalized = config.entries
      .filter(function(entry) {
        return entry && typeof entry === 'object'
          && typeof entry.id === 'string' && entry.id.length > 0
          && typeof entry.text === 'string' && entry.text.length > 0;
      });

    if (normalized.length === 0) {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    var limit = typeof config.limit === 'number' ? config.limit : KEYED_ENTRY_PANEL_LIMIT;
    var visible = normalized.slice(0, limit);
    var hiddenCount = normalized.length - limit;
    var overflowText = typeof config.overflowSummary === 'string' && config.overflowSummary.trim().length > 0
      ? config.overflowSummary.trim()
      : (hiddenCount > 0 ? '+' + hiddenCount + ' more not shown' : null);

    var listHtml = visible
      .map(function(entry) {
        if (typeof config.renderEntry === 'function') {
          return '<li class="' + config.itemClass + '">' + config.renderEntry(entry) + '</li>';
        }
        return '<li class="' + config.itemClass + '">' + escapeHtml(entry.text) + '</li>';
      })
      .join('');

    if (existingPanel) {
      var list = existingPanel.querySelector('#' + config.listId);
      if (list) {
        list.innerHTML = listHtml;
      }
      var existingSummary = existingPanel.querySelector('#' + config.overflowId);
      if (overflowText) {
        if (existingSummary) {
          existingSummary.textContent = overflowText;
        } else {
          var summary = document.createElement('div');
          summary.className = 'keyed-entry-overflow-summary';
          summary.id = config.overflowId;
          summary.textContent = overflowText;
          existingPanel.appendChild(summary);
        }
      } else if (existingSummary) {
        existingSummary.remove();
      }
      return;
    }

    var summaryHtml = overflowText
      ? '<div class="keyed-entry-overflow-summary" id="' + config.overflowId + '">'
          + escapeHtml(overflowText)
          + '</div>'
      : '';
    var panel = document.createElement('aside');
    panel.className = config.panelClass;
    panel.id = config.panelId;
    panel.setAttribute('aria-labelledby', config.titleId);
    panel.innerHTML = '<h3 class="' + config.titleClass + '" id="' + config.titleId + '">'
      + escapeHtml(config.title) + '</h3>'
      + '<ul class="' + config.listClass + '" id="' + config.listId + '">'
      + listHtml
      + '</ul>'
      + summaryHtml;

    config.container.appendChild(panel);
  }

  function renderActiveThreatsPanel(threats, threatsOverflowSummary, sidebarContainer) {
    renderKeyedEntryPanel({
      panelId: 'active-threats-panel',
      titleId: 'active-threats-title',
      listId: 'active-threats-list',
      overflowId: 'active-threats-overflow',
      panelClass: 'active-threats-panel',
      titleClass: 'active-threats-title',
      listClass: 'active-threats-list',
      itemClass: 'active-threats-item',
      title: 'Active Threats',
      entries: threats,
      overflowSummary: threatsOverflowSummary,
      container: sidebarContainer,
      renderEntry: function(entry) {
        var threatType = typeof entry.threatType === 'string' ? entry.threatType : '';
        if (!threatType) {
          return escapeHtml(entry.text);
        }
        return renderThreatBadgePill(threatType) + '<span>' + escapeHtml(entry.text) + '</span>';
      },
    });
  }

  function renderActiveConstraintsPanel(constraints, constraintsOverflowSummary, sidebarContainer) {
    renderKeyedEntryPanel({
      panelId: 'active-constraints-panel',
      titleId: 'active-constraints-title',
      listId: 'active-constraints-list',
      overflowId: 'active-constraints-overflow',
      panelClass: 'active-constraints-panel',
      titleClass: 'active-constraints-title',
      listClass: 'active-constraints-list',
      itemClass: 'active-constraints-item',
      title: 'Active Constraints',
      entries: constraints,
      overflowSummary: constraintsOverflowSummary,
      container: sidebarContainer,
      renderEntry: function(entry) {
        var constraintType = typeof entry.constraintType === 'string' ? entry.constraintType : '';
        if (!constraintType) {
          return escapeHtml(entry.text);
        }
        return (
          renderConstraintBadgePill(constraintType) + '<span>' + escapeHtml(entry.text) + '</span>'
        );
      },
    });
  }

  function formatPromiseScope(value) {
    if (typeof value !== 'string' || value.length === 0) {
      return '';
    }
    return value.charAt(0) + value.slice(1).toLowerCase();
  }

  function renderTrackedPromisesPanel(promises, trackedPromisesOverflowSummary, sidebarContainer) {
    renderKeyedEntryPanel({
      panelId: 'tracked-promises-panel',
      titleId: 'tracked-promises-title',
      listId: 'tracked-promises-list',
      overflowId: 'tracked-promises-overflow',
      panelClass: 'tracked-promises-panel',
      titleClass: 'tracked-promises-title',
      listClass: 'tracked-promises-list',
      itemClass: 'tracked-promises-item',
      title: 'Tracked Promises',
      entries: Array.isArray(promises) ? promises.map(function(p) {
        return {
          id: typeof p.id === 'string' ? p.id : '',
          text: typeof p.text === 'string' ? p.text : '',
          promiseType: typeof p.promiseType === 'string' ? p.promiseType : '',
          scope: typeof p.scope === 'string' ? p.scope : '',
          age: typeof p.age === 'number' ? p.age : 0,
          suggestedUrgency: typeof p.suggestedUrgency === 'string' ? p.suggestedUrgency : '',
        };
      }) : [],
      overflowSummary: trackedPromisesOverflowSummary,
      container: sidebarContainer,
      renderEntry: function(entry) {
        var scopeLabel = formatPromiseScope(entry.scope);
        return renderPromiseBadgePill(entry.promiseType, entry.suggestedUrgency)
          + (scopeLabel ? '<span class="promise-scope-badge">' + escapeHtml(scopeLabel) + '</span>' : '')
          + '<span class="promise-age-badge">' + entry.age + ' pg</span>'
          + '<span>' + escapeHtml(entry.text) + '</span>';
      },
    });
  }

  function ensureLeftSidebarContainer() {
    return document.getElementById('left-sidebar-widgets');
  }

  function cleanupEmptyLeftSidebar() {
    // Container is a grid cell; never remove it
  }

  function renderInventoryPanel(inventory, inventoryOverflowSummary, leftSidebarContainer) {
    renderKeyedEntryPanel({
      panelId: 'inventory-panel',
      titleId: 'inventory-title',
      listId: 'inventory-list',
      overflowId: 'inventory-overflow',
      panelClass: 'inventory-panel',
      titleClass: 'inventory-title',
      listClass: 'inventory-list',
      itemClass: 'inventory-item',
      title: 'Inventory',
      entries: inventory,
      overflowSummary: inventoryOverflowSummary,
      container: leftSidebarContainer,
      limit: LEFT_PANEL_LIMIT,
    });
  }

  function renderHealthPanel(health, healthOverflowSummary, leftSidebarContainer) {
    renderKeyedEntryPanel({
      panelId: 'health-panel',
      titleId: 'health-title',
      listId: 'health-list',
      overflowId: 'health-overflow',
      panelClass: 'health-panel',
      titleClass: 'health-title',
      listClass: 'health-list',
      itemClass: 'health-item',
      title: 'Health',
      entries: health,
      overflowSummary: healthOverflowSummary,
      container: leftSidebarContainer,
      limit: LEFT_PANEL_LIMIT,
    });
  }
