/**
 * Strict choice guidelines for enforcing high-quality divergent choices.
 * Shared between writer prompt (legacy) and choice generator prompt.
 */
export const STRICT_CHOICE_GUIDELINES = `
CHOICE REQUIREMENTS:
Each choice is a structured object with text, choiceType, primaryDelta, and optionally choiceSubtype and choiceShape.
Each choice should satisfy all of the following:

0. DRAMATIC COHERENCE: All choices must be natural answers to the same immediate dramatic question raised by the scene's final moment. If the planner provided a dramaticQuestion, ground your choices in it.
1. IN-CHARACTER: The protagonist would genuinely consider this action given their personality and situation
2. CONSEQUENTIAL: The choice meaningfully changes the story direction
3. DIVERGENT: No two choices may share both the same choiceType AND the same primaryDelta
4. ACTIONABLE: Describes a concrete action with active verbs (not "think about" or "consider")
5. BALANCED: Mix of cautious, bold, and creative options when appropriate
6. VERB-FIRST: Start each choice text with a clear immediate action verb (e.g., "Demand", "Flee", "Accept", "Attack")
7. SCENE-HOOKING: Each choice must introduce a distinct next-scene hook
8. INTENTIONAL RISK: When an option is unusually risky, costly, or difficult, telegraph that in the wording so the player chooses intentionally, not blindly

CHOICE TYPE VALUES (what the protagonist is mainly DOING — pick the core move):
- INVESTIGATE: seek, test, verify, observe, ask, search, eavesdrop — core move is learning
- REVEAL: confess, admit, declare, identify yourself, show evidence — core move is telling
- PERSUADE: negotiate, plead, bargain, charm, command, pressure — core move is changing another's decision without force
- CONNECT: trust, comfort, protect, assist, join, romance, stand with — core move is aligning with/protecting/trusting someone
- DECEIVE: lie, conceal, disguise, misdirect, plant evidence, feint — core move is misleading
- CONTEST: accuse, threaten, expose, attack, sabotage, challenge — core move is open opposition
- COMMIT: sacrifice, spend, promise, swear, choose a side, accept burden — core move is binding yourself through cost/promise
- INTERVENE: use, repair, steal, unlock, disable, destroy, activate, hack — core move is acting on a system/object/environment
- NAVIGATE: travel, choose route, pick destination, pursue thread, split up — core move is route/order/target selection
- WITHDRAW: flee, hide, wait, abstain, de-escalate, endure, refuse engagement — core move is reducing contact/exposure
- SUBMIT: obey, surrender, accept terms, comply, yield — core move is yielding to external demand

DISAMBIGUATION RULES (apply in order):
- If the core move is learning → INVESTIGATE
- If the core move is telling → REVEAL
- If the core move is changing another's decision without force → PERSUADE
- If the core move is aligning with/protecting/trusting someone → CONNECT
- If the core move is misleading → DECEIVE
- If the core move is open opposition → CONTEST
- If the core move is binding yourself through cost/promise → COMMIT
- If the core move is acting on a system/object/environment → INTERVENE
- If the core move is route/order/target selection → NAVIGATE
- If the core move is reducing contact/exposure → WITHDRAW
- If the core move is yielding to external demand → SUBMIT

PRIMARY DELTA VALUES (what the choice CHANGES in the world):
- LOCATION_ACCESS_CHANGE: Protagonist moves or gains/loses access to a place
- GOAL_PRIORITY_CHANGE: Protagonist's immediate objective changes or reprioritizes
- RELATIONSHIP_ALIGNMENT_CHANGE: NPC stance/trust/alliance shifts
- TIME_PRESSURE_CHANGE: Urgency increases or decreases
- RESOURCE_CONTROL_CHANGE: Significant resource changes hands
- INFORMATION_STATE_CHANGE: New knowledge gained or information lost
- SECRECY_EXPOSURE_CHANGE: How much attention/suspicion protagonist draws
- CONDITION_STATUS_CHANGE: Physical condition, injury, or ailment gained/lost
- THREAT_LEVEL_CHANGE: Active danger introduced, escalated, or neutralized
- OBLIGATION_RULE_CHANGE: Limitation, rule, or obligation imposed or lifted
- POWER_AUTHORITY_CHANGE: Hierarchy or authority shifts
- IDENTITY_REPUTATION_CHANGE: How the protagonist is perceived changes

CHOICE SUBTYPE (optional):
Provide a free-text subtype for nuance when it adds clarity. Examples: CONFESSION, BARGAIN, DISGUISE, AMBUSH, ESCAPE. Set to null when not applicable.

CHOICE SHAPE (optional — what kind of pressure does this choice create?):
- RELAXED: No urgency, player can explore freely
- OBVIOUS: One option is clearly the right call
- TRADEOFF: Gain X but lose Y — both costs and benefits are visible
- DILEMMA: Two or more bad options with no clearly good path
- GAMBLE: Outcome is uncertain — player is betting on unknown results
- TEMPTATION: Easy short-term gain at hidden or deferred cost
- SACRIFICE: Costly but morally or strategically right
- FLAVOR: Cosmetic difference — outcome is similar regardless of choice
Set to null when not applicable or when the pressure doesn't fit neatly into a category.

DIVERGENCE ENFORCEMENT:
- No two choices may share both the same choiceType AND the same primaryDelta.
- If two choices share the same choiceType, they must differ sharply in target, cost, or consequence horizon.
- For a 3-choice set: at least 2 unique action families and 3 unique primary deltas.
- For a 4-choice set: at least 3 unique action families and 3 unique primary deltas.
- Self-check: "Would these options plausibly open the next scene in materially different states, not just different tones?"

FORBIDDEN CHOICE PATTERNS:
- "Do nothing" / "Wait and see" (unless dramatically appropriate)
- Choices that contradict established character traits without justification
- Choices so similar they effectively lead to the same path
- Meta-choices like "See what happens" or "Continue exploring"
- Passive phrasing: "Consider talking to..." instead of "Talk to..."

CHOICE FORMATTING EXAMPLE:
{
  "text": "Demand to know who the target is before agreeing",
  "choiceType": "CONTEST",
  "primaryDelta": "INFORMATION_STATE_CHANGE",
  "choiceSubtype": "ULTIMATUM",
  "choiceShape": "TRADEOFF"
}`;
