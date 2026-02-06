import {
  extractOutputFromCoT,
  extractThinkingSection,
  hasCoTFormatting,
} from '../../../src/llm/cot-parser';

describe('extractOutputFromCoT', () => {
  it('should extract content from <output> tags', () => {
    const response = `<thinking>
Let me think about this...
I should create an engaging narrative.
</thinking>
<output>{"narrative": "The story begins...", "choices": ["A", "B"]}</output>`;

    const result = extractOutputFromCoT(response);

    expect(result).toBe('{"narrative": "The story begins...", "choices": ["A", "B"]}');
  });

  it('should extract from output tags with varying whitespace', () => {
    const response = `<thinking>Some reasoning</thinking>

<output>
  {"key": "value"}
</output>`;

    const result = extractOutputFromCoT(response);

    expect(result).toBe('{"key": "value"}');
  });

  it('should handle response without output tags by removing thinking', () => {
    const response = `<thinking>My reasoning here</thinking>
{"narrative": "Direct JSON", "choices": []}`;

    const result = extractOutputFromCoT(response);

    expect(result).toBe('{"narrative": "Direct JSON", "choices": []}');
  });

  it('should return original response when no CoT tags present', () => {
    const response = '{"narrative": "Plain JSON", "choices": ["X", "Y"]}';

    const result = extractOutputFromCoT(response);

    expect(result).toBe(response);
  });

  it('should handle multiple thinking sections', () => {
    const response = `<thinking>First thought</thinking>
<thinking>Second thought</thinking>
{"result": "data"}`;

    const result = extractOutputFromCoT(response);

    expect(result).toBe('{"result": "data"}');
  });

  it('should handle case-insensitive tags', () => {
    const response = `<THINKING>Reasoning</THINKING>
<OUTPUT>{"data": "value"}</OUTPUT>`;

    const result = extractOutputFromCoT(response);

    expect(result).toBe('{"data": "value"}');
  });

  it('should handle empty thinking sections', () => {
    const response = '<thinking></thinking><output>{"test": true}</output>';

    const result = extractOutputFromCoT(response);

    expect(result).toBe('{"test": true}');
  });
});

describe('extractThinkingSection', () => {
  it('should extract thinking content', () => {
    const response = `<thinking>
I need to consider the character's motivation.
Let me plan the choices carefully.
</thinking>
<output>{"narrative": "Story"}</output>`;

    const result = extractThinkingSection(response);

    expect(result).toContain("character's motivation");
    expect(result).toContain('plan the choices');
  });

  it('should return null when no thinking tags present', () => {
    const response = '{"narrative": "Direct response"}';

    const result = extractThinkingSection(response);

    expect(result).toBeNull();
  });

  it('should join multiple thinking sections', () => {
    const response = `<thinking>First thought</thinking>
Some text
<thinking>Second thought</thinking>`;

    const result = extractThinkingSection(response);

    expect(result).toContain('First thought');
    expect(result).toContain('Second thought');
  });

  it('should return null for empty thinking tags', () => {
    const response = '<thinking></thinking><output>{"data": 1}</output>';

    const result = extractThinkingSection(response);

    // Empty content after trim results in no meaningful thinking section
    expect(result).toBeNull();
  });
});

describe('hasCoTFormatting', () => {
  it('should return true when output tags present', () => {
    const response = '<output>{"data": 1}</output>';

    expect(hasCoTFormatting(response)).toBe(true);
  });

  it('should return true when thinking tags present', () => {
    const response = '<thinking>Some reasoning</thinking>{"data": 1}';

    expect(hasCoTFormatting(response)).toBe(true);
  });

  it('should return true when both tags present', () => {
    const response = '<thinking>Reasoning</thinking><output>{"data": 1}</output>';

    expect(hasCoTFormatting(response)).toBe(true);
  });

  it('should return false when no CoT tags present', () => {
    const response = '{"narrative": "Plain JSON"}';

    expect(hasCoTFormatting(response)).toBe(false);
  });

  it('should return false for similar but incorrect tags', () => {
    const response = '<thoughts>Not the right tag</thoughts>';

    expect(hasCoTFormatting(response)).toBe(false);
  });
});
