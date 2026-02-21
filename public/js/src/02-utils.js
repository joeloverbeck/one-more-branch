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

  function getPromiseIconPath(promiseType, urgency) {
    if (typeof promiseType !== 'string' || promiseType.length === 0) {
      return '';
    }
    if (typeof urgency !== 'string' || urgency.length === 0) {
      return '';
    }
    return '/images/icons/promise-' + promiseType.toLowerCase().replace(/_/g, '-') + '-' + urgency.toLowerCase() + '.png';
  }

  function setNodeText(node, value) {
    if (!node) {
      return;
    }
    node.textContent = value || '';
  }

  function hideSavedKernelSummary(summaryNode, fieldNodes) {
    if (summaryNode) {
      summaryNode.style.display = 'none';
    }
    if (!fieldNodes) {
      return;
    }
    setNodeText(fieldNodes.thesis, '');
    setNodeText(fieldNodes.valueAtStake, '');
    setNodeText(fieldNodes.opposingForce, '');
    setNodeText(fieldNodes.thematicQuestion, '');
    setNodeText(fieldNodes.overallScore, '');
  }

  function renderSavedKernelSummary(savedKernel, summaryNode, fieldNodes) {
    if (!savedKernel || !savedKernel.evaluatedKernel || !savedKernel.evaluatedKernel.kernel) {
      hideSavedKernelSummary(summaryNode, fieldNodes);
      return;
    }

    var kernel = savedKernel.evaluatedKernel.kernel;
    setNodeText(fieldNodes && fieldNodes.thesis, kernel.dramaticThesis || '');
    setNodeText(fieldNodes && fieldNodes.valueAtStake, kernel.valueAtStake || '');
    setNodeText(fieldNodes && fieldNodes.opposingForce, kernel.opposingForce || '');
    setNodeText(fieldNodes && fieldNodes.thematicQuestion, kernel.thematicQuestion || '');

    if (fieldNodes && fieldNodes.overallScore) {
      var rawScore = Number(savedKernel.evaluatedKernel.overallScore);
      var safeScore = Number.isFinite(rawScore) ? Math.round(Math.max(0, Math.min(100, rawScore))) : 0;
      setNodeText(fieldNodes.overallScore, safeScore + '/100');
    }

    if (summaryNode) {
      summaryNode.style.display = 'block';
    }
  }

  async function loadKernelOptionsIntoSelect(kernelSelector) {
    if (!(kernelSelector instanceof HTMLSelectElement)) {
      return;
    }

    var response = await fetch('/kernels/api/list', { method: 'GET' });
    var data = await response.json();
    if (!response.ok || !data.success || !Array.isArray(data.kernels)) {
      throw new Error(data.error || 'Failed to load kernels');
    }

    data.kernels.forEach(function (kernel) {
      var option = document.createElement('option');
      option.value = kernel.id;
      option.textContent = kernel.name || 'Untitled Kernel';
      kernelSelector.appendChild(option);
    });
  }

  async function loadSavedKernelById(kernelId) {
    var response = await fetch('/kernels/api/' + encodeURIComponent(kernelId), {
      method: 'GET',
    });
    var data = await response.json();
    if (!response.ok || !data.success || !data.kernel) {
      throw new Error(data.error || 'Failed to load selected kernel');
    }
    return data.kernel;
  }
