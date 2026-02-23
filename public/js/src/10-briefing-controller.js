  // ── Briefing page controller ─────────────────────────────────────

  function initBriefingPage() {
    var beginBtn = document.getElementById('begin-adventure-btn');
    var loading = document.getElementById('loading');
    var apiKeyModal = document.getElementById('api-key-modal');
    var briefingContainer = document.querySelector('.briefing-container');
    var errorBlock = document.getElementById('briefing-error');

    if (!beginBtn || !loading || !apiKeyModal || !briefingContainer) {
      return;
    }

    var storyId = briefingContainer.getAttribute('data-story-id');
    if (!storyId) {
      return;
    }

    var loadingProgress = createLoadingProgressController(loading);
    var ideationCtrl = createSceneIdeationController(storyId, loading, loadingProgress);
    var ideationContainer = document.getElementById('scene-ideation-container');

    function setError(message) {
      if (!errorBlock) {
        return;
      }

      errorBlock.textContent = message;
      errorBlock.style.display = 'block';
    }

    function clearError() {
      if (!errorBlock) {
        return;
      }

      errorBlock.textContent = '';
      errorBlock.style.display = 'none';
    }

    function ensureApiKey() {
      return new Promise(function(resolve, reject) {
        var key = getApiKey();
        if (key) {
          resolve(key);
          return;
        }

        var form = document.getElementById('api-key-form');
        var input = document.getElementById('modal-api-key');
        var cancelBtn = document.getElementById('cancel-api-key');

        if (!(form instanceof HTMLFormElement) || !(input instanceof HTMLInputElement)) {
          reject(new Error('API key prompt is unavailable.'));
          return;
        }

        apiKeyModal.style.display = 'flex';

        function cleanup() {
          form.removeEventListener('submit', handleSubmit);
          if (cancelBtn) {
            cancelBtn.removeEventListener('click', handleCancel);
          }
        }

        function handleCancel() {
          cleanup();
          apiKeyModal.style.display = 'none';
          reject(new Error('API key is required.'));
        }

        function handleSubmit(event) {
          event.preventDefault();
          var newKey = input.value.trim();
          if (newKey.length < 10) {
            setError('Please enter a valid API key.');
            return;
          }

          clearError();
          cleanup();
          setApiKey(newKey);
          apiKeyModal.style.display = 'none';
          resolve(newKey);
        }

        form.addEventListener('submit', handleSubmit);
        if (cancelBtn) {
          cancelBtn.addEventListener('click', handleCancel);
        }
      });
    }

    async function beginAdventure(apiKey, selectedDirection) {
      beginBtn.disabled = true;
      clearError();
      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      try {
        var body = {
          apiKey: apiKey,
          progressId: progressId,
        };
        if (selectedDirection) {
          body.selectedSceneDirection = selectedDirection;
        }

        var response = await fetch('/play/' + storyId + '/begin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        var data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to begin adventure');
        }

        window.location.assign('/play/' + storyId + '?page=1&newStory=true');
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to begin adventure');
        beginBtn.disabled = false;
      } finally {
        loadingProgress.stop();
        loading.style.display = 'none';
      }
    }

    async function startIdeation(apiKey) {
      clearError();
      beginBtn.disabled = true;
      loading.style.display = 'flex';

      try {
        var options = await ideationCtrl.fetchSceneOptions(apiKey, 'opening');
        loading.style.display = 'none';

        var target = ideationContainer || briefingContainer;
        ideationCtrl.renderIdeationUI(
          target,
          options,
          function onConfirm(selectedDirection) {
            beginAdventure(apiKey, selectedDirection);
          },
          function onRegenerate() {
            startIdeation(apiKey);
          }
        );
      } catch (error) {
        loading.style.display = 'none';
        setError(error instanceof Error ? error.message : 'Scene ideation failed');
        beginBtn.disabled = false;
      }
    }

    beginBtn.addEventListener('click', async function() {
      try {
        var apiKey = await ensureApiKey();
        await startIdeation(apiKey);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to begin adventure');
      }
    });
  }
