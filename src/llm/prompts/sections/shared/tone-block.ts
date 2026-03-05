/**
 * Builds a single tone directive for system-message injection.
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

  lines.push(
    'These qualities are mandatory creative constraints. Every concept must centrally embody all of them — not as incidental flavor, but as load-bearing identity.',
  );
  return lines.join('\n');
}
