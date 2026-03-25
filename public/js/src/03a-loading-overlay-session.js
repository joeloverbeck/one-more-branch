  // ── Loading Overlay Session Helper ───────────────────────────────

  function createLoadingOverlaySession(options) {
    if (!options || !options.overlayElement || !options.progressElement) {
      throw new Error('createLoadingOverlaySession requires overlayElement and progressElement');
    }

    var overlayElement = options.overlayElement;
    var progressElement = options.progressElement;
    var onShow = typeof options.onShow === 'function' ? options.onShow : null;
    var onHide = typeof options.onHide === 'function' ? options.onHide : null;
    var loadingProgress = createLoadingProgressController(progressElement);
    var active = false;

    function getButtonElements() {
      if (Array.isArray(options.buttonElements)) {
        return options.buttonElements.filter(Boolean);
      }

      if (options.buttonElement) {
        return [options.buttonElement];
      }

      return [];
    }

    function setButtonsDisabled(disabled) {
      getButtonElements().forEach(function(buttonElement) {
        buttonElement.disabled = disabled;
      });
    }

    function begin(progressId) {
      if (active) {
        end();
      }

      overlayElement.style.display = 'flex';
      loadingProgress.start(progressId);
      setButtonsDisabled(true);
      active = true;

      if (onShow) {
        onShow();
      }
    }

    function end() {
      if (!active) {
        return;
      }

      loadingProgress.stop();
      overlayElement.style.display = 'none';
      setButtonsDisabled(false);
      active = false;

      if (onHide) {
        onHide();
      }
    }

    async function withProgress(run) {
      var progressId = createProgressId();
      begin(progressId);

      try {
        return await run(progressId);
      } finally {
        end();
      }
    }

    function isActive() {
      return active;
    }

    return {
      begin: begin,
      end: end,
      withProgress: withProgress,
      isActive: isActive,
    };
  }
