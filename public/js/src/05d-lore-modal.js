// ── Story lore modal ─────────────────────────────────────────────

function extractWorldFactText(fact) {
  if (typeof fact === 'string') {
    return fact.length > 0 ? fact : null;
  }
  if (fact && typeof fact === 'object' && typeof fact.text === 'string' && fact.text.length > 0) {
    return fact.text;
  }
  return null;
}

function parseLoreDataFromDom() {
  var node = document.getElementById('lore-data');
  if (!node || typeof node.textContent !== 'string') {
    return { worldFacts: [], characterCanon: {} };
  }

  try {
    var parsed = JSON.parse(node.textContent);
    if (!parsed || typeof parsed !== 'object') {
      return { worldFacts: [], characterCanon: {} };
    }

    var worldFacts = Array.isArray(parsed.worldFacts)
      ? parsed.worldFacts.map(extractWorldFactText).filter(Boolean)
      : [];
    var characterCanon = parsed.characterCanon && typeof parsed.characterCanon === 'object'
      ? parsed.characterCanon
      : {};

    return { worldFacts: worldFacts, characterCanon: characterCanon };
  } catch (_) {
    return { worldFacts: [], characterCanon: {} };
  }
}

function normalizeCharacterCanon(characterCanon) {
  if (!characterCanon || typeof characterCanon !== 'object') {
    return {};
  }

  var normalized = {};
  Object.keys(characterCanon).forEach(function(characterName) {
    var facts = characterCanon[characterName];
    if (!Array.isArray(facts)) {
      return;
    }

    var validFacts = facts.filter(function(fact) {
      return typeof fact === 'string' && fact.length > 0;
    });
    if (validFacts.length > 0) {
      normalized[characterName] = validFacts;
    }
  });

  return normalized;
}

function renderLoreWorldPanel(worldFacts) {
  if (!Array.isArray(worldFacts) || worldFacts.length === 0) {
    return '<p class="lore-empty">No world facts established yet.</p>';
  }

  var list = worldFacts
    .map(function(fact) {
      return '<li>' + escapeHtml(fact) + '</li>';
    })
    .join('');
  return '<ul class="lore-world-list">' + list + '</ul>';
}

function renderLoreCharactersPanel(characterCanon) {
  var characterNames = Object.keys(characterCanon);
  if (characterNames.length === 0) {
    return '<p class="lore-empty">No character facts established yet.</p>';
  }

  return characterNames
    .map(function(characterName) {
      var facts = characterCanon[characterName];
      var factList = facts
        .map(function(fact) {
          return '<li>' + escapeHtml(fact) + '</li>';
        })
        .join('');

      return '<div class="lore-character-card">'
        + '<button type="button" class="lore-character-name" aria-expanded="false">'
        + escapeHtml(characterName)
        + '</button>'
        + '<ul class="lore-character-facts" style="display: none;">'
        + factList
        + '</ul>'
        + '</div>';
    })
    .join('');
}

function createLoreModalController(initialData) {
  var modal = document.getElementById('lore-modal');
  var triggerButton = document.getElementById('lore-trigger-btn');
  var closeButton = document.getElementById('lore-close-btn');
  var worldPanel = document.getElementById('lore-panel-world');
  var charactersPanel = document.getElementById('lore-panel-characters');
  var worldTab = document.getElementById('lore-tab-world');
  var charactersTab = document.getElementById('lore-tab-characters');
  var countBadge = document.getElementById('lore-count-badge');
  var leftSidebar = document.getElementById('left-sidebar-widgets');

  if (
    !modal
    || !triggerButton
    || !closeButton
    || !worldPanel
    || !charactersPanel
    || !worldTab
    || !charactersTab
    || !countBadge
    || !leftSidebar
  ) {
    return {
      update: function() {},
    };
  }

  function keepTriggerAtBottom() {
    leftSidebar.appendChild(triggerButton);
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  function openModal() {
    modal.style.display = 'flex';
  }

  function activateTab(tabName) {
    var isWorld = tabName === 'world';

    worldTab.classList.toggle('lore-tab--active', isWorld);
    worldTab.setAttribute('aria-selected', isWorld ? 'true' : 'false');
    worldPanel.style.display = isWorld ? '' : 'none';

    charactersTab.classList.toggle('lore-tab--active', !isWorld);
    charactersTab.setAttribute('aria-selected', isWorld ? 'false' : 'true');
    charactersPanel.style.display = isWorld ? 'none' : '';
  }

  function bindCharacterToggles() {
    var names = charactersPanel.querySelectorAll('.lore-character-name');
    names.forEach(function(nameButton) {
      nameButton.addEventListener('click', function() {
        var card = nameButton.closest('.lore-character-card');
        if (!card) {
          return;
        }

        var factsList = card.querySelector('.lore-character-facts');
        if (!factsList) {
          return;
        }

        var expanded = card.classList.toggle('lore-character-card--expanded');
        nameButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        factsList.style.display = expanded ? 'block' : 'none';
      });
    });
  }

  function renderLore(worldFactsInput, characterCanonInput) {
    var worldFacts = Array.isArray(worldFactsInput)
      ? worldFactsInput.map(extractWorldFactText).filter(Boolean)
      : [];
    var characterCanon = normalizeCharacterCanon(characterCanonInput);

    worldPanel.innerHTML = renderLoreWorldPanel(worldFacts);
    charactersPanel.innerHTML = renderLoreCharactersPanel(characterCanon);
    bindCharacterToggles();

    var characterFactCount = Object.values(characterCanon).reduce(function(total, facts) {
      return total + facts.length;
    }, 0);
    countBadge.textContent = '(' + (worldFacts.length + characterFactCount) + ')';
    keepTriggerAtBottom();
  }

  triggerButton.addEventListener('click', openModal);
  closeButton.addEventListener('click', closeModal);
  worldTab.addEventListener('click', function() {
    activateTab('world');
  });
  charactersTab.addEventListener('click', function() {
    activateTab('characters');
  });
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

  activateTab('world');
  renderLore(initialData.worldFacts, initialData.characterCanon);

  return {
    update: function(worldFacts, characterCanon) {
      renderLore(worldFacts, characterCanon);
    },
  };
}
