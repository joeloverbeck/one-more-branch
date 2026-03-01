  // ── Character Knowledge renderer ────────────────────────────────

  function renderKnowledgeStateField(icon, label, items) {
    if (!Array.isArray(items) || items.length === 0) {
      return '';
    }
    var html = '<div class="knowledge-state-field">';
    html += '<div class="knowledge-state-field-header">';
    html += '<span class="knowledge-state-icon" aria-hidden="true">' + icon + '</span>';
    html += '<span class="knowledge-state-label">' + escapeHtml(label) + '</span>';
    html += '</div>';
    html += '<ul class="knowledge-state-list">';
    items.forEach(function(item) {
      html += '<li>' + escapeHtml(String(item)) + '</li>';
    });
    html += '</ul>';
    html += '</div>';
    return html;
  }

  function renderKnowledgeStateCard(entry) {
    if (!entry || typeof entry !== 'object') {
      return '';
    }

    var characterName = typeof entry.characterName === 'string' ? entry.characterName : '';
    if (!characterName) {
      return '';
    }

    var knownFacts = Array.isArray(entry.knownFacts) ? entry.knownFacts : [];
    var falseBeliefs = Array.isArray(entry.falseBeliefs) ? entry.falseBeliefs : [];
    var secrets = Array.isArray(entry.secrets) ? entry.secrets : [];

    var fieldsHtml = '';
    fieldsHtml += renderKnowledgeStateField('\uD83D\uDCDA', 'Known Facts', knownFacts);
    fieldsHtml += renderKnowledgeStateField('\u274C', 'False Beliefs', falseBeliefs);
    fieldsHtml += renderKnowledgeStateField('\uD83D\uDD12', 'Secrets', secrets);

    if (!fieldsHtml) {
      return '';
    }

    var html = '<div class="knowledge-state-card" data-character="' + escapeHtml(characterName) + '">';
    html += '<div class="knowledge-state-header">';
    html += '<span class="knowledge-state-name">' + escapeHtml(characterName) + '</span>';
    html += '</div>';
    html += '<div class="knowledge-state-details" style="display: none;">';
    html += '<div class="knowledge-state-fields">';
    html += fieldsHtml;
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function bindKnowledgeStateCardToggles(panel) {
    if (!panel) {
      return;
    }
    var cards = panel.querySelectorAll('.knowledge-state-card');
    cards.forEach(function(card) {
      var header = card.querySelector('.knowledge-state-header');
      var details = card.querySelector('.knowledge-state-details');
      if (!header || !details) {
        return;
      }
      header.addEventListener('click', function() {
        var isHidden = details.style.display === 'none';
        details.style.display = isHidden ? 'block' : 'none';
      });
    });
  }

  function renderKnowledgeStatePanel(knowledgeState, leftSidebarContainer) {
    var existingPanel = document.getElementById('knowledge-state-panel');

    if (!Array.isArray(knowledgeState) || knowledgeState.length === 0) {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    var cardsHtml = knowledgeState.map(function(entry) {
      return renderKnowledgeStateCard(entry);
    }).join('');

    if (!cardsHtml) {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    if (existingPanel) {
      var content = existingPanel.querySelector('#knowledge-state-content');
      if (content) {
        content.innerHTML = cardsHtml;
      }
      bindKnowledgeStateCardToggles(existingPanel);
      return;
    }

    var panel = document.createElement('aside');
    panel.className = 'knowledge-state-panel';
    panel.id = 'knowledge-state-panel';
    panel.setAttribute('aria-labelledby', 'knowledge-state-title');
    panel.innerHTML = '<h3 class="knowledge-state-title" id="knowledge-state-title">Character Knowledge</h3>'
      + '<div class="knowledge-state-content" id="knowledge-state-content">'
      + cardsHtml
      + '</div>';

    // Insert after NPC agendas panel, before inventory panel
    var agendaPanel = leftSidebarContainer.querySelector('#npc-agendas-panel');
    var inventoryPanel = leftSidebarContainer.querySelector('#inventory-panel');
    if (agendaPanel && agendaPanel.nextSibling) {
      leftSidebarContainer.insertBefore(panel, agendaPanel.nextSibling);
    } else if (inventoryPanel) {
      leftSidebarContainer.insertBefore(panel, inventoryPanel);
    } else {
      leftSidebarContainer.appendChild(panel);
    }

    bindKnowledgeStateCardToggles(panel);
  }
