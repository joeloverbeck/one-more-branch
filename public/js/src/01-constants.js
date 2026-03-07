// ── Configuration ──────────────────────────────────────────────────

const API_KEY_STORAGE_KEY = 'omb_api_key';
const PROGRESS_POLL_INTERVAL_MS = 1200;
const PHRASE_ROTATION_MIN_MS = 3500;
const PHRASE_ROTATION_MAX_MS = 4500;
const OPEN_THREADS_PANEL_LIMIT = 6;
const KEYED_ENTRY_PANEL_LIMIT = 6;
const LEFT_PANEL_LIMIT = 10;

// Stage metadata (STAGE_PHRASE_POOLS + STAGE_DISPLAY_NAMES) is generated
// from src/config/generation-stage-metadata.json into 00-stage-metadata.js.

// ── Choice / Delta enums and label maps ──────────────────────────

var CHOICE_TYPES = [
  { value: 'INVESTIGATE', label: 'Investigate' },
  { value: 'REVEAL', label: 'Reveal' },
  { value: 'PERSUADE', label: 'Persuade' },
  { value: 'CONNECT', label: 'Connect' },
  { value: 'DECEIVE', label: 'Deceive' },
  { value: 'CONTEST', label: 'Contest' },
  { value: 'COMMIT', label: 'Commit' },
  { value: 'INTERVENE', label: 'Intervene' },
  { value: 'NAVIGATE', label: 'Navigate' },
  { value: 'WITHDRAW', label: 'Withdraw' },
  { value: 'SUBMIT', label: 'Submit' },
];

var PRIMARY_DELTAS = [
  { value: 'LOCATION_ACCESS_CHANGE', label: 'Location' },
  { value: 'GOAL_PRIORITY_CHANGE', label: 'Goal' },
  { value: 'RELATIONSHIP_ALIGNMENT_CHANGE', label: 'Relationship' },
  { value: 'TIME_PRESSURE_CHANGE', label: 'Time Pressure' },
  { value: 'RESOURCE_CONTROL_CHANGE', label: 'Resource' },
  { value: 'INFORMATION_STATE_CHANGE', label: 'Information' },
  { value: 'SECRECY_EXPOSURE_CHANGE', label: 'Exposure' },
  { value: 'CONDITION_STATUS_CHANGE', label: 'Condition' },
  { value: 'THREAT_LEVEL_CHANGE', label: 'Danger' },
  { value: 'OBLIGATION_RULE_CHANGE', label: 'Obligation' },
  { value: 'POWER_AUTHORITY_CHANGE', label: 'Power' },
  { value: 'IDENTITY_REPUTATION_CHANGE', label: 'Identity' },
];

var CHOICE_SHAPES = [
  { value: 'RELAXED', label: 'Relaxed' },
  { value: 'OBVIOUS', label: 'Obvious' },
  { value: 'TRADEOFF', label: 'Tradeoff' },
  { value: 'DILEMMA', label: 'Dilemma' },
  { value: 'GAMBLE', label: 'Gamble' },
  { value: 'TEMPTATION', label: 'Temptation' },
  { value: 'SACRIFICE', label: 'Sacrifice' },
  { value: 'FLAVOR', label: 'Flavor' },
];

var CHOICE_TYPE_LABEL_MAP = {};
CHOICE_TYPES.forEach(function (ct) { CHOICE_TYPE_LABEL_MAP[ct.value] = ct.label; });

var PRIMARY_DELTA_LABEL_MAP = {};
PRIMARY_DELTAS.forEach(function (pd) { PRIMARY_DELTA_LABEL_MAP[pd.value] = pd.label; });

var CHOICE_SHAPE_LABEL_MAP = {};
CHOICE_SHAPES.forEach(function (cs) { CHOICE_SHAPE_LABEL_MAP[cs.value] = cs.label; });

// ── Analyst insights tab metadata ────────────────────────────────

var THEMATIC_CHARGE_META = {
  THESIS_SUPPORTING: { css: 'thematic-badge--thesis', label: '\uD83C\uDFAF Thesis Supporting' },
  ANTITHESIS_SUPPORTING: { css: 'thematic-badge--antithesis', label: '\u2694\uFE0F Antithesis Supporting' },
  AMBIGUOUS: { css: 'thematic-badge--ambiguous', label: '\uD83C\uDF00 Ambiguous' },
};

var NARRATIVE_FOCUS_META = {
  DEEPENING: { css: 'narrative-focus-badge--deepening', label: '\uD83D\uDD0D Deepening' },
  BROADENING: { css: 'narrative-focus-badge--broadening', label: '\uD83C\uDF10 Broadening' },
  BALANCED: { css: 'narrative-focus-badge--balanced', label: '\u2696\uFE0F Balanced' },
};

var NPC_COHERENCE_META = {
  true: { css: 'npc-coherence--ok', label: '\u2705 Coherent' },
  false: { css: 'npc-coherence--issue', label: '\u26A0\uFE0F Issues Detected' },
};
