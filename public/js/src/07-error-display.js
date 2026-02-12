  // ── Error display ─────────────────────────────────────────────────

  function showPlayError(message, choicesSectionEl) {
    var errorBlock = choicesSectionEl.querySelector('#play-error');
    if (!errorBlock) {
      errorBlock = document.createElement('div');
      errorBlock.className = 'alert alert-error play-error';
      errorBlock.id = 'play-error';
      errorBlock.setAttribute('role', 'alert');
      errorBlock.setAttribute('aria-live', 'polite');
      const customChoiceEnums = choicesSectionEl.querySelector('.custom-choice-enums');
      if (customChoiceEnums) {
        customChoiceEnums.insertAdjacentElement('afterend', errorBlock);
      } else {
        choicesSectionEl.appendChild(errorBlock);
      }
    }

    errorBlock.textContent = message;
    errorBlock.style.display = 'block';
  }

  function clearPlayError(choicesSectionEl) {
    var errorBlock = choicesSectionEl.querySelector('#play-error');
    if (!errorBlock) {
      return;
    }

    errorBlock.textContent = '';
    errorBlock.style.display = 'none';
  }

  function showFormError(message) {
    let errorDiv = document.querySelector('.alert-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-error';
      const form = document.querySelector('.story-form');
      if (form && form.parentNode) {
        form.parentNode.insertBefore(errorDiv, form);
      }
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

