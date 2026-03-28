# Character Chat Relationship Timeline

## Canonical Contract

- The canonical relationship-display source is the persisted `relationshipSnapshot` attached to each committed character turn.
- Each snapshot describes post-turn relationship state after that character turn completes.
- A snapshot contains:
  - `dynamic`
  - `valence`
  - `tension`
  - `leverage`
  - `whatCharacterBelievesAboutInterlocutor`

## Ownership

- `relationshipSnapshot` owns chat relationship display and historical relationship timeline rendering.
- Session-level `relationshipState` remains the prompt/runtime state the pipeline mutates after each turn.
- After a successful character turn, `relationshipState` must agree with that turn's `relationshipSnapshot` for `dynamic`, `valence`, `tension`, and `leverage`.
- `chatBible.relationshipNow` remains a prompt/runtime curation artifact and is not a UI source of truth for relationship display.

## Pipeline

- The existing chat state-updater stage owns post-turn relationship extraction.
- The updater returns:
  - delta-oriented `stateUpdate`
  - absolute `relationshipSnapshot`
- The pipeline persists the snapshot on the committed character turn.
- The system does not add a second relationship-only LLM stage.

## UI Rules

- Initial page bootstrap derives relationship UI data from the persisted relationship timeline.
- Live sidebar updates append the just-committed character turn snapshot.
- Gauge values, ghost markers, sparklines, and turn-over-turn deltas are derived from adjacent snapshots in timeline order.
- The UI must not rebase delta-derived history against `chatBible.relationshipNow`.
