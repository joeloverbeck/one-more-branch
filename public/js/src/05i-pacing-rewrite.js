  // ── Pacing rewrite ────────────────────────────────────────────────

  function bindPacingRewriteButton(storyId, currentPageId, loading, loadingProgress, ensureApiKeyFn) {
    var btn = document.getElementById('pacing-rewrite-btn');
    if (!btn) {
      return;
    }

    btn.addEventListener('click', async function () {
      var apiKey = await ensureApiKeyFn();
      if (!apiKey) {
        return;
      }

      var choicesSection = document.getElementById('choices-section');
      if (choicesSection) {
        clearPlayError(choicesSection);
      }

      loading.style.display = 'flex';
      var progressId = createProgressId();
      loadingProgress.start(progressId);

      fetch('/play/' + storyId + '/rewrite-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: currentPageId,
          apiKey: apiKey,
          progressId: progressId,
        }),
      })
        .then(function (resp) {
          return resp.json().then(function (data) {
            return { ok: resp.ok, data: data };
          });
        })
        .then(function (result) {
          loadingProgress.stop();
          if (result.ok && result.data.success) {
            window.location.reload();
          } else {
            loading.style.display = 'none';
            if (choicesSection) {
              showPlayError(result.data.error || 'Structure rewrite failed', choicesSection);
            }
          }
        })
        .catch(function (err) {
          loadingProgress.stop();
          loading.style.display = 'none';
          if (choicesSection) {
            showPlayError(err.message || 'Structure rewrite failed', choicesSection);
          }
        });
    });
  }
