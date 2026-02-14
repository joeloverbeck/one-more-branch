  // ── Utility functions ──────────────────────────────────────────────

  function getApiKey() {
    return sessionStorage.getItem(API_KEY_STORAGE_KEY);
  }

  function setApiKey(key) {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
  }

  function createProgressId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    return 'progress-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function getRandomInt(minInclusive, maxInclusive) {
    return Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive;
  }

  function pickRandomPhrase(phrases, previousPhrase) {
    if (!Array.isArray(phrases) || phrases.length === 0) {
      return '';
    }

    if (phrases.length === 1) {
      return phrases[0];
    }

    var selected = phrases[getRandomInt(0, phrases.length - 1)];
    while (selected === previousPhrase) {
      selected = phrases[getRandomInt(0, phrases.length - 1)];
    }
    return selected;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
  }

  function escapeHtmlWithBreaks(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function enumToIconName(enumValue) {
    if (typeof enumValue !== 'string' || enumValue.length === 0) {
      return '';
    }
    return enumValue.toLowerCase().replace(/_/g, '-');
  }

  function getIconPath(enumValue) {
    var name = enumToIconName(enumValue);
    return name ? '/images/icons/' + name + '.png' : '';
  }

  function getThreadIconPath(threadType, urgency) {
    if (typeof threadType !== 'string' || threadType.length === 0) {
      return '';
    }
    if (typeof urgency !== 'string' || urgency.length === 0) {
      return '';
    }
    return '/images/icons/thread-' + threadType.toLowerCase() + '-' + urgency.toLowerCase() + '.png';
  }

