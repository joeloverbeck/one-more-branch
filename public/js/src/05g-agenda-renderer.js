  // ── NPC Agenda renderer ──────────────────────────────────────────

  function renderNpcAgendaCard(agenda) {
    if (!agenda || typeof agenda !== 'object') {
      return '';
    }

    var npcName = typeof agenda.npcName === 'string' ? agenda.npcName : '';
    var currentGoal = typeof agenda.currentGoal === 'string' ? agenda.currentGoal : '';
    var leverage = typeof agenda.leverage === 'string' ? agenda.leverage : '';
    var fear = typeof agenda.fear === 'string' ? agenda.fear : '';
    var offScreenBehavior = typeof agenda.offScreenBehavior === 'string' ? agenda.offScreenBehavior : '';

    if (!npcName) {
      return '';
    }

    var html = '<div class="npc-agenda-card" data-npc="' + escapeHtml(npcName) + '">';
    html += '<div class="npc-agenda-header">';
    html += '<span class="npc-agenda-name">' + escapeHtml(npcName) + '</span>';
    html += '</div>';
    html += '<div class="npc-agenda-fields">';
    html += '<p class="npc-agenda-field">';
    html += '<span class="npc-agenda-icon" aria-hidden="true">\uD83C\uDFAF</span>';
    html += '<span class="npc-agenda-label">Goal</span>';
    html += '<span class="npc-agenda-value">' + escapeHtml(currentGoal) + '</span>';
    html += '</p>';
    html += '<p class="npc-agenda-field">';
    html += '<span class="npc-agenda-icon" aria-hidden="true">\u2694\uFE0F</span>';
    html += '<span class="npc-agenda-label">Leverage</span>';
    html += '<span class="npc-agenda-value">' + escapeHtml(leverage) + '</span>';
    html += '</p>';
    html += '<p class="npc-agenda-field">';
    html += '<span class="npc-agenda-icon" aria-hidden="true">\uD83D\uDC80</span>';
    html += '<span class="npc-agenda-label">Fear</span>';
    html += '<span class="npc-agenda-value">' + escapeHtml(fear) + '</span>';
    html += '</p>';
    html += '<p class="npc-agenda-field">';
    html += '<span class="npc-agenda-icon" aria-hidden="true">\uD83D\uDC41\uFE0F</span>';
    html += '<span class="npc-agenda-label">Off-screen</span>';
    html += '<span class="npc-agenda-value">' + escapeHtml(offScreenBehavior) + '</span>';
    html += '</p>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderNpcAgendasPanel(agendas, leftSidebarContainer) {
    var existingPanel = document.getElementById('npc-agendas-panel');

    if (!Array.isArray(agendas) || agendas.length === 0) {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    var cardsHtml = agendas.map(function(agenda) {
      return renderNpcAgendaCard(agenda);
    }).join('');

    if (!cardsHtml) {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    if (existingPanel) {
      var content = existingPanel.querySelector('#npc-agendas-content');
      if (content) {
        content.innerHTML = cardsHtml;
      }
      return;
    }

    var panel = document.createElement('aside');
    panel.className = 'npc-agendas-panel';
    panel.id = 'npc-agendas-panel';
    panel.setAttribute('aria-labelledby', 'npc-agendas-title');
    panel.innerHTML = '<h3 class="npc-agendas-title" id="npc-agendas-title">NPC Agendas</h3>'
      + '<div class="npc-agendas-content" id="npc-agendas-content">'
      + cardsHtml
      + '</div>';

    // Insert after relationships panel, before inventory panel
    var relPanel = leftSidebarContainer.querySelector('#npc-relationships-panel');
    var inventoryPanel = leftSidebarContainer.querySelector('#inventory-panel');
    if (relPanel && relPanel.nextSibling) {
      leftSidebarContainer.insertBefore(panel, relPanel.nextSibling);
    } else if (inventoryPanel) {
      leftSidebarContainer.insertBefore(panel, inventoryPanel);
    } else {
      leftSidebarContainer.appendChild(panel);
    }
  }
