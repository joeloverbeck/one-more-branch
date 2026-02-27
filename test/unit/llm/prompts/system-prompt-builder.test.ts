import { composeCreativeSystemPrompt } from '@/llm/prompts/system-prompt-builder';

describe('composeCreativeSystemPrompt', () => {
  it('includes genre conventions block when genreFrame is provided', () => {
    const result = composeCreativeSystemPrompt({
      tone: 'noir',
      genreFrame: 'NOIR',
    });

    expect(result).toContain('GENRE CONVENTIONS');
    expect(result).toContain('NOIR');
  });

  it('omits genre conventions block when genreFrame is undefined', () => {
    const result = composeCreativeSystemPrompt({
      tone: 'noir',
    });

    expect(result).not.toContain('GENRE CONVENTIONS');
  });

  it('omits genre conventions block when toneParams is undefined', () => {
    const result = composeCreativeSystemPrompt();

    expect(result).not.toContain('GENRE CONVENTIONS');
  });

  it('places conventions after tone directive', () => {
    const result = composeCreativeSystemPrompt({
      tone: 'noir',
      genreFrame: 'NOIR',
    });

    const toneIndex = result.indexOf('TONE DIRECTIVE:');
    const conventionsIndex = result.indexOf('GENRE CONVENTIONS');
    expect(toneIndex).toBeGreaterThan(-1);
    expect(conventionsIndex).toBeGreaterThan(toneIndex);
  });
});
