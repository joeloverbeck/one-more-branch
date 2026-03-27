# Chat Summarizer Prompt

- Source: `src/llm/prompts/chat/chat-summary-prompt.ts`
- Stage: `chatSummarizer`

## Purpose

Compress older chat turns into durable continuity memory. The summarizer maintains a factual rolling memory object so the conversation can scale without keeping the full transcript in every downstream prompt.

## Authority Boundary

- The summarizer is authoritative for the persisted rolling summary object only.
- It must merge existing summary memory with the newly compressed turn span into one updated continuity artifact.
- It must not invent motives, events, or internal states unsupported by the transcript.

## System Prompt Requirements

The system prompt must instruct the model to:

- compress older one-on-one chat turns into durable continuity memory
- preserve only future-relevant facts such as commitments, leverage, disclosures, lies exposed, confessions, unresolved questions, and continuity-critical changes
- write from observable conversation reality, not vibes or literary interpretation
- avoid inventing unsupported motives, events, or internal states
- keep the summary additive and continuity-safe by merging existing summary and new turns
- keep emotional trajectory factual and externally grounded
- include the shared content policy block

## User Message Sections

The user message is organized into these sections, in order:

1. `EXISTING ROLLING SUMMARY`
2. `TURNS TO COMPRESS`

## Output Contract

The summarizer returns a strict `RollingSummaryOutput` object with:

- `compressedSummary`
- `keyCommitments`
- `keyRevelations`
- `unresolvedQuestions`
- `leverageShifts`
- `emotionalTrajectory`

## Schema

- `CHAT_SUMMARY_SCHEMA` from `src/llm/schemas/chat-summary-schema.ts`
- Parsed by `parseChatSummaryResponse()`
- Returned by `generateChatSummary()` in `src/llm/chat/chat-summary-generation.ts`

## Pipeline Notes

- The chat pipeline triggers summarization when the state updater requests it, on the 8-turn cadence, or on session resume when a long chat still lacks a rolling summary.
- The resulting summary is stored on the session and reused by later bible refreshes.
