/**
 * Establishment rules specific to opening prompts.
 * Focuses on character concept fidelity and initial state establishment.
 */

export const OPENING_ESTABLISHMENT_RULES = `ESTABLISHMENT RULES (OPENING):
This is the FIRST page - you are ESTABLISHING initial state, not maintaining continuity.

CHARACTER CONCEPT FIDELITY (CRITICAL):
- The character concept is your PRIMARY source of truth
- Starting inventory must reflect the character's background and profession
- Starting health conditions ONLY if explicitly mentioned in the concept
- Protagonist's personality, motivations, and reactions must match the concept
- Any abilities or limitations mentioned in the concept must be respected

WHAT YOU ESTABLISH:
- LOCATION: Where the story begins (be specific and evocative)
- INVENTORY: Items the character would logically possess based on their background
- HEALTH: Only conditions explicitly implied by the character concept
- ACTIVE STATE: Initial threats, constraints, and narrative threads
- CANON: Permanent world/character facts that constrain future scenes
- AFFECT: How the protagonist feels at the end of this opening

OPENING-SPECIFIC RULES:
- All "removed" arrays must be EMPTY (no prior state exists to remove)
- Be intentional about canon - these facts persist across all branches
- Plant threads that create intrigue without requiring immediate resolution
- The world you establish here becomes the foundation for all future scenes`;

export const OPENING_CHARACTER_CANON_GUIDANCE = `CHARACTER CANON ESTABLISHMENT (OPENING):
Since this is the first page, you are DEFINING characters, not referencing established facts.

PROTAGONIST CANON (newCharacterCanonFacts for protagonist):
Extract from the character concept:
- Inherent abilities mentioned in the concept
- Physical traits described in the concept
- Background elements that define who they are
- Relationships established in the concept

NPC CANON (newCharacterCanonFacts for NPCs):
For any NPCs introduced in this opening:
- Name and role in the world
- Relationship to the protagonist
- Inherent traits that will persist across branches

Rule: Only add canon facts that are PERMANENT and implied by the character concept or worldbuilding. Don't invent traits not supported by the provided context.`;
