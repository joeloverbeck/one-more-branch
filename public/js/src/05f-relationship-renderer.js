  // ── NPC Relationship renderer ────────────────────────────────────

  function renderNpcRelationshipCard(rel) {
    if (!rel || typeof rel !== 'object') {
      return '';
    }

    var npcName = typeof rel.npcName === 'string' ? rel.npcName : '';
    var dynamic = typeof rel.dynamic === 'string' ? rel.dynamic : '';
    var valence = typeof rel.valence === 'number' ? rel.valence : 0;
    var history = typeof rel.history === 'string' ? rel.history : '';
    var currentTension = typeof rel.currentTension === 'string' ? rel.currentTension : '';
    var leverage = typeof rel.leverage === 'string' ? rel.leverage : '';

    if (!npcName) {
      return '';
    }

    var valencePercent = ((valence + 5) / 10) * 100;
    if (valencePercent < 0) valencePercent = 0;
    if (valencePercent > 100) valencePercent = 100;

    var html = '<div class="npc-rel-card" data-npc="' + escapeHtml(npcName) + '">';
    html += '<div class="npc-rel-header">';
    html += '<span class="npc-rel-name">' + escapeHtml(npcName) + '</span>';
    html += '<span class="npc-rel-dynamic-pill">' + escapeHtml(dynamic) + '</span>';
    html += '</div>';
    html += '<div class="npc-rel-gauge">';
    html += '<div class="npc-rel-gauge-bar">';
    html += '<span class="npc-rel-gauge-marker" style="left: ' + valencePercent + '%"></span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="npc-rel-details" style="display: none;">';
    if (history) {
      html += '<p class="npc-rel-detail"><strong>History:</strong> ' + escapeHtml(history) + '</p>';
    }
    if (currentTension) {
      html += '<p class="npc-rel-detail"><strong>Tension:</strong> ' + escapeHtml(currentTension) + '</p>';
    }
    if (leverage) {
      html += '<p class="npc-rel-detail"><strong>Leverage:</strong> ' + escapeHtml(leverage) + '</p>';
    }
    html += '</div>';
    html += '</div>';
    return html;
  }

  function bindNpcRelationshipCardToggles(panel) {
    if (!panel) {
      return;
    }
    var cards = panel.querySelectorAll('.npc-rel-card');
    cards.forEach(function(card) {
      var header = card.querySelector('.npc-rel-header');
      var details = card.querySelector('.npc-rel-details');
      if (!header || !details) {
        return;
      }
      header.addEventListener('click', function() {
        var isHidden = details.style.display === 'none';
        details.style.display = isHidden ? 'block' : 'none';
      });
    });
  }

  function renderNpcRelationshipsPanel(relationships, leftSidebarContainer) {
    var existingPanel = document.getElementById('npc-relationships-panel');

    if (!Array.isArray(relationships) || relationships.length === 0) {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    var cardsHtml = relationships.map(function(rel) {
      return renderNpcRelationshipCard(rel);
    }).join('');

    if (!cardsHtml) {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    if (existingPanel) {
      var content = existingPanel.querySelector('#npc-relationships-content');
      if (content) {
        content.innerHTML = cardsHtml;
      }
      bindNpcRelationshipCardToggles(existingPanel);
      return;
    }

    var panel = document.createElement('aside');
    panel.className = 'npc-relationships-panel';
    panel.id = 'npc-relationships-panel';
    panel.setAttribute('aria-labelledby', 'npc-relationships-title');
    panel.innerHTML = '<h3 class="npc-relationships-title" id="npc-relationships-title">NPC Relationships</h3>'
      + '<div class="npc-relationships-content" id="npc-relationships-content">'
      + cardsHtml
      + '</div>';

    // Insert after affect panel, before inventory panel
    var affectPanel = leftSidebarContainer.querySelector('#affect-panel');
    var inventoryPanel = leftSidebarContainer.querySelector('#inventory-panel');
    if (affectPanel && affectPanel.nextSibling) {
      leftSidebarContainer.insertBefore(panel, affectPanel.nextSibling);
    } else if (inventoryPanel) {
      leftSidebarContainer.insertBefore(panel, inventoryPanel);
    } else {
      leftSidebarContainer.appendChild(panel);
    }

    bindNpcRelationshipCardToggles(panel);
  }
