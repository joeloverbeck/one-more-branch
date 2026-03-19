  // ── Act Indicator Toggle ──────────────────────────────────────────

  function syncActStructureIndicator() {
    var shell = document.getElementById('play-structure-shell');
    var indicator = document.getElementById('act-indicator');
    if (!shell || !indicator) return;

    var isExpanded = shell.hasAttribute('open');
    indicator.setAttribute('aria-expanded', String(isExpanded));
    indicator.classList.toggle('act-indicator--expanded', isExpanded);
  }

  function toggleActStructureDetails(forceExpanded) {
    var shell = document.getElementById('play-structure-shell');
    if (!shell) return;

    var shouldExpand =
      typeof forceExpanded === 'boolean' ? forceExpanded : !shell.hasAttribute('open');
    shell.open = shouldExpand;
    syncActStructureIndicator();
  }

  function initActIndicator() {
    var shell = document.getElementById('play-structure-shell');
    var indicator = document.getElementById('act-indicator');
    if (!shell || !indicator) return;

    shell.addEventListener('toggle', syncActStructureIndicator);
    syncActStructureIndicator();
  }

  function expandActStructureDetails() {
    toggleActStructureDetails(true);
  }

  function collapseActStructureDetails() {
    toggleActStructureDetails(false);
  }
