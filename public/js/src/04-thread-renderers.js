  // ── Thread renderers ──────────────────────────────────────────────

  function renderThreadBadgePill(threadType, urgency) {
    var threadTypeIconPath = getIconPath('thread_type_' + threadType);
    var urgencyIconPath = getIconPath('thread_urgency_' + urgency);
    var html = '<span class="thread-icon-pill" aria-hidden="true">';

    html += '<span class="thread-icon-badge thread-icon-badge--type">';
    if (threadTypeIconPath) {
      html += '<img class="thread-icon thread-icon--type"'
        + ' src="' + escapeHtml(threadTypeIconPath) + '"'
        + ' alt="" title="' + escapeHtml(threadType) + '"'
        + ' loading="lazy"'
        + " onerror=\"this.style.display='none'\">";
    }
    html += '</span>';

    html += '<span class="thread-icon-badge thread-icon-badge--urgency">';
    if (urgencyIconPath) {
      html += '<img class="thread-icon thread-icon--urgency"'
        + ' src="' + escapeHtml(urgencyIconPath) + '"'
        + ' alt="" title="' + escapeHtml(urgency) + '"'
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

  function ensureSidebarContainer(narrativeElement) {
    var existing = document.getElementById('sidebar-widgets');
    if (existing) {
      return existing;
    }
    var container = document.createElement('div');
    container.className = 'sidebar-widgets';
    container.id = 'sidebar-widgets';
    narrativeElement.before(container);
    return container;
  }

  function cleanupEmptySidebar(sidebarContainer) {
    if (!sidebarContainer) {
      return;
    }
    var asides = sidebarContainer.querySelectorAll('aside');
    if (asides.length === 0) {
      sidebarContainer.remove();
    }
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

    var visible = normalized.slice(0, KEYED_ENTRY_PANEL_LIMIT);
    var hiddenCount = normalized.length - KEYED_ENTRY_PANEL_LIMIT;
    var overflowText = typeof config.overflowSummary === 'string' && config.overflowSummary.trim().length > 0
      ? config.overflowSummary.trim()
      : (hiddenCount > 0 ? '+' + hiddenCount + ' more not shown' : null);

    var listHtml = visible.map(function(entry) {
      return '<li class="' + config.itemClass + '">' + escapeHtml(entry.text) + '</li>';
    }).join('');

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
    });
  }

