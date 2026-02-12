  // ── Loading progress controller ────────────────────────────────────

  function createLoadingProgressController(loadingElement) {
    var stageTextElement = loadingElement ? loadingElement.querySelector('.loading-stage') : null;
    var statusTextElement = loadingElement
      ? loadingElement.querySelector('.loading-status') || loadingElement.querySelector('p')
      : null;
    var fallbackText = statusTextElement && statusTextElement.textContent
      ? statusTextElement.textContent
      : 'Loading...';
    var stopped = true;
    var progressId = '';
    var currentStage = null;
    var currentPhrase = '';
    var pollTimeout = null;
    var phraseTimeout = null;

    function setStatusText(text) {
      if (statusTextElement) {
        statusTextElement.textContent = text;
      }
    }

    function setStageText(stageName) {
      if (stageTextElement) {
        stageTextElement.textContent = stageName || '';
      }
    }

    function clearTimers() {
      if (pollTimeout !== null) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
      }
      if (phraseTimeout !== null) {
        clearTimeout(phraseTimeout);
        phraseTimeout = null;
      }
    }

    function setFallbackText() {
      currentStage = null;
      currentPhrase = '';
      if (phraseTimeout !== null) {
        clearTimeout(phraseTimeout);
        phraseTimeout = null;
      }
      setStageText('');
      setStatusText(fallbackText);
    }

    function schedulePhraseRotation() {
      if (phraseTimeout !== null) {
        clearTimeout(phraseTimeout);
        phraseTimeout = null;
      }

      if (stopped || !currentStage) {
        return;
      }

      var phrases = STAGE_PHRASE_POOLS[currentStage];
      if (!Array.isArray(phrases) || phrases.length === 0) {
        return;
      }

      var delay = getRandomInt(PHRASE_ROTATION_MIN_MS, PHRASE_ROTATION_MAX_MS);
      phraseTimeout = window.setTimeout(function() {
        if (stopped || !currentStage) {
          return;
        }
        currentPhrase = pickRandomPhrase(phrases, currentPhrase);
        setStatusText(currentPhrase);
        schedulePhraseRotation();
      }, delay);
    }

    function applyStage(stage) {
      var phrases = STAGE_PHRASE_POOLS[stage];
      if (!Array.isArray(phrases) || phrases.length === 0) {
        setFallbackText();
        return;
      }

      if (currentStage !== stage) {
        currentStage = stage;
        setStageText(STAGE_DISPLAY_NAMES[stage] || '');
        currentPhrase = '';
        currentPhrase = pickRandomPhrase(phrases, currentPhrase);
        setStatusText(currentPhrase);
        schedulePhraseRotation();
        return;
      }

      if (phraseTimeout === null) {
        schedulePhraseRotation();
      }
    }

    async function pollProgress() {
      if (stopped || !progressId) {
        return;
      }

      try {
        var response = await fetch('/generation-progress/' + encodeURIComponent(progressId), {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Progress polling failed');
        }

        var snapshot = await response.json();
        if (snapshot.status === 'running') {
          if (typeof snapshot.activeStage === 'string') {
            applyStage(snapshot.activeStage);
          } else {
            setFallbackText();
          }
        } else if (snapshot.status === 'unknown') {
          setFallbackText();
        } else if (snapshot.status === 'completed' || snapshot.status === 'failed') {
          stop();
          return;
        } else {
          setFallbackText();
        }
      } catch (_error) {
        setFallbackText();
      }

      if (!stopped) {
        pollTimeout = window.setTimeout(pollProgress, PROGRESS_POLL_INTERVAL_MS);
      }
    }

    function start(newProgressId) {
      stop();
      progressId = newProgressId;
      stopped = false;
      setFallbackText();
      void pollProgress();
    }

    function stop() {
      stopped = true;
      progressId = '';
      currentStage = null;
      currentPhrase = '';
      clearTimers();
      setStatusText(fallbackText);
    }

    return {
      start: start,
      stop: stop,
    };
  }

