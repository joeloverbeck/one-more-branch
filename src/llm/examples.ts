import type { ChatMessage } from './types.js';

/**
 * Opening example: A wizard apprentice discovering a forbidden journal
 * Demonstrates proper story opening with hook, atmosphere, and meaningful choices
 */
const OPENING_EXAMPLE_USER = `Create the opening scene for a new interactive story.

CHARACTER CONCEPT:
A curious wizard apprentice named Lyra who seeks forbidden knowledge

WORLDBUILDING:
A magical academy floating in the clouds where students learn elemental magic

TONE/GENRE: whimsical fantasy with dark undertones

Write an engaging opening that:
1. Introduces the protagonist in a compelling scene.
2. Establishes the world and atmosphere matching the tone.
3. Presents an initial situation or hook that draws the player in.
4. Provides 2-4 meaningful choices for what the protagonist might do.

Also determine the overarching goal or conflict for this story (the story arc).`;

const OPENING_EXAMPLE_RESPONSE = JSON.stringify(
  {
    narrative:
      'The morning bell echoes through the floating spires of Celestria Academy, its chime carrying on winds that should not exist this high above the world. You are Lyra, a third-year apprentice with a reputation for asking questions better left unasked.\n\nYou sit in the back row of Professor Grimwald\'s Advanced Transmutation lecture, but your attention keeps drifting to the leather-bound journal hidden in your lap. Three weeks ago, you found it wedged behind a loose stone in the library—and since then, sleep has become a stranger. The journal speaks of a place beneath the academy, a library older than the institution itself, filled with knowledge the founders deemed too dangerous for students.\n\nGrimwald\'s droning voice fades as you trace the strange symbol on the journal\'s cover. A shiver runs down your spine. The book feels warm against your fingers, almost alive.\n\n"Miss Lyra!" Grimwald\'s voice cracks like thunder. "Perhaps you\'d like to share with the class what\'s so fascinating?"\n\nEvery head turns. Your roommate Elena shoots you a worried glance from two rows ahead.',
    choices: [
      'Hide the journal and apologize, claiming you were taking notes',
      'Show Grimwald the journal and ask if he knows anything about the forbidden library',
      'Use a minor illusion spell to make the journal appear to be your textbook',
      'Excuse yourself claiming sudden illness and slip away to investigate',
    ],
    stateChanges: [
      'Discovered a mysterious journal about the forbidden library',
      'Drew unwanted attention from Professor Grimwald',
    ],
    canonFacts: [
      'Celestria Academy floats among the clouds on enchanted foundations',
      'Professor Grimwald teaches Advanced Transmutation',
      "Elena is Lyra's roommate",
      'A forbidden library exists beneath the academy',
    ],
    isEnding: false,
    storyArc:
      'Uncover the secrets of the forbidden library beneath Celestria Academy and discover why its knowledge was sealed away',
  },
  null,
  2,
);

/**
 * Continuation example: Exploring a restricted area with tension
 * Demonstrates proper consequence-showing, consistency, and divergent choices
 */
const CONTINUATION_EXAMPLE_USER = `Continue the interactive story based on the player's choice.

CHARACTER CONCEPT:
A curious wizard apprentice named Lyra who seeks forbidden knowledge

WORLDBUILDING:
A magical academy floating in the clouds where students learn elemental magic

TONE/GENRE: whimsical fantasy with dark undertones

STORY ARC:
Uncover the secrets of the forbidden library beneath Celestria Academy

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
4. Present 2-4 new meaningful choices (unless this leads to an ending).`;

const CONTINUATION_EXAMPLE_RESPONSE = JSON.stringify(
  {
    narrative:
      "Your footsteps echo too loudly against the marble as you descend toward the east wing. Each step feels like a confession, a declaration of intent that anyone passing might hear and question.\n\nThe east wing greets you with silence and dust motes dancing in shafts of pale light. Unlike the bustling corridors of the main academy, these halls feel forgotten, preserved in amber. Portraits of long-dead magisters line the walls, their painted eyes seeming to track your progress.\n\nYou find the statue of Archmagus Caelan at the end of the corridor—a stern figure in flowing robes, one hand raised as if casting a spell frozen in time. The journal described a hidden mechanism, something about pressing the third rune on his staff.\n\nAs you approach, the journal grows almost hot against your chest. Then you hear it—footsteps. Not echoing from the direction you came, but from a side passage. Someone else is here, in the restricted wing.\n\nYou press yourself against the wall beside the statue, heart hammering. Through the shadows, you catch a glimpse of robes. Not student robes—the deep purple of a senior faculty member. They haven't seen you yet, but they're moving in your direction.\n\nThe mechanism is right there. You could try to activate it now and hope the passage opens quickly enough to hide you. Or you could wait, watch, see who else has business in this forbidden place.",
    choices: [
      "Quickly press the third rune and hope the passage opens before you're discovered",
      'Hide behind the statue and wait to see who the faculty member is',
      "Step out and pretend you're lost, claiming you took a wrong turn",
      'Use an illusion to make yourself appear invisible and observe',
    ],
    stateChanges: [
      'Entered the restricted east wing',
      'Located the statue of Archmagus Caelan',
      'Detected approaching faculty member',
    ],
    canonFacts: [
      'The east wing houses portraits of ancient magisters',
      "Archmagus Caelan's statue has a staff with runes",
    ],
    isEnding: false,
    storyArc: '',
  },
  null,
  2,
);

/**
 * Ending example: A victorious conclusion with closure
 * Demonstrates proper ending with empty choices and meaningful resolution
 */
const ENDING_EXAMPLE_USER = `Continue the interactive story based on the player's choice.

CHARACTER CONCEPT:
A curious wizard apprentice named Lyra who seeks forbidden knowledge

WORLDBUILDING:
A magical academy floating in the clouds where students learn elemental magic

TONE/GENRE: whimsical fantasy with dark undertones

STORY ARC:
Uncover the secrets of the forbidden library beneath Celestria Academy

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
4. Present 2-4 new meaningful choices (unless this leads to an ending).`;

const ENDING_EXAMPLE_RESPONSE = JSON.stringify(
  {
    narrative:
      'With trembling hands, you close the Codex of Unmaking and speak the words of binding. The ritual you learned from decoding the journal—the one its previous owner died protecting—wraps around the book like chains of light.\n\nThe hungry void within the pages screams, a sound that exists only in your mind, but you hold firm. You are Lyra, curious and stubborn and utterly unwilling to let ancient darkness win. The light grows brighter, the chains tighter, until finally the Codex falls silent.\n\nYou stand alone in the heart of the forbidden library, surrounded by floating tomes that no longer seem threatening. The knowledge here isn\'t dangerous—only the Codex was. And now it sleeps, bound by magic both ancient and new.\n\nWhen you emerge from the east wing three hours later, covered in dust and exhaustion, you find Professor Grimwald waiting. But the suspicion in his eyes has been replaced by something else—respect, perhaps, or recognition.\n\n"I wondered when someone would find their way down there," he says quietly. "I\'ve been waiting thirty years for a student brave enough—and clever enough—to do what needed to be done."\n\nHe extends his hand. In his palm rests a silver pin—the mark of the Academy\'s secret order of librarians.\n\n"Welcome, Miss Lyra. Your real education begins now."',
    choices: [],
    stateChanges: [
      'Successfully bound the Codex of Unmaking',
      "Earned Professor Grimwald's respect",
      "Inducted into the Academy's secret order of librarians",
    ],
    canonFacts: [
      'The Codex of Unmaking can be bound by those who know the ritual',
      "A secret order of librarians protects the forbidden library's true contents",
    ],
    isEnding: true,
    storyArc: '',
  },
  null,
  2,
);

/**
 * Builds few-shot example messages for the specified context type and mode.
 *
 * @param type - 'opening' for story beginnings, 'continuation' for ongoing stories
 * @param mode - 'minimal' returns 1 example, 'standard' returns 2-3 examples
 * @returns Array of ChatMessage pairs (user + assistant) to inject before the actual prompt
 */
export function buildFewShotMessages(
  type: 'opening' | 'continuation',
  mode: 'minimal' | 'standard',
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (type === 'opening') {
    // Opening always includes the opening example
    messages.push(
      { role: 'user', content: OPENING_EXAMPLE_USER },
      { role: 'assistant', content: OPENING_EXAMPLE_RESPONSE },
    );
  } else {
    // Continuation includes continuation example
    messages.push(
      { role: 'user', content: CONTINUATION_EXAMPLE_USER },
      { role: 'assistant', content: CONTINUATION_EXAMPLE_RESPONSE },
    );

    // Standard mode also includes ending example to show proper endings
    if (mode === 'standard') {
      messages.push(
        { role: 'user', content: ENDING_EXAMPLE_USER },
        { role: 'assistant', content: ENDING_EXAMPLE_RESPONSE },
      );
    }
  }

  return messages;
}
