  // ── State renderers ───────────────────────────────────────────────

  function renderStateChanges(changes, narrativeElement) {
    let stateChangesElement = document.getElementById('state-changes');

    if (Array.isArray(changes) && changes.length > 0) {
      const items = changes.map((change) => `<li>${escapeHtml(change)}</li>`).join('');
      const stateHtml = `<h4>What happened:</h4><ul>${items}</ul>`;

      if (stateChangesElement) {
        stateChangesElement.innerHTML = stateHtml;
        stateChangesElement.style.display = 'block';
      } else {
        stateChangesElement = document.createElement('aside');
        stateChangesElement.className = 'state-changes';
        stateChangesElement.id = 'state-changes';
        stateChangesElement.innerHTML = stateHtml;
        narrativeElement.after(stateChangesElement);
      }
    } else if (stateChangesElement) {
      stateChangesElement.style.display = 'none';
      stateChangesElement.innerHTML = '';
    }
  }

  function renderDeviationBanner(deviationInfo, choicesSectionEl) {
    const existingBanner = document.getElementById('deviation-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    if (!deviationInfo || !deviationInfo.detected) {
      return;
    }

    const beatsText = deviationInfo.beatsInvalidated
      ? ` (${deviationInfo.beatsInvalidated} story beat${deviationInfo.beatsInvalidated > 1 ? 's' : ''} replanned)`
      : '';

    const banner = document.createElement('aside');
    banner.className = 'deviation-banner';
    banner.id = 'deviation-banner';
    banner.innerHTML = `
        <div class="deviation-icon">&#x1F504;</div>
        <div class="deviation-content">
          <h4>Story Path Shifted</h4>
          <p>${escapeHtml(deviationInfo.reason)}${beatsText}</p>
        </div>
      `;

    if (choicesSectionEl) {
      choicesSectionEl.parentNode.insertBefore(banner, choicesSectionEl);
    }
  }

