// ── Character Selector Component ─────────────────────────────────────
// Populates protagonist dropdown and NPC checkboxes from decomposed characters.

/**
 * Creates a character selector controller for the new-story form.
 * Fetches saved decomposed characters and renders selection UI.
 *
 * @param {HTMLSelectElement} protagonistSelect - The protagonist dropdown
 * @param {HTMLElement} npcContainer - Container for NPC checkboxes
 * @returns {{ init: () => Promise<void>, getProtagonistCharacterId: () => string, getNpcCharacterIds: () => string[] }}
 */
function createCharacterSelector(protagonistSelect, npcContainer) {
  var characters = [];

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

  function renderNpcCheckboxes(excludeId) {
    npcContainer.innerHTML = '';
    var available = characters.filter(function (ch) { return ch.id !== excludeId; });

    if (available.length === 0) {
      npcContainer.innerHTML = '<p class="form-help" style="margin:0;">No other characters available.</p>';
      return;
    }

    for (var i = 0; i < available.length; i++) {
      var ch = available[i];
      var label = document.createElement('label');
      label.className = 'character-checkbox-label';

      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = ch.id;
      checkbox.className = 'character-checkbox';
      checkbox.name = 'npcCharacterIds';

      var nameSpan = document.createElement('span');
      nameSpan.className = 'character-checkbox-name';
      nameSpan.textContent = ch.name;

      label.appendChild(checkbox);
      label.appendChild(nameSpan);

      if (ch.coreTraits && ch.coreTraits.length > 0) {
        var traitsSpan = document.createElement('span');
        traitsSpan.className = 'character-checkbox-traits';
        traitsSpan.textContent = ' — ' + ch.coreTraits.slice(0, 3).join(', ');
        label.appendChild(traitsSpan);
      }

      npcContainer.appendChild(label);
    }
  }

  function getProtagonistCharacterId() {
    return protagonistSelect.value || '';
  }

  function getNpcCharacterIds() {
    var checkboxes = npcContainer.querySelectorAll('input.character-checkbox:checked');
    var ids = [];
    for (var i = 0; i < checkboxes.length; i++) {
      ids.push(checkboxes[i].value);
    }
    return ids;
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
      npcContainer.innerHTML =
        '<p class="form-help" style="margin:0;">No decomposed characters yet. ' +
        '<a href="/characters">Create some</a> first.</p>';
      return;
    }

    renderProtagonistOptions('');
    renderNpcCheckboxes('');

    protagonistSelect.addEventListener('change', function () {
      renderNpcCheckboxes(protagonistSelect.value);
    });
  }

  return {
    init: init,
    getProtagonistCharacterId: getProtagonistCharacterId,
    getNpcCharacterIds: getNpcCharacterIds,
  };
}
