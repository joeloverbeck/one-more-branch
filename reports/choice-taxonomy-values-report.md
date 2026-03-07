# Choice Taxonomy Values Report

## Overview

The choice taxonomy consists of four classification axes applied to every generated choice. Together they enforce divergent, mechanically distinct options.

## Taxonomy 1: ChoiceType (11 values)

**Question**: "What is the protagonist mainly doing?"

| Value | Description |
|---|---|
| INVESTIGATE | Seeking hidden information or clues |
| REVEAL | Exposing truth, confessing, or making something known |
| PERSUADE | Convincing, negotiating, or appealing to others |
| CONNECT | Building bonds, showing empathy, or deepening relationships |
| DECEIVE | Lying, manipulating, or concealing true intent |
| CONTEST | Fighting, competing, or directly opposing a force |
| COMMIT | Making a binding decision, oath, or irreversible pledge |
| INTERVENE | Stepping in to alter an ongoing situation |
| NAVIGATE | Moving through space, escaping, or finding a path |
| WITHDRAW | Retreating, disengaging, or choosing inaction |
| SUBMIT | Yielding, surrendering, or accepting another's authority |

**UI encoding**: Background color on `.choice-btn`.

## Taxonomy 2: PrimaryDelta (12 values)

**Question**: "What dimension of the world does this choice primarily change?"

| Value | Label | Description |
|---|---|---|
| LOCATION_ACCESS_CHANGE | Location | Opens or closes access to places |
| GOAL_PRIORITY_CHANGE | Goal | Shifts what the protagonist is pursuing |
| RELATIONSHIP_ALIGNMENT_CHANGE | Relationship | Alters trust, loyalty, or alliance dynamics |
| TIME_PRESSURE_CHANGE | Time Pressure | Increases or decreases urgency |
| RESOURCE_CONTROL_CHANGE | Resource | Gains or loses material assets |
| INFORMATION_STATE_CHANGE | Information | Reveals or obscures knowledge |
| SECRECY_EXPOSURE_CHANGE | Exposure | Changes what is hidden vs. known publicly |
| CONDITION_STATUS_CHANGE | Condition | Affects health, status, or well-being |
| THREAT_LEVEL_CHANGE | Danger | Escalates or de-escalates threats |
| OBLIGATION_RULE_CHANGE | Obligation | Creates or removes duties and constraints |
| POWER_AUTHORITY_CHANGE | Power | Shifts control, rank, or influence |
| IDENTITY_REPUTATION_CHANGE | Identity | Alters how the protagonist is perceived |

**UI encoding**: 3px left-border accent color on `.choice-btn`.

## Taxonomy 3: ChoiceShape (8 values, optional)

**Question**: "What kind of pressure does this choice create?"

| Value | Description |
|---|---|
| RELAXED | Low-stakes, breathing room, no immediate cost |
| OBVIOUS | Clear best option, but may have hidden consequences |
| TRADEOFF | Gain something, lose something else |
| DILEMMA | Two bad options, pick the lesser evil |
| GAMBLE | Uncertain outcome, high variance |
| TEMPTATION | Attractive short-term gain with long-term risk |
| SACRIFICE | Give up something precious for a greater cause |
| FLAVOR | Cosmetic variation, minimal mechanical difference |

**UI encoding**: 3rd icon in the icon pill when present.

## Taxonomy 4: choiceSubtype (free-text, optional)

Additional tactical flavor describing the specific approach (e.g., "stealth approach", "diplomatic angle", "brute force").

**UI encoding**: Italic tag below choice text (`↳ stealth approach`).

## Visual Encoding Reference

| Axis | CSS Mechanism | Example |
|---|---|---|
| ChoiceType | `background` on `[data-choice-type]` | INVESTIGATE = `#148f77` |
| PrimaryDelta | `border-left: 3px solid` on `[data-primary-delta]` | LOCATION_ACCESS_CHANGE = `#3498db` |
| ChoiceShape | Icon in `.choice-icon--shape` | DILEMMA = forked thorned path |
| choiceSubtype | `.choice-subtype` italic text | `↳ stealth approach` |

## Total Taxonomy Values

- ChoiceType: 11
- PrimaryDelta: 12
- ChoiceShape: 8
- choiceSubtype: free-text
- Combined enum values: 31
