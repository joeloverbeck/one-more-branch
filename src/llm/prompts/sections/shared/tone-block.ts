/**
 * Builds a single tone directive for system-message injection.
 * Replaces the former buildToneBlock + buildToneReminder pair.
 * Tone goes in the system message ONLY — the analyst's toneDriftDescription
 * provides the feedback loop if the writer drifts.
 */
export function buildToneDirective(
  tone: string,
  toneFeel?: readonly string[],
  toneAvoid?: readonly string[]
): string {
  const lines: string[] = ['TONE DIRECTIVE:'];
  lines.push(`Genre/tone: ${tone}`);

  if (toneFeel && toneFeel.length > 0) {
    lines.push(`Atmospheric feel (evoke these qualities): ${toneFeel.join(', ')}`);
  }

  if (toneAvoid && toneAvoid.length > 0) {
    lines.push(`Anti-patterns (never drift toward): ${toneAvoid.join(', ')}`);
  }

  lines.push('Every scene, description, and dialogue beat must be filtered through this tonal lens.');
  return lines.join('\n');
}

/**
 * @deprecated Use buildToneDirective instead. Kept temporarily for backward compat during migration.
 */
export const buildToneBlock = buildToneDirective;

/**
 * @deprecated Tone reminders are no longer used. Tone is set once in system message.
 * Kept temporarily so callers that still reference it compile.
 */
export function buildToneReminder(
  tone: string,
  _toneFeel?: readonly string[],
  _toneAvoid?: readonly string[]
): string {
  return `TONE REMINDER: All output must fit the tone: ${tone}.`;
}
