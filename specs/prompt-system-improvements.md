# Spec: Prompt System Improvements (Post-Review)

## Goals
- Improve long-run narrative coherence and state correctness (especially thread/state staleness).
- Reduce schema/prompt noncompliance at runtime.
- Ship a strict cutover with no backward compatibility or legacy code paths.

---

## 1) Changes to Implement

### 1.1 Typed Threads (Enum tagging for thread hygiene)
**Problem addressed:** stale/incoherent threads; LLM needs handles to manage “what kind of thread is this” and “is it still relevant.”

**Schema Change (writer output)**
- Replace:
  - `threadsAdded: string[]`
- With:
  - `threadsAdded: ThreadAdd[]`
- Where:
  - `ThreadAdd = { text: string, threadType: ThreadType, urgency: Urgency }`
  - `ThreadType` enum (initial):
    - MYSTERY | QUEST | RELATIONSHIP | DANGER | INFORMATION | RESOURCE | MORAL
  - `Urgency` enum:
    - LOW | MEDIUM | HIGH
- Keep:
  - `threadsResolved: string[]` (IDs only)
- Compatibility policy:
  - No backward compatibility or legacy parsing.
  - Any payload using legacy `threadsAdded: string[]` shape is invalid and rejected.

**Prompt text updates**
- Opening and Continuation prompts:
  - Update “THREADS” rules section to instruct: provide objects with `text`, `threadType`, `urgency`.
  - Still: server assigns IDs; only resolve using IDs.

**Server/storage updates**
- Store thread entries as objects: `{ id, text, threadType, urgency }`.
- Render OPEN THREADS section as:
  - `- [td-3] (MYSTERY/HIGH) Strange symbols on the wall`

---

### 1.2 Deterministic Output Validator (post-LLM, pre-commit)
**Problem addressed:** LLM occasionally violates rules (IDs in additions, plain text in removals, duplicates, etc.)

**Validator checks**
- For each category:
  - Added arrays contain NO IDs/prefixes (th-, cn-, td-, inv-, hp-, cs-).
  - Removed/resolved arrays contain ONLY valid IDs with the right prefix.
- Choice divergence:
  - enforce uniqueness of `(choiceType, primaryDelta)` pairs across choices.
- protagonistAffect:
  - ensure required fields present and non-empty.
- If validator fails:
  - Always reject and do not commit the page.
  - Return a structured validation error payload that includes failed rule keys and offending fields.
  - No retry wrapper in this phase (avoid hidden non-deterministic control flow).

---

## 2) Invariants That Must Hold

### 2.1 State tracking invariants
- Additions are never user-assigned IDs.
  - `threatsAdded[]`, `constraintsAdded[]`, `inventoryAdded[]`, `healthAdded[]`:
    - MUST NOT contain strings beginning with `th-`, `cn-`, `inv-`, `hp-`, `td-`, `cs-`.
- Removals/resolutions are IDs only:
  - `threatsRemoved[]` => `th-*`
  - `constraintsRemoved[]` => `cn-*`
  - `inventoryRemoved[]` => `inv-*`
  - `healthRemoved[]` => `hp-*`
  - `threadsResolved[]` => `td-*`
  - `characterStateChangesRemoved[]` => `cs-*` (if present in your schema)
- No duplicate active state entries after server apply (by ID).
- When a condition “worsens”, old ID must be removed and new entry added (as your rules already state).

### 2.2 Writer output invariants
- `protagonistAffect` is a fresh snapshot at end of scene (not copied verbatim from parent).
- Choices:
  - Exactly 3 by default; allow 4 only if explicitly justified (existing behavior).
  - Each choice must differ by choiceType OR primaryDelta; validator enforces unique pairs.

### 2.3 Typed threads invariants
- Every entry in `threadsAdded` is `{text, threadType, urgency}` with non-empty `text`.
- `threadType` and `urgency` must be valid enums.
- The OPEN THREADS render includes these tags for LLM visibility.
- `text` is normalized server-side before persist (trimmed; reject empty-after-trim).

### 2.4 Cutover invariants (no legacy)
- Only one accepted writer schema exists at runtime; no union types for old/new thread shapes.
- Only one prompt contract exists at runtime; no dual prompt templates.
- Only one persistence shape exists for new threads: `{ id, text, threadType, urgency }`.
- Existing tests that assert legacy thread behavior are removed or rewritten, not conditionally toggled.

---

## 3) Implementation Requirements (missing details resolved)

### 3.1 Hard-cut migration
- Add a one-time migration for persisted story data:
  - Convert legacy thread strings into objects using deterministic defaults:
    - `threadType: INFORMATION`
    - `urgency: MEDIUM`
  - Preserve text exactly except trim leading/trailing whitespace.
- Migration runs before the new writer path is enabled in production.
- If migration encounters invalid/unknown shape, fail fast and log affected story/page IDs.

### 3.2 Canonical validators
- Centralize prefix validation in a single shared module used by all writer entry points.
- Canonical ID prefixes:
  - `th-`, `cn-`, `inv-`, `hp-`, `td-`, `cs-`
- Reject cross-category IDs (for example `th-*` in `constraintsRemoved[]`).

### 3.3 Observability
- Emit structured metrics/counters for validator failures by rule key.
- Emit migration summary metrics:
  - total pages scanned
  - pages migrated
  - pages failed
- Log events must include stable identifiers for debugging (storyId, pageId, requestId).

---

## 4) Tests That Must Pass

### 3.1 Typed threads tests (new)
1. Writer schema accepts `threadsAdded: ThreadAdd[]` and rejects plain strings.
2. Prompt rendering:
   - OPEN THREADS shows `(TYPE/URGENCY)` beside each thread ID.

### 3.2 Output validator tests (new)
1. Reject if additions include ID-like strings.
2. Reject if removals include non-ID text.
3. Reject if any two choices share the same `(choiceType, primaryDelta)` pair.
4. Reject if protagonistAffect missing required fields.
5. Reject if removed/resolved ID prefix does not match its field category.

### 3.3 Migration and cutover tests (new)
1. Migration converts legacy thread strings to object shape with default enum values.
2. Migration trims thread text and rejects empty-after-trim strings.
3. Runtime rejects legacy `threadsAdded: string[]` payloads after cutover.
4. No legacy prompt template path remains reachable.

---

## Non-Goals (explicitly not changing now)
- Adding enums for threats/constraints/inventory/health beyond current rules.
- Adding beat emotional tone tags or convergence-point schema fields.
- Changing the 3-act / 2–4 beats constraints.
