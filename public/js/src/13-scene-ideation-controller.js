  // ── Scene Ideation Controller ────────────────────────────────────

  function createSceneIdeationController(storyId, loadingEl, loadingProgressCtrl) {
    function fetchSceneOptions(apiKey, mode, pageId, choiceIndex, protagonistGuidance, progressId) {
      var body = { apiKey: apiKey, mode: mode || 'opening' };
      if (progressId) {
        body.progressId = progressId;
      }
      if (mode === 'continuation') {
        body.pageId = pageId;
        body.choiceIndex = choiceIndex;
      }
      if (protagonistGuidance && Object.keys(protagonistGuidance).length > 0) {
        body.protagonistGuidance = protagonistGuidance;
      }

      return fetch('/play/' + storyId + '/ideate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok || !data.success) {
              throw new Error(data.error || 'Scene ideation failed');
            }
            return data.options;
          });
        });
    }

    function renderIdeationUI(targetContainer, options, onConfirm, onRegenerate) {
      targetContainer.innerHTML = '';

      var wrapper = document.createElement('div');
      wrapper.className = 'scene-ideation-wrapper';

      var heading = document.createElement('h3');
      heading.className = 'scene-ideation-heading';
      heading.textContent = 'Choose a Scene Direction';
      wrapper.appendChild(heading);

      var subtitle = document.createElement('p');
      subtitle.className = 'scene-ideation-subtitle';
      subtitle.textContent =
        'Select a direction for the next scene. You can edit the text fields after selecting.';
      wrapper.appendChild(subtitle);

      var cardsContainer = document.createElement('div');
      cardsContainer.className = 'scene-direction-options';
      wrapper.appendChild(cardsContainer);

      renderSceneDirectionOptions(options, cardsContainer, function () {
        confirmBtn.disabled = false;
      });

      var actions = document.createElement('div');
      actions.className = 'scene-ideation-actions';

      var confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-primary scene-ideation-confirm';
      confirmBtn.textContent = 'Confirm Direction';
      confirmBtn.disabled = true;
      confirmBtn.addEventListener('click', function () {
        var edited = captureSceneDirectionEdits(cardsContainer);
        if (edited && typeof onConfirm === 'function') {
          onConfirm(edited);
        }
      });

      var regenerateBtn = document.createElement('button');
      regenerateBtn.className = 'btn btn-secondary scene-ideation-regenerate';
      regenerateBtn.textContent = 'Regenerate Options';
      regenerateBtn.addEventListener('click', function () {
        if (typeof onRegenerate === 'function') {
          onRegenerate();
        }
      });

      actions.appendChild(confirmBtn);
      actions.appendChild(regenerateBtn);
      wrapper.appendChild(actions);

      targetContainer.appendChild(wrapper);
    }

    return {
      fetchSceneOptions: fetchSceneOptions,
      renderIdeationUI: renderIdeationUI,
    };
  }
