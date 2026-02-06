import {
  buildFallbackSystemPromptAddition,
  parseTextResponse,
} from '../../../src/llm/fallback-parser';
import { LLMError } from '../../../src/llm/types';

describe('parseTextResponse', () => {
  it('should parse well-formatted response with all sections', () => {
    const response = `
NARRATIVE:
You step into the dark cave. The air is cold and damp. A faint light glimmers in the distance.

CHOICES:
1. Move toward the light
2. Feel along the wall for another path
3. Call out to see if anyone responds

STATE_CHANGES:
- Entered the mysterious cave
- Feeling of unease

CANON_FACTS:
- The cave system extends beneath the mountain
`;

    const result = parseTextResponse(response);

    expect(result.narrative).toContain('dark cave');
    expect(result.choices).toEqual([
      'Move toward the light',
      'Feel along the wall for another path',
      'Call out to see if anyone responds',
    ]);
    expect(result.stateChanges).toEqual(['Entered the mysterious cave', 'Feeling of unease']);
    expect(result.canonFacts).toEqual(['The cave system extends beneath the mountain']);
    expect(result.isEnding).toBe(false);
  });

  it('should parse ending response with THE END marker', () => {
    const response = `
NARRATIVE:
The dragon's fire engulfs you. In your final moments, you see your village at peace.

THE END
Your adventure concludes here.

STATE_CHANGES:
- Hero died fighting the dragon
`;

    const result = parseTextResponse(response);

    expect(result.isEnding).toBe(true);
    expect(result.choices).toEqual([]);
    expect(result.stateChanges).toEqual(['Hero died fighting the dragon']);
  });

  it('should parse response with story arc', () => {
    const response = `
NARRATIVE:
You awaken in a strange land with no memory of how you arrived.

CHOICES:
1. Explore the surroundings
2. Wait and observe

STORY_ARC:
Discover the truth behind your mysterious arrival and find a way home
`;

    const result = parseTextResponse(response);

    expect(result.storyArc).toBe(
      'Discover the truth behind your mysterious arrival and find a way home',
    );
  });

  it('should handle response without section markers', () => {
    const response = `
You walk into the tavern. The bartender nods at you warmly.

1. Order a drink
2. Ask about rumors in town
3. Find a quiet corner to rest
`;

    const result = parseTextResponse(response);

    expect(result.narrative).toContain('tavern');
    expect(result.choices).toHaveLength(3);
  });

  it('should throw LLMError for missing choices on non-ending', () => {
    const response = `
NARRATIVE:
The story continues without any choices presented to the player.

STATE_CHANGES:
- Something happened
`;

    try {
      parseTextResponse(response);
      fail('Expected parseTextResponse to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      const llmError = error as LLMError;
      expect(llmError.code).toBe('MISSING_CHOICES');
      expect(llmError.retryable).toBe(true);
    }
  });

  it('should handle empty state changes and canon facts', () => {
    const response = `
NARRATIVE:
You balance on the edge of the ancient bridge.

CHOICES:
1. Cross the bridge
2. Search for another route

STATE_CHANGES:

CANON_FACTS:
`;

    const result = parseTextResponse(response);

    expect(result.stateChanges).toEqual([]);
    expect(result.canonFacts).toEqual([]);
  });

  it('should parse numbered choices (1. format)', () => {
    const response = `
NARRATIVE:
The gate creaks open.

CHOICES:
1. Enter the courtyard
2. Hide in the shadows
`;

    const result = parseTextResponse(response);

    expect(result.choices).toEqual(['Enter the courtyard', 'Hide in the shadows']);
  });

  it('should parse numbered choices (1) format)', () => {
    const response = `
NARRATIVE:
The gate creaks open.

CHOICES:
1) Enter the courtyard
2) Hide in the shadows
`;

    const result = parseTextResponse(response);

    expect(result.choices).toEqual(['Enter the courtyard', 'Hide in the shadows']);
  });

  it('should parse bullet choices (- format)', () => {
    const response = `
NARRATIVE:
You reach a crossroads in the catacombs.

CHOICES:
- Follow the cold draft
- Follow the distant chanting
`;

    const result = parseTextResponse(response);

    expect(result.choices).toEqual(['Follow the cold draft', 'Follow the distant chanting']);
  });

  it('should parse bullet choices (* format)', () => {
    const response = `
NARRATIVE:
You reach a crossroads in the catacombs.

CHOICES:
* Follow the cold draft
* Follow the distant chanting
`;

    const result = parseTextResponse(response);

    expect(result.choices).toEqual(['Follow the cold draft', 'Follow the distant chanting']);
  });

  it('should handle mixed formatting in choices', () => {
    const response = `
NARRATIVE:
A clockwork door rattles in front of you.

CHOICES:
1. Turn the brass key
- Force the gears by hand
* Step back and wait
`;

    const result = parseTextResponse(response);

    expect(result.choices).toEqual([
      'Turn the brass key',
      'Force the gears by hand',
      'Step back and wait',
    ]);
  });

  it('should handle missing section end markers', () => {
    const response = `
NARRATIVE:
The corridor narrows around you.

CHOICES:
1. Squeeze through
2. Turn back

CANON_FACTS:
- The corridor was carved by giant worms
`;

    const result = parseTextResponse(response);

    expect(result.choices).toEqual(['Squeeze through', 'Turn back']);
    expect(result.canonFacts).toEqual(['The corridor was carved by giant worms']);
  });

  it('should extract narrative without explicit NARRATIVE marker', () => {
    const response = `
You stand in the moonlit ruins while the wind rattles broken banners.

CHOICES:
1. Enter the keep
2. Circle the walls
`;

    const result = parseTextResponse(response);

    expect(result.narrative).toContain('moonlit ruins');
    expect(result.choices).toHaveLength(2);
  });

  it('should parse CHARACTER_CANON_FACTS section', () => {
    const response = `
NARRATIVE:
You meet Dr. Cohen in the hallway. He adjusts his glasses and greets you warmly.

CHOICES:
1. Ask about the patient
2. Request a private consultation

STATE_CHANGES:
- Met Dr. Cohen

CANON_FACTS:
- The year is 1972

CHARACTER_CANON_FACTS:
[Dr. Cohen]
- Dr. Cohen is a psychiatrist at Stella Maris
- He wears wire-rimmed glasses

[Margaret]
- Margaret is the intake nurse
`;

    const result = parseTextResponse(response);

    expect(result.characterCanonFacts).toEqual({
      'Dr. Cohen': [
        'Dr. Cohen is a psychiatrist at Stella Maris',
        'He wears wire-rimmed glasses',
      ],
      'Margaret': ['Margaret is the intake nurse'],
    });
  });

  it('should return empty object when CHARACTER_CANON_FACTS section is missing', () => {
    const response = `
NARRATIVE:
A simple scene with no character facts.

CHOICES:
1. Continue
2. Wait
`;

    const result = parseTextResponse(response);

    expect(result.characterCanonFacts).toEqual({});
  });

  it('should handle CHARACTER_CANON_FACTS with single character', () => {
    const response = `
NARRATIVE:
You encounter The Kid again.

CHOICES:
1. Speak to The Kid
2. Ignore the apparition

CHARACTER_CANON_FACTS:
[The Kid]
- The Kid is an eidolon who appears to Alicia
- The Kid speaks with unnerving clarity
`;

    const result = parseTextResponse(response);

    expect(result.characterCanonFacts).toEqual({
      'The Kid': [
        'The Kid is an eidolon who appears to Alicia',
        'The Kid speaks with unnerving clarity',
      ],
    });
  });

  it('should handle CHARACTER_CANON_FACTS with bullet points', () => {
    const response = `
NARRATIVE:
The scene unfolds.

CHOICES:
1. Act
2. Wait

CHARACTER_CANON_FACTS:
[Bobby Western]
* Bobby is in a coma in Italy
* Bobby inherited gold from his grandfather
`;

    const result = parseTextResponse(response);

    expect(result.characterCanonFacts).toEqual({
      'Bobby Western': [
        'Bobby is in a coma in Italy',
        'Bobby inherited gold from his grandfather',
      ],
    });
  });
});

describe('buildFallbackSystemPromptAddition', () => {
  const prompt = buildFallbackSystemPromptAddition();

  it('should include NARRATIVE section instruction', () => {
    expect(prompt).toContain('NARRATIVE:');
  });

  it('should include CHOICES section instruction', () => {
    expect(prompt).toContain('CHOICES:');
  });

  it('should include STATE_CHANGES section instruction', () => {
    expect(prompt).toContain('STATE_CHANGES:');
  });

  it('should include CANON_FACTS section instruction', () => {
    expect(prompt).toContain('CANON_FACTS:');
  });

  it('should include THE END instruction for endings', () => {
    expect(prompt).toContain('THE END');
  });

  it('should include STORY_ARC instruction', () => {
    expect(prompt).toContain('STORY_ARC:');
  });

  it('should include CHARACTER_CANON_FACTS section instruction', () => {
    expect(prompt).toContain('CHARACTER_CANON_FACTS:');
  });

  it('should include character name bracket format example', () => {
    expect(prompt).toContain('[Character Name]');
  });
});
