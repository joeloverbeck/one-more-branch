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
  var submitButton = document.getElementById('chat-new-submit');

  if (!targetSelect || !interlocutorSelect || !submitButton) {
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

  function populateSelect(select, characters) {
    var placeholder = select.querySelector('option');
    var placeholderHtml = placeholder
      ? '<option value="' + escapeHtml(placeholder.value || '') + '">' + escapeHtml(placeholder.textContent || '') + '</option>'
      : '<option value="">Select...</option>';

    select.innerHTML =
      placeholderHtml +
      characters
        .map(function (character) {
          return (
            '<option value="' +
            escapeHtml(character.id || '') +
            '">' +
            escapeHtml(character.name || 'Unnamed') +
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

  void (async function loadCharacters() {
    try {
      var response = await fetch('/characters/api/list', { method: 'GET' });
      var data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.characters)) {
        throw new Error((data && data.error) || 'Failed to load characters');
      }

      populateSelect(targetSelect, data.characters);
      populateSelect(interlocutorSelect, data.characters);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load characters');
    }
  })();
}
