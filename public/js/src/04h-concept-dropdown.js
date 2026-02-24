  // ── Concept Dropdown (custom searchable, genre-grouped) ────────

  function createConceptDropdown(containerEl, concepts, onSelect) {
    var selectedId = '';
    var isOpen = false;
    var focusedIndex = -1;
    var filteredOptions = [];
    var genreGroups = groupConceptsByGenreClient(concepts);

    // Build DOM
    var wrapper = document.createElement('div');
    wrapper.className = 'concept-dropdown';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'concept-dropdown__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.textContent = '-- Select a saved concept --';

    var panel = document.createElement('div');
    panel.className = 'concept-dropdown__panel';
    panel.style.display = 'none';

    var searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'concept-dropdown__search';
    searchInput.placeholder = 'Search concepts...';
    searchInput.setAttribute('aria-label', 'Search concepts');

    var list = document.createElement('div');
    list.className = 'concept-dropdown__list';
    list.setAttribute('role', 'listbox');

    var emptyMsg = document.createElement('div');
    emptyMsg.className = 'concept-dropdown__empty';
    emptyMsg.textContent = 'No matching concepts';
    emptyMsg.style.display = 'none';

    panel.appendChild(searchInput);
    panel.appendChild(list);
    panel.appendChild(emptyMsg);
    wrapper.appendChild(trigger);
    wrapper.appendChild(panel);
    containerEl.appendChild(wrapper);

    function buildOptionId(concept) {
      return 'cdd-opt-' + concept.id;
    }

    function renderList(filter) {
      list.innerHTML = '';
      filteredOptions = [];
      focusedIndex = -1;
      var query = (filter || '').toLowerCase().trim();
      var hasResults = false;

      genreGroups.forEach(function (group) {
        var matchingConcepts = group.concepts.filter(function (c) {
          if (!query) return true;
          var name = (c.name || '').toLowerCase();
          var hook =
            c.evaluatedConcept && c.evaluatedConcept.concept
              ? (c.evaluatedConcept.concept.oneLineHook || '').toLowerCase()
              : '';
          var genre = group.displayLabel.toLowerCase();
          return name.indexOf(query) >= 0 || hook.indexOf(query) >= 0 || genre.indexOf(query) >= 0;
        });

        if (matchingConcepts.length === 0) return;
        hasResults = true;

        var header = document.createElement('div');
        header.className = 'concept-dropdown__genre-header';
        header.textContent = group.displayLabel + ' (' + matchingConcepts.length + ')';
        list.appendChild(header);

        matchingConcepts.forEach(function (c) {
          var option = document.createElement('div');
          option.className = 'concept-dropdown__option';
          option.id = buildOptionId(c);
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', c.id === selectedId ? 'true' : 'false');
          option.setAttribute('data-concept-id', c.id);

          var score = c.evaluatedConcept ? Math.round(c.evaluatedConcept.overallScore || 0) : 0;
          option.innerHTML =
            '<span class="concept-dropdown__option-name">' + escapeHtml(c.name || 'Untitled') + '</span>' +
            '<span class="concept-dropdown__option-score">(' + score + ')</span>';

          if (c.id === selectedId) {
            option.classList.add('concept-dropdown__option--selected');
          }

          list.appendChild(option);
          filteredOptions.push({ element: option, concept: c });
        });
      });

      emptyMsg.style.display = hasResults ? 'none' : 'block';
    }

    function selectConcept(concept) {
      selectedId = concept ? concept.id : '';
      trigger.textContent = concept
        ? concept.name + ' (' + Math.round((concept.evaluatedConcept && concept.evaluatedConcept.overallScore) || 0) + ')'
        : '-- Select a saved concept --';
      closePanel();
      if (onSelect) onSelect(selectedId, concept);
    }

    function openPanel() {
      isOpen = true;
      panel.style.display = 'block';
      trigger.setAttribute('aria-expanded', 'true');
      searchInput.value = '';
      renderList('');
      searchInput.focus();
    }

    function closePanel() {
      isOpen = false;
      panel.style.display = 'none';
      trigger.setAttribute('aria-expanded', 'false');
      focusedIndex = -1;
    }

    function setFocus(index) {
      if (filteredOptions.length === 0) return;
      if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        filteredOptions[focusedIndex].element.classList.remove('concept-dropdown__option--focused');
      }
      focusedIndex = Math.max(0, Math.min(index, filteredOptions.length - 1));
      var el = filteredOptions[focusedIndex].element;
      el.classList.add('concept-dropdown__option--focused');
      el.scrollIntoView({ block: 'nearest' });
    }

    // Events
    trigger.addEventListener('click', function () {
      if (isOpen) {
        closePanel();
      } else {
        openPanel();
      }
    });

    searchInput.addEventListener('input', function () {
      renderList(searchInput.value);
    });

    list.addEventListener('click', function (e) {
      var target = e.target;
      if (!(target instanceof HTMLElement)) return;
      var option = target.closest('.concept-dropdown__option');
      if (!option) return;
      var conceptId = option.getAttribute('data-concept-id');
      var found = concepts.filter(function (c) { return c.id === conceptId; })[0];
      if (found) selectConcept(found);
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus(focusedIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocus(focusedIndex - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          selectConcept(filteredOptions[focusedIndex].concept);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
        trigger.focus();
      }
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (isOpen && !wrapper.contains(e.target)) {
        closePanel();
      }
    });

    // Public API
    return {
      getSelectedId: function () { return selectedId; },
      setSelectedId: function (id) {
        var found = concepts.filter(function (c) { return c.id === id; })[0];
        if (found) {
          selectedId = id;
          trigger.textContent = found.name + ' (' + Math.round((found.evaluatedConcept && found.evaluatedConcept.overallScore) || 0) + ')';
        } else {
          selectedId = '';
          trigger.textContent = '-- Select a saved concept --';
        }
      },
      destroy: function () {
        if (wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
        }
      },
    };
  }
