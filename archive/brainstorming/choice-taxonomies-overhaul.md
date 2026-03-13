**Status**: COMPLETED

# Choice Taxonomies Overhaul

I asked ChatGPT the following:

"We're developing a browser-based app for interactive branching storytelling. One of the main points of our app is giving the user distinct, compelling, meaningful choices. The prompt relies on two taxonomies of choices, but I suspect that they aren't comprehensive enough. Please analyze and investigate the matter in detail in case we need to change/expand/etc until we have the most comprehensive taxonomies possible, while still value still remains distinct."

It said:

## ChatGPT's response

Yes. You should change it.

The problem is not just that the current lists may be missing a few values. The bigger problem is that your current choiceType is not a single clean taxonomy at all. Right now the generator has 9 choiceType values and 10 primaryDelta values, requires each choice to differ on at least one of those axes, and those tags are then consumed downstream by state accounting. 

choice-taxonomy-values-report

 

choice-generator-prompt

Research on narrative agency points in a very specific direction: players feel more agency when options are perceived to lead to meaningfully different situational content, and meaningful play depends on action-outcome relationships being both discernible and integrated into the larger context. Choice-poetics work pushes the same point further: the effect of a choice depends on options, outcomes, player goals, modes of engagement, and uncertainty, not just on the surface wording of the buttons. Practical IF design advice says the player also needs intentionality: they should know why they are choosing an option and have some sense of likely consequences and relative difficulty, especially when the outcomes are negative or uneven.

There is another important wrinkle. A recent qualitative study of narrative-rich games found that developers and players distinguish choices along orthogonal dimensions such as temporal consequence, perceived significance, and reward/benefit, and it also found that even low-impact choices can still matter by reinforcing player persona and immersion. So if you try to make one enum carry action, dramatic pressure, consequence horizon, and reward profile all at once, it turns into soup.

### What is wrong with the current setup

primaryDelta is the healthier of the two. It is already trying to answer a clean question: what part of story state is expected to change? That is useful for both generation and downstream accounting. It still has naming and coverage problems, but the underlying idea is sound. 

choice-generator-prompt

choiceType is the real mess.

It mixes at least three different classification logics:

- Action family: INVESTIGATION, CONFRONTATION, AVOIDANCE_RETREAT

- Dramatic/psychological frame: MORAL_DILEMMA, IDENTITY_EXPRESSION

- Structural or consequence-ish category: PATH_DIVERGENCE, RESOURCE_COMMITMENT, RELATIONSHIP_SHIFT

Those are not peers. PATH_DIVERGENCE is especially bad because your prompt already requires every choice to create a meaningfully different path, so the category duplicates the whole purpose of the generator. RELATIONSHIP_SHIFT overlaps directly with RELATIONSHIP_CHANGE in primaryDelta. TACTICAL_APPROACH is a giant trash can that swallows anything that does not fit elsewhere.

That creates four concrete failures.

First, false distinctness. Two choices can get different tags while still being basically the same move.

Second, missing homes for common narrative acts. Your system has no clean place for “confess,” “bargain,” “lie,” “obey,” “repair,” “accept terms,” or “declare allegiance.” Those are bread-and-butter branching-story verbs.

Third, bad repair behavior. If the model is told “make each choice have a different choiceType,” it will reach for mixed categories instead of actually diversifying the set.

Fourth, weak downstream semantics. If state accounting consumes dirty labels, it has to guess whether a tag is about behavior, theme, or consequence.

### The clean fix

Do not just add more values to the current choiceType. That would make the ontology worse.

Instead:

- Keep two hard taxonomies.

- Make each hard taxonomy answer exactly one question.

- Push nuance into subtypes or soft tags, not into the core enums.

The two hard questions should be:

1. What is the protagonist mainly doing?
That is choiceType in practice, though I would rename it to choiceAction if you can.

2. What is the dominant foreseeable state change if this path is pursued?
That remains primaryDelta.

That aligns with your prompt surprisingly well, because your choices already have to start with a clear action verb. If the text is verb-first, the first taxonomy should absolutely be a pure action-family taxonomy.

### Recommended hard taxonomy 1: choiceType as pure action family

I would replace the current 9-value enum with this 11-value set:

INVESTIGATE — seek, test, verify, observe, ask, search, eavesdrop.

REVEAL — confess, admit, declare, identify yourself, show evidence, state intent.

PERSUADE — negotiate, plead, bargain, charm, command, pressure, recruit.

CONNECT — trust, comfort, protect, assist, join, romance, stand with.

DECEIVE — lie, conceal, disguise, misdirect, plant evidence, feint.

CONTEST — accuse, threaten, expose an opponent, attack, sabotage, arrest, challenge.

COMMIT — sacrifice, spend, promise, swear, choose a side, accept a burden.

INTERVENE — use, repair, steal, unlock, disable, destroy, activate, perform a ritual, hack.

NAVIGATE — travel, choose a route, pick a destination, pursue one thread, split up, sequence priorities.

WITHDRAW — flee, hide, wait, abstain, de-escalate, endure, refuse engagement.

SUBMIT — obey, surrender, accept terms, comply, yield to external control.

That set is broad enough to cover almost every meaningful branching-story move, but the values still stay distinct because they are all answering the same question: what is the protagonist doing right now?

A few disambiguation rules keep it clean:

If the core move is learning, use INVESTIGATE.

If the core move is telling, use REVEAL.

If the core move is changing another character’s decision without direct force, use PERSUADE.

If the core move is aligning with / protecting / trusting someone, use CONNECT.

If the core move is misleading, use DECEIVE.

If the core move is open opposition, use CONTEST.

If the core move is binding yourself through cost or promise, use COMMIT.

If the core move is acting on a system/object/environment, use INTERVENE.

If the core move is route/order/target selection, use NAVIGATE.

If the core move is reducing contact/exposure/engagement, use WITHDRAW.

If the core move is yielding to an external demand, use SUBMIT.

### Recommended hard taxonomy 2: expanded primaryDelta

Your current primaryDelta is close, but several names are too narrow and two major state axes are missing. I would ship this 12-value version:

LOCATION_ACCESS_CHANGE — where you are, what spaces are reachable, what routes are open or closed.

GOAL_PRIORITY_CHANGE — what objective or thread becomes primary, abandoned, or deprioritized.

RELATIONSHIP_ALIGNMENT_CHANGE — trust, affection, loyalty, alliance, resentment, faction alignment.

TIME_PRESSURE_CHANGE — urgency, delay, breathing room, deadline compression.

RESOURCE_CONTROL_CHANGE — money, items, tools, supplies, custody, leverage-bearing assets.

INFORMATION_STATE_CHANGE — what is known, suspected, verified, remembered, or misunderstood.

SECRECY_EXPOSURE_CHANGE — who knows a hidden fact, who is noticed, how visible/traceable the protagonist is.

CONDITION_STATUS_CHANGE — health, injury, fatigue, corruption, captivity, morale, emotional stability.

THREAT_LEVEL_CHANGE — danger, hostility, pursuit, deterrence, escalation/de-escalation.

OBLIGATION_RULE_CHANGE — promises, debts, oaths, permissions, bargains, laws, taboos, duties.

POWER_AUTHORITY_CHANGE — command, legitimacy to order others, institutional control, leverage over people/systems.

IDENTITY_REPUTATION_CHANGE — role, title, public image, legitimacy, self-definition, social label.

This is the version I would actually want the state accountant to consume, because it is tied to story-state dimensions rather than genre-ish vibes. Since your downstream prompt consumes these tags, I would also add matching state fields for at least authority/leverage, obligations/oaths/debts, reputation/role, and access. Otherwise the new deltas will just collapse back into ad hoc hacks under CONSTRAINT_CHANGE and RELATIONSHIP_CHANGE.

### What to do with your current odd categories

Here is the blunt version.

Keep:

- INVESTIGATION → INVESTIGATE

- CONFRONTATION → CONTEST

- AVOIDANCE_RETREAT → WITHDRAW

- RESOURCE_COMMITMENT → COMMIT

Delete or move:

- TACTICAL_APPROACH → delete; it is a garbage bin

- PATH_DIVERGENCE → delete; all good choices diverge

- RELATIONSHIP_SHIFT → fold into CONNECT or CONTEST, while the actual state change lives in RELATIONSHIP_ALIGNMENT_CHANGE

- MORAL_DILEMMA → do not keep as a core action type

- IDENTITY_EXPRESSION → do not keep as a core action type

MORAL_DILEMMA and IDENTITY_EXPRESSION are real and important, but they are not action families. Moral gameplay research explicitly treats ethical engagement as broader than simple good/evil judgment; it involves sensitivity, judgment, and action. Identity-heavy choices matter too, and even low-consequence dialogue choices can reinforce player persona and immersion. Those belong as soft tags or themes, not as hard peers of CONFRONTATION and INVESTIGATION.

### The real trick: hierarchy, not enum bloat

If you want “most comprehensive possible” without destroying distinctness, the answer is not a 30-value flat enum.

The answer is:

small, clean top-level enums

optional subtypes for nuance

So I would add an optional field like:

choiceSubtype?: string

Examples:

REVEAL + CONFESSION

PERSUADE + BARGAIN

CONNECT + ROMANCE

DECEIVE + DISGUISE

CONTEST + ACCUSATION

COMMIT + OATH

INTERVENE + SABOTAGE

NAVIGATE + ROUTE_SELECTION

WITHDRAW + DELAY

SUBMIT + SURRENDER

That is how you get comprehensiveness without making the core taxonomy unusable.

### Optional third axis if you want finer control

If you want to preserve the “feel” dimension that is currently leaking into choiceType, the cleanest third hard axis is not “moral vs identity.” It is choice shape.

Dunyazad’s work explicitly models at least three recognizable choice structures: obvious, relaxed, and dilemma choices, as distinct poetic effects. Combined with the other work on significance and low-impact persona-reinforcing choices, I would use something like:

RELAXED — low stakes, no bad option

OBVIOUS — one option clearly best by short-term logic

TRADEOFF — competing pros/cons, no clean winner

DILEMMA — all options carry serious downside

GAMBLE — uncertain high variance

TEMPTATION — immediate gain vs long-term cost/values

SACRIFICE — certain cost paid for principle/person/future

FLAVOR — low-significance expressive choice

That third axis is optional, but it is the right place for “what kind of pressure does this choice create?” if you want it.

### Prompt and validation changes I would make

I would not keep the current distinctness rule as-is. “Different choiceType or primaryDelta” is too weak. 

choice-generator-prompt

I would change the logic to this:

- No two choices may share both the same top-level choiceType and the same primaryDelta.

- If two choices share the same choiceType, they must differ sharply in target, cost, or consequence horizon.

- For a 3-choice set, aim for at least 2 unique action families and 3 unique primary deltas.

- For a 4-choice set, aim for at least 3 unique action families and 3 unique primary deltas.

- Add a self-check: “Would these options plausibly open the next scene in materially different states, not just different tones?”

I would also add an instruction based on intentional-choice design: when an option is unusually risky, costly, or difficult, telegraph that in the wording or lead-in text so the player is choosing intentionally, not blindly.

### What I would ship

If I were doing this for production, I would ship exactly this core schema:

export const ChoiceType = z.enum([
  "INVESTIGATE",
  "REVEAL",
  "PERSUADE",
  "CONNECT",
  "DECEIVE",
  "CONTEST",
  "COMMIT",
  "INTERVENE",
  "NAVIGATE",
  "WITHDRAW",
  "SUBMIT",
]);

export const PrimaryDelta = z.enum([
  "LOCATION_ACCESS_CHANGE",
  "GOAL_PRIORITY_CHANGE",
  "RELATIONSHIP_ALIGNMENT_CHANGE",
  "TIME_PRESSURE_CHANGE",
  "RESOURCE_CONTROL_CHANGE",
  "INFORMATION_STATE_CHANGE",
  "SECRECY_EXPOSURE_CHANGE",
  "CONDITION_STATUS_CHANGE",
  "THREAT_LEVEL_CHANGE",
  "OBLIGATION_RULE_CHANGE",
  "POWER_AUTHORITY_CHANGE",
  "IDENTITY_REPUTATION_CHANGE",
]);

And if I had room for one more field:

choiceSubtype?: string

That is the proper fix. Not a patch.

primaryDelta should be expanded and renamed. choiceType should be rebuilt from the ground up as a pure action-family taxonomy. Moral, identity, and similar pressures should become soft tags or a separate optional axis, not stay inside the core enum.

If you only do one thing, do the choiceType redesign first. That is the real blocker.

## Outcome

- Completion date: 2026-03-13
- What changed: The expanded `ChoiceType` and `PrimaryDelta` taxonomies were implemented in the production enums, prompt guidance, choice schema, and play/debug UI.
- Deviations from the original plan: The overhaul shipped as a direct replacement of the old enums and guidance rather than as a separate soft-tag axis in this document.
- Verification results: Confirmed in `src/models/choice-enums.ts`, `src/llm/schemas/choice-generator-schema.ts`, `src/llm/prompts/sections/shared/choice-guidelines.ts`, and `prompts/choice-generator-prompt.md`.
