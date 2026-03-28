window.ChatTurnRenderer = (function () {
  function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function hasItems(items) {
    return Array.isArray(items) && items.length > 0;
  }

  function formatSignedNumber(value) {
    if (typeof value !== 'number' || !isFinite(value) || value === 0) {
      return String(value || 0);
    }

    return (value > 0 ? '+' : '') + String(value);
  }

  function buildDefinitionListHtml(rows) {
    var safeRows = Array.isArray(rows) ? rows.filter(function (row) {
      return row && hasText(row.label) && hasText(row.value);
    }) : [];

    if (safeRows.length === 0) {
      return '';
    }

    return (
      '<dl class="chat-inner-world__details">' +
      safeRows.map(function (row) {
        return (
          '<div class="chat-inner-world__detail">' +
          '<dt>' + escapeHtml(row.label) + '</dt>' +
          '<dd>' + escapeHtml(row.value) + '</dd>' +
          '</div>'
        );
      }).join('') +
      '</dl>'
    );
  }

  function buildListHtml(items, itemClass, renderItem) {
    var safeItems = Array.isArray(items) ? items.filter(function (item) {
      return item != null;
    }) : [];

    if (safeItems.length === 0) {
      return '';
    }

    return (
      '<ul class="chat-inner-world__list">' +
      safeItems.map(function (item) {
        return (
          '<li class="' + escapeHtml(itemClass || 'chat-inner-world__list-item') + '">' +
          renderItem(item) +
          '</li>'
        );
      }).join('') +
      '</ul>'
    );
  }

  function buildSectionHtml(title, body, modifierClass) {
    if (!body) {
      return '';
    }

    return (
      '<section class="chat-inner-world__section' +
      (modifierClass ? ' ' + modifierClass : '') +
      '">' +
      '<h3 class="chat-inner-world__section-title">' + escapeHtml(title) + '</h3>' +
      body +
      '</section>'
    );
  }

  function buildInternalSelfCheckHtml(plannerOutput) {
    if (!plannerOutput || !plannerOutput.internalSelfCheck) {
      return '';
    }

    return buildSectionHtml(
      'Internal Self-Check',
      buildDefinitionListHtml([
        { label: 'What I want', value: plannerOutput.internalSelfCheck.whatDoIWant },
        { label: 'What I know', value: plannerOutput.internalSelfCheck.whatDoIKnow },
        { label: "What I'm hiding", value: plannerOutput.internalSelfCheck.whatAmIHiding },
        { label: 'How honest am I', value: plannerOutput.internalSelfCheck.howHonestAmI },
      ])
    );
  }

  function buildEmotionalLayerHtml(plannerOutput) {
    if (!plannerOutput) {
      return '';
    }

    var emotionCards = '';
    if (hasText(plannerOutput.surfaceEmotion) || hasText(plannerOutput.suppressedEmotion)) {
      emotionCards =
        '<div class="chat-inner-world__emotion-grid">' +
        (hasText(plannerOutput.surfaceEmotion)
          ? '<div class="chat-inner-world__emotion-card">' +
            '<span class="chat-inner-world__eyebrow">Surface emotion</span>' +
            '<p>' + escapeHtml(plannerOutput.surfaceEmotion) + '</p>' +
            '</div>'
          : '') +
        (hasText(plannerOutput.suppressedEmotion)
          ? '<div class="chat-inner-world__emotion-card">' +
            '<span class="chat-inner-world__eyebrow">Suppressed emotion</span>' +
            '<p>' + escapeHtml(plannerOutput.suppressedEmotion) + '</p>' +
            '</div>'
          : '') +
        '</div>';
    }

    var subtextHtml = hasText(plannerOutput.subtext)
      ? '<div class="chat-inner-world__copy-block">' +
        '<span class="chat-inner-world__eyebrow">Subtext</span>' +
        '<p>' + escapeHtml(plannerOutput.subtext) + '</p>' +
        '</div>'
      : '';

    return buildSectionHtml('Emotional Layer', emotionCards + subtextHtml);
  }

  function buildResponseStrategyHtml(plannerOutput) {
    if (!plannerOutput) {
      return '';
    }

    var mustAddressHtml = hasItems(plannerOutput.mustAddress)
      ? '<div class="chat-inner-world__copy-block">' +
        '<span class="chat-inner-world__eyebrow">Must address</span>' +
        buildListHtml(plannerOutput.mustAddress, 'chat-inner-world__list-item', function (item) {
          return escapeHtml(String(item));
        }) +
        '</div>'
      : '';
    var mustAvoidHtml = hasItems(plannerOutput.mustAvoid)
      ? '<div class="chat-inner-world__copy-block">' +
        '<span class="chat-inner-world__eyebrow">Must avoid</span>' +
        buildListHtml(plannerOutput.mustAvoid, 'chat-inner-world__list-item', function (item) {
          return escapeHtml(String(item));
        }) +
        '</div>'
      : '';

    return buildSectionHtml(
      'Response Strategy',
      buildDefinitionListHtml([
        { label: 'Response goal', value: plannerOutput.responseGoal },
        { label: 'Target length', value: plannerOutput.targetLength },
      ]) +
      mustAddressHtml +
      mustAvoidHtml
    );
  }

  function buildActionPlanHtml(plannerOutput) {
    if (!plannerOutput || !hasItems(plannerOutput.actionPlan)) {
      return '';
    }

    return buildSectionHtml(
      'Action Plan',
      buildListHtml(plannerOutput.actionPlan, 'chat-inner-world__list-item', function (item) {
        var changeBadge = item.changesPhysicalState
          ? '<span class="chat-inner-world__pill chat-inner-world__pill--physical">Physical change</span>'
          : '';
        return (
          '<div class="chat-inner-world__action-item">' +
          '<span class="chat-inner-world__pill">' + escapeHtml(String(item.kind || '')) + '</span>' +
          '<span class="chat-inner-world__action-text">' + escapeHtml(String(item.text || '')) + '</span>' +
          changeBadge +
          '</div>'
        );
      })
    );
  }

  function buildTurnImpactHtml(turn) {
    if (!turn) {
      return '';
    }

    var turnMeta = turn.turnMeta || {};
    var expectedImpact = turn.plannerOutput && turn.plannerOutput.expectedImpact
      ? turn.plannerOutput.expectedImpact
      : null;
    var replyBadges = '';

    if (turnMeta.expectsReply === true) {
      replyBadges += '<span class="chat-inner-world__pill">Expects reply</span>';
    }
    if (turnMeta.endsWithQuestion === true) {
      replyBadges += '<span class="chat-inner-world__pill">Ends with question</span>';
    }

    return buildSectionHtml(
      'Turn Impact',
      buildDefinitionListHtml([
        { label: 'Final pressure', value: turnMeta.finalPressure },
        expectedImpact
          ? {
              label: 'Relationship delta hint',
              value: formatSignedNumber(expectedImpact.relationshipDeltaHint),
            }
          : null,
        expectedImpact
          ? {
              label: 'Tension delta hint',
              value: formatSignedNumber(expectedImpact.tensionDeltaHint),
            }
          : null,
        expectedImpact
          ? {
              label: 'Reveals secret',
              value: expectedImpact.revealsSecret ? 'Yes' : 'No',
            }
          : null,
      ]) +
      (replyBadges
        ? '<div class="chat-inner-world__pill-row">' + replyBadges + '</div>'
        : '')
    );
  }

  function buildStateChangesHtml(stateUpdate) {
    if (!stateUpdate) {
      return '';
    }

    var relationshipShiftsHtml = hasItems(stateUpdate.relationshipShifts)
      ? '<div class="chat-inner-world__copy-block">' +
        '<span class="chat-inner-world__eyebrow">Relationship shifts</span>' +
        buildListHtml(stateUpdate.relationshipShifts, 'chat-inner-world__list-item', function (shift) {
          var dynamicText = hasText(shift.suggestedNewDynamic)
            ? ' Suggested dynamic: ' + escapeHtml(shift.suggestedNewDynamic) + '.'
            : '';
          return (
            '<strong>' + escapeHtml(String(shift.shiftDescription || '')) + '</strong>' +
            ' (' +
            'Valence ' + escapeHtml(formatSignedNumber(shift.suggestedValenceChange)) +
            ', Tension ' + escapeHtml(formatSignedNumber(shift.suggestedTensionChange)) +
            ').' +
            dynamicText
          );
        }) +
        '</div>'
      : '';
    var knowledgeChanges = stateUpdate.knowledgeChanges || {};
    var knowledgeChangesHtml = buildDefinitionListHtml([
      {
        label: 'New known facts',
        value: hasItems(knowledgeChanges.newKnownFacts) ? knowledgeChanges.newKnownFacts.join(', ') : '',
      },
      {
        label: 'New suspicions',
        value: hasItems(knowledgeChanges.newSuspicions) ? knowledgeChanges.newSuspicions.join(', ') : '',
      },
      {
        label: 'False beliefs corrected',
        value: hasItems(knowledgeChanges.falseBeliefsCorrected)
          ? knowledgeChanges.falseBeliefsCorrected.join(', ')
          : '',
      },
      {
        label: 'Secrets revealed',
        value: hasItems(knowledgeChanges.secretsRevealed) ? knowledgeChanges.secretsRevealed.join(', ') : '',
      },
    ]);
    var conversationUpdate = stateUpdate.conversationUpdate || {};
    var conversationUpdateHtml = buildDefinitionListHtml([
      {
        label: 'Commitments made',
        value: hasItems(conversationUpdate.commitmentsMade) ? conversationUpdate.commitmentsMade.join(', ') : '',
      },
      {
        label: 'Threats made',
        value: hasItems(conversationUpdate.threatsMade) ? conversationUpdate.threatsMade.join(', ') : '',
      },
      {
        label: 'Questions opened',
        value: hasItems(conversationUpdate.questionsOpened) ? conversationUpdate.questionsOpened.join(', ') : '',
      },
      {
        label: 'Questions resolved',
        value: hasItems(conversationUpdate.questionsResolved) ? conversationUpdate.questionsResolved.join(', ') : '',
      },
    ]);
    var physicalStateUpdate = stateUpdate.physicalStateUpdate || {};
    var physicalChangesHtml = buildDefinitionListHtml([
      {
        label: 'Location changed',
        value: typeof physicalStateUpdate.locationChanged === 'boolean'
          ? (physicalStateUpdate.locationChanged ? 'Yes' : 'No')
          : '',
      },
      { label: 'New location', value: physicalStateUpdate.newLocation },
      { label: 'New micro-location', value: physicalStateUpdate.newMicroLocation },
      { label: 'New distance band', value: physicalStateUpdate.newDistanceBand },
      {
        label: 'Object state changes',
        value: hasItems(physicalStateUpdate.objectStateChanges)
          ? physicalStateUpdate.objectStateChanges.join(', ')
          : '',
      },
    ]);

    return buildSectionHtml(
      'State Changes',
      buildDefinitionListHtml([{ label: 'Summary', value: stateUpdate.summaryDelta }]) +
      relationshipShiftsHtml +
      knowledgeChangesHtml +
      conversationUpdateHtml +
      physicalChangesHtml
    );
  }

  function buildInnerWorldHtml(turn) {
    if (!turn || turn.speaker !== 'CHARACTER') {
      return '';
    }

    var plannerOutput = turn.plannerOutput || null;
    var stateUpdate = turn.stateUpdate || null;
    var sections = [
      buildInternalSelfCheckHtml(plannerOutput),
      buildEmotionalLayerHtml(plannerOutput),
      buildResponseStrategyHtml(plannerOutput),
      buildActionPlanHtml(plannerOutput),
      buildTurnImpactHtml(turn),
      buildStateChangesHtml(stateUpdate),
    ].join('');

    if (!sections) {
      return '';
    }

    return (
      '<details class="chat-inner-world">' +
      '<summary class="chat-inner-world__summary">Character&#39;s Inner World</summary>' +
      '<div class="chat-inner-world__content">' +
      sections +
      '</div>' +
      '</details>'
    );
  }

  function buildTurnBlockHtml(block) {
    if (!block || block.type === 'ACTION') {
      return (
        '<div class="chat-block chat-block--action" data-chat-block="ACTION">' +
        '<em>' +
        escapeHtml(block && block.text) +
        '</em>' +
        '</div>'
      );
    }

    return (
      '<div class="chat-block chat-block--speech" data-chat-block="SPEECH">' +
      (block.delivery
        ? '<span class="chat-delivery">' + escapeHtml(block.delivery) + '</span>'
        : '') +
      '<p>&ldquo;' +
      escapeHtml(block.text) +
      '&rdquo;</p>' +
      '</div>'
    );
  }

  function buildTurnTagHtml(text, modifierClass) {
    if (!text) {
      return '';
    }

    return (
      '<span class="chat-tag ' +
      modifierClass +
      '">' +
      escapeHtml(text) +
      '</span>'
    );
  }

  function buildTurnTagBarHtml(turn) {
    if (!turn || turn.speaker !== 'CHARACTER') {
      return '';
    }

    var plannerOutput = turn.plannerOutput || {};
    var turnMeta = turn.turnMeta || {};
    var tags =
      buildTurnTagHtml(plannerOutput.speechAct, 'chat-tag--speech-act') +
      buildTurnTagHtml(plannerOutput.honestyMode, 'chat-tag--honesty') +
      buildTurnTagHtml(turnMeta.visibleEmotion, 'chat-tag--emotion');

    if (!tags) {
      return '';
    }

    return '<div class="chat-tag-bar">' + tags + '</div>';
  }

  function buildTurnHtml(turn, options) {
    var safeOptions = options || {};
    var speakerName =
      turn.speaker === 'CHARACTER'
        ? safeOptions.targetCharacterName || 'Character'
        : safeOptions.interlocutorCharacterName || 'You';
    var blocks = Array.isArray(turn.blocks) ? turn.blocks : [];
    var turnClass = turn.speaker === 'CHARACTER' ? 'character' : 'user';
    var timestamp = turn && turn.timestamp ? String(turn.timestamp) : '';
    var formattedTimestamp = safeOptions.formatTimestamp
      ? safeOptions.formatTimestamp(timestamp)
      : timestamp;

    return (
      '<article class="chat-turn chat-turn--' +
      turnClass +
      '" data-chat-turn data-chat-speaker="' +
      escapeHtml(turn.speaker || '') +
      '" data-turn-number="' +
      escapeHtml(String(turn.turnNumber || '')) +
      '">' +
      '<div class="chat-turn__card">' +
      '<h2 class="chat-turn__heading"><span>' +
      escapeHtml(speakerName) +
      '</span><small>#' +
      escapeHtml(String(turn.turnNumber || '')) +
      '</small></h2>' +
      '<p class="form-help"><time datetime="' +
      escapeHtml(timestamp) +
      '">' +
      escapeHtml(formattedTimestamp) +
      '</time></p>' +
      blocks.map(buildTurnBlockHtml).join('') +
      buildTurnTagBarHtml(turn) +
      buildInnerWorldHtml(turn) +
      '</div></article>'
    );
  }

  return {
    buildTurnBlockHtml: buildTurnBlockHtml,
    buildInnerWorldHtml: buildInnerWorldHtml,
    buildTurnTagBarHtml: buildTurnTagBarHtml,
    buildTurnHtml: buildTurnHtml,
  };
})();
