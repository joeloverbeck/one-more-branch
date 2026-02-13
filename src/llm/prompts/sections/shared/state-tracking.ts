/**
 * Continuity context guidance shared by both opening and continuation prompts.
 * Covers read-only scene context plus creative-field boundaries.
 */

export const CONTINUITY_CONTEXT_USAGE = `=== CONTINUITY CONTEXT USAGE ===

Use the continuity context sections in the prompt as authoritative scene context. These represent what is TRUE RIGHT NOW.

READ-ONLY CONTINUITY INPUT:
- CURRENT LOCATION: where the protagonist is right now.
- ACTIVE THREATS: immediate dangers currently present.
- ACTIVE CONSTRAINTS: limitations currently affecting the protagonist.
- OPEN NARRATIVE THREADS: unresolved hooks and mysteries.

How to use this context:
1. Continue from the exact situation shown by these sections.
2. Do not contradict listed facts unless the scene clearly resolves or changes them in narrative events.
3. Show consequences in prose and choices.`;

export const INVENTORY_MANAGEMENT = `INVENTORY MANAGEMENT:
- Treat YOUR INVENTORY as read-only context for what the protagonist currently carries.
- Use inventory details naturally in narrative and choice design.`;

export const HEALTH_MANAGEMENT = `HEALTH MANAGEMENT:
- Treat YOUR HEALTH as read-only context for current physical condition.
- Reflect physical limitations in narrative and choices when relevant.`;

export const FIELD_SEPARATION = `FIELD SEPARATION:
- CREATIVE OUTPUT FIELDS:
  - narrative
  - choices
  - sceneSummary
  - protagonistAffect
  - isEnding
- READ-ONLY CONTEXT:
  - inventory, health, location, threats, constraints, threads, canon, and NPC state sections in the prompt.`;
