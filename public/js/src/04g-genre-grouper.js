  // ── Genre Grouper ──────────────────────────────────────────────

  function formatGenreDisplayLabel(genre) {
    return (genre || 'UNKNOWN').replace(/_/g, ' ');
  }

  function groupConceptsByGenreClient(concepts) {
    var map = {};
    (concepts || []).forEach(function (concept) {
      var genre =
        concept.evaluatedConcept &&
        concept.evaluatedConcept.concept &&
        concept.evaluatedConcept.concept.genreFrame
          ? concept.evaluatedConcept.concept.genreFrame
          : 'UNKNOWN';
      if (!map[genre]) {
        map[genre] = [];
      }
      map[genre].push(concept);
    });

    return Object.keys(map)
      .sort(function (a, b) {
        return formatGenreDisplayLabel(a).localeCompare(formatGenreDisplayLabel(b));
      })
      .map(function (genre) {
        return {
          genre: genre,
          displayLabel: formatGenreDisplayLabel(genre),
          concepts: map[genre],
        };
      });
  }

  function renderGenreSectionHeader(genre, displayLabel, count, open) {
    var openAttr = open !== false ? ' open' : '';
    return (
      '<details class="genre-group" data-genre="' + escapeHtml(genre) + '"' + openAttr + '>' +
        '<summary class="genre-group__header">' +
          '<span class="genre-group__label">' + escapeHtml(displayLabel) + '</span>' +
          '<span class="genre-group__count">(' + count + ')</span>' +
        '</summary>' +
        '<div class="genre-group__body spine-options-container">'
    );
  }

  function renderGenreSectionFooter() {
    return '</div></details>';
  }
