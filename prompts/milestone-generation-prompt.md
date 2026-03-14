# Milestone Generation Prompt (Production Template)

- Source: `src/llm/prompts/milestone-generation-prompt.ts`
- System prompt source: `buildStructureSystemPrompt()` from `src/llm/prompts/system-prompt-builder.ts`
- Output schema source: `src/llm/schemas/milestone-generation-schema.ts`
- Active role in pipeline: Call 2 of structure generation. Owns milestone realization only.

## Purpose

This prompt takes a validated, immutable `MacroArchitectureResult` plus the original structure context and generates milestone-only output:

- one output act per macro act, matched by `actIndex`
- 2-4 milestones per act
- canonical milestone fields including `exitCondition`
- midpoint placement that must match the locked macro anchor
- setpiece traceability or explicit concept-specificity for escalation-heavy milestones

It must not rewrite macro-act fields. Macro architecture remains the source of truth for act-level commitments.
