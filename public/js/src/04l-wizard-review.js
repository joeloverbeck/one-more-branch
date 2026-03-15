// ── Wizard Review Summary ────────────────────────────────────────

var REVIEW_SECTIONS = [
  {
    title: 'Concept & Kernel',
    step: 1,
    fields: [
      { id: 'title', label: 'Title', type: 'text' },
      { id: 'kernel-disp-thesis', label: 'Kernel Thesis', type: 'span' },
      { id: 'kernel-disp-value', label: 'Value at Stake', type: 'span' },
      { id: 'kernel-disp-opposing', label: 'Opposing Force', type: 'span' },
      { id: 'kernel-disp-direction', label: 'Direction of Change', type: 'span' },
      { id: 'kernel-disp-question', label: 'Thematic Question', type: 'span' },
      { id: 'character-web-selector', label: 'Character Web', type: 'select' },
    ],
  },
  {
    title: 'Narrative Identity',
    step: 2,
    fields: [
      { id: 'oneLineHook', label: 'One-Line Hook', type: 'text' },
      { id: 'elevatorParagraph', label: 'Elevator Pitch', type: 'textarea' },
      { id: 'whatIfQuestion', label: 'What-If Question', type: 'text' },
      { id: 'ironicTwist', label: 'Ironic Twist', type: 'textarea' },
      { id: 'playerFantasy', label: 'Player Fantasy', type: 'text' },
      { id: 'genreFrame', label: 'Genre Frame', type: 'select' },
      { id: 'genreSubversion', label: 'Genre Subversion', type: 'text' },
      { id: 'tone', label: 'Tone', type: 'textarea' },
    ],
  },
  {
    title: 'Protagonist',
    step: 3,
    fields: [
      { id: 'protagonistRole', label: 'Role', type: 'text' },
      { id: 'coreCompetence', label: 'Core Competence', type: 'text' },
      { id: 'coreFlaw', label: 'Core Flaw', type: 'text' },
      { id: 'dynamic-list-actionVerbs', label: 'Action Verbs', type: 'dynamic-list', field: 'actionVerbs' },
    ],
  },
  {
    title: 'Conflict & Arc',
    step: 4,
    fields: [
      { id: 'coreConflictLoop', label: 'Core Conflict Loop', type: 'textarea' },
      { id: 'conflictAxis', label: 'Conflict Axis', type: 'select' },
      { id: 'conflictType', label: 'Conflict Type', type: 'select' },
      { id: 'pressureSource', label: 'Pressure Source', type: 'text' },
      { id: 'stakesPersonal', label: 'Personal Stakes', type: 'text' },
      { id: 'stakesSystemic', label: 'Systemic Stakes', type: 'text' },
      { id: 'deadlineMechanism', label: 'Deadline Mechanism', type: 'text' },
      { id: 'incitingDisruption', label: 'Inciting Disruption', type: 'textarea' },
      { id: 'escapeValve', label: 'Escape Valve', type: 'textarea' },
      { id: 'protagonistLie', label: 'Protagonist Lie', type: 'textarea' },
      { id: 'protagonistTruth', label: 'Protagonist Truth', type: 'textarea' },
      { id: 'protagonistGhost', label: 'Protagonist Ghost', type: 'textarea' },
      { id: 'wantNeedCollisionSketch', label: 'Want/Need Collision', type: 'textarea' },
    ],
  },
  {
    title: 'World & NPCs',
    step: 5,
    fields: [
      { id: 'worldbuilding', label: 'Worldbuilding', type: 'textarea' },
      { id: 'dynamic-list-settingAxioms', label: 'Setting Axioms', type: 'dynamic-list', field: 'settingAxioms' },
      { id: 'dynamic-list-constraintSet', label: 'Constraints', type: 'dynamic-list', field: 'constraintSet' },
      { id: 'dynamic-list-keyInstitutions', label: 'Key Institutions', type: 'dynamic-list', field: 'keyInstitutions' },
      { id: 'settingScale', label: 'Setting Scale', type: 'select' },
      { id: 'npc-entries', label: 'NPCs', type: 'npc-list' },
      { id: 'startingSituation', label: 'Starting Situation', type: 'textarea' },
    ],
  },
];

var REVIEW_VERIFICATION_FIELDS = [
  { id: 'signatureScenario', label: 'Signature Scenario', type: 'textarea' },
  { id: 'inevitabilityStatement', label: 'Inevitability Statement', type: 'textarea' },
  { id: 'dynamic-list-escalatingSetpieces', label: 'Escalating Setpieces', type: 'dynamic-list', field: 'escalatingSetpieces' },
  { id: 'dynamic-list-premisePromises', label: 'Premise Promises', type: 'dynamic-list', field: 'premisePromises' },
];

/**
 * Build a read-only review summary of all form fields.
 * @param {HTMLElement} containerEl - The element to render review into
 * @param {function} [navigateToStep] - Optional callback(stepNumber) to navigate on click
 */
function buildReviewSummary(containerEl, navigateToStep) {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  REVIEW_SECTIONS.forEach(function (section) {
    var sectionEl = document.createElement('div');
    sectionEl.className = 'review-section';

    var headerEl = document.createElement('h3');
    headerEl.className = 'review-section__header';
    headerEl.textContent = section.title;
    if (navigateToStep) {
      headerEl.classList.add('review-section__header--clickable');
      headerEl.title = 'Go to ' + section.title;
      headerEl.addEventListener('click', function () {
        navigateToStep(section.step);
      });
    }
    sectionEl.appendChild(headerEl);

    section.fields.forEach(function (fieldDef) {
      var value = readFieldValue(fieldDef);
      var fieldEl = document.createElement('div');
      fieldEl.className = 'review-field';

      var labelEl = document.createElement('span');
      labelEl.className = 'review-label';
      labelEl.textContent = fieldDef.label + ':';
      fieldEl.appendChild(labelEl);

      var valueEl = document.createElement('span');
      valueEl.className = 'review-value';

      if (fieldDef.type === 'dynamic-list' && Array.isArray(value) && value.length > 0) {
        var ul = document.createElement('ul');
        ul.className = 'review-list';
        value.forEach(function (item) {
          var li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });
        valueEl.appendChild(ul);
      } else if (fieldDef.type === 'npc-list' && Array.isArray(value) && value.length > 0) {
        value.forEach(function (npc) {
          var card = document.createElement('div');
          card.className = 'review-npc-card';
          var nameEl = document.createElement('strong');
          nameEl.textContent = npc.name;
          card.appendChild(nameEl);
          var descEl = document.createElement('p');
          descEl.textContent = npc.description;
          card.appendChild(descEl);
          valueEl.appendChild(card);
        });
      } else {
        var displayValue = Array.isArray(value) ? value.join(', ') : (value || '');
        if (!displayValue) {
          valueEl.classList.add('review-value--empty');
          valueEl.textContent = '(not set)';
        } else {
          valueEl.textContent = displayValue;
        }
      }

      fieldEl.appendChild(valueEl);
      sectionEl.appendChild(fieldEl);
    });

    containerEl.appendChild(sectionEl);
  });

  // Verification section
  var hasVerification = REVIEW_VERIFICATION_FIELDS.some(function (f) {
    var v = readFieldValue(f);
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  });

  if (hasVerification) {
    var verifSection = document.createElement('div');
    verifSection.className = 'review-section review-section--verification';

    var verifHeader = document.createElement('h3');
    verifHeader.className = 'review-section__header';
    verifHeader.textContent = 'Concept Verification';
    verifSection.appendChild(verifHeader);

    REVIEW_VERIFICATION_FIELDS.forEach(function (fieldDef) {
      var value = readFieldValue(fieldDef);
      var isEmpty = Array.isArray(value) ? value.length === 0 : !value;
      if (isEmpty) return;

      var fieldEl = document.createElement('div');
      fieldEl.className = 'review-field';

      var labelEl = document.createElement('span');
      labelEl.className = 'review-label';
      labelEl.textContent = fieldDef.label + ':';
      fieldEl.appendChild(labelEl);

      var valueEl = document.createElement('span');
      valueEl.className = 'review-value';

      if (fieldDef.type === 'dynamic-list' && Array.isArray(value)) {
        var ul = document.createElement('ul');
        ul.className = 'review-list';
        value.forEach(function (item) {
          var li = document.createElement('li');
          li.textContent = item;
          ul.appendChild(li);
        });
        valueEl.appendChild(ul);
      } else {
        valueEl.textContent = value;
      }

      fieldEl.appendChild(valueEl);
      verifSection.appendChild(fieldEl);
    });

    containerEl.appendChild(verifSection);
  }
}

function readFieldValue(fieldDef) {
  var el = document.getElementById(fieldDef.id);
  if (!el) return '';

  if (fieldDef.type === 'select') {
    if (el instanceof HTMLSelectElement && el.selectedIndex >= 0) {
      var option = el.options[el.selectedIndex];
      return option && option.value ? option.text : '';
    }
    return '';
  }

  if (fieldDef.type === 'span') {
    return (el.textContent || '').trim();
  }

  if (fieldDef.type === 'dynamic-list') {
    return typeof collectDynamicListEntries === 'function'
      ? collectDynamicListEntries(fieldDef.field)
      : [];
  }

  if (fieldDef.type === 'npc-list') {
    return typeof collectNpcEntries === 'function' ? collectNpcEntries() : [];
  }

  return (el.value || '').trim();
}
