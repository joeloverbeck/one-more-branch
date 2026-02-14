**Status**: NOT IMPLEMENTED

# Improvements to prompts

I fed the prompt docs to ChatGPT so that it could find issues or suggest improvements. ChatGPT said the following:

## Add a golden rule for optimal prose

In the opening and continuation prompts (src/llm/prompts/* ) the instructions for writing vivid prose are too vague. We should add a golden rule for prose writing that doesn't get lost among other instructions. The existing instructions for prose writing should be audited and removed if necessary.

We should add a golden rule for writing like: 'Build the narrative prose around vigorous verbs, specific nouns, and meaningful sensorial information."

## Instruction overload (models start “averaging” your rules)

Your continuation/opening prompts are huge and contain repeated, overlapping constraints (continuity rules, choice rules, formatting rules, recap rules, etc.). Big prompts work, but the failure mode is predictable: the model starts missing some constraints because there are too many “musts.”

Fix: introduce an explicit “priority stack” at the very end (last ~15 lines before the JSON schema), something like:

1. Output valid JSON only

2. Don’t contradict state/canon/inventory/health

3. Scene must react to the player choice + advance plot

4. Choices must be divergent by (choiceType, primaryDelta)

5. Prose quality requirements (maybe the golden rule for writing narrative prose could go here)

This single move increases compliance more than another page of rules.

## You have small but real rule conflicts

In strict choice guidance you mention 2–3 choices in a few places, while the global requirement says 3 choices (4 only if warranted). That inconsistency matters; it causes occasional “2 choices” outputs or panicked padding.

Fix: make it one rule everywhere:

“Return exactly 3 choices when isEnding=false, unless a 4th is justified by a distinct major branch.”

## Your divergence rule creates “menu engineering,” not “novelist choices”

Forcing each choice to differ by type or delta is great for system variety, but it often produces choices that feel like UI categories, not natural options a person would consider.

Fix (big impact): make divergence secondary to “same scene question, different answer.”
Add a rule like:

“All choices must be answers to the same immediate dramatic question posed by the scene.”

That one constraint prevents “random INVESTIGATION option” showing up just to satisfy tags.

## Analyst prompt is structurally good but missing “severity/uncertainty”

Your analyst is conservative (good), but it lacks:

- confidence / uncertainty

- deviation severity (minor drift vs hard invalidation)

Right now you’re forced into binary-ish downstream decisions. 

analyst-prompt

Fix: add fields:

- deviationSeverity: NONE|MINOR|MAJOR

- confidence: LOW|MEDIUM|HIGH

- riskNotes: string[] (optional)

Also: “narrativeSummary empty when no deviation” is a waste. That summary is useful always for planner compression.


## Planner prompt: you’re missing the single most useful output

Your planner creates sceneIntent and continuity anchors (good), but it doesn’t propose choice intents (because you forbade choices). That means the writer invents choices “cold,” and your tag constraints force awkwardness. 

page-planner-prompt

Fix: add a “choice intent” section that is not player-facing, e.g.

- choiceIntents: [{hook, choiceType, primaryDelta}]
No choice text, no narration, just a blueprint.

## Add a tiny “anti-repetition” checklist to writer

You already say “don’t recap,” but models still rephrase the last line.

Add a micro-check:

“Do not reuse any phrase longer than 6 words from the previous scene.”

“Do not restate the player’s choice; show it.”

This helps more than you’d think.

## Improve structure beats to be machine-checkable

Your structure beats are descriptive but not easily “gateable.”

Enhance each beat with:

- completionSignals (2–4 bullet phrases)

- allowedVariants (2–3 ways it can be satisfied across branches)

This makes your analyst’s “anchor evidence” far easier and less subjective.

