// Content Packets UI Controller

function initContentPacketsPage() {
  var page = document.getElementById('content-packets-page');
  if (!page) return;

  var form = document.getElementById('content-generate-form');
  var progressEl = document.getElementById('content-generation-progress');
  var statusEl = document.getElementById('content-generation-status');
  var resultsEl = document.getElementById('content-generation-results');
  var generatedList = document.getElementById('generated-packets-list');
  var generateBtn = document.getElementById('content-generate-btn');

  initExemplarControls();

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleContentGenerate();
    });
  }

  // Pin/delete buttons on saved packets
  page.addEventListener('click', function (e) {
    var target = e.target;
    if (target.classList.contains('pin-packet-btn')) {
      handlePinPacket(target.getAttribute('data-id'));
    } else if (target.classList.contains('delete-packet-btn')) {
      handleDeletePacket(target.getAttribute('data-id'));
    } else if (target.classList.contains('save-generated-btn')) {
      handleSaveGenerated(target);
    }
  });

  function getApiKey() {
    var input = document.getElementById('contentApiKey');
    return input ? input.value.trim() : '';
  }

  function collectExemplarIdeas() {
    var entries = document.querySelectorAll('#exemplar-entries .exemplar-entry');
    var ideas = [];
    entries.forEach(function (entry) {
      var span = entry.querySelector('.exemplar-entry-text');
      if (span) ideas.push(span.textContent);
    });
    return ideas;
  }

  function addExemplarEntry(text) {
    var container = document.getElementById('exemplar-entries');
    if (!container) return;

    var entry = document.createElement('div');
    entry.className = 'exemplar-entry';

    var span = document.createElement('span');
    span.className = 'exemplar-entry-text';
    span.textContent = text;

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-small btn-danger exemplar-remove-btn';
    removeBtn.textContent = '\u00D7';
    removeBtn.addEventListener('click', function () {
      entry.remove();
    });

    entry.appendChild(span);
    entry.appendChild(removeBtn);
    container.appendChild(entry);
  }

  function initExemplarControls() {
    var addBtn = document.getElementById('exemplar-add-btn');
    var input = document.getElementById('exemplar-idea-input');

    if (!addBtn || !input) return;

    addBtn.addEventListener('click', function () {
      var text = input.value.trim();
      if (!text) return;
      addExemplarEntry(text);
      input.value = '';
      input.focus();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addBtn.click();
      }
    });
  }

  function handleContentGenerate() {
    var apiKey = getApiKey();
    if (!apiKey || apiKey.length < 10) {
      alert('Please enter a valid OpenRouter API key.');
      return;
    }

    var ideas = collectExemplarIdeas();
    if (ideas.length === 0) {
      alert('Please enter at least one exemplar idea.');
      return;
    }

    var usePipeline = document.getElementById('usePipeline');
    var pipeline = usePipeline ? usePipeline.checked : false;

    var moodInput = document.getElementById('contentMoodKeywords');
    var prefInput = document.getElementById('contentPreferences');

    var payload = {
      exemplarIdeas: ideas,
      apiKey: apiKey,
      pipeline: pipeline,
    };

    if (moodInput && moodInput.value.trim()) {
      if (pipeline) {
        payload.moodOrGenre = moodInput.value.trim();
      } else {
        payload.moodKeywords = moodInput.value.trim();
      }
    }
    if (prefInput && prefInput.value.trim()) {
      payload.contentPreferences = prefInput.value.trim();
    }

    if (generateBtn) generateBtn.disabled = true;
    if (progressEl) progressEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (statusEl) statusEl.textContent = 'Generating content packets...';

    fetch('/content-packets/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (progressEl) progressEl.style.display = 'none';
        if (generateBtn) generateBtn.disabled = false;

        if (!data.success) {
          alert('Generation failed: ' + (data.error || 'Unknown error'));
          return;
        }

        renderGeneratedPackets(data.packets || []);
      })
      .catch(function (err) {
        if (progressEl) progressEl.style.display = 'none';
        if (generateBtn) generateBtn.disabled = false;
        alert('Generation failed: ' + err.message);
      });
  }

  function renderGeneratedPackets(packets) {
    if (!generatedList || !resultsEl) return;
    if (packets.length === 0) {
      generatedList.innerHTML = '<p>No packets generated.</p>';
      resultsEl.style.display = 'block';
      return;
    }

    var html = packets.map(function (pkt, idx) {
      var title = pkt.title || pkt.coreAnomaly || 'Packet ' + (idx + 1);
      var kind = pkt.contentKind || 'UNKNOWN';
      return (
        '<article class="story-card">' +
          '<div class="story-card-content">' +
            '<h3 class="story-title">' + escapeHtml(title) + '</h3>' +
            '<dl class="story-details">' +
              '<div class="story-detail-row"><dt>Kind</dt><dd>' + escapeHtml(kind) + '</dd></div>' +
              '<div class="story-detail-row"><dt>Core Anomaly</dt><dd>' + escapeHtml(pkt.coreAnomaly || '') + '</dd></div>' +
              '<div class="story-detail-row"><dt>Wildness Invariant</dt><dd>' + escapeHtml(pkt.wildnessInvariant || '') + '</dd></div>' +
              '<div class="story-detail-row"><dt>Signature Image</dt><dd>' + escapeHtml(pkt.signatureImage || '') + '</dd></div>' +
            '</dl>' +
            '<button class="btn btn-sm btn-primary save-generated-btn" ' +
              'data-packet=\'' + escapeAttr(JSON.stringify(pkt)) + '\'>' +
              'Save' +
            '</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    generatedList.innerHTML = html;
    resultsEl.style.display = 'block';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  }

  function handleSaveGenerated(btn) {
    var packetData;
    try {
      packetData = JSON.parse(btn.getAttribute('data-packet'));
    } catch (_e) {
      alert('Invalid packet data');
      return;
    }

    var apiKey = getApiKey();
    var packetId = 'cp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);

    fetch('/content-packets/api/' + encodeURIComponent(packetId) + '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packet: packetData, apiKey: apiKey }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          btn.textContent = 'Saved';
          btn.disabled = true;
        } else {
          alert('Save failed: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(function (err) {
        alert('Save failed: ' + err.message);
      });
  }

  function handlePinPacket(packetId) {
    if (!packetId) return;

    fetch('/content-packets/api/' + encodeURIComponent(packetId) + '/pin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          window.location.reload();
        } else {
          alert('Pin toggle failed: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(function (err) {
        alert('Pin toggle failed: ' + err.message);
      });
  }

  function handleDeletePacket(packetId) {
    if (!packetId) return;
    if (!confirm('Delete this content packet?')) return;

    fetch('/content-packets/api/' + encodeURIComponent(packetId), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          var card = document.querySelector('[data-packet-id="' + packetId + '"]');
          if (card) card.remove();
        } else {
          alert('Delete failed: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(function (err) {
        alert('Delete failed: ' + err.message);
      });
  }
}

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentPacketsPage);
} else {
  initContentPacketsPage();
}
