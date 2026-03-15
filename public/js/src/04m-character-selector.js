// ── Character Selector Component ─────────────────────────────────────
// Populates protagonist dropdown and NPC select + pill tags from decomposed characters.

/**
 * Creates a character selector controller for the new-story form.
 * Fetches saved decomposed characters and renders selection UI.
 *
 * @param {HTMLSelectElement} protagonistSelect - The protagonist dropdown
 * @param {HTMLElement} npcSelectorWrap - Container for NPC select dropdown
 * @param {HTMLElement} npcPillsContainer - Container for NPC pill tags
 * @returns {{ init: () => Promise<void>, getProtagonistCharacterId: () => string, getNpcCharacterIds: () => string[] }}
 */
function createCharacterSelector(protagonistSelect, npcSelectorWrap, npcPillsContainer) {
  var characters = [];
  var selectedNpcIds = [];

  function renderProtagonistOptions(selectedId) {
    // Keep the default empty option
    while (protagonistSelect.options.length > 1) {
      protagonistSelect.remove(1);
    }
    for (var i = 0; i < characters.length; i++) {
      var ch = characters[i];
      var opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = ch.name;
      if (ch.id === selectedId) {
        opt.selected = true;
      }
      protagonistSelect.appendChild(opt);
    }
  }

  function renderNpcSelector() {
    npcSelectorWrap.innerHTML = '';
    var protagonistId = protagonistSelect.value || '';
    var available = characters.filter(function (ch) {
      return ch.id !== protagonistId && selectedNpcIds.indexOf(ch.id) === -1;
    });

    if (available.length === 0 && selectedNpcIds.length === 0) {
      npcSelectorWrap.innerHTML = '<p class="form-help" style="margin:0;">No other characters available.</p>';
      return;
    }

    if (available.length === 0) {
      // All characters already selected as NPCs
      return;
    }

    var select = document.createElement('select');
    select.className = 'npc-add-selector';

    var defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '-- Add NPC character --';
    select.appendChild(defaultOpt);

    for (var i = 0; i < available.length; i++) {
      var ch = available[i];
      var opt = document.createElement('option');
      opt.value = ch.id;
      var label = ch.name;
      if (ch.coreTraits && ch.coreTraits.length > 0) {
        label += ' — ' + ch.coreTraits.slice(0, 3).join(', ');
      }
      opt.textContent = label;
      select.appendChild(opt);
    }

    select.addEventListener('change', function () {
      var selectedId = select.value;
      if (selectedId && selectedNpcIds.indexOf(selectedId) === -1) {
        selectedNpcIds.push(selectedId);
        renderNpcSelector();
        renderNpcPills();
      }
    });

    npcSelectorWrap.appendChild(select);
  }

  function renderNpcPills() {
    npcPillsContainer.innerHTML = '';

    for (var i = 0; i < selectedNpcIds.length; i++) {
      var npcId = selectedNpcIds[i];
      var ch = characters.find(function (c) { return c.id === npcId; });
      if (!ch) continue;

      var pill = document.createElement('span');
      pill.className = 'npc-pill';

      var nameSpan = document.createElement('span');
      nameSpan.className = 'npc-pill-name';
      nameSpan.textContent = ch.name;
      pill.appendChild(nameSpan);

      if (ch.coreTraits && ch.coreTraits.length > 0) {
        var traitsSpan = document.createElement('span');
        traitsSpan.className = 'npc-pill-traits';
        traitsSpan.textContent = ' — ' + ch.coreTraits.slice(0, 3).join(', ');
        pill.appendChild(traitsSpan);
      }

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'npc-pill-remove';
      removeBtn.dataset.id = npcId;
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', (function (id) {
        return function () {
          var idx = selectedNpcIds.indexOf(id);
          if (idx !== -1) {
            selectedNpcIds.splice(idx, 1);
          }
          renderNpcSelector();
          renderNpcPills();
        };
      })(npcId));
      pill.appendChild(removeBtn);

      npcPillsContainer.appendChild(pill);
    }
  }

  function getProtagonistCharacterId() {
    return protagonistSelect.value || '';
  }

  function getNpcCharacterIds() {
    return selectedNpcIds.slice();
  }

  async function init() {
    try {
      var response = await fetch('/characters/api/list');
      if (!response.ok) {
        return;
      }
      var data = await response.json();
      characters = Array.isArray(data.characters) ? data.characters : [];
    } catch (_err) {
      characters = [];
    }

    if (characters.length === 0) {
      npcSelectorWrap.innerHTML =
        '<p class="form-help" style="margin:0;">No decomposed characters yet. ' +
        '<a href="/characters">Create some</a> first.</p>';
      return;
    }

    renderProtagonistOptions('');
    renderNpcSelector();

    protagonistSelect.addEventListener('change', function () {
      // Remove new protagonist from NPC selection if present
      var newProtId = protagonistSelect.value;
      var idx = selectedNpcIds.indexOf(newProtId);
      if (idx !== -1) {
        selectedNpcIds.splice(idx, 1);
        renderNpcPills();
      }
      renderNpcSelector();
    });
  }

  return {
    init: init,
    getProtagonistCharacterId: getProtagonistCharacterId,
    getNpcCharacterIds: getNpcCharacterIds,
  };
}
