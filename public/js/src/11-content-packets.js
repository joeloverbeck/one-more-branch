// Content Packets UI Controller

function initContentPacketsPage() {
  var page = document.getElementById('content-packets-page');
  if (!page) return;

  var form = document.getElementById('content-generate-form');
  var progressEl = document.getElementById('content-generation-progress');
  var resultsEl = document.getElementById('content-generation-results');
  var generatedList = document.getElementById('generated-packets-list');
  var generateBtn = document.getElementById('content-generate-btn');
  var loadingProgress = progressEl ? createLoadingProgressController(progressEl) : null;

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

    var progressId = createProgressId();
    payload.progressId = progressId;

    if (generateBtn) generateBtn.disabled = true;
    if (resultsEl) resultsEl.style.display = 'none';
    if (loadingProgress) loadingProgress.start(progressId);

    fetch('/content-packets/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (loadingProgress) loadingProgress.stop();
        if (generateBtn) generateBtn.disabled = false;

        if (!data.success) {
          alert('Generation failed: ' + (data.error || 'Unknown error'));
          return;
        }

        renderGeneratedPackets(data.packetCards || [], data.packets || [], data.evaluations || []);
      })
      .catch(function (err) {
        if (loadingProgress) loadingProgress.stop();
        if (generateBtn) generateBtn.disabled = false;
        alert('Generation failed: ' + err.message);
      });
  }

  function renderGeneratedPackets(packetCards, packets, evaluations) {
    if (!generatedList || !resultsEl) return;
    if (packetCards.length === 0) {
      generatedList.innerHTML = '<p>No packets generated.</p>';
      resultsEl.style.display = 'block';
      return;
    }

    var evaluationsByContentId = {};
    (evaluations || []).forEach(function (evaluation) {
      if (evaluation && evaluation.contentId) {
        evaluationsByContentId[evaluation.contentId] = evaluation;
      }
    });

    var html = packetCards.map(function (card, idx) {
      var packet = packets[idx];
      var evaluation = packet && packet.packet
        ? evaluationsByContentId[packet.packet.contentId]
        : evaluationsByContentId[packet.contentId];
      return (
        '<article class="story-card">' +
          '<div class="story-card-content">' +
            renderCardSections(card) +
            '<button class="btn btn-sm btn-primary save-generated-btn" ' +
              'data-candidate=\'' + escapeAttr(JSON.stringify(packet)) + '\' ' +
              'data-evaluation=\'' + escapeAttr(JSON.stringify(evaluation || null)) + '\'>' +
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

  function renderDetailRows(details) {
    var rows = [];

    function renderValue(value) {
      if (Array.isArray(value)) {
        return (
          '<ul class="story-detail-list">' +
            value.map(function (item) {
              return '<li>' + escapeHtml(item) + '</li>';
            }).join('') +
          '</ul>'
        );
      }

      return escapeHtml(value || '');
    }

    (details || []).forEach(function (detail) {
      rows.push(
        '<div class="story-detail-row' +
          (detail.rowClassSuffix || '') +
          '" data-detail-key="' +
          escapeAttr(detail.key) +
          '">' +
          '<dt>' + escapeHtml(detail.label) + '</dt>' +
          '<dd>' + renderValue(detail.value) + '</dd>' +
        '</div>'
      );
    });

    return rows.join('');
  }

  function renderCardSections(card) {
    var sections = [
      { key: 'context', title: 'Context', details: card.contextDetails || [] },
      { key: 'packet', title: 'Packet', details: card.packetDetails || [] },
      { key: 'origin', title: 'Origin', details: card.originDetails || [] },
      { key: 'meta', title: 'Meta', details: card.metaDetails || [] },
    ].filter(function (section) {
      return section.details.length > 0;
    });

    return sections
      .map(function (section) {
        var rowClassSuffix = section.key === 'meta' ? ' story-detail-row--meta' : '';

        return (
          '<section class="story-card-section story-card-section--' +
          escapeAttr(section.key) +
          '" data-section-key="' +
          escapeAttr(section.key) +
          '">' +
          '<h3 class="story-card-section__title">' +
          escapeHtml(section.title) +
          '</h3>' +
          '<dl class="story-details">' +
          renderDetailRows(section.details.map(function (detail) {
            return {
              key: detail.key,
              label: detail.label,
              value: detail.value,
              rowClassSuffix: rowClassSuffix,
            };
          })) +
          '</dl>' +
          '</section>'
        );
      })
      .join('');
  }

  function handleSaveGenerated(btn) {
    var candidateData;
    var evaluationData;
    try {
      candidateData = JSON.parse(btn.getAttribute('data-candidate'));
      evaluationData = JSON.parse(btn.getAttribute('data-evaluation'));
    } catch (_e) {
      alert('Invalid packet data');
      return;
    }

    var packetId = 'cp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);

    fetch('/content-packets/api/' + encodeURIComponent(packetId) + '/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate: candidateData,
        evaluation: evaluationData || undefined,
      }),
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
