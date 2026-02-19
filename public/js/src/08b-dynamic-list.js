  // ── Dynamic list controller ──────────────────────────────────────

  function initDynamicLists() {
    document.querySelectorAll('.dynamic-list-add-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var field = btn.dataset.field;
        if (!field) return;
        var input = document.querySelector('.dynamic-list-input[data-field="' + field + '"]');
        if (!input || typeof input.value !== 'string') return;

        var text = input.value.trim();
        if (!text) return;

        addDynamicListItem(field, text);
        input.value = '';
        input.focus();
      });
    });

    document.querySelectorAll('.dynamic-list-input').forEach(function (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var field = input.dataset.field;
        if (!field) return;

        var text = input.value.trim();
        if (!text) return;

        addDynamicListItem(field, text);
        input.value = '';
      });
    });
  }

  function addDynamicListItem(fieldName, text) {
    var container = document.getElementById('dynamic-list-' + fieldName);
    if (!container) return;

    var item = document.createElement('div');
    item.className = 'dynamic-list-item';

    var span = document.createElement('span');
    span.className = 'dynamic-list-item-text';
    span.textContent = text;

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-small btn-danger dynamic-list-remove-btn';
    removeBtn.textContent = '\u00D7';
    removeBtn.addEventListener('click', function () {
      item.remove();
    });

    item.appendChild(span);
    item.appendChild(removeBtn);
    container.appendChild(item);
  }

  function populateDynamicList(fieldName, items) {
    clearDynamicList(fieldName);
    if (!Array.isArray(items)) return;

    items.forEach(function (text) {
      if (typeof text === 'string' && text.trim().length > 0) {
        addDynamicListItem(fieldName, text.trim());
      }
    });
  }

  function collectDynamicListEntries(fieldName) {
    var container = document.getElementById('dynamic-list-' + fieldName);
    if (!container) return [];

    var items = container.querySelectorAll('.dynamic-list-item-text');
    var result = [];
    items.forEach(function (span) {
      var text = span.textContent.trim();
      if (text.length > 0) {
        result.push(text);
      }
    });
    return result;
  }

  function clearDynamicList(fieldName) {
    var container = document.getElementById('dynamic-list-' + fieldName);
    if (container) {
      container.innerHTML = '';
    }
  }
