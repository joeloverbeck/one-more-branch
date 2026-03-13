// Worldbuilding management page controller

(function initWorldbuildingController() {
  const page = document.getElementById('worldbuilding-page');
  if (!page) return;

  const errorEl = document.getElementById('worldbuilding-error');
  const loadingEl = document.getElementById('worldbuilding-loading');
  const loadingTextEl = document.getElementById('worldbuilding-loading-text');
  const listEl = document.getElementById('worldbuilding-list');
  const emptyEl = document.getElementById('worldbuilding-empty');
  const listSection = document.getElementById('worldbuilding-list-section');
  const detailSection = document.getElementById('worldbuilding-detail-section');
  const detailTitle = document.getElementById('wb-detail-title');
  const detailInfo = document.getElementById('wb-detail-info');
  const previewContent = document.getElementById('wb-preview-content');

  let currentWb = null;

  function getApiKey() {
    const el = document.getElementById('worldbuilding-api-key');
    return el ? el.value.trim() : '';
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
  }

  function clearError() {
    if (errorEl) errorEl.style.display = 'none';
  }

  function showLoading(text) {
    if (loadingEl) loadingEl.style.display = 'flex';
    if (loadingTextEl) loadingTextEl.textContent = text || 'Working...';
  }

  function hideLoading() {
    if (loadingEl) loadingEl.style.display = 'none';
  }

  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    if (res.status === 204) return { success: true };
    return res.json();
  }

  async function loadList() {
    clearError();
    try {
      const data = await fetchJson('/worldbuilding/api/list');
      if (!data.success) {
        showError(data.error || 'Failed to load worldbuildings');
        return;
      }
      renderList(data.worldbuildings || []);
    } catch (err) {
      showError(err.message);
    }
  }

  function renderList(worldbuildings) {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (worldbuildings.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    worldbuildings.forEach(function (wb) {
      var card = document.createElement('article');
      card.className = 'story-card';
      var hasWorld = wb.decomposedWorld && wb.decomposedWorld.facts && wb.decomposedWorld.facts.length > 0;
      var hasSeed = !!wb.worldSeed;
      var badges = [];
      badges.push('<span class="badge">' + wb.sourceKind + '</span>');
      if (hasSeed) badges.push('<span class="badge badge-success">Seed</span>');
      if (hasWorld) badges.push('<span class="badge badge-success">World</span>');

      card.innerHTML =
        '<div class="story-card-content">' +
        '<h3>' + escapeHtml(wb.name) + '</h3>' +
        '<p>' + badges.join(' ') + '</p>' +
        '<p class="form-help">' + new Date(wb.updatedAt).toLocaleDateString() + '</p>' +
        '<button class="btn btn-small wb-view-btn" data-id="' + wb.id + '">View</button>' +
        '</div>';
      listEl.appendChild(card);
    });

    listEl.querySelectorAll('.wb-view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadDetail(btn.getAttribute('data-id'));
      });
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  async function loadDetail(id) {
    clearError();
    showLoading('Loading...');
    try {
      var data = await fetchJson('/worldbuilding/api/' + id);
      hideLoading();
      if (!data.success) {
        showError(data.error || 'Failed to load worldbuilding');
        return;
      }
      currentWb = data.worldbuilding;
      showDetail();
    } catch (err) {
      hideLoading();
      showError(err.message);
    }
  }

  function showDetail() {
    if (!currentWb) return;
    if (listSection) listSection.style.display = 'none';
    if (detailSection) detailSection.style.display = 'block';
    if (detailTitle) detailTitle.textContent = currentWb.name;

    var hasSeed = !!currentWb.worldSeed;
    var hasElaboration = !!currentWb.decomposedWorld;

    var info = '<p><strong>Source:</strong> ' + currentWb.sourceKind + '</p>';
    info += '<p><strong>Created:</strong> ' + new Date(currentWb.createdAt).toLocaleString() + '</p>';
    if (hasSeed) info += '<p><span class="badge badge-success">Seed generated</span></p>';
    if (hasElaboration) info += '<p><span class="badge badge-success">World elaborated (' + currentWb.decomposedWorld.facts.length + ' facts)</span></p>';
    if (currentWb.worldLogline || (currentWb.decomposedWorld && currentWb.decomposedWorld.worldLogline)) {
      var logline = currentWb.decomposedWorld ? currentWb.decomposedWorld.worldLogline : '';
      if (logline) info += '<p><em>' + escapeHtml(logline) + '</em></p>';
    }
    if (detailInfo) detailInfo.innerHTML = info;

    var seedBtn = document.getElementById('wb-generate-seed-btn');
    var elabBtn = document.getElementById('wb-generate-elaboration-btn');
    if (seedBtn) seedBtn.style.display = currentWb.sourceKind === 'PIPELINE' ? '' : 'none';
    if (elabBtn) elabBtn.style.display = currentWb.sourceKind === 'PIPELINE' && hasSeed ? '' : 'none';

    showPreview('seed');
  }

  function showPreview(tab) {
    if (!currentWb || !previewContent) return;
    var content = '';
    if (tab === 'seed') {
      content = currentWb.worldSeed ? JSON.stringify(currentWb.worldSeed, null, 2) : 'No seed generated yet.';
    } else if (tab === 'markdown') {
      content = currentWb.rawWorldMarkdown || 'No markdown generated yet.';
    } else if (tab === 'facts') {
      if (currentWb.decomposedWorld && currentWb.decomposedWorld.facts.length > 0) {
        content = currentWb.decomposedWorld.facts.map(function (f) {
          return '[' + f.domain + '] ' + (f.factType ? '[' + f.factType + '] ' : '') + f.fact + ' (scope: ' + f.scope + ')';
        }).join('\n');
      } else {
        content = 'No facts generated yet.';
      }
    }
    previewContent.textContent = content;
  }

  // --- Event handlers ---

  var createBtn = document.getElementById('wb-create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', async function () {
      clearError();
      var name = document.getElementById('wb-pipeline-name').value.trim();
      if (!name) { showError('Name is required'); return; }

      showLoading('Creating...');
      try {
        var data = await fetchJson('/worldbuilding/api/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            userNotes: document.getElementById('wb-user-notes').value.trim() || undefined,
            tone: document.getElementById('wb-tone').value.trim() || undefined,
            contentPreferences: document.getElementById('wb-content-preferences').value.trim() || undefined,
            startingSituation: document.getElementById('wb-starting-situation').value.trim() || undefined,
          }),
        });
        hideLoading();
        if (!data.success) { showError(data.error); return; }
        currentWb = data.worldbuilding;
        showDetail();
        loadList();
      } catch (err) {
        hideLoading();
        showError(err.message);
      }
    });
  }

  var decomposeBtn = document.getElementById('wb-decompose-btn');
  if (decomposeBtn) {
    decomposeBtn.addEventListener('click', async function () {
      clearError();
      var name = document.getElementById('wb-raw-name').value.trim();
      var rawText = document.getElementById('wb-raw-text').value.trim();
      var apiKey = getApiKey();
      var tone = document.getElementById('wb-raw-tone').value.trim() || 'default';

      if (!name || !rawText) { showError('Name and raw text are required'); return; }
      if (!apiKey) { showError('API key is required'); return; }

      showLoading('Decomposing worldbuilding...');
      try {
        var data = await fetchJson('/worldbuilding/api/decompose-raw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, rawText: rawText, apiKey: apiKey, tone: tone }),
        });
        hideLoading();
        if (!data.success) { showError(data.error); return; }
        currentWb = data.worldbuilding;
        showDetail();
        loadList();
      } catch (err) {
        hideLoading();
        showError(err.message);
      }
    });
  }

  var seedBtn = document.getElementById('wb-generate-seed-btn');
  if (seedBtn) {
    seedBtn.addEventListener('click', async function () {
      clearError();
      var apiKey = getApiKey();
      if (!apiKey) { showError('API key is required'); return; }
      if (!currentWb) return;

      showLoading('Generating world seed...');
      try {
        var data = await fetchJson('/worldbuilding/api/' + currentWb.id + '/generate-seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKey }),
        });
        hideLoading();
        if (!data.success) { showError(data.error); return; }
        currentWb = data.worldbuilding;
        showDetail();
      } catch (err) {
        hideLoading();
        showError(err.message);
      }
    });
  }

  var elabBtn = document.getElementById('wb-generate-elaboration-btn');
  if (elabBtn) {
    elabBtn.addEventListener('click', async function () {
      clearError();
      var apiKey = getApiKey();
      if (!apiKey) { showError('API key is required'); return; }
      if (!currentWb) return;

      showLoading('Elaborating world...');
      try {
        var data = await fetchJson('/worldbuilding/api/' + currentWb.id + '/generate-elaboration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKey }),
        });
        hideLoading();
        if (!data.success) { showError(data.error); return; }
        currentWb = data.worldbuilding;
        showDetail();
      } catch (err) {
        hideLoading();
        showError(err.message);
      }
    });
  }

  var deleteBtn = document.getElementById('wb-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async function () {
      if (!currentWb) return;
      if (!confirm('Delete "' + currentWb.name + '"?')) return;

      try {
        await fetchJson('/worldbuilding/api/' + currentWb.id, { method: 'DELETE' });
        currentWb = null;
        if (detailSection) detailSection.style.display = 'none';
        if (listSection) listSection.style.display = 'block';
        loadList();
      } catch (err) {
        showError(err.message);
      }
    });
  }

  var backBtn = document.getElementById('wb-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      currentWb = null;
      if (detailSection) detailSection.style.display = 'none';
      if (listSection) listSection.style.display = 'block';
    });
  }

  // Preview tabs
  var tabBtns = document.querySelectorAll('#wb-preview-tabs [data-tab]');
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      showPreview(btn.getAttribute('data-tab'));
    });
  });

  // Initial load
  loadList();
})();
