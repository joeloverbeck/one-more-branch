function initChatListPage() {
  var page = document.querySelector('[data-chat-list]');
  if (!page) {
    return;
  }
  if (page.getAttribute('data-chat-list-controller-initialized') === 'true') {
    return;
  }
  page.setAttribute('data-chat-list-controller-initialized', 'true');

  function ensureEmptyState() {
    if (page.querySelector('[data-chat-summary]')) {
      return;
    }

    if (document.getElementById('chat-list-empty-state')) {
      return;
    }

    var listItems = document.getElementById('chat-list-items') || page.querySelector('.story-card-content');
    if (!listItems) {
      return;
    }

    var emptyState = document.createElement('p');
    emptyState.id = 'chat-list-empty-state';
    emptyState.textContent = 'No chats yet. Start one from the new chat setup page.';
    listItems.appendChild(emptyState);
  }

  page.querySelectorAll('[data-chat-delete-button]').forEach(function (button) {
    button.addEventListener('click', async function () {
      if (button.disabled) {
        return;
      }

      var chatId = button.getAttribute('data-chat-id') || '';
      var label = button.getAttribute('data-chat-label') || 'this chat';
      if (!chatId) {
        return;
      }

      if (!window.confirm('Delete chat "' + label + '"?')) {
        return;
      }

      button.disabled = true;

      try {
        var response = await fetch('/chat/' + encodeURIComponent(chatId), {
          method: 'DELETE',
        });
        var data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error((data && data.error) || 'Failed to delete chat');
        }

        var card = button.closest('[data-chat-summary]');
        if (card && card.parentNode) {
          card.parentNode.removeChild(card);
        }
        ensureEmptyState();
      } catch (error) {
        button.disabled = false;
        if (typeof window.alert === 'function') {
          window.alert(error instanceof Error ? error.message : 'Failed to delete chat');
        }
      }
    });
  });
}
