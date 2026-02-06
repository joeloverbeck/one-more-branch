# Complete Ending Response Example

This shows what a story ending looks like when generated.

## Context

The player made a choice that leads to character death or story conclusion.

---

## Expected Response (Death Ending)

```json
{
  "narrative": "You step through the final doorway into the heart of the forbidden library. The room pulses with an otherworldly light, ancient tomes floating in lazy circles around a central pedestal. Upon it rests the Codex of Unmaking—the book you've sought since finding that first journal.\n\nBut as your fingers brush the leather binding, you understand too late why it was forbidden. The book doesn't contain knowledge—it contains hunger. A void opens in your mind, vast and cold and infinitely patient.\n\nThe last thing you see is your own reflection in the polished obsidian pedestal, your eyes already turning to bottomless black. The last thing you feel is the curious sensation of being unwritten, letter by letter, word by word, until nothing remains of the curious apprentice named Lyra but a cautionary tale whispered in the halls of Celestria Academy.\n\nThe library claims another seeker. The Codex waits for the next.\n\nIn the dormitory above, Elena wakes from a nightmare she cannot remember, tears streaming down her face. She reaches for her roommate's bed, finds it cold and somehow wrong—as if no one has ever slept there at all.",
  "choices": [],
  "stateChanges": [
    "Lyra was consumed by the Codex of Unmaking",
    "All memory of Lyra began to fade from the world"
  ],
  "canonFacts": [
    "The Codex of Unmaking erases those who touch it from existence",
    "The forbidden library claims seekers who reach its heart"
  ],
  "isEnding": true,
  "storyArc": ""
}
```

---

## Expected Response (Victory Ending)

```json
{
  "narrative": "With trembling hands, you close the Codex of Unmaking and speak the words of binding. The ritual you learned from decoding the journal—the one its previous owner died protecting—wraps around the book like chains of light.\n\nThe hungry void within the pages screams, a sound that exists only in your mind, but you hold firm. You are Lyra, curious and stubborn and utterly unwilling to let ancient darkness win. The light grows brighter, the chains tighter, until finally the Codex falls silent.\n\nYou stand alone in the heart of the forbidden library, surrounded by floating tomes that no longer seem threatening. The knowledge here isn't dangerous—only the Codex was. And now it sleeps, bound by magic both ancient and new.\n\nWhen you emerge from the east wing three hours later, covered in dust and exhaustion, you find Professor Grimwald waiting. But the suspicion in his eyes has been replaced by something else—respect, perhaps, or recognition.\n\n\"I wondered when someone would find their way down there,\" he says quietly. \"I've been waiting thirty years for a student brave enough—and clever enough—to do what needed to be done.\"\n\nHe extends his hand. In his palm rests a silver pin—the mark of the Academy's secret order of librarians.\n\n\"Welcome, Miss Lyra. Your real education begins now.\"",
  "choices": [],
  "stateChanges": [
    "You successfully bound the Codex of Unmaking",
    "You earned Professor Grimwald's respect",
    "You were inducted into the Academy's secret order of librarians"
  ],
  "canonFacts": [
    "The Codex of Unmaking can be bound by those who know the ritual",
    "A secret order of librarians protects the forbidden library's true contents"
  ],
  "isEnding": true,
  "storyArc": ""
}
```

---

## Key Characteristics of Endings

1. **`isEnding: true`** - Signals this is a terminal page
2. **`choices: []`** - Empty array, no further choices
3. **Closure** - Narrative provides satisfying conclusion
4. **Consequence** - Ending reflects the journey and choices made
5. **`storyArc: ""`** - Empty for non-opening pages
