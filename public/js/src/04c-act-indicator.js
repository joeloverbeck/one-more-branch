  // ── Act Indicator Toggle ──────────────────────────────────────────

  function toggleActStructureDetails() {
    var indicator = document.getElementById('act-indicator');
    var details = document.getElementById('act-structure-details');
    if (!indicator || !details) return;

    var isExpanded = indicator.getAttribute('aria-expanded') === 'true';
    indicator.setAttribute('aria-expanded', String(!isExpanded));
    indicator.classList.toggle('act-indicator--expanded', !isExpanded);
    details.hidden = isExpanded;
  }

  function initActIndicator() {
    var indicator = document.getElementById('act-indicator');
    if (!indicator) return;

    indicator.addEventListener('click', toggleActStructureDetails);
    indicator.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleActStructureDetails();
      }
    });
  }

  function expandActStructureDetails() {
    var indicator = document.getElementById('act-indicator');
    var details = document.getElementById('act-structure-details');
    if (!indicator || !details) return;
    indicator.setAttribute('aria-expanded', 'true');
    indicator.classList.add('act-indicator--expanded');
    details.hidden = false;
  }

  function collapseActStructureDetails() {
    var indicator = document.getElementById('act-indicator');
    var details = document.getElementById('act-structure-details');
    if (!indicator || !details) return;
    indicator.setAttribute('aria-expanded', 'false');
    indicator.classList.remove('act-indicator--expanded');
    details.hidden = true;
  }
