# Macro Architecture Prompt (Production Template)

- Source: `src/llm/prompts/macro-architecture-prompt.ts`
- System prompt source: `buildStructureSystemPrompt()` from `src/llm/prompts/system-prompt-builder.ts`
- Output schema source: `src/llm/schemas/macro-architecture-schema.ts`
- Active role in pipeline: Call 1 of structure generation. Owns macro architecture only.

## Purpose

This prompt designs the locked macro frame for story structure:

- overall theme and premise
- opening and closing images
- pacing budget
- anchor moments
- act-level objectives, stakes, entry conditions, questions, reversals, promise targets, and obligation targets
- initial NPC agendas

It does not generate milestones. Milestone realization happens in the dedicated Call 2 prompt.
