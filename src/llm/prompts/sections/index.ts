/**
 * Barrel export for all system prompt section modules.
 * Organized into shared, opening, and continuation sections.
 */

// Shared sections (used by both opening and continuation)
export {
  STORYTELLING_GUIDELINES,
  ENDING_GUIDELINES,
  ACTIVE_STATE_TRACKING,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
  PROTAGONIST_AFFECT,
} from './shared/index.js';

// Opening-specific sections
export {
  OPENING_ESTABLISHMENT_RULES,
  OPENING_CHARACTER_CANON_GUIDANCE,
  OPENING_ACTIVE_STATE_QUALITY,
  OPENING_CANON_QUALITY,
} from './opening/index.js';

// Continuation-specific sections
export {
  CONTINUATION_CONTINUITY_RULES,
  CHARACTER_CANON_VS_STATE,
  CONTINUATION_ACTIVE_STATE_QUALITY,
  CONTINUATION_CANON_QUALITY,
} from './continuation/index.js';

// Planner-specific sections
export {
  buildPlannerOpeningContextSection,
  buildPlannerContinuationContextSection,
  PLANNER_STATE_INTENT_RULES,
} from './planner/index.js';
