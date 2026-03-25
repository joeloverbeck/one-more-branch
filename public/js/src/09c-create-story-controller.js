// ── Create Story Page Controller ─────────────────────────────────

function initCreateStoryPage() {
  var page = document.getElementById('create-story-page');
  if (!page) return;

  var form = document.getElementById('create-story-form');
  var createBtn = document.getElementById('create-story-btn');
  var spineSelect = document.getElementById('createStorySpineId');
  var titleInput = document.getElementById('createStoryTitle');
  var apiKeyInput = document.getElementById('createStoryApiKey');
  var summaryPanel = document.getElementById('spine-summary-panel');
  var summaryContent = document.getElementById('spine-summary-content');
  var progressSection = document.getElementById('create-story-progress-section');
  var progressContent = document.getElementById('create-story-progress-content');
  var errorDiv = document.getElementById('create-story-error');

  if (!form || !createBtn || !errorDiv || !progressSection || !progressContent) return;

  var loadingSession = createLoadingOverlaySession({
    overlayElement: progressSection,
    progressElement: progressContent,
    buttonElement: createBtn,
    onHide: updateCreateButton,
  });
  var inlineError = createInlineErrorController(errorDiv);

  // Restore API key
  var storedApiKey = getApiKey();
  if (storedApiKey && apiKeyInput && apiKeyInput.value.length === 0) {
    apiKeyInput.value = storedApiKey;
  }

  function updateCreateButton() {
    var hasSpine = spineSelect && spineSelect.value;
    var hasTitle = titleInput && titleInput.value.trim().length > 0;
    var hasApiKey = apiKeyInput && apiKeyInput.value.trim().length >= 10;
    createBtn.disabled = !(hasSpine && hasTitle && hasApiKey);
  }

  if (spineSelect) spineSelect.addEventListener('change', updateCreateButton);
  if (titleInput) titleInput.addEventListener('input', updateCreateButton);
  if (apiKeyInput) apiKeyInput.addEventListener('input', updateCreateButton);
  updateCreateButton();

  // Show spine summary when selection changes
  if (spineSelect) {
    spineSelect.addEventListener('change', function () {
      var selected = spineSelect.options[spineSelect.selectedIndex];
      if (!selected || !selected.dataset.spine) {
        if (summaryPanel) summaryPanel.style.display = 'none';
        return;
      }

      try {
        var spine = JSON.parse(selected.dataset.spine);
        var opt = spine.spineOption;
        var html =
          '<p><strong>Type:</strong> ' + escapeHtml(opt.storySpineType) + '</p>' +
          '<p><strong>Dramatic Question:</strong> ' + escapeHtml(opt.centralDramaticQuestion) + '</p>' +
          '<p><strong>Conflict:</strong> ' + escapeHtml(opt.conflictAxis) + ' / ' + escapeHtml(opt.conflictType) + '</p>' +
          '<p><strong>Arc:</strong> ' + escapeHtml(opt.characterArcType) + '</p>' +
          '<p><strong>Need:</strong> ' + escapeHtml(opt.protagonistNeedVsWant.need) + '</p>' +
          '<p><strong>Want:</strong> ' + escapeHtml(opt.protagonistNeedVsWant.want) + '</p>';

        if (spine.tone) {
          html += '<p><strong>Tone:</strong> ' + escapeHtml(spine.tone) + '</p>';
        }
        if (spine.startingSituation) {
          html += '<p><strong>Starting Situation:</strong> ' + escapeHtml(spine.startingSituation) + '</p>';
        }

        if (summaryContent) summaryContent.innerHTML = html;
        if (summaryPanel) summaryPanel.style.display = '';
      } catch (e) {
        if (summaryPanel) summaryPanel.style.display = 'none';
      }
    });
  }

  async function createStory() {
    inlineError.clear();

    try {
      await loadingSession.withProgress(async function(progressId) {
        var apiKey = apiKeyInput.value.trim();
        setApiKey(apiKey);

        var response = await fetch('/create-story/api/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spineId: spineSelect.value,
            title: titleInput.value.trim(),
            apiKey: apiKey,
            progressId: progressId,
          }),
        });

        var data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to create story');
        }

        window.location.assign('/play/' + data.storyId + '/briefing');
      });
    } catch (error) {
      inlineError.show(
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      );
    }
  }

  createBtn.addEventListener('click', function (event) {
    event.preventDefault();
    createStory();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
  });
}
