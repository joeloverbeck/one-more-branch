/**
 * Builds a consistent tone block for injection into prompts.
 * When keywords are not yet available (e.g., structure generator hasn't run),
 * falls back to just the tone string.
 */
export function buildToneBlock(
  tone: string,
  toneKeywords?: readonly string[],
  toneAntiKeywords?: readonly string[]
): string {
  const lines: string[] = ['TONE/GENRE IDENTITY:'];
  lines.push(`Tone: ${tone}`);

  if (toneKeywords && toneKeywords.length > 0) {
    lines.push(`Target feel: ${toneKeywords.join(', ')}`);
  }

  if (toneAntiKeywords && toneAntiKeywords.length > 0) {
    lines.push(`Avoid: ${toneAntiKeywords.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Builds a tone reminder for bookending user prompts.
 * Placed just before the final instruction line to exploit recency attention.
 */
export function buildToneReminder(
  tone: string,
  toneKeywords?: readonly string[],
  toneAntiKeywords?: readonly string[]
): string {
  let reminder = `TONE REMINDER: All output must fit the tone: ${tone}.`;

  if (toneKeywords && toneKeywords.length > 0) {
    reminder += ` Target feel: ${toneKeywords.join(', ')}.`;
  }

  if (toneAntiKeywords && toneAntiKeywords.length > 0) {
    reminder += ` Avoid: ${toneAntiKeywords.join(', ')}.`;
  }

  return reminder;
}
