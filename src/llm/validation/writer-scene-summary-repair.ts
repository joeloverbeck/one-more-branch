const MIN_SCENE_SUMMARY_LENGTH = 20;
const MAX_SCENE_SUMMARY_LENGTH = 300;

const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /^placeholder$/i,
  /^todo$/i,
  /^tbd$/i,
  /^n\/?a$/i,
  /^\.{2,}$/,
  /^-+$/,
  /^_+$/,
  /^x+$/i,
  /^scene\s*summary$/i,
  /^summary$/i,
  /^test$/i,
  /^\[.*\]$/,
];

export interface SceneSummaryRepairResult {
  readonly repairedJson: unknown;
  readonly repaired: boolean;
  readonly repairDetails?: string;
}

function isPlaceholderSummary(sceneSummary: string): boolean {
  const trimmed = sceneSummary.trim();
  if (trimmed.length < MIN_SCENE_SUMMARY_LENGTH) {
    return true;
  }
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function extractSentences(narrative: string): string[] {
  const sentences: string[] = [];
  const pattern = /[^.!?]+[.!?]+/g;
  let match: RegExpExecArray | null = pattern.exec(narrative);
  while (match !== null) {
    const sentence = match[0].trim();
    if (sentence.length >= 5) {
      sentences.push(sentence);
    }
    match = pattern.exec(narrative);
  }
  return sentences;
}

function buildSummaryFromNarrative(narrative: string): string | null {
  const trimmed = narrative.trim();
  if (!trimmed) {
    return null;
  }

  const sentences = extractSentences(trimmed);
  if (sentences.length === 0) {
    if (trimmed.length >= MIN_SCENE_SUMMARY_LENGTH) {
      return trimmed.length <= MAX_SCENE_SUMMARY_LENGTH
        ? trimmed
        : trimmed.slice(0, MAX_SCENE_SUMMARY_LENGTH).trimEnd() + '...';
    }
    return null;
  }

  let summary = '';
  const targetSentences = Math.min(sentences.length, 3);
  for (let i = 0; i < targetSentences; i++) {
    const candidate = summary ? summary + ' ' + sentences[i] : sentences[i]!;
    if (candidate.length > MAX_SCENE_SUMMARY_LENGTH) {
      break;
    }
    summary = candidate;
  }

  if (!summary && sentences[0]) {
    summary =
      sentences[0].length <= MAX_SCENE_SUMMARY_LENGTH
        ? sentences[0]
        : sentences[0].slice(0, MAX_SCENE_SUMMARY_LENGTH).trimEnd() + '...';
  }

  return summary && summary.length >= MIN_SCENE_SUMMARY_LENGTH ? summary : null;
}

export function repairPlaceholderSceneSummary(rawJson: unknown): SceneSummaryRepairResult {
  if (typeof rawJson !== 'object' || rawJson === null || Array.isArray(rawJson)) {
    return { repairedJson: rawJson, repaired: false };
  }

  const source = rawJson as Record<string, unknown>;
  const sceneSummary = source['sceneSummary'];
  const narrative = source['narrative'];

  if (typeof sceneSummary !== 'string' || typeof narrative !== 'string') {
    return { repairedJson: rawJson, repaired: false };
  }

  if (!isPlaceholderSummary(sceneSummary)) {
    return { repairedJson: rawJson, repaired: false };
  }

  const extracted = buildSummaryFromNarrative(narrative);
  if (!extracted) {
    return { repairedJson: rawJson, repaired: false };
  }

  const repaired = { ...source, sceneSummary: extracted };
  return {
    repairedJson: repaired,
    repaired: true,
    repairDetails: `Replaced placeholder sceneSummary ("${sceneSummary}") with ${extracted.length}-char extract from narrative`,
  };
}
