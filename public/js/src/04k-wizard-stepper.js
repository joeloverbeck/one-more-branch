// ── Wizard Stepper Navigation ────────────────────────────────────

/**
 * Creates a wizard stepper controller for multi-step form navigation.
 * @param {Object} config
 * @param {number} config.totalSteps - Total number of steps (default 6)
 * @param {function} [config.onStepChange] - Callback(fromStep, toStep) on navigation
 * @returns {{ goToStep: function, getCurrentStep: function, markStepComplete: function, isStepComplete: function }}
 */
function createWizardStepper(config) {
  var totalSteps = (config && config.totalSteps) || 6;
  var onStepChange = (config && config.onStepChange) || null;
  var currentStep = 1;
  var completedSteps = {};

  var prevBtn = document.getElementById('wizard-prev');
  var nextBtn = document.getElementById('wizard-next');

  function getStepSections() {
    return document.querySelectorAll('.wizard-step');
  }

  function getStepButtons() {
    return document.querySelectorAll('.wizard-stepper__btn');
  }

  function updateStepperIndicators() {
    var buttons = getStepButtons();
    buttons.forEach(function (btn) {
      var step = Number(btn.dataset.step);
      btn.classList.remove('wizard-stepper__btn--active', 'wizard-stepper__btn--complete');
      if (step === currentStep) {
        btn.classList.add('wizard-stepper__btn--active');
      } else if (completedSteps[step]) {
        btn.classList.add('wizard-stepper__btn--complete');
      }
    });
  }

  function updateNavButtons() {
    if (prevBtn) {
      prevBtn.style.display = currentStep === 1 ? 'none' : '';
    }
    if (nextBtn) {
      if (currentStep === totalSteps) {
        nextBtn.style.display = 'none';
      } else {
        nextBtn.style.display = '';
        nextBtn.textContent = 'Next';
      }
    }
  }

  function showStep(step) {
    var sections = getStepSections();
    sections.forEach(function (section) {
      var sectionStep = Number(section.dataset.step);
      section.style.display = sectionStep === step ? 'block' : 'none';
    });
  }

  function goToStep(step) {
    if (step < 1 || step > totalSteps || step === currentStep) return;
    var fromStep = currentStep;
    currentStep = step;
    showStep(currentStep);
    updateStepperIndicators();
    updateNavButtons();

    // Scroll to top of wizard
    var stepper = document.querySelector('.wizard-stepper');
    if (stepper && typeof stepper.scrollIntoView === 'function') {
      stepper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (onStepChange) {
      onStepChange(fromStep, currentStep);
    }
  }

  function markStepComplete(step) {
    completedSteps[step] = true;
    updateStepperIndicators();
  }

  function isStepComplete(step) {
    return !!completedSteps[step];
  }

  function getCurrentStep() {
    return currentStep;
  }

  // Bind step indicator buttons (free navigation)
  var stepButtons = getStepButtons();
  stepButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var step = Number(btn.dataset.step);
      if (step >= 1 && step <= totalSteps) {
        goToStep(step);
      }
    });
  });

  // Bind prev/next buttons
  if (prevBtn) {
    prevBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (currentStep > 1) goToStep(currentStep - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (currentStep < totalSteps) goToStep(currentStep + 1);
    });
  }

  // Initialize display
  showStep(1);
  updateStepperIndicators();
  updateNavButtons();

  return {
    goToStep: goToStep,
    getCurrentStep: getCurrentStep,
    markStepComplete: markStepComplete,
    isStepComplete: isStepComplete,
  };
}
