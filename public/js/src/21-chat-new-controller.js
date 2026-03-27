function initChatNewPage() {
  var form = document.querySelector('form[data-chat-new-form]');
  if (!form) {
    return;
  }
  if (form.getAttribute('data-chat-new-controller-initialized') === 'true') {
    return;
  }
  form.setAttribute('data-chat-new-controller-initialized', 'true');

  var errorBlock = document.getElementById('chat-new-error');
  var targetSelect = document.getElementById('chat-target-character-id');
  var interlocutorSelect = document.getElementById('chat-interlocutor-character-id');
  var worldbuildingSelect = document.getElementById('chat-worldbuilding-id');
  var submitButton = document.getElementById('chat-new-submit');

  if (!targetSelect || !interlocutorSelect || !worldbuildingSelect || !submitButton) {
    return;
  }

  var submitting = false;

  function setError(message) {
    if (!errorBlock) {
      return;
    }

    errorBlock.textContent = message;
    errorBlock.style.display = 'block';
  }

  function clearError() {
    if (!errorBlock) {
      return;
    }

    errorBlock.textContent = '';
    errorBlock.style.display = 'none';
  }

  function populateSelect(select, items, labelField) {
    var placeholder = select.querySelector('option');
    var placeholderHtml = placeholder
      ? '<option value="' + escapeHtml(placeholder.value || '') + '">' + escapeHtml(placeholder.textContent || '') + '</option>'
      : '<option value="">Select...</option>';

    select.innerHTML =
      placeholderHtml +
      items
        .map(function (item) {
          return (
            '<option value="' +
            escapeHtml(item.id || '') +
            '">' +
            escapeHtml(item[labelField] || 'Unnamed') +
            '</option>'
          );
        })
        .join('');
  }

  function hasDistinctCharacters() {
    return (
      typeof targetSelect.value === 'string' &&
      targetSelect.value.length > 0 &&
      targetSelect.value !== interlocutorSelect.value
    );
  }

  function validateBeforeSubmit() {
    clearError();

    if (typeof form.checkValidity === 'function' && !form.checkValidity()) {
      if (typeof form.reportValidity === 'function') {
        form.reportValidity();
      }
      return false;
    }

    if (!hasDistinctCharacters()) {
      setError('Target and interlocutor must be different characters');
      return false;
    }

    return true;
  }

  targetSelect.addEventListener('change', function () {
    if (hasDistinctCharacters()) {
      clearError();
    }
  });

  interlocutorSelect.addEventListener('change', function () {
    if (hasDistinctCharacters()) {
      clearError();
    }
  });

  worldbuildingSelect.addEventListener('change', function () {
    if (worldbuildingSelect.value) {
      clearError();
    }
  });

  form.addEventListener('submit', function (event) {
    if (submitting) {
      event.preventDefault();
      return;
    }

    if (!validateBeforeSubmit()) {
      event.preventDefault();
      return;
    }

    submitting = true;
    submitButton.disabled = true;
  });

  void (async function loadFormOptions() {
    try {
      var responses = await Promise.all([
        fetch('/characters/api/list', { method: 'GET' }),
        fetch('/worldbuilding/api/list', { method: 'GET' }),
      ]);
      var charactersResponse = responses[0];
      var worldbuildingsResponse = responses[1];
      var charactersData = await charactersResponse.json();
      var worldbuildingsData = await worldbuildingsResponse.json();

      if (
        !charactersResponse.ok ||
        !charactersData.success ||
        !Array.isArray(charactersData.characters)
      ) {
        throw new Error((charactersData && charactersData.error) || 'Failed to load characters');
      }

      if (
        !worldbuildingsResponse.ok ||
        !worldbuildingsData.success ||
        !Array.isArray(worldbuildingsData.worldbuildings)
      ) {
        throw new Error(
          (worldbuildingsData && worldbuildingsData.error) || 'Failed to load worldbuildings'
        );
      }

      populateSelect(targetSelect, charactersData.characters, 'name');
      populateSelect(interlocutorSelect, charactersData.characters, 'name');
      populateSelect(worldbuildingSelect, worldbuildingsData.worldbuildings, 'name');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load form options');
    }
  })();
}
