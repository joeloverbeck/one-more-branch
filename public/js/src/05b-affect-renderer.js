  // ── Affect renderer ──────────────────────────────────────────────

  var INTENSITY_DOT_COUNT = { mild: 1, moderate: 2, strong: 3, overwhelming: 4 };

  function renderAffectPanel(protagonistAffect, leftSidebarContainer) {
    var existingPanel = document.getElementById('affect-panel');

    if (!protagonistAffect || typeof protagonistAffect !== 'object') {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    var primaryEmotion = typeof protagonistAffect.primaryEmotion === 'string'
      ? protagonistAffect.primaryEmotion : '';
    var primaryIntensity = typeof protagonistAffect.primaryIntensity === 'string'
      ? protagonistAffect.primaryIntensity : 'mild';
    var primaryCause = typeof protagonistAffect.primaryCause === 'string'
      ? protagonistAffect.primaryCause : '';
    var secondaryEmotions = Array.isArray(protagonistAffect.secondaryEmotions)
      ? protagonistAffect.secondaryEmotions : [];
    var dominantMotivation = typeof protagonistAffect.dominantMotivation === 'string'
      ? protagonistAffect.dominantMotivation : '';

    if (!primaryEmotion) {
      if (existingPanel) {
        existingPanel.remove();
      }
      return;
    }

    var filledCount = INTENSITY_DOT_COUNT[primaryIntensity] || 1;
    var dotsHtml = '';
    for (var d = 0; d < 4; d++) {
      dotsHtml += '<span class="affect-dot' + (d < filledCount ? ' affect-dot--filled' : '') + '"></span>';
    }

    var primaryHtml = '<div class="affect-primary">'
      + '<span class="affect-emotion">' + escapeHtml(primaryEmotion) + '</span>'
      + '<div class="affect-dots" aria-label="Intensity: ' + escapeHtml(primaryIntensity) + '">'
      + dotsHtml
      + '<span class="affect-intensity-label">' + escapeHtml(primaryIntensity) + '</span>'
      + '</div>'
      + '<span class="affect-cause">' + escapeHtml(primaryCause) + '</span>'
      + '</div>';

    var secondariesHtml = '';
    if (secondaryEmotions.length > 0) {
      var pills = secondaryEmotions
        .filter(function(se) { return se && typeof se.emotion === 'string'; })
        .map(function(se) {
          var cause = typeof se.cause === 'string' ? se.cause : '';
          return '<span class="affect-pill" title="' + escapeHtml(cause) + '">'
            + escapeHtml(se.emotion) + '</span>';
        })
        .join('');
      if (pills) {
        secondariesHtml = '<div class="affect-secondaries">' + pills + '</div>';
      }
    }

    var motivationHtml = dominantMotivation
      ? '<div class="affect-motivation">' + escapeHtml(dominantMotivation) + '</div>'
      : '';

    var innerHtml = '<h3 class="affect-title" id="affect-title">Protagonist</h3>'
      + primaryHtml + secondariesHtml + motivationHtml;

    if (existingPanel) {
      existingPanel.setAttribute('data-intensity', primaryIntensity);
      existingPanel.innerHTML = innerHtml;
      return;
    }

    var panel = document.createElement('aside');
    panel.className = 'affect-panel';
    panel.id = 'affect-panel';
    panel.setAttribute('aria-labelledby', 'affect-title');
    panel.setAttribute('data-intensity', primaryIntensity);
    panel.innerHTML = innerHtml;

    // Insert at the top of left sidebar, before inventory/health
    leftSidebarContainer.insertBefore(panel, leftSidebarContainer.firstChild);
  }
