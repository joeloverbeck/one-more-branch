# Fallback Output Format Instructions

This text is **appended to the system prompt** when the LLM model does not support structured outputs (JSON schema).
It teaches the LLM the expected text format using section markers.

**Note**: When structured output IS supported, this is NOT included - the JSON schema descriptions handle format guidance instead.

---

OUTPUT FORMAT:
Always structure your response as follows:

NARRATIVE:
[Your narrative text here - describe the scene, action, dialogue, and outcomes]

CHOICES:
1. [First meaningful choice]
2. [Second meaningful choice]
3. [Third meaningful choice]

STATE_CHANGES:
- [Any significant event that occurred]
- [Any item gained or lost]
- [Any relationship change]

CANON_FACTS:
- [Any new world facts introduced]
- [Any new characters introduced]

If this is an ENDING (character death, story conclusion, etc.), omit the CHOICES section and instead write:

THE END
[Brief epilogue or closing statement]

For the opening/first page, also include:

STORY_ARC:
[The main goal or conflict driving this adventure]

---

## Example Non-Ending Response

```
NARRATIVE:
You step cautiously into the dark cave. The air is cold and damp, carrying the faint scent of moss and something metallic. Your footsteps echo softly against the stone walls. A faint light glimmers in the distance, dancing like a will-o'-wisp deeper within the cavern.

CHOICES:
1. Move toward the mysterious light
2. Feel along the wall for another path
3. Call out to see if anyone responds
4. Turn back - this feels too dangerous

STATE_CHANGES:
- Entered the mysterious cave system
- Growing feeling of unease

CANON_FACTS:
- The cave system extends deep beneath the mountain
- Strange lights have been reported by local villagers
```

## Example Ending Response

```
NARRATIVE:
The dragon's fire engulfs you in a roaring inferno. In your final moments, as the flames consume everything, you see a vision of your village at peace - the people you saved, the evil you vanquished before this final battle. Your sacrifice was not in vain.

THE END
Though you fell in battle against the ancient wyrm, your legend lives on. Songs are sung of the hero who dared challenge the dragon, and your name becomes a rallying cry for future generations of adventurers.

STATE_CHANGES:
- Hero died fighting the dragon
- The dragon was weakened by the battle
```

## Example Opening Response (with Story Arc)

```
NARRATIVE:
You awaken in a strange land with no memory of how you arrived here. The sky above burns with unfamiliar constellations, and the grass beneath your fingers feels wrong somehow - too soft, too alive. In the distance, a city of impossible architecture rises against the horizon, its spires twisting in ways that hurt your eyes.

CHOICES:
1. Head toward the strange city
2. Search your belongings for clues
3. Wait and observe your surroundings
4. Call out for help

STATE_CHANGES:
- Arrived in unknown realm
- Memory is fragmented

CANON_FACTS:
- The realm of Valdris exists beyond mortal understanding
- The sky holds two moons and alien stars

STORY_ARC:
Discover the truth behind your mysterious arrival and find a way back home
```
