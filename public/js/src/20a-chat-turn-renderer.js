window.ChatTurnRenderer = (function () {
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
      '</div></article>'
    );
  }

  return {
    buildTurnBlockHtml: buildTurnBlockHtml,
    buildTurnTagBarHtml: buildTurnTagBarHtml,
    buildTurnHtml: buildTurnHtml,
  };
})();
