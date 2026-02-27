  // ── Genre Grouper ──────────────────────────────────────────────

  function formatGenreDisplayLabel(genre) {
    return (genre || 'UNKNOWN').replace(/_/g, ' ');
  }

  /* eslint-disable */
  var GENRE_CONVENTIONS_GLOSSES = {
    ADVENTURE: ['The protagonist pursues a concrete outer objective','The environment itself grows more hostile over time','Relationships with allies shape the journey','New places and phenomena evoke awe','The protagonist must prove capable through action','Travel changes the traveler'],
    COSMIC_HORROR: ['Understanding brings harm, not power','Forces at play make human effort trivial','Something is fundamentally off about reality','What characters perceive may not be true','No one else understands what the protagonist faces','Mental stability erodes under pressure'],
    CYBERPUNK: ['Technology amplifies inequality','Corporations hold more authority than governments','Physical augmentation is transactional','Privacy does not exist','Data has more value than physical goods','Gleaming technology overlays crumbling infrastructure'],
    DARK_COMEDY: ['Pain is the raw material of comedy','Situations grow more ridiculous as stakes rise','Characters discuss the unspeakable without flinching','Self-awareness is conspicuously absent','The narration maintains detached amusement','The world does not reward virtue or punish vice'],
    DRAMA: ['External events matter because of internal stakes','Human connections carry thematic meaning','Characters must eventually face truth','Actions produce realistic outcomes','What is unsaid matters as much as dialogue','Transformation requires genuine struggle'],
    DYSTOPIAN: ['Authority regulates mundane existence','Expression itself is dangerous','Being watched is unremarkable','Defiance risks death or worse','The system incentivizes compliance','History is controlled or erased'],
    ESPIONAGE: ['Every relationship has a hidden dimension','Maintaining a false self erodes the real one','No one has the full picture','Operational procedure shapes how scenes unfold','The job demands ethical shortcuts','Professional relationships involve control imbalance'],
    FABLE: ['Characters represent ideas','Nature reflects moral truths','Prose is direct and unadorned','Morals emerge from events, not lectures','Roles matter more than personalities','The world\'s design rewards virtue and punishes vice'],
    FANTASY: ['Power is not free','Artifacts and locations carry significance','The hero is singled out or forged by trial','Old forces stir again','Beauty and threat are intertwined','Heritage and destiny shape events'],
    GOTHIC: ['Architecture and landscape mirror inner turmoil','History refuses to stay buried','Escape feels impossible','Ancestry carries obligation and guilt','Physical ruin signals spiritual decline','Sustained unease rather than jump scares'],
    GRIMDARK: ['Protagonists are flawed and compromised','Systems are engines of cruelty','No one wields authority cleanly','Principled stances lead to suffering','Survival demands moral flexibility','No option is clearly right'],
    HISTORICAL: ['Material culture anchors scenes in time','Class and status limit choices','Modern sensibilities cannot be imposed','Events larger than any character','Objects, language, and customs feel period-correct','Private lives intersect public history'],
    HORROR: ['Safety is shown before being destroyed','The antagonist follows incomprehensible rules','No cavalry is coming','The threat targets physical or psychological integrity','Relief is always temporary','Escaping costs something precious'],
    LITERARY: ['Internal experience matters more than events','Mundane situations carry weight','Images and patterns repeat with deepening meaning','Clean endings are suspect','Prose style is inseparable from content','Ideas matter more than action'],
    MAGICAL_REALISM: ['Magic is unremarkable','The extraordinary is accepted','Vivid detail makes magic tangible','Social critique lives under the narrative','Past, present, and future blur','Folklore is everyday reality'],
    MYSTERY: ['The detective knows or suspects more','Nothing is merely decorative','The reader could solve it with available information','Guilt appears to move between characters','Reasoning produces results','The answer was always visible'],
    MYTHIC: ['Individual trials reflect universal forces','Characters fill mythic functions','Powers beyond human act on the story','Ceremony and imagery have real effect','The hero cannot return to who they were','Destiny and free will pull against each other'],
    NOIR: ['The system is rigged against the protagonist','Ethical shortcuts are routine','Setting reflects systemic corruption','A character whose allure masks danger','Prose carries exhaustion and hindsight','Knowledge is leverage, not shared freely'],
    PICARESQUE: ['The hero is an outsider surviving by wit','The story drifts through social worlds','Each milieu\'s pretensions are exposed','Cleverness substitutes for power','The protagonist does not reform','Meeting people reveals their true nature'],
    POST_APOCALYPTIC: ['Resources are the primary constraint','Relics of civilization evoke loss','Group survival vs. self-preservation','The world itself is dangerous','Old rules no longer apply','The past is a ghost'],
    ROMANCE: ['Desire opens characters to hurt','Something outside the lovers keeps them apart','Vulnerability produces connection','Closeness demands exposure','Opposition strengthens longing','Each lover\'s flaw matches the other\'s need'],
    SATIRE: ['The system\'s logic is shown as ridiculous','Distortion illuminates reality','Sincerity highlights institutional failure','What people claim vs. what they do','Following rules to absurd conclusions','Complicity is inescapable'],
    SCI_FI: ['The "what if" is followed to its logical end','Innovation changes what it means to be human','Moral questions change at different magnitudes','The setting operates by consistent internal logic','Conceptual tensions generate plot','Discovery is thrilling and unsettling'],
    SURREAL: ['Events follow emotional rather than rational order','Characters may change or merge without explanation','Unrelated elements collide meaningfully','Feelings matter more than facts','Familiar things become strange','Understanding comes through recurrence'],
    THRILLER: ['The hero never gets to rest','The opposition anticipates the hero\'s moves','Truth comes out through crisis','Time pressure is omnipresent','Allies may be compromised','The threat targets what the hero loves'],
    WESTERN: ['The edge of civilization tests character','Order cannot be taken for granted','Fighting carries real cost','Independence is valued above all','Geography molds the people who inhabit it','Settlement and wildness are in opposition'],
  };

  var GENRE_OBLIGATIONS_GLOSSES = {
    ADVENTURE: ['An external summons or discovery launches the journey','The protagonist leaves the known world behind','A companion proves loyalty or is recruited through trial','The protagonist endures a defining physical or mental test','The prize is won but at meaningful expense','The protagonist comes back changed by the journey'],
    COSMIC_HORROR: ['The protagonist learns something they shouldn\'t','The rules of the world visibly break down','The protagonist grasps the scale of what they face','Direct contact with the unknowable damages the mind','Understanding cannot be unlearned','The final revelation makes things worse, not better'],
    CYBERPUNK: ['The protagonist sees how the system extracts from the powerless','Technology is used to breach a defended space','Augmentation happens under duress or necessity','An institution the protagonist relied on turns hostile','Information is stolen or weaponized in a key scene','The protagonist wins but the system absorbs the damage'],
    DARK_COMEDY: ['A character does something terrible and it is funny','One bad decision cascades into compounding disasters','A respected figure or institution is revealed as fraudulent','A character becomes complicit by failing to act','The most transgressive moment produces the biggest laugh','The ending resolves things but in a way that mocks resolution'],
    DRAMA: ['A meaningful bond breaks under pressure','A character is forced to face an uncomfortable reality','A character reveals what they have been hiding','A character must give something up to gain something else','Something long unsaid is finally spoken','The climax delivers emotional payoff built over the full arc'],
    DYSTOPIAN: ['The system\'s power is shown in action against someone','A moment of defiance ignites broader opposition','The protagonist sees the system\'s willingness to destroy','Trust within the opposition collapses','The protagonist learns what the system hides','Surviving within the system demands moral cost'],
    ESPIONAGE: ['The assignment has layers the protagonist doesn\'t see','The false self is nearly exposed','Someone is working for the other side','A procedural operation goes wrong or must be improvised','A key relationship is revealed as compromised','The authority figure acts against the protagonist\'s interest or gives themselves up'],
    FABLE: ['The protagonist faces a clear ethical choice','A figure embodies wisdom and offers direction','A character\'s flaw produces visible consequences','Circumstance flips for a character based on their virtue or vice','Wrongdoing receives its consequence','The story\'s moral is demonstrated by what happens, not stated'],
    FANTASY: ['A character pushes against the limits of what magic allows','A powerful object or gift is the focus of a quest','The protagonist faces a test with symbolic or supernatural weight','Magic or power demands something in exchange','A moment of awe carries a price','A foretold event comes true or is deliberately broken'],
    GOTHIC: ['The primary location is established as oppressive and laden with history','A hidden truth about lineage or legacy is revealed','A mirror, double, or uncanny reflection appears','A character violates natural or moral law','Physical deterioration of setting reflects a character\'s inner state','The resolution carries an air of inescapability'],
    GRIMDARK: ['A system inflicts cruelty as standard procedure','A character abandons a moral stance to survive','A companion is sacrificed for tactical advantage','Authority is gained through violence or manipulation','The best outcome still costs dearly','Living trumps doing the right thing'],
    HISTORICAL: ['The era\'s specific constraints are shown bearing on characters','A character\'s desires clash with historical norms','A real or analogous historical event intersects the plot','Class or rank is challenged or enforced','A character wanting what the era forbids faces consequences','Past actions or ancestry shape present outcomes'],
    HORROR: ['The antagonist or danger appears for the first time','A moment of relief is violently interrupted','The protagonist is cut off from help','A companion falls victim to the danger','The true nature or scale of the threat becomes clear','The climax demands a price for survival'],
    LITERARY: ['A small event fractures the protagonist\'s routine','A scene focuses on internal experience over external action','A recurring image or pattern achieves its fullest meaning','A familiar bond is seen from a new angle','The protagonist reaches or fails to reach understanding','The ending resonates thematically without resolving cleanly'],
    MAGICAL_REALISM: ['Magic appears and no one is surprised','A figure or event from folklore enters the narrative','A shared practice or memory carries weight','Social truth is revealed via supernatural means','Feelings take precedence over physical plausibility','The ending carries gentle astonishment rather than spectacle'],
    MYSTERY: ['The central question or crime is established','A misleading clue or suspect diverts attention','The detective presses someone who knows something','An earlier detail is revealed to mean something different','The investigator assembles the full picture','The guilty party is identified and confronted'],
    MYTHIC: ['A supernatural or fateful summons launches the quest','A figure blocks passage to the next stage','The hero enters a place of trial and suffering','The guide falls away, forcing independence','The quest\'s prize is obtained through sacrifice','The hero comes back fundamentally changed'],
    NOIR: ['The protagonist\'s weakness is turned against them','The network of complicity becomes visible','Someone the protagonist relied on proves false','The protagonist does something they cannot undo','A way out appears and is taken away','The ending delivers truth without comfort'],
    PICARESQUE: ['The protagonist arrives in an unfamiliar social world','The protagonist clashes with authority or convention','A social class or institution is shown as corrupt or absurd','The protagonist uses cleverness to escape or prevail','A powerful figure is deceived or manipulated','The protagonist moves on, unchanged, to the next episode'],
    POST_APOCALYPTIC: ['The new reality\'s constraints are shown','People clash over scarce necessities','A place of safety is compromised','A relic or memory of the previous civilization surfaces','Group bonds strain under survival pressure','A character must choose between self-interest and compassion'],
    ROMANCE: ['The lovers first feel mutual pull','Emotional or physical closeness increases','Both lovers reveal something hidden','The obstacle between them reaches maximum intensity','A character risks everything to declare their feelings','The final decision about the relationship is made'],
    SATIRE: ['The institution or social structure is introduced','The system\'s logic produces increasingly ridiculous outcomes','A sincere character highlights the system\'s dysfunction','A gap between professed values and actual behavior is revealed','Following the rules to their conclusion produces absurdity','The ending comments on the system without reforming it'],
    SCI_FI: ['The core "what if" is shown in action','The premise creates unforeseen problems','The protagonist confronts something at a vastly different magnitude','Moral questions arise from the speculative premise','The technology or idea produces chain reactions','The story\'s central idea reaches its fullest expression'],
    SURREAL: ['The world shifts away from the familiar','Events follow emotional rather than causal order','The protagonist\'s sense of self or reality wavers','Unrelated elements collide to produce meaning','Something ordinary becomes profoundly strange','A visual or sensory moment conveys the story\'s deepest point'],
    THRILLER: ['Danger is present from the outset','A deadline creates urgency','The antagonist gains advantage','The protagonist is trapped or powerless','An apparent resolution proves premature','The climax turns on a final unexpected shift'],
    WESTERN: ['A character must choose between competing moral codes','The protagonist faces the question of righteous force','Tension builds toward an inevitable confrontation','The physical environment tests the protagonist\'s endurance','Principle clashes with self-preservation','The climax centers on a direct confrontation'],
  };
  /* eslint-enable */

  function renderGenreInfoPanelHtml(conventions, obligations) {
    if ((!conventions || conventions.length === 0) && (!obligations || obligations.length === 0)) {
      return '';
    }
    var html = '<div class="genre-info-panel">';
    html += '<div class="genre-info-panel__column">';
    html += '<h4 class="genre-info-panel__heading">Conventions</h4>';
    html += '<hr class="genre-info-panel__divider">';
    html += '<ul class="genre-info-panel__list">';
    (conventions || []).forEach(function (g) {
      html += '<li>' + escapeHtml(g) + '</li>';
    });
    html += '</ul></div>';
    html += '<div class="genre-info-panel__column">';
    html += '<h4 class="genre-info-panel__heading">Obligations</h4>';
    html += '<hr class="genre-info-panel__divider">';
    html += '<ul class="genre-info-panel__list">';
    (obligations || []).forEach(function (g) {
      html += '<li>' + escapeHtml(g) + '</li>';
    });
    html += '</ul></div></div>';
    return html;
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
    var conventions = GENRE_CONVENTIONS_GLOSSES[genre] || [];
    var obligations = GENRE_OBLIGATIONS_GLOSSES[genre] || [];
    return (
      '<details class="genre-group" data-genre="' + escapeHtml(genre) + '"' + openAttr + '>' +
        '<summary class="genre-group__header">' +
          '<span class="genre-group__label">' + escapeHtml(displayLabel) + '</span>' +
          '<span class="genre-group__count">(' + count + ')</span>' +
        '</summary>' +
        renderGenreInfoPanelHtml(conventions, obligations) +
        '<div class="genre-group__body spine-options-container">'
    );
  }

  function renderGenreSectionFooter() {
    return '</div></details>';
  }
