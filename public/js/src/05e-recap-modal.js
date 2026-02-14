// ── Story recap modal ────────────────────────────────────────────

function parseRecapDataFromDom() {
  var node = document.getElementById('recap-data');
  if (!node || typeof node.textContent !== 'string') {
    return [];
  }

  try {
    var parsed = JSON.parse(node.textContent);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(function(entry) {
      return entry
        && typeof entry === 'object'
        && typeof entry.pageId === 'number'
        && Number.isInteger(entry.pageId)
        && entry.pageId >= 1
        && typeof entry.summary === 'string';
    });
  } catch (_) {
    return [];
  }
}

function createRecapModalController(initialData) {
  var modal = document.getElementById('recap-modal');
  var triggerButton = document.getElementById('recap-btn');
  var closeButton = document.getElementById('recap-close-btn');
  var modalBody = document.getElementById('recap-modal-body');
  var entries = Array.isArray(initialData) ? initialData : [];

  if (!modal || !triggerButton || !closeButton || !modalBody) {
    return {
      update: function() {},
    };
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  function openModal() {
    modal.style.display = 'flex';
  }

  function renderRecapBody() {
    if (!Array.isArray(entries) || entries.length === 0) {
      modalBody.innerHTML = '<p class="recap-empty">No scenes recorded yet.</p>';
      return;
    }

    modalBody.innerHTML = entries.map(function(entry, index) {
      var sceneLabel = 'Scene ' + String(index + 1);
      return '<article class="recap-entry">'
        + '<span class="recap-page-label">' + escapeHtml(sceneLabel) + '</span>'
        + '<p class="recap-summary">' + escapeHtml(entry.summary) + '</p>'
        + '</article>';
    }).join('');
  }

  triggerButton.addEventListener('click', openModal);
  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeModal();
    }
  });
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  });

  renderRecapBody();

  return {
    update: function(nextEntries) {
      entries = Array.isArray(nextEntries) ? nextEntries : [];
      renderRecapBody();
    },
  };
}
