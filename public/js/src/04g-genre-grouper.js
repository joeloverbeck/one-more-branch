  // ── Genre Grouper ──────────────────────────────────────────────

  function formatGenreDisplayLabel(genre) {
    return (genre || 'UNKNOWN').replace(/_/g, ' ');
  }

  /* eslint-disable */
  var GENRE_CONVENTIONS_GLOSSES = {
    ABSURDIST: ['Logical reasoning produces nonsensical outcomes','Characters search for purpose in a purposeless universe','Cycles and loops replace linear progress','Power structures operate by inscrutable rules','Words fail to convey what characters actually mean','Trivial events and existential crises receive identical weight'],
    ADVENTURE: ['The protagonist pursues a concrete outer objective','The environment itself grows more hostile over time','Relationships with allies shape the journey','New places and phenomena evoke awe','The protagonist must prove capable through action','Travel changes the traveler'],
    ALTERNATE_HISTORY: ['A specific historical change is the foundation of all differences','Consequences of the divergence propagate logically through society','The reader knows what should have happened','Recognizable organizations and nations exist in altered forms','Material culture and social norms feel grounded in their era','Characters struggle to redirect or preserve the altered course of history'],
    COMING_OF_AGE: ['The protagonist begins with a limited, sheltered worldview','Mentors, first loves, and rivals function as identity-shapers','The protagonist\'s sphere of experience broadens across the story','Society pushes the protagonist toward a role they must negotiate','Physical maturation and emotional development intertwine','Something irrevocable reveals the world is not what the protagonist believed'],
    COSMIC_HORROR: ['Understanding brings harm, not power','Forces at play make human effort trivial','Something is fundamentally off about reality','What characters perceive may not be true','No one else understands what the protagonist faces','Mental stability erodes under pressure'],
    CULTIVATION: ['A rigidly stratified system of power levels structures all social interactions','The universe has laws that govern advancement and impose tribulations','Characters pursue transcendence of mortality','Power progresses from individual martial arts to reality-warping scales','Sects are training institutions, political powers, and social hierarchies simultaneously','Spirit stones, elixirs, and artifacts accelerate advancement'],
    CYBERPUNK: ['Technology amplifies inequality','Corporations hold more authority than governments','Physical augmentation is transactional','Privacy does not exist','Data has more value than physical goods','Gleaming technology overlays crumbling infrastructure'],
    DARK_COMEDY: ['Pain is the raw material of comedy','Situations grow more ridiculous as stakes rise','Characters discuss the unspeakable without flinching','Self-awareness is conspicuously absent','The narration maintains detached amusement','The world does not reward virtue or punish vice'],
    DRAMA: ['External events matter because of internal stakes','Human connections carry thematic meaning','Characters must eventually face truth','Actions produce realistic outcomes','What is unsaid matters as much as dialogue','Transformation requires genuine struggle'],
    DYSTOPIAN: ['Authority regulates mundane existence','Expression itself is dangerous','Being watched is unremarkable','Defiance risks death or worse','The system incentivizes compliance','History is controlled or erased'],
    EROTICA: ['Physical and emotional desire is the primary engine of plot','Sexual encounters expose who characters truly are','Negotiation of boundaries creates tension and trust','Physical sensation carries psychological meaning','Each encounter demands deeper exposure','Control, surrender, and equality are always at play'],
    ESPIONAGE: ['Every relationship has a hidden dimension','Maintaining a false self erodes the real one','No one has the full picture','Operational procedure shapes how scenes unfold','The job demands ethical shortcuts','Professional relationships involve control imbalance'],
    FABLE: ['Characters represent ideas','Nature reflects moral truths','Prose is direct and unadorned','Morals emerge from events, not lectures','Roles matter more than personalities','The world\'s design rewards virtue and punishes vice'],
    FANTASY: ['Power is not free','Artifacts and locations carry significance','The hero is singled out or forged by trial','Old forces stir again','Beauty and threat are intertwined','Heritage and destiny shape events'],
    GOTHIC: ['Architecture and landscape mirror inner turmoil','History refuses to stay buried','Escape feels impossible','Ancestry carries obligation and guilt','Physical ruin signals spiritual decline','Sustained unease rather than jump scares'],
    GRIMDARK: ['Protagonists are flawed and compromised','Systems are engines of cruelty','No one wields authority cleanly','Principled stances lead to suffering','Survival demands moral flexibility','No option is clearly right'],
    HEIST: ['Characters are defined by being extraordinarily good at specific skills','The heist plan itself structures the narrative','The protagonists are the ones with the scheme','The audience roots for the people committing the crime','Every scene operates with clockwork exactness','The thing being robbed has its own defenses that function as an antagonist'],
    HISTORICAL: ['Material culture anchors scenes in time','Class and status limit choices','Modern sensibilities cannot be imposed','Events larger than any character','Objects, language, and customs feel period-correct','Private lives intersect public history'],
    HORROR: ['Safety is shown before being destroyed','The antagonist follows incomprehensible rules','No cavalry is coming','The threat targets physical or psychological integrity','Relief is always temporary','Escaping costs something precious'],
    ISEKAI: ['The protagonist\'s ordinary past highlights the new world\'s strangeness','Skills or understanding from the old world give unexpected leverage','The setting has discoverable systems the protagonist can master','The protagonist defines who they are without old-world status','Being uprooted is simultaneously freeing and disorienting','Growth comes from learning the new world\'s logic'],
    KAIJU: ['The monster evokes awe and terror simultaneously','Human infrastructure and institutions are fragile against the threat','The creature embodies a real-world fear or social force','Personal stories ground the overwhelming destruction','Institutional attempts to understand or combat the threat drive plot','Normal-sized humans exist alongside impossibly vast beings'],
    LITRPG: ['Stats, levels, and skill trees appear as narrative elements','Understanding game rules is equivalent to personal development','Quantified advancement provides tangible reward','Finding loopholes in the system signals protagonist intelligence','Items, skills, and abilities are earned through measurable achievement','Status screens, notifications, and pop-ups convey information within the story'],
    LITERARY: ['Internal experience matters more than events','Mundane situations carry weight','Images and patterns repeat with deepening meaning','Clean endings are suspect','Prose style is inseparable from content','Ideas matter more than action'],
    MAGICAL_REALISM: ['Magic is unremarkable','The extraordinary is accepted','Vivid detail makes magic tangible','Social critique lives under the narrative','Past, present, and future blur','Folklore is everyday reality'],
    MILITARY: ['Rank and orders define all interpersonal relationships','Survival depends on the group, not the lone warrior','Combat produces lasting damage to body and mind','Tactical objectives conflict with emotional needs','Long stretches of inaction contrast with sudden, intense danger','The military machine does not care about any single soldier'],
    MYSTERY: ['The detective knows or suspects more','Nothing is merely decorative','The reader could solve it with available information','Guilt appears to move between characters','Reasoning produces results','The answer was always visible'],
    MYTHIC: ['Individual trials reflect universal forces','Characters fill mythic functions','Powers beyond human act on the story','Ceremony and imagery have real effect','The hero cannot return to who they were','Destiny and free will pull against each other'],
    NOIR: ['The system is rigged against the protagonist','Ethical shortcuts are routine','Setting reflects systemic corruption','A character whose allure masks danger','Prose carries exhaustion and hindsight','Knowledge is leverage, not shared freely'],
    PARANORMAL: ['Vampires, ghosts, or shapeshifters coexist with ordinary people','Supernatural communities have hierarchies and power struggles','Supernatural nature does not make a being good or evil','Modern cities, jobs, and technology anchor the supernatural elements','Encountering non-human beings forces reflection on what being human means','Supernatural existence is either hidden from or negotiated with human society'],
    PICARESQUE: ['The hero is an outsider surviving by wit','The story drifts through social worlds','Each milieu\'s pretensions are exposed','Cleverness substitutes for power','The protagonist does not reform','Meeting people reveals their true nature'],
    POST_APOCALYPTIC: ['Resources are the primary constraint','Relics of civilization evoke loss','Group survival vs. self-preservation','The world itself is dangerous','Old rules no longer apply','The past is a ghost'],
    ROMANCE: ['Desire opens characters to hurt','Something outside the lovers keeps them apart','Vulnerability produces connection','Closeness demands exposure','Opposition strengthens longing','Each lover\'s flaw matches the other\'s need'],
    SATIRE: ['The system\'s logic is shown as ridiculous','Distortion illuminates reality','Sincerity highlights institutional failure','What people claim vs. what they do','Following rules to absurd conclusions','Complicity is inescapable'],
    SCI_FI: ['The "what if" is followed to its logical end','Innovation changes what it means to be human','Moral questions change at different magnitudes','The setting operates by consistent internal logic','Conceptual tensions generate plot','Discovery is thrilling and unsettling'],
    SLICE_OF_LIFE: ['Events unfold at the rhythm of everyday life, not narrative urgency','A shared meal or quiet conversation holds as much weight as any crisis','Who people are matters more than what happens to them','Repeated daily activities create atmosphere and grounding','Feelings change gradually rather than through dramatic revelation','The setting and its inhabitants form a collective presence'],
    SPACE_OPERA: ['Multiple spacefaring species or factions with complex political relationships','FTL travel, energy weapons, and AI exist but are not the point','Love, family, and honor drive decisions with galaxy-spanning consequences','Protagonists believe in something and fight for it','Massive space battles, alien worlds, and cosmic vistas are expected','Prophecies, chosen ones, and galactic destiny operate without specific mythology'],
    STEAMPUNK: ['Fashion, architecture, and social mores draw from the 19th century','Advanced machines operate on steam, gears, and brass rather than electronics','Technology and opportunity are distributed by social station','Machines are built by singular brilliant minds, not assembly lines','Imperial power structures pervade the social and political landscape','Gears, pipes, and moving parts are displayed rather than hidden'],
    SURREAL: ['Events follow emotional rather than rational order','Characters may change or merge without explanation','Unrelated elements collide meaningfully','Feelings matter more than facts','Familiar things become strange','Understanding comes through recurrence'],
    SURVIVAL: ['Nature, climate, or terrain is the central threat','Food, water, shelter, and tools constrain every choice','Physical condition deteriorates and must be actively maintained','Practical competence separates the living from the dead','Being alone or in a small group amplifies every setback','Social norms collapse when basic needs are unmet'],
    THRILLER: ['The hero never gets to rest','The opposition anticipates the hero\'s moves','Truth comes out through crisis','Time pressure is omnipresent','Allies may be compromised','The threat targets what the hero loves'],
    TRAGEDY: ['The protagonist begins with genuine stature that makes their fall meaningful','A specific character flaw, not external forces, is the causal engine of destruction','Tension comes from watching an unstoppable trajectory, not from surprise','The emotional contract is purgation through pity and fear','The fall has grandeur; the destruction matters because the person mattered','The protagonist both causes and cannot escape their doom'],
    TRANSGRESSIVE: ['The narrative systematically crosses boundaries society enforces','Physical acts and bodily experience carry ideological weight','The narrative voice does not distance itself from disturbing content','Materialism, conformity, and mainstream values are exposed and attacked','Disturbing content exists to strip away comfortable illusions','The story inhabits spaces outside mainstream social approval'],
    UTOPIAN: ['The setting presents a deliberately designed better world','The ideal society requires trade-offs or sacrifices','A newcomer or dissident exposes what residents take for granted','Characters discuss and defend the principles underlying their society','Personal wants test the limits of social engineering','The utopia implicitly critiques the reader\'s own world'],
    WESTERN: ['The edge of civilization tests character','Order cannot be taken for granted','Fighting carries real cost','Independence is valued above all','Geography molds the people who inhabit it','Settlement and wildness are in opposition'],
    WUXIA: ['The martial underworld operates by its own laws outside official society','A chivalric code: protect the weak, right wrongs, maintain integrity','Power comes from disciplined internal training, not external magic','Knowledge passes through lineage relationships that carry obligations','Martial sects function as political factions with rivalries and hierarchies','Grudges between individuals and sects drive multi-generational conflicts'],
  };

  var GENRE_OBLIGATIONS_GLOSSES = {
    ABSURDIST: ['A character follows a reasonable chain of thought to a nonsensical result','A system of rules traps the protagonist in circular procedure','An act of significance is rendered pointless by circumstance','The protagonist faces the void and receives no answer','Characters speak to each other but comprehend nothing','A sudden, inexplicable change is treated as unremarkable'],
    ADVENTURE: ['An external summons or discovery launches the journey','The protagonist leaves the known world behind','A companion proves loyalty or is recruited through trial','The protagonist endures a defining physical or mental test','The prize is won but at meaningful expense','The protagonist comes back changed by the journey'],
    ALTERNATE_HISTORY: ['A scene shows a concrete result of the historical change','A known person appears in their altered role','An event echoes what actually happened, with meaningful difference','A detail of daily life reveals how different this world became','The altered history produces a political or social clash','Events reach a moment where the alternate history becomes permanently fixed'],
    COMING_OF_AGE: ['The protagonist leaves or is expelled from their sheltered environment','A figure embodies what the protagonist might become','A belief the protagonist held is shattered by experience','The protagonist\'s emerging identity conflicts with expectations of family or society','The protagonist must choose who they are becoming','Understanding comes at a cost: innocence, a relationship, or a dream'],
    COSMIC_HORROR: ['The protagonist learns something they shouldn\'t','The rules of the world visibly break down','The protagonist grasps the scale of what they face','Direct contact with the unknowable damages the mind','Understanding cannot be unlearned','The final revelation makes things worse, not better'],
    CULTIVATION: ['The protagonist advances through a defined power level through tribulation or insight','The universe itself tests the protagonist\'s worthiness to advance','Competition between cultivators or sects provides structure','A powerful legacy from a long-dead cultivator is found','The protagonist moves to a higher realm with stronger beings','A philosophical or spiritual insight unlocks power'],
    CYBERPUNK: ['The protagonist sees how the system extracts from the powerless','Technology is used to breach a defended space','Augmentation happens under duress or necessity','An institution the protagonist relied on turns hostile','Information is stolen or weaponized in a key scene','The protagonist wins but the system absorbs the damage'],
    DARK_COMEDY: ['A character does something terrible and it is funny','One bad decision cascades into compounding disasters','A respected figure or institution is revealed as fraudulent','A character becomes complicit by failing to act','The most transgressive moment produces the biggest laugh','The ending resolves things but in a way that mocks resolution'],
    DRAMA: ['A meaningful bond breaks under pressure','A character is forced to face an uncomfortable reality','A character reveals what they have been hiding','A character must give something up to gain something else','Something long unsaid is finally spoken','The climax delivers emotional payoff built over the full arc'],
    DYSTOPIAN: ['The system\'s power is shown in action against someone','A moment of defiance ignites broader opposition','The protagonist sees the system\'s willingness to destroy','Trust within the opposition collapses','The protagonist learns what the system hides','Surviving within the system demands moral cost'],
    EROTICA: ['A character becomes aware of a specific, consuming want','A limit\u2014physical, emotional, or social\u2014is approached and negotiated','Physical encounters intensify in vulnerability or stakes','Something only imagined is acted upon for the first time','Yielding to desire produces a meaningful change in circumstances','A character confronts what their desires reveal about themselves'],
    ESPIONAGE: ['The assignment has layers the protagonist doesn\'t see','The false self is nearly exposed','Someone is working for the other side','A procedural operation goes wrong or must be improvised','A key relationship is revealed as compromised','The authority figure acts against the protagonist\'s interest or gives themselves up'],
    FABLE: ['The protagonist faces a clear ethical choice','A figure embodies wisdom and offers direction','A character\'s flaw produces visible consequences','Circumstance flips for a character based on their virtue or vice','Wrongdoing receives its consequence','The story\'s moral is demonstrated by what happens, not stated'],
    FANTASY: ['A character pushes against the limits of what magic allows','A powerful object or gift is the focus of a quest','The protagonist faces a test with symbolic or supernatural weight','Magic or power demands something in exchange','A moment of awe carries a price','A foretold event comes true or is deliberately broken'],
    GOTHIC: ['The primary location is established as oppressive and laden with history','A hidden truth about lineage or legacy is revealed','A mirror, double, or uncanny reflection appears','A character violates natural or moral law','Physical deterioration of setting reflects a character\'s inner state','The resolution carries an air of inescapability'],
    GRIMDARK: ['A system inflicts cruelty as standard procedure','A character abandons a moral stance to survive','A companion is sacrificed for tactical advantage','Authority is gained through violence or manipulation','The best outcome still costs dearly','Living trumps doing the right thing'],
    HEIST: ['Recruitment of specialists with distinct, complementary skills','The scheme is presented with sufficient detail to create investment','The plan goes into motion and something goes wrong','The protagonists had a deeper plan than what was shown','Someone has a hidden agenda or is outmaneuvered','The final reveal reframes earlier events'],
    HISTORICAL: ['The era\'s specific constraints are shown bearing on characters','A character\'s desires clash with historical norms','A real or analogous historical event intersects the plot','Class or rank is challenged or enforced','A character wanting what the era forbids faces consequences','Past actions or ancestry shape present outcomes'],
    HORROR: ['The antagonist or danger appears for the first time','A moment of relief is violently interrupted','The protagonist is cut off from help','A companion falls victim to the danger','The true nature or scale of the threat becomes clear','The climax demands a price for survival'],
    ISEKAI: ['The protagonist is torn from their ordinary existence','The mechanics or laws of the new reality are revealed','Knowledge from the old world solves a problem others cannot','Who the protagonist was no longer fits who they must become','The protagonist gains something worth protecting in this world','Returning to the old world becomes impossible or undesirable'],
    KAIJU: ['The monster appears or arrives with overwhelming visual impact','Buildings, vehicles, or systems are destroyed at massive scale','Military or scientific countermeasures fail against the creature','Ordinary people experience the devastation at ground level','Something about the monster\'s origin, motivation, or biology is discovered','A human choice with enormous cost addresses the creature-level threat'],
    LITRPG: ['The protagonist\'s stats, skills, or level are displayed','The protagonist gains measurable power through the system','The protagonist discovers and uses a mechanical advantage others missed','A major combat tests the protagonist\'s build and strategy','A significant item or ability is obtained after a challenge','A rule or restriction of the game system produces a genuine threat'],
    LITERARY: ['A small event fractures the protagonist\'s routine','A scene focuses on internal experience over external action','A recurring image or pattern achieves its fullest meaning','A familiar bond is seen from a new angle','The protagonist reaches or fails to reach understanding','The ending resonates thematically without resolving cleanly'],
    MAGICAL_REALISM: ['Magic appears and no one is surprised','A figure or event from folklore enters the narrative','A shared practice or memory carries weight','Social truth is revealed via supernatural means','Feelings take precedence over physical plausibility','The ending carries gentle astonishment rather than spectacle'],
    MILITARY: ['A battle or firefight produces casualties or lasting effects','A character follows a command they believe is wrong','Combat or crisis strains the relationship between soldiers','Personal life or civilian reality pierces the military bubble','A strategic decision requires accepting harm to some for the benefit of others','The accumulated stress of combat produces visible behavioral change'],
    MYSTERY: ['The central question or crime is established','A misleading clue or suspect diverts attention','The detective presses someone who knows something','An earlier detail is revealed to mean something different','The investigator assembles the full picture','The guilty party is identified and confronted'],
    MYTHIC: ['A supernatural or fateful summons launches the quest','A figure blocks passage to the next stage','The hero enters a place of trial and suffering','The guide falls away, forcing independence','The quest\'s prize is obtained through sacrifice','The hero comes back fundamentally changed'],
    NOIR: ['The protagonist\'s weakness is turned against them','The network of complicity becomes visible','Someone the protagonist relied on proves false','The protagonist does something they cannot undo','A way out appears and is taken away','The ending delivers truth without comfort'],
    PARANORMAL: ['A supernatural being or event intrudes on ordinary life','The protagonist learns how the supernatural community operates','Tension between human and supernatural groups surfaces','Human and supernatural characters establish or contest boundaries','A mortal takes a definitive side in supernatural affairs','The secret of supernatural existence is nearly exposed or deliberately protected'],
    PICARESQUE: ['The protagonist arrives in an unfamiliar social world','The protagonist clashes with authority or convention','A social class or institution is shown as corrupt or absurd','The protagonist uses cleverness to escape or prevail','A powerful figure is deceived or manipulated','The protagonist moves on, unchanged, to the next episode'],
    POST_APOCALYPTIC: ['The new reality\'s constraints are shown','People clash over scarce necessities','A place of safety is compromised','A relic or memory of the previous civilization surfaces','Group bonds strain under survival pressure','A character must choose between self-interest and compassion'],
    ROMANCE: ['The lovers first feel mutual pull','Emotional or physical closeness increases','Both lovers reveal something hidden','The obstacle between them reaches maximum intensity','A character risks everything to declare their feelings','The final decision about the relationship is made'],
    SATIRE: ['The institution or social structure is introduced','The system\'s logic produces increasingly ridiculous outcomes','A sincere character highlights the system\'s dysfunction','A gap between professed values and actual behavior is revealed','Following the rules to their conclusion produces absurdity','The ending comments on the system without reforming it'],
    SCI_FI: ['The core "what if" is shown in action','The premise creates unforeseen problems','The protagonist confronts something at a vastly different magnitude','Moral questions arise from the speculative premise','The technology or idea produces chain reactions','The story\'s central idea reaches its fullest expression'],
    SLICE_OF_LIFE: ['Two characters share an understated moment of understanding','A small change in routine produces gentle ripple effects','The progression of time is noted through natural or cultural markers','A low-stakes disagreement is settled by understanding rather than force','A character pauses to appreciate something commonplace','Something familiar ends or shifts, and the character lets it go'],
    SPACE_OPERA: ['An existential threat to multiple civilizations','Factions that distrust each other cooperate against the greater threat','A large-scale engagement determines the trajectory of events','An individual choice with cosmic consequences','A climactic face-to-face encounter between protagonist and antagonist in a seat of power','Resolution affirms that individual courage matters at any scale'],
    STEAMPUNK: ['A new machine or device is demonstrated for the first time','A character confronts the limits of their social station','Complex machinery produces a visually dramatic scene','The reach of empire affects the protagonist directly','A machine fails in a way that drives the plot forward','Individual craft clashes with mass production or institutional control'],
    SURREAL: ['The world shifts away from the familiar','Events follow emotional rather than causal order','The protagonist\'s sense of self or reality wavers','Unrelated elements collide to produce meaning','Something ordinary becomes profoundly strange','A visual or sensory moment conveys the story\'s deepest point'],
    SURVIVAL: ['A critical supply runs out or becomes dangerously low','Weather, terrain, or wildlife presents an immediate physical threat','The protagonist creates a solution from available materials','The body fails or nearly fails under the demands of survival','Limited resources force a decision about who benefits','The protagonist either finds help or commits to saving themselves'],
    THRILLER: ['Danger is present from the outset','A deadline creates urgency','The antagonist gains advantage','The protagonist is trapped or powerless','An apparent resolution proves premature','The climax turns on a final unexpected shift'],
    TRAGEDY: ['The fatal flaw is established through concrete action','The protagonist\'s position, capability, or worth is shown before the fall','Each escalation flows from the protagonist\'s nature, not external machinations','The protagonist crosses an irreversible threshold through their own choices','A sudden reversal of fortune caused by the protagonist\'s own actions','The protagonist sees, too late, the truth of their situation and their role in causing it'],
    TRANSGRESSIVE: ['A character crosses a social boundary and the narrative does not condemn them','A character\'s respectable surface is stripped away','The protagonist participates in an activity outside mainstream acceptance','A scene of indulgence or self-destruction is rendered in unflinching detail','A character uses destruction to communicate what words cannot','The protagonist\'s sense of self breaks down under accumulated transgression'],
    UTOPIAN: ['A specific mechanism of the ideal society is shown functioning','The utopia is explained to someone encountering it for the first time','A sacrifice or limitation required by the perfect system becomes visible','Someone within or arriving from outside questions the ideal','A character articulates why the system works and must be preserved','An emergency or edge case challenges the society\'s foundational rules'],
    WESTERN: ['A character must choose between competing moral codes','The protagonist faces the question of righteous force','Tension builds toward an inevitable confrontation','The physical environment tests the protagonist\'s endurance','Principle clashes with self-preservation','The climax centers on a direct confrontation'],
    WUXIA: ['The protagonist achieves a martial advancement through discipline','Following xia principles conflicts with survival or personal desire','Martial prowess is tested publicly against other practitioners','The protagonist must honor a debt to their teacher or school','Justice must be pursued through the martial community\'s own mechanisms','A specific martial technique or manual becomes a contested prize'],
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
