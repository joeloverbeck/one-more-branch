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
  var apiKeyToggle = document.getElementById('chat-apikey-toggle');
  var apiKeyPopover = document.getElementById('chat-apikey-popover');
  var messageInput = document.getElementById('chat-message');
  var sendButton = document.getElementById('chat-send-button');
  var loadingIndicator = document.getElementById('chat-loading-indicator');
  var progressStatus = document.getElementById('chat-progress-status');
  var pageError = document.getElementById('chat-error');
  var turnError = document.getElementById('chat-turn-error');
  var sidebarToggle = page.querySelector('[data-chat-sidebar-toggle]');
  var apiKeyToggleIcon = apiKeyToggle
    ? apiKeyToggle.querySelector('.chat-apikey-btn__icon')
    : null;
  var apiKeyAnchor = apiKeyToggle && apiKeyToggle.parentElement ? apiKeyToggle.parentElement : null;
  var MIN_MESSAGE_HEIGHT = 46;
  var MAX_MESSAGE_HEIGHT = 168;

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
      messageInput.readOnly = true;
      progressStatus.style.display = 'block';
    },
    onHide: function () {
      messageInput.readOnly = false;
      progressStatus.style.display = 'none';
      updateSendButtonState();
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

  function getMessageValue() {
    return typeof messageInput.value === 'string' ? messageInput.value.trim() : '';
  }

  function getApiKeyValue() {
    return typeof apiKeyInput.value === 'string' ? apiKeyInput.value.trim() : '';
  }

  function updateSendButtonState() {
    sendButton.disabled = inFlight || getMessageValue().length === 0 || getApiKeyValue().length < 10;
  }

  function syncApiKeyToggleState() {
    if (!apiKeyToggle) {
      return;
    }

    var hasApiKey = getApiKeyValue().length >= 10;
    apiKeyToggle.classList.toggle('chat-apikey-btn--configured', hasApiKey);
    apiKeyToggle.setAttribute(
      'aria-label',
      hasApiKey ? 'API key configured' : 'Open API key settings'
    );
    apiKeyToggle.setAttribute('title', hasApiKey ? 'API key configured' : 'API key settings');

    if (apiKeyToggleIcon) {
      apiKeyToggleIcon.textContent = hasApiKey ? 'Locked' : 'Unlocked';
    }
  }

  function isApiKeyPopoverOpen() {
    return Boolean(apiKeyPopover && !apiKeyPopover.hasAttribute('hidden'));
  }

  function closeApiKeyPopover() {
    if (!apiKeyPopover || !apiKeyToggle) {
      return;
    }

    apiKeyPopover.setAttribute('hidden', '');
    apiKeyToggle.setAttribute('aria-expanded', 'false');
  }

  function openApiKeyPopover() {
    if (!apiKeyPopover || !apiKeyToggle) {
      return;
    }

    apiKeyPopover.removeAttribute('hidden');
    apiKeyToggle.setAttribute('aria-expanded', 'true');
  }

  function toggleApiKeyPopover() {
    if (isApiKeyPopoverOpen()) {
      closeApiKeyPopover();
      return;
    }

    openApiKeyPopover();
    if (typeof apiKeyInput.focus === 'function') {
      apiKeyInput.focus();
    }
  }

  function autoResizeMessageInput() {
    messageInput.style.height = 'auto';
    var nextHeight = Math.min(
      Math.max(messageInput.scrollHeight, MIN_MESSAGE_HEIGHT),
      MAX_MESSAGE_HEIGHT
    );
    messageInput.style.height = nextHeight + 'px';
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

  function appendTurn(turn) {
    if (!turn) {
      return;
    }

    var emptyState = document.getElementById('chat-empty-state');
    if (emptyState && emptyState.parentNode) {
      emptyState.parentNode.removeChild(emptyState);
    }

    messageList.insertAdjacentHTML(
      'beforeend',
      window.ChatTurnRenderer.buildTurnHtml(turn, {
        targetCharacterName: targetCharacterName,
        interlocutorCharacterName: interlocutorCharacterName,
        formatTimestamp: formatTimestamp,
      })
    );
    var turns = messageList.querySelectorAll('[data-chat-turn]');
    var lastTurn = turns.length > 0 ? turns[turns.length - 1] : null;
    if (lastTurn && typeof lastTurn.scrollIntoView === 'function') {
      lastTurn.scrollIntoView({ block: 'end' });
    }

    updateTurnCount();
  }

  function updateTurnCount() {
    var turnCount = page.querySelectorAll('[data-chat-turn]').length;
    var turnCountLabel = page.querySelector('[data-chat-turn-count]');
    if (turnCountLabel) {
      turnCountLabel.textContent = turnCount + ' ' + (turnCount === 1 ? 'turn' : 'turns');
    }
  }

  function getFieldText(name, index) {
    var fields = page.querySelectorAll('[data-chat-field="' + name + '"]');
    var targetIndex = typeof index === 'number' ? index : 0;
    var field = fields.length > targetIndex ? fields[targetIndex] : null;
    return field && typeof field.textContent === 'string' ? field.textContent : '';
  }

  function parseFieldList(name) {
    var rawValue = getFieldText(name, 0);
    return rawValue
      .split(',')
      .map(function (item) {
        return item.trim();
      })
      .filter(function (item) {
        return item.length > 0 && item !== 'None';
      });
  }

  function syncSidebarToggle() {
    if (!sidebarToggle) {
      return;
    }

    var isCollapsed = page.classList.contains('sidebar-collapsed');
    sidebarToggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    sidebarToggle.textContent = isCollapsed ? 'Show Scene State' : 'Hide Scene State';
  }

  function updateSidebar(session) {
    if (!session) {
      return;
    }

    if (window.ChatSidebar && typeof window.ChatSidebar.update === 'function') {
      window.ChatSidebar.update(page, session);
    }
  }

  async function submitTurn() {
    if (inFlight) {
      return;
    }

    clearErrors();

    var rawMessage = getMessageValue();
    if (rawMessage.length === 0) {
      setError(turnError, 'Message is required');
      updateSendButtonState();
      return;
    }

    var apiKey = getApiKeyValue();
    if (apiKey.length < 10) {
      setError(turnError, 'OpenRouter API key is required');
      updateSendButtonState();
      return;
    }

    inFlight = true;
    setApiKey(apiKey);
    syncApiKeyToggleState();
    updateSendButtonState();

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
          var errorMessage = (payload && payload.error) || 'Failed to send chat turn';
          if (payload && payload.debug) {
            var debugParts = [];
            if (payload.debug.model) {
              debugParts.push('Model: ' + payload.debug.model);
            }
            if (payload.debug.httpStatus) {
              debugParts.push('HTTP ' + payload.debug.httpStatus);
            }
            if (debugParts.length > 0) {
              errorMessage += ' [' + debugParts.join(', ') + ']';
            }
          }
          throw new Error(errorMessage);
        }

        return payload;
      });

      appendTurn(data.userTurn);
      appendTurn(data.characterTurn);
      updateSidebar(data.updatedSession);
      messageInput.value = '';
      autoResizeMessageInput();
      closeApiKeyPopover();
      shouldSendResumeFlag = false;
    } catch (error) {
      setError(turnError, error instanceof Error ? error.message : 'Failed to send chat turn');
    } finally {
      inFlight = false;
      updateSendButtonState();
    }
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    void submitTurn();
  });

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      page.classList.toggle('sidebar-collapsed');
      syncSidebarToggle();
    });
  }

  if (apiKeyToggle) {
    apiKeyToggle.addEventListener('click', function () {
      toggleApiKeyPopover();
    });
  }

  document.addEventListener('click', function (event) {
    if (!isApiKeyPopoverOpen() || !apiKeyAnchor) {
      return;
    }

    var target = event.target;
    if (target instanceof Node && apiKeyAnchor.contains(target)) {
      return;
    }

    closeApiKeyPopover();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeApiKeyPopover();
    }
  });

  apiKeyInput.addEventListener('input', function () {
    syncApiKeyToggleState();
    updateSendButtonState();
  });

  messageInput.addEventListener('input', function () {
    autoResizeMessageInput();
    updateSendButtonState();
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

  updateTurnCount();
  if (window.ChatSidebar && typeof window.ChatSidebar.init === 'function') {
    window.ChatSidebar.init(page, {
      physicalContext: {
        location: getFieldText('location'),
        microLocation: getFieldText('microLocation'),
        timeOfDay: getFieldText('timeOfDay'),
        privacy: getFieldText('privacy'),
        distanceBand: getFieldText('distanceBand'),
        characterActivity: getFieldText('characterActivity'),
        interactableObjects: parseFieldList('interactableObjects'),
        ambientConditions: parseFieldList('ambientConditions'),
      },
      relationshipState: {
        dynamic: getFieldText('dynamic'),
        valence: Number(getFieldText('valence') || '0'),
        tension: Number(getFieldText('tension') || '0'),
        leverage: getFieldText('leverage'),
      },
      leadInContext: {
        whyNow: getFieldText('whyNow'),
      },
    });
  }
  syncSidebarToggle();
  syncApiKeyToggleState();
  autoResizeMessageInput();
  updateSendButtonState();
}
