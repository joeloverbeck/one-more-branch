# Choice Taxonomy Values Report

## Scope
This report extracts choice taxonomy values from prompt documentation under `prompts/*`, focused on choice generation and downstream prompt usage.

## Source Prompt Docs
- `prompts/choice-generator-prompt.md`
- `prompts/state-accountant-prompt.md`

## Taxonomy 1: `choiceType` (Method/Tactic)
From `prompts/choice-generator-prompt.md` JSON Response Shape:

- `TACTICAL_APPROACH`
- `MORAL_DILEMMA`
- `IDENTITY_EXPRESSION`
- `RELATIONSHIP_SHIFT`
- `RESOURCE_COMMITMENT`
- `INVESTIGATION`
- `PATH_DIVERGENCE`
- `CONFRONTATION`
- `AVOIDANCE_RETREAT`

Count: 9

## Taxonomy 2: `primaryDelta` (Item/State-Change Axis)
From `prompts/choice-generator-prompt.md` JSON Response Shape:

- `LOCATION_CHANGE`
- `GOAL_SHIFT`
- `RELATIONSHIP_CHANGE`
- `URGENCY_CHANGE`
- `ITEM_CONTROL`
- `EXPOSURE_CHANGE`
- `CONDITION_CHANGE`
- `INFORMATION_REVEALED`
- `THREAT_SHIFT`
- `CONSTRAINT_CHANGE`

Count: 10

## Cross-Prompt Confirmation
`prompts/state-accountant-prompt.md` confirms both taxonomies are consumed downstream via:

`Choice Intents: 1. [{{choiceType}} / {{primaryDelta}}] {{hook}}`

## Total Taxonomy Values
- `choiceType`: 9
- `primaryDelta`: 10
- Combined total: 19
