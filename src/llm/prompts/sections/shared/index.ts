/**
 * Barrel export for shared system prompt sections.
 * These sections are used by both opening and continuation prompts.
 */

export { STORYTELLING_GUIDELINES, ENDING_GUIDELINES } from './narrative-core.js';

export {
  ACTIVE_STATE_TRACKING,
  INVENTORY_MANAGEMENT,
  HEALTH_MANAGEMENT,
  FIELD_SEPARATION,
} from './state-tracking.js';

export { PROTAGONIST_AFFECT } from './protagonist-affect.js';

export { buildToneBlock, buildToneReminder } from './tone-block.js';
