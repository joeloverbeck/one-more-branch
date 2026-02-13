/**
 * Few-shot example data for story generation prompts.
 *
 * This module contains only pure data constants - no logic.
 * Each constant represents a user-assistant pair for few-shot learning.
 */

/**
 * Opening example: A wizard apprentice discovering a forbidden journal
 * Demonstrates proper story opening with hook, atmosphere, and meaningful choices
 */
export const OPENING_EXAMPLE_USER = `Create the opening scene for a new interactive story.

CHARACTER CONCEPT:
A curious wizard apprentice named Lyra who seeks forbidden knowledge

WORLDBUILDING:
A magical academy floating in the clouds where students learn elemental magic

TONE/GENRE: whimsical fantasy with dark undertones

Write an engaging opening that:
1. Introduces the protagonist in a compelling scene.
2. Establishes the world and atmosphere matching the tone.
3. Presents an initial situation or hook that draws the player in.
4. Provides 3 meaningful structured choice objects (4 only when truly warranted).`;

export const OPENING_EXAMPLE_RESPONSE = JSON.stringify(
  {
    narrative:
      "The morning bell sends its chime rippling through the floating spires of Celestria Academy—a resonance pattern you once calculated should be impossible at this altitude, but magic has never cared much for your equations. You are Lyra, third-year apprentice, and you have not slept properly in three weeks.\n\nYou sit in the back row of Professor Grimwald's Advanced Transmutation lecture, but the words washing over you might as well be wind noise. Your attention belongs entirely to the leather-bound journal hidden in your lap. You found it wedged behind a loose stone in the restricted section—the kind of hiding spot that practically begged to be discovered, if you were the sort of person who ran your fingers along every crack in every wall. Which, obviously, you are.\n\nThe journal speaks of a place beneath the academy. A library older than the institution itself. The implications make your pulse quicken every time you think about them: knowledge the founders deemed too dangerous for students, which means knowledge the founders understood, which means someone wrote it down somewhere, which means it can be learned.\n\nYou trace the symbol on the cover—it resembles the Aldermani script from Professor Vex's etymology lectures, but the ligatures are wrong, older somehow. The leather feels warm against your fingers, almost alive. A rational mind would find that alarming. Your rational mind finds it fascinating.\n\n\"Miss Lyra!\" Grimwald's voice hits you like a slap. \"Perhaps you'd like to share with the class what's so fascinating?\"\n\nEvery head turns. Elena—your roommate, your conscience, the only person who can make you feel guilty with just her eyebrows—shoots you a look from two rows ahead that says don't you dare.",
    choices: [
      {
        text: 'Hide the journal and apologize, claiming you were taking notes',
        choiceType: 'TACTICAL_APPROACH',
        primaryDelta: 'EXPOSURE_CHANGE',
      },
      {
        text: 'Use a minor illusion spell to make the journal appear to be your textbook',
        choiceType: 'TACTICAL_APPROACH',
        primaryDelta: 'INFORMATION_REVEALED',
      },
      {
        text: 'Excuse yourself claiming sudden illness and slip away to investigate',
        choiceType: 'AVOIDANCE_RETREAT',
        primaryDelta: 'LOCATION_CHANGE',
      },
    ],
    currentLocation: 'Advanced Transmutation lecture hall, back row',
    threatsAdded: ['Professor Grimwald is watching you closely'],
    threatsRemoved: [],
    constraintsAdded: ['You are in the middle of a lecture'],
    constraintsRemoved: [],
    threadsAdded: [
      {
        text: 'The journal speaks of a library beneath the academy',
        threadType: 'MYSTERY',
        urgency: 'HIGH',
      },
      {
        text: 'Where did this journal come from and who wrote it?',
        threadType: 'MYSTERY',
        urgency: 'MEDIUM',
      },
    ],
    threadsResolved: [],
    newCanonFacts: [
      'Celestria Academy floats among the clouds on enchanted foundations',
      'Professor Grimwald teaches Advanced Transmutation',
      "Elena is Lyra's roommate",
      'A forbidden library exists beneath the academy',
    ],
    newCharacterCanonFacts: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    sceneSummary:
      "Lyra discovers a mysterious journal hidden in the restricted section of Celestria Academy during Professor Grimwald's lecture. The journal describes a forbidden library beneath the academy, and her attempt to study it draws unwanted attention from the professor.",
    isEnding: false,
  },
  null,
  2
);

/**
 * Continuation example: Exploring a restricted area with tension
 * Demonstrates proper consequence-showing, consistency, and divergent choices
 */
export const CONTINUATION_EXAMPLE_USER = `Continue the interactive story based on the player's choice.

CHARACTER CONCEPT:
A curious wizard apprentice named Lyra who seeks forbidden knowledge

WORLDBUILDING:
A magical academy floating in the clouds where students learn elemental magic

TONE/GENRE: whimsical fantasy with dark undertones

=== STORY STRUCTURE ===
Overall Theme: Uncover the forbidden library's secrets and decide who can be trusted with them.
Current Act: The Exile
Current Beat Objective: Escape immediate pursuit and find temporary shelter

ESTABLISHED WORLD FACTS:
- Celestria Academy floats among the clouds on enchanted foundations
- Professor Grimwald teaches Advanced Transmutation
- Elena is Lyra's roommate
- A forbidden library exists beneath the academy

CURRENT STATE:
- Discovered a mysterious journal about the forbidden library
- Drew unwanted attention from Professor Grimwald
- Used illusion magic to hide the journal
- Successfully escaped the lecture hall

PREVIOUS SCENE:
You slip out of the lecture hall, heart pounding as the heavy doors close behind you. The corridor is empty—most students are in class at this hour. Your fingers tremble slightly as you pull out the journal, its leather cover warm to the touch.

According to the notes you've decoded, the entrance to the forbidden library lies behind the statue of Archmagus Caelan in the east wing. But the east wing is restricted to senior students and faculty only.

You glance both ways down the marble corridor. To your left, the stairs lead down toward the east wing. To your right, the path leads to the dormitories where Elena is probably waiting with questions.

PLAYER'S CHOICE: "Head to the east wing and find the statue of Archmagus Caelan"

Continue the story:
1. Show the direct consequences of the player's choice.
2. Advance the narrative naturally from this decision.
3. Maintain consistency with all established facts and the current state.
4. Present 3 new meaningful structured choice objects (4 only when truly warranted), unless this leads to an ending.`;

export const CONTINUATION_EXAMPLE_RESPONSE = JSON.stringify(
  {
    narrative:
      "Your footsteps echo against the marble with every step down toward the east wing, and you find yourself counting them—an anxious habit you picked up during first-year exams and never managed to shake. Fourteen steps. Fifteen. Each one a small, irreversible commitment.\n\nThe east wing greets you with the kind of silence that belongs in tombs. Dust motes drift through shafts of pale light, and the air tastes stale, preserved—like opening a book that hasn't been read in decades. You know that taste. You love that taste. Portraits of long-dead magisters line the walls, and you catch yourself trying to identify them by period: the high collars suggest Second Convocation era, the brushwork is definitely pre-Sundering.\n\nFocus, Lyra.\n\nThe statue of Archmagus Caelan stands at the corridor's end—stern face, flowing robes, one hand raised mid-cast. You've read about him: the architect of the academy's original ward system, brilliant and paranoid in equal measure. Exactly the sort of person who would build a hidden entrance and then leave clues for anyone clever enough to find them. The journal described a mechanism—the third rune on his staff. Your fingers itch.\n\nThen the journal flares warm against your chest, and you hear footsteps. Not from behind you. From a side passage. Someone else is in the restricted wing, and the logical part of your brain—the part that sounds annoyingly like Elena—points out that you have no plausible excuse for being here.\n\nYou press yourself against the wall beside the statue, heart slamming. Through the shadows: robes. Deep purple. Senior faculty. They haven't spotted you yet, but they're heading your way.\n\nThe mechanism is right there, within arm's reach. You could activate it now and pray the passage opens fast enough to swallow you. Or you could wait—watch—find out who else has business in a place that's supposed to be empty.",
    choices: [
      {
        text: "Quickly press the third rune and hope the passage opens before you're discovered",
        choiceType: 'TACTICAL_APPROACH',
        primaryDelta: 'LOCATION_CHANGE',
      },
      {
        text: 'Hide behind the statue and wait to see who the faculty member is',
        choiceType: 'INVESTIGATION',
        primaryDelta: 'INFORMATION_REVEALED',
      },
      {
        text: 'Use an illusion to make yourself appear invisible and observe',
        choiceType: 'TACTICAL_APPROACH',
        primaryDelta: 'EXPOSURE_CHANGE',
      },
    ],
    currentLocation: 'East wing corridor, beside the statue of Archmagus Caelan',
    threatsAdded: ['A senior faculty member is approaching your position'],
    threatsRemoved: [],
    constraintsAdded: ['You are trespassing in the restricted east wing'],
    constraintsRemoved: ['cn-1'],
    threadsAdded: [
      {
        text: 'The third rune on the staff may open a hidden passage',
        threadType: 'QUEST',
        urgency: 'HIGH',
      },
    ],
    threadsResolved: [],
    newCanonFacts: [
      'The east wing houses portraits of ancient magisters',
      "Archmagus Caelan's statue has a staff with runes",
    ],
    newCharacterCanonFacts: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    sceneSummary:
      'Lyra ventures into the restricted east wing and locates the statue of Archmagus Caelan. As she reaches the mechanism described in the journal, approaching faculty footsteps force her to decide between activating the hidden passage immediately or hiding to observe.',
    isEnding: false,
  },
  null,
  2
);

/**
 * Ending example: A victorious conclusion with closure
 * Demonstrates proper ending with empty choices and meaningful resolution
 */
export const ENDING_EXAMPLE_USER = `Continue the interactive story based on the player's choice.

CHARACTER CONCEPT:
A curious wizard apprentice named Lyra who seeks forbidden knowledge

WORLDBUILDING:
A magical academy floating in the clouds where students learn elemental magic

TONE/GENRE: whimsical fantasy with dark undertones

=== STORY STRUCTURE ===
Overall Theme: Uncover the forbidden library's secrets and decide who can be trusted with them.
Current Act: The Broken Seal
Current Beat Objective: End the conspiracy while preserving a future worth protecting

ESTABLISHED WORLD FACTS:
- Celestria Academy floats among the clouds on enchanted foundations
- The Codex of Unmaking lies at the heart of the forbidden library
- The journal contains a binding ritual

CURRENT STATE:
- Reached the heart of the forbidden library
- Decoded the binding ritual from the journal
- Standing before the Codex of Unmaking

PREVIOUS SCENE:
The forbidden library stretches before you, ancient tomes floating in lazy circles around a central pedestal. Upon it rests the Codex of Unmaking—the book you've sought since finding that first journal.

PLAYER'S CHOICE: "Perform the binding ritual to seal the Codex"

Continue the story:
1. Show the direct consequences of the player's choice.
2. Advance the narrative naturally from this decision.
3. Maintain consistency with all established facts and the current state.
4. Present 3 new meaningful structured choice objects (4 only when truly warranted), unless this leads to an ending.`;

export const ENDING_EXAMPLE_RESPONSE = JSON.stringify(
  {
    narrative:
      "Your hands are shaking—you notice this with the detached clarity of someone who has read about adrenaline responses in textbooks but never expected to catalog her own. You close the Codex of Unmaking and speak the words of binding, each syllable pulled from three weeks of obsessive decoding, from a cipher its previous owner died protecting. The ritual wraps around the book like chains of light, and some analytical corner of your mind notes that the luminance pattern matches descriptions of Fourth Era containment magic. Fascinating, really, if you weren't terrified.\n\nThe void within the pages screams—not in your ears but somewhere behind your eyes, in the place where understanding lives. It wants to be read. It wants to be known. And for one awful, honest moment, you want to know it too. That's the most frightening part: not the darkness, but how badly you want to open the cover again.\n\nYou hold firm. You are Lyra, and you have never once in your life stopped asking questions—but you have learned, tonight, that some answers are cages. The light grows brighter. The chains pull tight. The Codex falls silent.\n\nYou stand alone in the heart of the forbidden library, surrounded by floating tomes that drift in lazy, harmless circles. The knowledge here isn't dangerous—only the Codex was. The rest is just... books. Waiting to be read. You'll come back. Obviously you'll come back.\n\nThree hours later, you emerge from the east wing covered in dust, barely upright, running on nothing but stubbornness and the fading afterglow of the most extraordinary night of your life. Professor Grimwald is waiting in the corridor. But the suspicion you remember from his face is gone, replaced by something you've only seen him direct at particularly elegant transmutation proofs—respect.\n\n\"I wondered when someone would find their way down there,\" he says quietly. \"I've been waiting thirty years for a student curious enough—and stubborn enough—to do what needed to be done.\"\n\nHe extends his hand. In his palm: a silver pin, engraved with a symbol you recognize from the journal's cover. The mark of the Academy's secret order of librarians.\n\n\"Welcome, Miss Lyra. Your real education begins now.\"\n\nYour real education. The words land like a key turning in a lock you didn't know existed. You take the pin, and your hands have finally stopped shaking.",
    choices: [],
    currentLocation: 'Academy entrance hall, reunited with Professor Grimwald',
    threatsAdded: [],
    threatsRemoved: ['th-1', 'th-2'],
    constraintsAdded: [],
    constraintsRemoved: ['cn-2'],
    threadsAdded: [],
    threadsResolved: ['td-1', 'td-2'],
    newCanonFacts: [
      'The Codex of Unmaking can be bound by those who know the ritual',
      "A secret order of librarians protects the forbidden library's true contents",
    ],
    newCharacterCanonFacts: [],
    inventoryAdded: [],
    inventoryRemoved: [],
    healthAdded: [],
    healthRemoved: [],
    characterStateChangesAdded: [],
    characterStateChangesRemoved: [],
    sceneSummary:
      "Lyra performs the binding ritual on the Codex of Unmaking, resisting its temptation to be read. She seals the dangerous knowledge and emerges to find Professor Grimwald waiting with respect rather than suspicion, welcoming her into the Academy's secret order of librarians.",
    isEnding: true,
  },
  null,
  2
);
