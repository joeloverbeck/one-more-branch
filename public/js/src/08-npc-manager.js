  // ── NPC manager ───────────────────────────────────────────────────

  function collectNpcEntries() {
    var entries = document.querySelectorAll('#npc-entries .npc-entry');
    var npcs = [];
    entries.forEach(function(entry) {
      var name = entry.querySelector('.npc-entry-header strong');
      var desc = entry.querySelector('.npc-entry-description');
      if (name && desc) {
        npcs.push({ name: name.textContent, description: desc.textContent });
      }
    });
    return npcs;
  }

  function addNpcEntry(name, description) {
    var container = document.getElementById('npc-entries');
    if (!container) return;

    var entry = document.createElement('div');
    entry.className = 'npc-entry';

    var header = document.createElement('div');
    header.className = 'npc-entry-header';

    var strong = document.createElement('strong');
    strong.textContent = name;

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-small btn-danger npc-remove-btn';
    removeBtn.textContent = '\u00D7';
    removeBtn.addEventListener('click', function() {
      entry.remove();
    });

    header.appendChild(strong);
    header.appendChild(removeBtn);

    var descP = document.createElement('p');
    descP.className = 'npc-entry-description';
    descP.textContent = description;

    entry.appendChild(header);
    entry.appendChild(descP);
    container.appendChild(entry);
  }

  function initNpcControls() {
    var addBtn = document.getElementById('npc-add-btn');
    var nameInput = document.getElementById('npc-name-input');
    var descInput = document.getElementById('npc-desc-input');

    if (!addBtn || !nameInput || !descInput) return;

    addBtn.addEventListener('click', function() {
      var name = nameInput.value.trim();
      var desc = descInput.value.trim();
      if (!name || !desc) return;

      addNpcEntry(name, desc);
      nameInput.value = '';
      descInput.value = '';
      nameInput.focus();
    });

    // Bind remove buttons for server-rendered entries (validation error re-render)
    document.querySelectorAll('.npc-remove-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var entry = btn.closest('.npc-entry');
        if (entry) entry.remove();
      });
    });
  }

