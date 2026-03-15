// ── Stage Renderers for Character Development ──────────────────────

var EMOTION_SALIENCE_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

var RELATIONSHIP_TYPE_OPTIONS = [
  { value: 'KIN', label: 'Kin' },
  { value: 'ALLY', label: 'Ally' },
  { value: 'RIVAL', label: 'Rival' },
  { value: 'PATRON', label: 'Patron' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'MENTOR', label: 'Mentor' },
  { value: 'SUBORDINATE', label: 'Subordinate' },
  { value: 'ROMANTIC', label: 'Romantic' },
  { value: 'EX_ROMANTIC', label: 'Ex-Romantic' },
  { value: 'INFORMANT', label: 'Informant' },
];

var RELATIONSHIP_VALENCE_OPTIONS = [
  { value: 'POSITIVE', label: 'Positive' },
  { value: 'NEGATIVE', label: 'Negative' },
  { value: 'AMBIVALENT', label: 'Ambivalent' },
];

function formatEnumLabel(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return '';
  }
  return value
    .split('_')
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function renderLabeledField(label, value) {
  return (
    '<div class="stage-field">' +
    '<span class="stage-field-label">' + escapeHtml(label) + ':</span> ' +
    '<span class="stage-field-value">' + escapeHtml(String(value || '')) + '</span>' +
    '</div>'
  );
}

function renderLabeledLongText(label, value) {
  return (
    '<div class="stage-field">' +
    '<span class="stage-field-label">' + escapeHtml(label) + ':</span>' +
    '<div class="stage-field-long">' + escapeHtmlWithBreaks(String(value || '')) + '</div>' +
    '</div>'
  );
}

function renderBulletList(label, items) {
  var safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return (
      '<div class="stage-field">' +
      '<span class="stage-field-label">' + escapeHtml(label) + ':</span> ' +
      '<span class="stage-field-value stage-field-empty">None</span>' +
      '</div>'
    );
  }

  return (
    '<div class="stage-field">' +
    '<span class="stage-field-label">' + escapeHtml(label) + ':</span>' +
    '<ul class="stage-bullet-list">' +
    safeItems.map(function (item) {
      return '<li>' + escapeHtml(String(item)) + '</li>';
    }).join('') +
    '</ul>' +
    '</div>'
  );
}

function renderEnumBadge(label, value) {
  return (
    '<div class="stage-field">' +
    '<span class="stage-field-label">' + escapeHtml(label) + ':</span> ' +
    '<span class="stage-enum-badge">' + escapeHtml(formatEnumLabel(value)) + '</span>' +
    '</div>'
  );
}

// ── Per-stage renderers ─────────────────────────────────────────────

function renderStage1(data) {
  return (
    renderLabeledField('Super Objective', data.superObjective) +
    renderBulletList('Immediate Objectives', data.immediateObjectives) +
    renderLabeledField('Primary Opposition', data.primaryOpposition) +
    renderBulletList('Stakes', data.stakes) +
    renderBulletList('Constraints', data.constraints) +
    renderLabeledField('Pressure Point', data.pressurePoint)
  );
}

function renderStage2(data) {
  return (
    renderLabeledLongText('Physiology', data.physiology) +
    renderLabeledLongText('Sociology', data.sociology) +
    renderLabeledLongText('Psychology', data.psychology) +
    renderBulletList('Core Traits', data.coreTraits)
  );
}

function renderStage3(data) {
  return (
    renderEnumBadge('Emotion Salience', data.emotionSalience) +
    renderBulletList('Core Beliefs', data.coreBeliefs) +
    renderBulletList('Desires', data.desires) +
    renderBulletList('Current Intentions', data.currentIntentions) +
    renderBulletList('False Beliefs', data.falseBeliefs) +
    renderLabeledLongText('Decision Pattern', data.decisionPattern)
  );
}

function renderStage4(data) {
  var html = '';

  if (Array.isArray(data.relationships)) {
    html += data.relationships.map(function (rel) {
      return (
        '<div class="stage-relationship-card">' +
        '<h5 class="stage-relationship-header">' +
        escapeHtml(rel.fromCharacter) + ' &rarr; ' + escapeHtml(rel.toCharacter) +
        '</h5>' +
        renderEnumBadge('Type', rel.relationshipType) +
        renderEnumBadge('Valence', rel.valence) +
        renderLabeledField('Numeric Valence', rel.numericValence) +
        renderLabeledLongText('History', rel.history) +
        renderLabeledLongText('Current Tension', rel.currentTension) +
        renderLabeledLongText('Leverage', rel.leverage) +
        '</div>'
      );
    }).join('');
  }

  html += renderBulletList('Secrets', data.secrets);
  html += renderBulletList('Personal Dilemmas', data.personalDilemmas);
  return html;
}

function renderSpeechFingerprintSection(fp) {
  if (!fp) {
    return '<div class="stage-field"><span class="stage-field-label">Speech Fingerprint:</span> <span class="stage-field-empty">None</span></div>';
  }

  return (
    '<div class="stage-speech-section">' +
    '<span class="stage-field-label stage-section-header">Speech Fingerprint</span>' +
    renderBulletList('Catchphrases', fp.catchphrases) +
    renderLabeledLongText('Vocabulary Profile', fp.vocabularyProfile) +
    renderLabeledLongText('Sentence Patterns', fp.sentencePatterns) +
    renderBulletList('Verbal Tics', fp.verbalTics) +
    renderBulletList('Dialogue Samples', fp.dialogueSamples) +
    renderLabeledLongText('Metaphor Frames', fp.metaphorFrames) +
    renderBulletList('Anti-Examples', fp.antiExamples) +
    renderBulletList('Discourse Markers', fp.discourseMarkers) +
    renderLabeledLongText('Register Shifts', fp.registerShifts) +
    '</div>'
  );
}

function renderStage5(data) {
  return (
    renderSpeechFingerprintSection(data.speechFingerprint) +
    renderLabeledLongText('Appearance', data.appearance) +
    renderLabeledLongText('Knowledge Boundaries', data.knowledgeBoundaries) +
    renderLabeledLongText('Conflict Priority', data.conflictPriority)
  );
}

function renderStageContent(stageNumber, payload) {
  switch (stageNumber) {
    case 1: return renderStage1(payload);
    case 2: return renderStage2(payload);
    case 3: return renderStage3(payload);
    case 4: return renderStage4(payload);
    case 5: return renderStage5(payload);
    default: return '<pre>' + escapeHtml(JSON.stringify(payload, null, 2)) + '</pre>';
  }
}

// ── Markdown copy ───────────────────────────────────────────────────

function bulletListToMarkdown(label, items) {
  var safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return '**' + label + ':** None\n';
  }

  return (
    '**' + label + ':**\n' +
    safeItems.map(function (item) { return '- ' + item; }).join('\n') +
    '\n'
  );
}

function stageToMarkdown(stageNumber, payload, characterName) {
  var stageName = ['', 'Character Kernel', 'Tridimensional Profile', 'Agency Model', 'Deep Relationships', 'Textual Presentation'][stageNumber] || 'Stage ' + stageNumber;
  var lines = ['## ' + stageName + (characterName ? ' — ' + characterName : ''), ''];

  switch (stageNumber) {
    case 1:
      lines.push('**Super Objective:** ' + (payload.superObjective || ''));
      lines.push('');
      lines.push(bulletListToMarkdown('Immediate Objectives', payload.immediateObjectives));
      lines.push('**Primary Opposition:** ' + (payload.primaryOpposition || ''));
      lines.push('');
      lines.push(bulletListToMarkdown('Stakes', payload.stakes));
      lines.push(bulletListToMarkdown('Constraints', payload.constraints));
      lines.push('**Pressure Point:** ' + (payload.pressurePoint || ''));
      break;

    case 2:
      lines.push('**Physiology:** ' + (payload.physiology || ''));
      lines.push('');
      lines.push('**Sociology:** ' + (payload.sociology || ''));
      lines.push('');
      lines.push('**Psychology:** ' + (payload.psychology || ''));
      lines.push('');
      lines.push(bulletListToMarkdown('Core Traits', payload.coreTraits));
      break;

    case 3:
      lines.push('**Emotion Salience:** ' + formatEnumLabel(payload.emotionSalience));
      lines.push('');
      lines.push(bulletListToMarkdown('Core Beliefs', payload.coreBeliefs));
      lines.push(bulletListToMarkdown('Desires', payload.desires));
      lines.push(bulletListToMarkdown('Current Intentions', payload.currentIntentions));
      lines.push(bulletListToMarkdown('False Beliefs', payload.falseBeliefs));
      lines.push('**Decision Pattern:** ' + (payload.decisionPattern || ''));
      break;

    case 4:
      if (Array.isArray(payload.relationships)) {
        payload.relationships.forEach(function (rel) {
          lines.push('### ' + rel.fromCharacter + ' → ' + rel.toCharacter);
          lines.push('');
          lines.push('**Type:** ' + formatEnumLabel(rel.relationshipType));
          lines.push('**Valence:** ' + formatEnumLabel(rel.valence) + ' (' + rel.numericValence + ')');
          lines.push('**History:** ' + (rel.history || ''));
          lines.push('**Current Tension:** ' + (rel.currentTension || ''));
          lines.push('**Leverage:** ' + (rel.leverage || ''));
          lines.push('');
        });
      }
      lines.push(bulletListToMarkdown('Secrets', payload.secrets));
      lines.push(bulletListToMarkdown('Personal Dilemmas', payload.personalDilemmas));
      break;

    case 5:
      if (payload.speechFingerprint) {
        var fp = payload.speechFingerprint;
        lines.push('### Speech Fingerprint');
        lines.push('');
        lines.push(bulletListToMarkdown('Catchphrases', fp.catchphrases));
        lines.push('**Vocabulary Profile:** ' + (fp.vocabularyProfile || ''));
        lines.push('');
        lines.push('**Sentence Patterns:** ' + (fp.sentencePatterns || ''));
        lines.push('');
        lines.push(bulletListToMarkdown('Verbal Tics', fp.verbalTics));
        lines.push(bulletListToMarkdown('Dialogue Samples', fp.dialogueSamples));
        lines.push('**Metaphor Frames:** ' + (fp.metaphorFrames || ''));
        lines.push('');
        lines.push(bulletListToMarkdown('Anti-Examples', fp.antiExamples));
        lines.push(bulletListToMarkdown('Discourse Markers', fp.discourseMarkers));
        lines.push('**Register Shifts:** ' + (fp.registerShifts || ''));
        lines.push('');
      }
      lines.push('**Appearance:** ' + (payload.appearance || ''));
      lines.push('');
      lines.push('**Knowledge Boundaries:** ' + (payload.knowledgeBoundaries || ''));
      lines.push('');
      lines.push('**Conflict Priority:** ' + (payload.conflictPriority || ''));
      break;
  }

  return lines.join('\n');
}

function copyStageAsMarkdown(stageNumber, payload, characterName, buttonEl) {
  var md = stageToMarkdown(stageNumber, payload, characterName);
  navigator.clipboard.writeText(md).then(function () {
    var originalText = buttonEl.textContent;
    buttonEl.textContent = 'Copied!';
    setTimeout(function () {
      buttonEl.textContent = originalText;
    }, 1500);
  });
}

// ── Edit mode ───────────────────────────────────────────────────────

function buildStringInput(value, className) {
  var input = document.createElement('input');
  input.type = 'text';
  input.className = className || 'concept-inline-input';
  input.value = value || '';
  return input;
}

function buildTextarea(value, className) {
  var textarea = document.createElement('textarea');
  textarea.className = className || 'concept-inline-textarea';
  textarea.rows = 3;
  textarea.value = value || '';
  return textarea;
}

function buildSelect(currentValue, options) {
  var select = document.createElement('select');
  select.className = 'concept-inline-select';
  options.forEach(function (opt) {
    var option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === currentValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  return select;
}

function buildListEditor(items, containerClass) {
  var currentItems = Array.isArray(items) ? items.slice() : [];
  var container = document.createElement('div');
  container.className = containerClass || 'concept-inline-list-editor';

  function render() {
    container.innerHTML = '';
    currentItems.forEach(function (item, idx) {
      var row = document.createElement('div');
      row.className = 'concept-inline-list-item';

      var inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'concept-inline-input';
      inp.value = item;
      inp.addEventListener('input', function () {
        currentItems[idx] = inp.value;
      });

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'concept-inline-list-remove';
      removeBtn.textContent = '\u00d7';
      removeBtn.addEventListener('click', function () {
        currentItems.splice(idx, 1);
        render();
      });

      row.appendChild(inp);
      row.appendChild(removeBtn);
      container.appendChild(row);
    });

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'concept-inline-list-add';
    addBtn.textContent = '+ Add';
    addBtn.addEventListener('click', function () {
      currentItems.push('');
      render();
      var inputs = container.querySelectorAll('.concept-inline-input');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    });
    container.appendChild(addBtn);
  }

  render();

  container.getValues = function () {
    return currentItems
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  };

  return container;
}

function buildEditField(label, editor) {
  var wrapper = document.createElement('div');
  wrapper.className = 'stage-edit-field';
  var labelEl = document.createElement('label');
  labelEl.className = 'stage-field-label';
  labelEl.textContent = label + ':';
  wrapper.appendChild(labelEl);
  wrapper.appendChild(editor);
  return wrapper;
}

function buildStage1EditForm(data) {
  var form = document.createElement('div');
  form.className = 'stage-edit-form';

  var superObjective = buildStringInput(data.superObjective);
  var immediateObjectives = buildListEditor(data.immediateObjectives);
  var primaryOpposition = buildStringInput(data.primaryOpposition);
  var stakes = buildListEditor(data.stakes);
  var constraints = buildListEditor(data.constraints);
  var pressurePoint = buildStringInput(data.pressurePoint);

  form.appendChild(buildEditField('Super Objective', superObjective));
  form.appendChild(buildEditField('Immediate Objectives', immediateObjectives));
  form.appendChild(buildEditField('Primary Opposition', primaryOpposition));
  form.appendChild(buildEditField('Stakes', stakes));
  form.appendChild(buildEditField('Constraints', constraints));
  form.appendChild(buildEditField('Pressure Point', pressurePoint));

  form.collectValues = function () {
    return {
      characterName: data.characterName,
      superObjective: superObjective.value.trim(),
      immediateObjectives: immediateObjectives.getValues(),
      primaryOpposition: primaryOpposition.value.trim(),
      stakes: stakes.getValues(),
      constraints: constraints.getValues(),
      pressurePoint: pressurePoint.value.trim(),
    };
  };

  return form;
}

function buildStage2EditForm(data) {
  var form = document.createElement('div');
  form.className = 'stage-edit-form';

  var physiology = buildTextarea(data.physiology);
  var sociology = buildTextarea(data.sociology);
  var psychology = buildTextarea(data.psychology);
  var coreTraits = buildListEditor(data.coreTraits);

  form.appendChild(buildEditField('Physiology', physiology));
  form.appendChild(buildEditField('Sociology', sociology));
  form.appendChild(buildEditField('Psychology', psychology));
  form.appendChild(buildEditField('Core Traits', coreTraits));

  form.collectValues = function () {
    return {
      characterName: data.characterName,
      physiology: physiology.value.trim(),
      sociology: sociology.value.trim(),
      psychology: psychology.value.trim(),
      coreTraits: coreTraits.getValues(),
    };
  };

  return form;
}

function buildStage3EditForm(data) {
  var form = document.createElement('div');
  form.className = 'stage-edit-form';

  var emotionSalience = buildSelect(data.emotionSalience, EMOTION_SALIENCE_OPTIONS);
  var coreBeliefs = buildListEditor(data.coreBeliefs);
  var desires = buildListEditor(data.desires);
  var currentIntentions = buildListEditor(data.currentIntentions);
  var falseBeliefs = buildListEditor(data.falseBeliefs);
  var decisionPattern = buildTextarea(data.decisionPattern);

  form.appendChild(buildEditField('Emotion Salience', emotionSalience));
  form.appendChild(buildEditField('Core Beliefs', coreBeliefs));
  form.appendChild(buildEditField('Desires', desires));
  form.appendChild(buildEditField('Current Intentions', currentIntentions));
  form.appendChild(buildEditField('False Beliefs', falseBeliefs));
  form.appendChild(buildEditField('Decision Pattern', decisionPattern));

  form.collectValues = function () {
    return {
      characterName: data.characterName,
      emotionSalience: emotionSalience.value,
      coreBeliefs: coreBeliefs.getValues(),
      desires: desires.getValues(),
      currentIntentions: currentIntentions.getValues(),
      falseBeliefs: falseBeliefs.getValues(),
      decisionPattern: decisionPattern.value.trim(),
    };
  };

  return form;
}

function buildStage4EditForm(data) {
  var form = document.createElement('div');
  form.className = 'stage-edit-form';

  var relEditors = [];

  if (Array.isArray(data.relationships)) {
    data.relationships.forEach(function (rel) {
      var card = document.createElement('div');
      card.className = 'stage-relationship-card';

      var header = document.createElement('h5');
      header.className = 'stage-relationship-header';
      header.textContent = rel.fromCharacter + ' \u2192 ' + rel.toCharacter;
      card.appendChild(header);

      var relType = buildSelect(rel.relationshipType, RELATIONSHIP_TYPE_OPTIONS);
      var valence = buildSelect(rel.valence, RELATIONSHIP_VALENCE_OPTIONS);
      var numericValence = buildStringInput(String(rel.numericValence));
      numericValence.type = 'number';
      numericValence.min = '-10';
      numericValence.max = '10';
      var history = buildTextarea(rel.history);
      var currentTension = buildTextarea(rel.currentTension);
      var leverage = buildTextarea(rel.leverage);

      card.appendChild(buildEditField('Type', relType));
      card.appendChild(buildEditField('Valence', valence));
      card.appendChild(buildEditField('Numeric Valence', numericValence));
      card.appendChild(buildEditField('History', history));
      card.appendChild(buildEditField('Current Tension', currentTension));
      card.appendChild(buildEditField('Leverage', leverage));
      form.appendChild(card);

      relEditors.push({
        fromCharacter: rel.fromCharacter,
        toCharacter: rel.toCharacter,
        relType: relType,
        valence: valence,
        numericValence: numericValence,
        history: history,
        currentTension: currentTension,
        leverage: leverage,
      });
    });
  }

  var secrets = buildListEditor(data.secrets);
  var personalDilemmas = buildListEditor(data.personalDilemmas);

  form.appendChild(buildEditField('Secrets', secrets));
  form.appendChild(buildEditField('Personal Dilemmas', personalDilemmas));

  form.collectValues = function () {
    return {
      relationships: relEditors.map(function (ed) {
        return {
          fromCharacter: ed.fromCharacter,
          toCharacter: ed.toCharacter,
          relationshipType: ed.relType.value,
          valence: ed.valence.value,
          numericValence: Number(ed.numericValence.value) || 0,
          history: ed.history.value.trim(),
          currentTension: ed.currentTension.value.trim(),
          leverage: ed.leverage.value.trim(),
        };
      }),
      secrets: secrets.getValues(),
      personalDilemmas: personalDilemmas.getValues(),
    };
  };

  return form;
}

function buildSpeechFingerprintEditForm(fp) {
  var section = document.createElement('div');
  section.className = 'stage-speech-section';

  var sectionLabel = document.createElement('span');
  sectionLabel.className = 'stage-field-label stage-section-header';
  sectionLabel.textContent = 'Speech Fingerprint';
  section.appendChild(sectionLabel);

  var catchphrases = buildListEditor(fp.catchphrases);
  var vocabularyProfile = buildTextarea(fp.vocabularyProfile);
  var sentencePatterns = buildTextarea(fp.sentencePatterns);
  var verbalTics = buildListEditor(fp.verbalTics);
  var dialogueSamples = buildListEditor(fp.dialogueSamples);
  var metaphorFrames = buildTextarea(fp.metaphorFrames);
  var antiExamples = buildListEditor(fp.antiExamples);
  var discourseMarkers = buildListEditor(fp.discourseMarkers);
  var registerShifts = buildTextarea(fp.registerShifts);

  section.appendChild(buildEditField('Catchphrases', catchphrases));
  section.appendChild(buildEditField('Vocabulary Profile', vocabularyProfile));
  section.appendChild(buildEditField('Sentence Patterns', sentencePatterns));
  section.appendChild(buildEditField('Verbal Tics', verbalTics));
  section.appendChild(buildEditField('Dialogue Samples', dialogueSamples));
  section.appendChild(buildEditField('Metaphor Frames', metaphorFrames));
  section.appendChild(buildEditField('Anti-Examples', antiExamples));
  section.appendChild(buildEditField('Discourse Markers', discourseMarkers));
  section.appendChild(buildEditField('Register Shifts', registerShifts));

  section.collectValues = function () {
    return {
      catchphrases: catchphrases.getValues(),
      vocabularyProfile: vocabularyProfile.value.trim(),
      sentencePatterns: sentencePatterns.value.trim(),
      verbalTics: verbalTics.getValues(),
      dialogueSamples: dialogueSamples.getValues(),
      metaphorFrames: metaphorFrames.value.trim(),
      antiExamples: antiExamples.getValues(),
      discourseMarkers: discourseMarkers.getValues(),
      registerShifts: registerShifts.value.trim(),
    };
  };

  return section;
}

function buildStage5EditForm(data) {
  var form = document.createElement('div');
  form.className = 'stage-edit-form';

  var speechFp = buildSpeechFingerprintEditForm(data.speechFingerprint || {});
  var appearance = buildTextarea(data.appearance);
  var knowledgeBoundaries = buildTextarea(data.knowledgeBoundaries);
  var conflictPriority = buildTextarea(data.conflictPriority);

  form.appendChild(speechFp);
  form.appendChild(buildEditField('Appearance', appearance));
  form.appendChild(buildEditField('Knowledge Boundaries', knowledgeBoundaries));
  form.appendChild(buildEditField('Conflict Priority', conflictPriority));

  form.collectValues = function () {
    return {
      characterName: data.characterName,
      speechFingerprint: speechFp.collectValues(),
      appearance: appearance.value.trim(),
      knowledgeBoundaries: knowledgeBoundaries.value.trim(),
      conflictPriority: conflictPriority.value.trim(),
    };
  };

  return form;
}

function buildEditFormForStage(stageNumber, data) {
  switch (stageNumber) {
    case 1: return buildStage1EditForm(data);
    case 2: return buildStage2EditForm(data);
    case 3: return buildStage3EditForm(data);
    case 4: return buildStage4EditForm(data);
    case 5: return buildStage5EditForm(data);
    default: return null;
  }
}

// ── Stage block wrapper ─────────────────────────────────────────────

function renderStageBlock(stageNumber, payload, characterId, characterName) {
  if (payload === null || payload === undefined) {
    return '<p class="form-help">Not generated yet.</p>';
  }

  return (
    '<div class="stage-block" data-stage="' + stageNumber + '" data-char-id="' + escapeHtml(characterId) + '" data-char-name="' + escapeHtml(characterName || '') + '">' +
    '<div class="stage-block-toolbar">' +
    '<button type="button" class="btn btn-secondary btn-sm stage-copy-btn" data-stage="' + stageNumber + '">Copy as Markdown</button>' +
    '<button type="button" class="btn btn-secondary btn-sm stage-edit-btn" data-stage="' + stageNumber + '">Edit</button>' +
    '</div>' +
    '<div class="stage-block-content">' +
    renderStageContent(stageNumber, payload) +
    '</div>' +
    '</div>'
  );
}

function attachStageBlockListeners(container, getPayload, onSaved) {
  container.querySelectorAll('.stage-copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var block = btn.closest('.stage-block');
      if (!block) return;
      var stageNumber = Number(block.getAttribute('data-stage'));
      var charName = block.getAttribute('data-char-name') || '';
      var payload = getPayload(stageNumber);
      if (payload) {
        copyStageAsMarkdown(stageNumber, payload, charName, btn);
      }
    });
  });

  container.querySelectorAll('.stage-edit-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var block = btn.closest('.stage-block');
      if (!block) return;
      var stageNumber = Number(block.getAttribute('data-stage'));
      var charId = block.getAttribute('data-char-id') || '';
      var payload = getPayload(stageNumber);
      if (!payload) return;

      var contentEl = block.querySelector('.stage-block-content');
      if (!contentEl) return;

      var editForm = buildEditFormForStage(stageNumber, payload);
      if (!editForm) return;

      contentEl.innerHTML = '';
      contentEl.appendChild(editForm);

      var actions = document.createElement('div');
      actions.className = 'stage-edit-actions';

      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary btn-sm';
      saveBtn.textContent = 'Save Changes';

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-secondary btn-sm';
      cancelBtn.textContent = 'Cancel';

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      contentEl.appendChild(actions);

      // Hide toolbar during edit
      var toolbar = block.querySelector('.stage-block-toolbar');
      if (toolbar) toolbar.style.display = 'none';

      cancelBtn.addEventListener('click', function () {
        contentEl.innerHTML = renderStageContent(stageNumber, payload);
        if (toolbar) toolbar.style.display = '';
      });

      saveBtn.addEventListener('click', function () {
        var values = editForm.collectValues();
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        fetch(
          '/character-webs/api/characters/' + encodeURIComponent(charId) + '/stages/' + stageNumber,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          }
        )
          .then(function (response) { return response.json(); })
          .then(function (data) {
            if (data.success && data.character) {
              contentEl.innerHTML = renderStageContent(stageNumber, values);
              if (toolbar) toolbar.style.display = '';
              if (onSaved) onSaved(data.character);
            } else {
              throw new Error((data && data.error) || 'Failed to save stage');
            }
          })
          .catch(function (err) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
            window.alert('Save failed: ' + (err.message || 'Unknown error'));
          });
      });
    });
  });
}
