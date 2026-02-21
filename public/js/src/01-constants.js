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
  { value: 'TACTICAL_APPROACH', label: 'Method/Tactic' },
  { value: 'MORAL_DILEMMA', label: 'Moral Choice' },
  { value: 'IDENTITY_EXPRESSION', label: 'Define Yourself' },
  { value: 'RELATIONSHIP_SHIFT', label: 'Relationship' },
  { value: 'RESOURCE_COMMITMENT', label: 'Spend/Risk' },
  { value: 'INVESTIGATION', label: 'Investigate' },
  { value: 'PATH_DIVERGENCE', label: 'Change Direction' },
  { value: 'CONFRONTATION', label: 'Confront/Fight' },
  { value: 'AVOIDANCE_RETREAT', label: 'Avoid/Flee' },
];

var PRIMARY_DELTAS = [
  { value: 'LOCATION_CHANGE', label: 'Location' },
  { value: 'GOAL_SHIFT', label: 'Goal' },
  { value: 'RELATIONSHIP_CHANGE', label: 'Relationship' },
  { value: 'URGENCY_CHANGE', label: 'Time Pressure' },
  { value: 'ITEM_CONTROL', label: 'Item' },
  { value: 'EXPOSURE_CHANGE', label: 'Attention' },
  { value: 'CONDITION_CHANGE', label: 'Condition' },
  { value: 'INFORMATION_REVEALED', label: 'Information' },
  { value: 'THREAT_SHIFT', label: 'Danger' },
  { value: 'CONSTRAINT_CHANGE', label: 'Limitation' },
];

var CHOICE_TYPE_LABEL_MAP = {};
CHOICE_TYPES.forEach(function (ct) { CHOICE_TYPE_LABEL_MAP[ct.value] = ct.label; });

var PRIMARY_DELTA_LABEL_MAP = {};
PRIMARY_DELTAS.forEach(function (pd) { PRIMARY_DELTA_LABEL_MAP[pd.value] = pd.label; });
