function initChatPage() {
  var page = document.getElementById('chat-page');
  if (!page || !page.getAttribute('data-chat-id')) {
    return;
  }
  if (page.getAttribute('data-chat-controller-initialized') === 'true') {
    return;
  }
  page.setAttribute('data-chat-controller-initialized', 'true');

  var chatId = page.getAttribute('data-chat-id') || '';
  var targetCharacterName = page.getAttribute('data-target-character-name') || 'Character';
  var interlocutorCharacterName =
    page.getAttribute('data-interlocutor-character-name') || 'You';
  var messageList = document.getElementById('chat-message-list');
  var form = document.getElementById('chat-turn-form');
  var apiKeyInput = document.getElementById('chat-api-key');
  var messageInput = document.getElementById('chat-message');
  var sendButton = document.getElementById('chat-send-button');
  var loadingIndicator = document.getElementById('chat-loading-indicator');
  var progressStatus = document.getElementById('chat-progress-status');
  var pageError = document.getElementById('chat-error');
  var turnError = document.getElementById('chat-turn-error');

  if (
    !messageList ||
    !form ||
    !apiKeyInput ||
    !messageInput ||
    !sendButton ||
    !loadingIndicator ||
    !progressStatus
  ) {
    return;
  }

  if (!progressStatus.querySelector('.loading-stage')) {
    progressStatus.innerHTML =
      '<div class="loading-stage"></div><p class="loading-status">Character is thinking...</p>';
  }
  progressStatus.style.display = 'none';

  var storedApiKey = getApiKey();
  if (storedApiKey && apiKeyInput.value.length === 0) {
    apiKeyInput.value = storedApiKey;
  }

  var shouldSendResumeFlag = messageList.querySelector('[data-chat-turn]') !== null;
  var inFlight = false;
  var loadingSession = createLoadingOverlaySession({
    overlayElement: loadingIndicator,
    progressElement: progressStatus,
    buttonElement: sendButton,
    onShow: function () {
      progressStatus.style.display = 'block';
    },
    onHide: function () {
      progressStatus.style.display = 'none';
    },
  });

  function setError(element, message) {
    if (!element) {
      return;
    }

    element.textContent = message;
    element.style.display = 'block';
  }

  function clearError(element) {
    if (!element) {
      return;
    }

    element.textContent = '';
    element.style.display = 'none';
  }

  function clearErrors() {
    clearError(pageError);
    clearError(turnError);
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) {
      return '';
    }

    try {
      return (
        new Date(timestamp).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'UTC',
        }) + ' UTC'
      );
    } catch (_error) {
      return timestamp;
    }
  }

  function buildTurnBlockHtml(block) {
    if (!block || block.type === 'ACTION') {
      return '<p data-chat-block="ACTION"><em>' + escapeHtml(block && block.text) + '</em></p>';
    }

    return (
      '<p data-chat-block="SPEECH">' +
      (block.delivery ? '<strong>' + escapeHtml(block.delivery) + ':</strong> ' : '') +
      '&ldquo;' +
      escapeHtml(block.text) +
      '&rdquo;</p>'
    );
  }

  function buildTurnHtml(turn) {
    var speakerName =
      turn.speaker === 'CHARACTER' ? targetCharacterName : interlocutorCharacterName;
    var blocks = Array.isArray(turn.blocks) ? turn.blocks : [];

    return (
      '<article class="story-card" data-chat-turn data-chat-speaker="' +
      escapeHtml(turn.speaker || '') +
      '" data-turn-number="' +
      escapeHtml(String(turn.turnNumber || '')) +
      '">' +
      '<div class="story-card-content">' +
      '<h3>' +
      escapeHtml(speakerName) +
      '<small>#' +
      escapeHtml(String(turn.turnNumber || '')) +
      '</small></h3>' +
      '<p class="form-help"><time datetime="' +
      escapeHtml(turn.timestamp || '') +
      '">' +
      escapeHtml(formatTimestamp(turn.timestamp || '')) +
      '</time></p>' +
      blocks.map(buildTurnBlockHtml).join('') +
      '</div></article>'
    );
  }

  function appendTurn(turn) {
    if (!turn) {
      return;
    }

    var emptyState = document.getElementById('chat-empty-state');
    if (emptyState && emptyState.parentNode) {
      emptyState.parentNode.removeChild(emptyState);
    }

    messageList.insertAdjacentHTML('beforeend', buildTurnHtml(turn));
    var turns = messageList.querySelectorAll('[data-chat-turn]');
    var lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;
    if (lastTurn && typeof lastTurn.scrollIntoView === 'function') {
      lastTurn.scrollIntoView({ block: 'end' });
    }
  }

  function updateField(name, value, fallback) {
    var field = page.querySelector('[data-chat-field="' + name + '"]');
    if (field) {
      field.textContent = value || fallback || '';
    }
  }

  function joinList(values) {
    return Array.isArray(values) && values.length > 0 ? values.join(', ') : 'None';
  }

  function updateSidebar(session) {
    if (!session) {
      return;
    }

    var physicalContext = session.physicalContext || {};
    var relationshipState = session.relationshipState || {};
    var leadInContext = session.leadInContext || {};

    updateField('location', physicalContext.location, '');
    updateField('microLocation', physicalContext.microLocation, '');
    updateField('timeOfDay', physicalContext.timeOfDay, '');
    updateField('privacy', physicalContext.privacy, '');
    updateField('distanceBand', physicalContext.distanceBand, '');
    updateField('characterActivity', physicalContext.characterActivity, '');
    updateField('interactableObjects', joinList(physicalContext.interactableObjects), 'None');
    updateField('ambientConditions', joinList(physicalContext.ambientConditions), 'None');
    updateField('dynamic', relationshipState.dynamic, 'Unformed');
    updateField('valence', String(relationshipState.valence != null ? relationshipState.valence : 0), '0');
    updateField('tension', String(relationshipState.tension != null ? relationshipState.tension : 0), '0');
    updateField('leverage', relationshipState.leverage, 'None');
    updateField('whyNow', leadInContext.whyNow, '');
  }

  async function submitTurn() {
    if (inFlight) {
      return;
    }

    clearErrors();

    var rawMessage = typeof messageInput.value === 'string' ? messageInput.value.trim() : '';
    if (rawMessage.length === 0) {
      setError(turnError, 'Message is required');
      return;
    }

    var apiKey = typeof apiKeyInput.value === 'string' ? apiKeyInput.value.trim() : '';
    if (apiKey.length < 10) {
      setError(turnError, 'OpenRouter API key is required');
      return;
    }

    inFlight = true;
    setApiKey(apiKey);

    try {
      var data = await loadingSession.withProgress(async function (progressId) {
        var body = {
          message: rawMessage,
          apiKey: apiKey,
          progressId: progressId,
        };

        if (shouldSendResumeFlag) {
          body.isSessionResume = true;
        }

        var response = await fetch('/chat/' + encodeURIComponent(chatId) + '/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        var payload = null;
        try {
          payload = await response.json();
        } catch (_error) {
          payload = null;
        }

        if (!response.ok || !payload || !payload.success) {
          throw new Error((payload && payload.error) || 'Failed to send chat turn');
        }

        return payload;
      });

      appendTurn(data.userTurn);
      appendTurn(data.characterTurn);
      updateSidebar(data.updatedSession);
      messageInput.value = '';
      shouldSendResumeFlag = false;
    } catch (error) {
      setError(turnError, error instanceof Error ? error.message : 'Failed to send chat turn');
    } finally {
      inFlight = false;
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    void submitTurn();
  });

  messageInput.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
      return;
    }

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}
