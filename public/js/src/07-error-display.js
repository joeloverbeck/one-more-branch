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
    let errorDiv = document.querySelector('.alert-error.form-error');
    if (!errorDiv) {
      errorDiv = document.querySelector(
        '.form-section .alert-error:not(.play-error):not(.briefing-error)'
      );
      if (errorDiv) {
        errorDiv.classList.add('form-error');
      }
    }

    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-error form-error';
      errorDiv.setAttribute('role', 'alert');
      errorDiv.setAttribute('aria-live', 'polite');

      const form = document.querySelector('.story-form');
      const conceptGenerateSection = document.getElementById('concept-generate-section');
      const formSection = document.querySelector('.form-section');

      if (form && form.parentNode) {
        form.parentNode.insertBefore(errorDiv, form);
      } else if (conceptGenerateSection && conceptGenerateSection.parentNode) {
        conceptGenerateSection.parentNode.insertBefore(errorDiv, conceptGenerateSection);
      } else if (formSection) {
        formSection.insertAdjacentElement('afterbegin', errorDiv);
      } else {
        document.body.insertAdjacentElement('afterbegin', errorDiv);
      }
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
