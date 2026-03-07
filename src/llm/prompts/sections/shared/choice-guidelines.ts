/**
 * Strict choice guidelines for enforcing high-quality divergent choices.
 * Shared between writer prompt (legacy) and choice generator prompt.
 */
export const STRICT_CHOICE_GUIDELINES = `
CHOICE REQUIREMENTS:
Each choice is a structured object with text, choiceType, and primaryDelta.
Each choice should satisfy all of the following:

0. DRAMATIC COHERENCE: All choices must be natural answers to the same immediate dramatic question raised by the scene's final moment. If the planner provided a dramaticQuestion, ground your choices in it.
1. IN-CHARACTER: The protagonist would genuinely consider this action given their personality and situation
2. CONSEQUENTIAL: The choice meaningfully changes the story direction
3. DIVERGENT: Each choice MUST have a different choiceType OR primaryDelta from all other choices
4. ACTIONABLE: Describes a concrete action with active verbs (not "think about" or "consider")
5. BALANCED: Mix of cautious, bold, and creative options when appropriate
6. VERB-FIRST: Start each choice text with a clear immediate action verb (e.g., "Demand", "Flee", "Accept", "Attack")
7. SCENE-HOOKING: Each choice must introduce a distinct next-scene hook

CHOICE TYPE VALUES (what the choice is ABOUT):
- TACTICAL_APPROACH: Choosing a method or tactic to accomplish the current objective
- MORAL_DILEMMA: A value conflict where each option has genuine ethical costs
- IDENTITY_EXPRESSION: Defining or revealing who the protagonist is
- RELATIONSHIP_SHIFT: Changing how the protagonist relates to another character
- RESOURCE_COMMITMENT: Spending, risking, or giving up something scarce
- INVESTIGATION: Choosing what to examine, learn, reveal, or conceal
- PATH_DIVERGENCE: Committing to a fundamentally different story direction
- CONFRONTATION: Choosing to engage, fight, threaten, or stand ground
- AVOIDANCE_RETREAT: Choosing to flee, hide, de-escalate, or avoid

PRIMARY DELTA VALUES (what the choice CHANGES in the world):
- LOCATION_CHANGE: Protagonist moves to a different place
- GOAL_SHIFT: Protagonist's immediate objective changes
- RELATIONSHIP_CHANGE: NPC stance/trust/dynamic shifts
- URGENCY_CHANGE: Time pressure increases or decreases
- ITEM_CONTROL: Possession of a significant object shifts
- EXPOSURE_CHANGE: How much attention/suspicion protagonist draws
- CONDITION_CHANGE: Physical condition, injury, or ailment gained/lost
- INFORMATION_REVEALED: New knowledge gained, mystery advances
- THREAT_SHIFT: Active danger introduced, escalated, or neutralized
- CONSTRAINT_CHANGE: Limitation on protagonist imposed or lifted

DIVERGENCE ENFORCEMENT:
Each choice MUST have a different choiceType OR a different primaryDelta from all other choices.
Do not repeat the same (choiceType, primaryDelta) combination across choices.
If you cannot produce at least 2 choices with different tags, consider making this an ENDING.

FORBIDDEN CHOICE PATTERNS:
- "Do nothing" / "Wait and see" (unless dramatically appropriate)
- Choices that contradict established character traits without justification
- Choices so similar they effectively lead to the same path
- Meta-choices like "See what happens" or "Continue exploring"
- Passive phrasing: "Consider talking to..." instead of "Talk to..."

CHOICE FORMATTING EXAMPLE:
{
  "text": "Demand to know who the target is before agreeing",
  "choiceType": "CONFRONTATION",
  "primaryDelta": "INFORMATION_REVEALED"
}`;
