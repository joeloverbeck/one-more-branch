// ── Inline Field Editor Primitives ──────────────────────────────────

var GENRE_FRAME_OPTIONS = [
  { value: 'ADVENTURE', label: 'Adventure' },
  { value: 'COMING_OF_AGE', label: 'Coming of Age' },
  { value: 'COSMIC_HORROR', label: 'Cosmic Horror' },
  { value: 'CULTIVATION', label: 'Cultivation' },
  { value: 'CYBERPUNK', label: 'Cyberpunk' },
  { value: 'DARK_COMEDY', label: 'Dark Comedy' },
  { value: 'DRAMA', label: 'Drama' },
  { value: 'DYSTOPIAN', label: 'Dystopian' },
  { value: 'EROTICA', label: 'Erotica' },
  { value: 'ESPIONAGE', label: 'Espionage' },
  { value: 'FABLE', label: 'Fable' },
  { value: 'FANTASY', label: 'Fantasy' },
  { value: 'GOTHIC', label: 'Gothic' },
  { value: 'GRIMDARK', label: 'Grimdark' },
  { value: 'HEIST', label: 'Heist' },
  { value: 'HISTORICAL', label: 'Historical' },
  { value: 'HORROR', label: 'Horror' },
  { value: 'ISEKAI', label: 'Isekai' },
  { value: 'LITERARY', label: 'Literary' },
  { value: 'MAGICAL_REALISM', label: 'Magical Realism' },
  { value: 'MYSTERY', label: 'Mystery' },
  { value: 'MYTHIC', label: 'Mythic' },
  { value: 'NOIR', label: 'Noir' },
  { value: 'PICARESQUE', label: 'Picaresque' },
  { value: 'POST_APOCALYPTIC', label: 'Post Apocalyptic' },
  { value: 'ROMANCE', label: 'Romance' },
  { value: 'SATIRE', label: 'Satire' },
  { value: 'SCI_FI', label: 'Sci Fi' },
  { value: 'SPACE_OPERA', label: 'Space Opera' },
  { value: 'SURREAL', label: 'Surreal' },
  { value: 'THRILLER', label: 'Thriller' },
  { value: 'TRAGEDY', label: 'Tragedy' },
  { value: 'WESTERN', label: 'Western' },
  { value: 'WUXIA', label: 'Wuxia' },
];

var CONFLICT_AXIS_OPTIONS = [
  { value: 'INDIVIDUAL_VS_SYSTEM', label: 'Individual vs System' },
  { value: 'TRUTH_VS_STABILITY', label: 'Truth vs Stability' },
  { value: 'DUTY_VS_DESIRE', label: 'Duty vs Desire' },
  { value: 'FREEDOM_VS_SAFETY', label: 'Freedom vs Safety' },
  { value: 'KNOWLEDGE_VS_INNOCENCE', label: 'Knowledge vs Innocence' },
  { value: 'POWER_VS_MORALITY', label: 'Power vs Morality' },
  { value: 'LOYALTY_VS_SURVIVAL', label: 'Loyalty vs Survival' },
  { value: 'IDENTITY_VS_BELONGING', label: 'Identity vs Belonging' },
];

var CONFLICT_TYPE_OPTIONS = [
  { value: '', label: '-- None --' },
  { value: 'PERSON_VS_PERSON', label: 'Person vs Person' },
  { value: 'PERSON_VS_SELF', label: 'Person vs Self' },
  { value: 'PERSON_VS_SOCIETY', label: 'Person vs Society' },
  { value: 'PERSON_VS_NATURE', label: 'Person vs Nature' },
  { value: 'PERSON_VS_TECHNOLOGY', label: 'Person vs Technology' },
  { value: 'PERSON_VS_SUPERNATURAL', label: 'Person vs Supernatural' },
  { value: 'PERSON_VS_FATE', label: 'Person vs Fate' },
];

var SETTING_SCALE_OPTIONS = [
  { value: 'INTIMATE', label: 'Intimate' },
  { value: 'LOCAL', label: 'Local' },
  { value: 'REGIONAL', label: 'Regional' },
  { value: 'GLOBAL', label: 'Global' },
];

function getEnumOptionsForField(fieldKey) {
  switch (fieldKey) {
    case 'genreFrame': return GENRE_FRAME_OPTIONS;
    case 'conflictAxis': return CONFLICT_AXIS_OPTIONS;
    case 'conflictType': return CONFLICT_TYPE_OPTIONS;
    case 'settingScale': return SETTING_SCALE_OPTIONS;
    default: return null;
  }
}

function createInlineTextEditor(valueEl, currentValue, onCommit) {
  var original = currentValue || '';
  var useTextarea = original.length > 100;
  var input;

  if (useTextarea) {
    input = document.createElement('textarea');
    input.className = 'concept-inline-textarea';
    input.rows = 3;
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'concept-inline-input';
  }

  input.value = original;
  valueEl.textContent = '';
  valueEl.appendChild(input);
  input.focus();
  input.select();

  var committed = false;

  function commit() {
    if (committed) return;
    committed = true;
    var newVal = input.value.trim();
    valueEl.textContent = newVal || original;
    if (newVal !== original) {
      onCommit(newVal);
    }
  }

  function revert() {
    if (committed) return;
    committed = true;
    valueEl.textContent = original;
  }

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !useTextarea) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      revert();
    }
  });

  input.addEventListener('blur', function () {
    commit();
  });
}

function createInlineSelectEditor(valueEl, currentValue, options, onCommit) {
  var original = currentValue || '';
  var select = document.createElement('select');
  select.className = 'concept-inline-select';

  for (var i = 0; i < options.length; i++) {
    var opt = document.createElement('option');
    opt.value = options[i].value;
    opt.textContent = options[i].label;
    if (options[i].value === original) {
      opt.selected = true;
    }
    select.appendChild(opt);
  }

  valueEl.textContent = '';
  valueEl.appendChild(select);
  select.focus();

  var committed = false;

  function commit() {
    if (committed) return;
    committed = true;
    var newVal = select.value;
    valueEl.textContent = formatConceptLabel(newVal || original);
    if (newVal !== original) {
      onCommit(newVal);
    }
  }

  function revert() {
    if (committed) return;
    committed = true;
    valueEl.textContent = formatConceptLabel(original);
  }

  select.addEventListener('change', function () {
    commit();
  });

  select.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      revert();
    }
  });

  select.addEventListener('blur', function () {
    commit();
  });
}

function createInlineListEditor(valueEl, currentItems, onCommit) {
  var items = Array.isArray(currentItems) ? currentItems.slice() : [];
  var container = document.createElement('div');
  container.className = 'concept-inline-list-editor';
  var blurTimer = null;

  function renderEditor() {
    container.innerHTML = '';
    for (var i = 0; i < items.length; i++) {
      (function (idx) {
        var row = document.createElement('div');
        row.className = 'concept-inline-list-item';

        var inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'concept-inline-input';
        inp.value = items[idx];
        inp.addEventListener('input', function () {
          items[idx] = inp.value;
        });
        inp.addEventListener('focus', function () {
          if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
        });
        inp.addEventListener('blur', function () {
          scheduleCollapse();
        });

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'concept-inline-list-remove';
        removeBtn.textContent = '\u00d7';
        removeBtn.addEventListener('click', function () {
          items.splice(idx, 1);
          renderEditor();
        });
        removeBtn.addEventListener('focus', function () {
          if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
        });
        removeBtn.addEventListener('blur', function () {
          scheduleCollapse();
        });

        row.appendChild(inp);
        row.appendChild(removeBtn);
        container.appendChild(row);
      })(i);
    }

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'concept-inline-list-add';
    addBtn.textContent = '+ Add';
    addBtn.addEventListener('click', function () {
      items.push('');
      renderEditor();
      var inputs = container.querySelectorAll('.concept-inline-input');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    });
    addBtn.addEventListener('focus', function () {
      if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
    });
    addBtn.addEventListener('blur', function () {
      scheduleCollapse();
    });
    container.appendChild(addBtn);
  }

  function scheduleCollapse() {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = setTimeout(function () {
      collapse();
    }, 200);
  }

  function collapse() {
    var cleaned = items
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
    onCommit(cleaned);

    // Restore to <ul> display
    valueEl.innerHTML = '';
    var ul = document.createElement('ul');
    if (cleaned.length === 0) {
      ul.innerHTML = '<li class="concept-list-empty">None</li>';
    } else {
      for (var j = 0; j < cleaned.length; j++) {
        var li = document.createElement('li');
        li.textContent = cleaned[j];
        ul.appendChild(li);
      }
    }
    valueEl.appendChild(ul);
  }

  // Replace current content
  valueEl.innerHTML = '';
  valueEl.appendChild(container);
  renderEditor();

  // Focus first input
  var firstInput = container.querySelector('.concept-inline-input');
  if (firstInput) firstInput.focus();
}
