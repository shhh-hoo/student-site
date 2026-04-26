# Memorisation Bank Learning State Plan

This document defines the PR2 learning-state design before migration code is
implemented. PR2A is planning and pure-helper preparation only. It does not
write `mb:progress:v1`, does not migrate data, and does not add My Review Bank,
custom items, or Easy Mode hint changes.

PR19 already protects legacy session keys matching `memorisation-bank-session::*`
and stores raw recovery snapshots in `mb:legacy-session-backup:v1`. PR2B must use
that safety layer before any migration starts.

## A. Generated Content ID Algorithm

Canonical progress records need stable runtime content IDs that survive UI
filters, order changes, page changes, and session state resets.

The content ID must not depend on:

- Array index in a loaded JSON file.
- Current UI order.
- Current filter state.
- Page number.
- The selected session round filter.
- Mutable prompt wording alone.

The content ID uses stable dimensions that already exist in the catalog and
source payload:

- Stage, normalized to lowercase, for example `as` or `a2`.
- Level id, for example `level-1-core`.
- Topic slug, for example `atomic-structure` or `group-2`.
- File id or pack id, for example `core-definitions`, `guided-cloze`, or
  `multi-round-cloze`.
- Canonical source id from the source payload, for example `as-def-001` or
  `as-exp-003`.
- Runtime unit kind, for example `single`, `cloze`, or `reconstruction`.
- Canonical round number only when the source item itself has rounds, not the
  current UI round filter.
- Blank index within the canonical runtime unit.
- Optional duplicate key when a raw source id is duplicated inside the same
  stage, level, topic, file, kind, round, and blank.

PR2B must build these IDs from canonical runtime item context produced by the
catalog/source item matching layer. Migration code must not guess stage, topic,
file, kind, round, or blank context from a legacy id string alone.

Proposed helper:

```js
buildStableContentId({
  stage,
  levelId,
  topicSlug,
  fileId,
  sourceId,
  kind,
  round,
  blankIndex,
  duplicateKey,
});
```

Proposed ID format:

```text
mb:canonical:v1:<stage>:<levelId>:<topicSlug>:<fileId>:<sourceId>:<kind>[:round-<n>]:blank-<n>[:dup-<duplicateKey>]
```

The checked unit in the current product is a blank, not only a source item. This
means Level 1 definitions and Level 4 reconstruction usually use `blank-0`,
while guided and multi-round cloze items may create several progress records for
one canonical source item.

### Duplicate Raw Source IDs

Raw source IDs repeat across levels and files. For example, `as-exp-003` exists
in Level 2 guided cloze and Level 3 multi-round cloze. That is acceptable because
the ID includes stage, level, topic, file, kind, round, and blank.

If the same raw source id repeats inside the exact same stage, level, topic, file,
kind, round, and blank, PR2B must not use array position to resolve it. It should
use a stable duplicate key derived from immutable source metadata, such as:

- source subtopic slug
- source type
- source scope
- canonical pack id
- explicit canonical id if the source later adds one

If those fields still cannot distinguish the records, migration should store the
legacy record under `unmatchedLegacyProgress` and report that the canonical source
needs an id repair. It should not guess based on array index.

### Examples

AS Level 1 core definition:

```text
Source: AS / level-1-core / atomic-structure / core-definitions / as-def-001
Content ID:
mb:canonical:v1:as:level-1-core:atomic-structure:core-definitions:as-def-001:single:blank-0
```

A2 Level 1 core item:

```text
Source: A2 / level-1-core / thermodynamics / core-definitions / a2-def-001
Content ID:
mb:canonical:v1:a2:level-1-core:thermodynamics:core-definitions:a2-def-001:single:blank-0
```

Guided cloze item:

```text
Source: AS / level-2-guided-cloze / group-2 / guided-cloze / as-exp-003
Blank 0 content ID:
mb:canonical:v1:as:level-2-guided-cloze:group-2:guided-cloze:as-exp-003:cloze:blank-0

Blank 2 content ID:
mb:canonical:v1:as:level-2-guided-cloze:group-2:guided-cloze:as-exp-003:cloze:blank-2
```

Multi-round cloze item:

```text
Source: AS / level-3-multi-round-cloze / group-2 / multi-round-cloze / as-exp-003 / round 2
Blank 0 content ID:
mb:canonical:v1:as:level-3-multi-round-cloze:group-2:multi-round-cloze:as-exp-003:cloze:round-2:blank-0
```

## B. Legacy Migration Mapping Table

Target progress shape for PR2B:

```js
{
  contentId,
  status: "unseen" | "learning" | "reviewing" | "mastered",
  correctCount,
  wrongCount,
  hintCount,
  gaveUpCount,
  revealedCount,
  streak,
  lastSeenAt,
  nextReviewAt,
  masteryScore,
  legacySources,
}
```

PR2B should create progress records only after a legacy id is confidently mapped
to a generated content ID. Typed student answers must never be copied into normal
progress records.

### `blankStates[]` Mapping

| Legacy signal                                                       | Target mapping                                                                            | Notes                                                                                                                                                      |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status === "correct"`                                              | `correctCount += 1`, `streak += 1`, `status = "learning"` unless other review debt exists | A single legacy correct should not automatically prove `mastered`.                                                                                         |
| `status === "wrong"`                                                | `wrongCount += max(1, wrongCount)`, `status = "reviewing"`                                | Add or keep the item in review.                                                                                                                            |
| `wrongCount > 0`                                                    | `wrongCount += wrongCount`, `status = "reviewing"`                                        | Applies even if `status` is stale or missing.                                                                                                              |
| `revealed === true` or `status === "revealed"`                      | `revealedCount += 1`, `status = "reviewing"`                                              | Existing reveal semantics mean "show answer"; do not count as mastery. Do not map to `gaveUpCount` unless PR3 introduces explicit stuck/give-up semantics. |
| `value`                                                             | Do not migrate                                                                            | Typed answers stay only in PR19 raw backup.                                                                                                                |
| `coveredGroups`, `missingGroups`, `contradictionHits`, `matchState` | Optional summary only                                                                     | Store only counts/flags if useful for diagnostics; do not store answer text.                                                                               |
| `reviewPriority`, `lastReviewSignalAt`                              | Preserve as legacy review reason/priority when possible                                   | This can seed review ordering but should not override new scheduling once the item is seen again.                                                          |

Recommended status resolution for combined signals:

- Any wrong or revealed signal wins over correct and sets `status = "reviewing"`.
- Correct without review debt sets `status = "learning"` and increases
  `masteryScore`, but does not immediately set `mastered`.
- Idle or untouched records should remain `unseen` unless they carry review debt.

### `easyQuestionStates[]` Mapping

| Legacy signal                 | Target mapping                                                              | Notes                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `easyStep === "copy"`         | Preserve as legacy activity only                                            | Reaching copy step means keyword order was likely solved, but it is not mastery proof.                           |
| `selectedKeywordIds`          | Preserve count only                                                         | Do not copy keyword ids into progress unless needed for diagnostics; selected ids alone do not count as mastery. |
| `keywordStatus === "correct"` | Preserve as legacy activity only                                            | Keyword-only completion is lower-confidence practice, not an answer check.                                       |
| `copyStatus === "correct"`    | `correctCount += 1`, lower `masteryScore` than clean full dictation correct | This is a correct copy after support, so it is lower-confidence evidence.                                        |
| `copyStatus === "wrong"`      | `wrongCount += 1`, `status = "reviewing"`                                   | Add or keep in review.                                                                                           |
| `copyValue`                   | Do not migrate                                                              | Copied answer text stays only in PR19 raw backup.                                                                |

Easy Mode is now limited to Level 1 core items. Legacy Easy records from older
guided or multi-round sessions should be treated as legacy activity. They should
not re-enable Easy Mode for those levels.

## C. Unmatched Legacy Records Strategy

Migration can only write normal progress when a legacy blank id or question id is
confidently matched to a generated content ID. If matching fails, PR2B must keep
the data recoverable without leaking typed answers.

Unmatched records should be stored under `unmatchedLegacyProgress` inside the
`mb:progress:v1` payload. PR2B should use this single location unless a later
review explicitly chooses a separate key; splitting unmatched records into a
separate storage key would complicate export/import and migration idempotency.

```js
{
  unmatchedLegacyProgress: [
    {
      sourceStorageKey,
      legacyId,
      legacyKind: "blank" | "easy-question" | "session",
      parseStatus,
      detectedVersion,
      selectionKey,
      summaryCounts,
      reviewReasons,
      capturedAt,
    },
  ];
}
```

Rules:

- Do not discard unmatched records.
- Preserve source storage key, legacy id, parse status, detected version,
  selection key, and summary counts.
- Do not preserve typed answer values, copy values, full custom answers, or custom
  content in normal progress records.
- Raw recovery remains available only through the PR19 debug backup
  `mb:legacy-session-backup:v1`.
- If the legacy id looks structurally valid but no canonical source can be found,
  mark the record as unmatched instead of fabricating a content ID.

## D. Migration Safety Rules

Future PR2B migration must be non-destructive and repeatable.

Migration must:

- Call `ensureLegacyBackupSnapshot()` before migration starts.
- Never delete legacy `memorisation-bank-session::*` keys.
- Never overwrite `mb:legacy-session-backup:v1`.
- Write migrated progress to a new key only, initially `mb:progress:v1`.
- Store review scheduling in `mb:review-list:v1` only when PR2B implements the
  runtime learning state.
- Be idempotent.
- Mark completion with a separate flag, for example
  `mb:progress:migrated:v1`.
- Record which legacy storage key and legacy ids contributed to each migrated
  record in `legacySources`.
- Be able to re-run without duplicating counts.
- Preserve unmatched legacy records.
- Skip migration writes if backup fails.
- Never treat missing imported records as a reason to delete local records.

Idempotency should be based on source markers, not only counts. A progress record
can keep `legacySources` entries like:

```js
{
  storageKey,
  legacyId,
  legacyKind,
  migratedAt,
  contribution: {
    correctCount,
    wrongCount,
    revealedCount,
  },
}
```

When PR2B re-runs, it should detect that the same storage key and legacy id have
already contributed and avoid adding the same counts again.

## E. Import/Export Merge Strategy

PR2B should define:

```js
exportLearningState();
importLearningState(payload);
```

Export should include:

- Schema version.
- Progress records by `contentId`.
- Review list entries.
- Settings if PR2B introduces settings.
- Custom items only in a later PR that implements custom items.
- `unmatchedLegacyProgress` summaries.

Export should not include:

- Legacy typed answer values.
- Easy Mode `copyValue`.
- Raw backup payloads.
- Private raw localStorage values.

Import must be non-destructive by default:

- Validate schema version first.
- Merge records by `contentId`.
- Preserve the higher `correctCount`.
- Preserve the higher `wrongCount`.
- Preserve the higher `hintCount`.
- Preserve the higher `gaveUpCount`.
- Preserve the higher `revealedCount`.
- Preserve the latest `lastSeenAt`.
- Preserve the earliest `nextReviewAt` if either record is due.
- Merge `legacySources` by stable source marker.
- Merge `unmatchedLegacyProgress` by source storage key and legacy id.
- Never delete local records just because they are absent from the imported
  payload.

Destructive reset must be a separate explicit action. Import must never act as a
reset by default.

## PR2B Handoff

PR2B can implement `learning-state.mjs` and migration after this plan is reviewed.
That implementation should use the pure helper functions introduced in PR2A, call
PR19 backup protection before touching legacy data, and follow the mapping and
merge rules above. It must resolve canonical runtime item context first, then
call `buildStableContentId()` with that context; it should store unmatched
summaries inside `mb:progress:v1.unmatchedLegacyProgress`.
