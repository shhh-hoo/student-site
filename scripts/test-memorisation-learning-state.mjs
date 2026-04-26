import assert from "node:assert/strict";

import {
  buildCanonicalContentIndex,
  createLearningStateStore,
  exportLearningState,
  getAllProgress,
  getProgress,
  importLearningState,
  learningProgressStorageKey,
  migrateLegacySessionProgress,
  progressMigratedStorageKey,
  recordAttempt,
  reviewListStorageKey,
} from "../interactive/9701-memorisation-bank/learning-state.mjs";
import { legacySessionBackupKey } from "../interactive/9701-memorisation-bank/legacy-progress-safety.mjs";
import { buildStableContentId } from "../interactive/9701-memorisation-bank/learning-state-id.mjs";

class MemoryStorage {
  constructor(entries = []) {
    this.map = new Map(entries);
  }

  get length() {
    return this.map.size;
  }

  key(index) {
    return [...this.map.keys()][index] ?? null;
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(String(key), String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

class BackupFailingStorage extends MemoryStorage {
  setItem(key, value) {
    if (key === legacySessionBackupKey) {
      const error = new Error("quota");
      error.name = "QuotaExceededError";
      throw error;
    }

    super.setItem(key, value);
  }
}

const baseNow = "2026-04-26T10:00:00.000Z";
const laterNow = "2026-04-27T10:00:00.000Z";
const latestNow = "2026-04-28T10:00:00.000Z";

const coreContentId = buildStableContentId({
  stage: "AS",
  levelId: "level-1-core",
  topicSlug: "atomic-structure",
  fileId: "core-definitions",
  sourceId: "as-def-001",
  kind: "single",
  blankIndex: 0,
});
const guidedContentId = buildStableContentId({
  stage: "AS",
  levelId: "level-2-guided-cloze",
  topicSlug: "group-2",
  fileId: "guided-cloze",
  sourceId: "as-exp-003",
  kind: "cloze",
  blankIndex: 1,
});
const topicChangeContentId = buildStableContentId({
  stage: "AS",
  levelId: "level-1-core",
  topicSlug: "bonding",
  fileId: "core-definitions",
  sourceId: "as-def-010",
  kind: "single",
  blankIndex: 0,
});

function makeCanonicalItems() {
  return [
    {
      stage: "AS",
      level: "level-1-core",
      topic: "atomic-structure",
      fileId: "core-definitions",
      sourceId: "as-def-001",
      kind: "single",
      id: "core-definitions::atomic-structure::as-def-001",
      blanks: [{ id: "core-definitions::atomic-structure::as-def-001::0", blankIndex: 0 }],
    },
    {
      stage: "AS",
      level: "level-2-guided-cloze",
      topic: "group-2",
      fileId: "guided-cloze",
      sourceId: "as-exp-003",
      kind: "cloze",
      id: "guided-cloze::group-2::as-exp-003",
      blanks: [
        { id: "guided-cloze::group-2::as-exp-003::0", blankIndex: 0 },
        { id: "guided-cloze::group-2::as-exp-003::1", blankIndex: 1 },
      ],
    },
  ];
}

function parseStored(storage, key) {
  return JSON.parse(storage.getItem(key));
}

function assertNoPrivateValues(value) {
  const serialized = JSON.stringify(value);

  assert.equal(serialized.includes("student typed secret"), false);
  assert.equal(serialized.includes("student copy secret"), false);
  assert.equal(serialized.includes("wrong copy secret"), false);
}

{
  const storage = new MemoryStorage();
  const store = createLearningStateStore({ storage, now: () => baseNow });

  let record = store.getProgress(coreContentId);
  assert.equal(record.status, "unseen");
  assert.equal(record.correctCount, 0);

  record = store.recordAttempt({ contentId: coreContentId, result: "correct" });
  assert.equal(record.correctCount, 1);
  assert.equal(record.streak, 1);
  assert.equal(record.hintCount, 0);
  assert.equal(record.status, "learning");
  assert.equal(record.masteryScore, 20);

  record = store.recordAttempt({ contentId: coreContentId, result: "correct", hintsUsed: 2 });
  assert.equal(record.correctCount, 2);
  assert.equal(record.hintCount, 2);
  assert.equal(record.masteryScore, 32);

  record = store.recordAttempt({ contentId: coreContentId, result: "incorrect" });
  assert.equal(record.wrongCount, 1);
  assert.equal(record.streak, 0);
  assert.equal(record.status, "reviewing");
  assert.equal(store.getDueReviewItems().length, 1);

  record = store.recordAttempt({ contentId: coreContentId, result: "gave_up" });
  assert.equal(record.gaveUpCount, 1);
  assert.equal(record.status, "reviewing");

  record = store.recordAttempt({ contentId: coreContentId, result: "revealed" });
  assert.equal(record.revealedCount, 1);
  assert.equal(record.status, "reviewing");
  console.log("PASS 1: recordAttempt updates counts, status, review queue, hints, and mastery score.");
}

{
  const storage = new MemoryStorage();

  recordAttempt({ contentId: coreContentId, result: "correct" }, { storage, now: () => baseNow });
  const refreshedRecord = getProgress(coreContentId, { storage, now: () => laterNow });
  const allProgress = getAllProgress({ storage });

  assert.equal(refreshedRecord.correctCount, 1);
  assert.equal(Object.keys(allProgress).length, 1);
  assert.equal(parseStored(storage, learningProgressStorageKey).records[coreContentId].correctCount, 1);
  console.log("PASS 2: progress persists through a fresh store/read cycle.");
}

{
  const storage = new MemoryStorage();
  const oldKey = "memorisation-bank-session::AS::level-2-guided-cloze::group-2::guided-cloze::all::all";
  const legacyPayload = {
    version: 1,
    selectionKey: "AS::level-2-guided-cloze::group-2::guided-cloze::all::all",
    currentBlankId: "guided-cloze::group-2::as-exp-003::1",
    blankStates: [
      {
        id: "guided-cloze::group-2::as-exp-003::1",
        value: "student typed secret",
        status: "wrong",
        wrongCount: 2,
        revealed: true,
        matchState: "checked",
        reviewPriority: 12,
      },
    ],
    easyQuestionStates: [],
  };
  storage.setItem(oldKey, JSON.stringify(legacyPayload));

  const result = migrateLegacySessionProgress({
    storage,
    now: () => baseNow,
    canonicalItems: makeCanonicalItems(),
    currentSessionVersion: 2,
  });
  const record = getProgress(guidedContentId, { storage });
  const backup = parseStored(storage, legacySessionBackupKey);

  assert.equal(result.ok, true);
  assert.equal(record.status, "reviewing");
  assert.equal(record.wrongCount, 2);
  assert.equal(record.revealedCount, 1);
  assert.equal(record.legacySources.length, 1);
  assert.equal(storage.getItem(oldKey), JSON.stringify(legacyPayload));
  assert.equal(backup.entries.length, 1);
  assertNoPrivateValues(parseStored(storage, learningProgressStorageKey));
  console.log(
    "PASS 3: v1 legacy blank state migrates after backup without copying typed values or deleting legacy keys."
  );
}

{
  const storage = new MemoryStorage();
  const currentUnrestoredKey =
    "memorisation-bank-session::AS::level-1-core::atomic-structure::core-definitions::paper_only::all";
  storage.setItem(
    currentUnrestoredKey,
    JSON.stringify({
      version: 2,
      selectionKey: "AS::level-1-core::atomic-structure::core-definitions::paper_only::all",
      currentBlankId: "core-definitions::atomic-structure::as-def-001::0",
      blankStates: [
        {
          id: "core-definitions::atomic-structure::as-def-001::0",
          value: "student typed secret",
          status: "correct",
          wrongCount: 0,
          revealed: false,
        },
      ],
      easyQuestionStates: [
        {
          questionId: "core-definitions::atomic-structure::as-def-001",
          easyStep: "copy",
          selectedKeywordIds: ["keyword-1"],
          keywordStatus: "correct",
          copyValue: "student copy secret",
          copyStatus: "correct",
        },
      ],
    })
  );

  const result = migrateLegacySessionProgress({
    storage,
    now: () => baseNow,
    canonicalItems: makeCanonicalItems(),
    currentSessionVersion: 2,
  });
  const record = getProgress(coreContentId, { storage });

  assert.equal(result.ok, true);
  assert.equal(record.correctCount, 2);
  assert.equal(record.legacySources.length, 2);
  assert.equal(record.status, "learning");
  assertNoPrivateValues(parseStored(storage, learningProgressStorageKey));
  console.log("PASS 4: current v2 session data can migrate without relying on current UI restore state.");
}

{
  const storage = new MemoryStorage();
  const malformedKey = "memorisation-bank-session::AS::level-2-guided-cloze::group-2::guided-cloze::all::all";
  storage.setItem(malformedKey, "{not json");

  const result = migrateLegacySessionProgress({
    storage,
    now: () => baseNow,
    canonicalItems: makeCanonicalItems(),
    currentSessionVersion: 2,
  });
  const progressPayload = parseStored(storage, learningProgressStorageKey);

  assert.equal(result.ok, true);
  assert.equal(progressPayload.unmatchedLegacyProgress.length, 1);
  assert.equal(progressPayload.unmatchedLegacyProgress[0].legacyKind, "session");
  assert.equal(progressPayload.unmatchedLegacyProgress[0].parseStatus, "malformed");
  assert.equal(storage.getItem(malformedKey), "{not json");
  console.log("PASS 5: malformed legacy JSON is preserved as an unmatched summary without raw payload leakage.");
}

{
  const legacyKey = "memorisation-bank-session::AS::level-2-guided-cloze::group-2::guided-cloze::all::all";
  const storage = new BackupFailingStorage([
    [
      legacyKey,
      JSON.stringify({
        version: 1,
        selectionKey: "AS::level-2-guided-cloze::group-2::guided-cloze::all::all",
        blankStates: [
          {
            id: "guided-cloze::group-2::as-exp-003::1",
            value: "student typed secret",
            status: "wrong",
            wrongCount: 1,
          },
        ],
        easyQuestionStates: [],
      }),
    ],
  ]);

  const result = migrateLegacySessionProgress({
    storage,
    now: () => baseNow,
    canonicalItems: makeCanonicalItems(),
    currentSessionVersion: 2,
  });

  assert.equal(result.ok, false);
  assert.equal(result.migrated, false);
  assert.equal(storage.getItem(learningProgressStorageKey), null);
  assert.equal(storage.getItem(legacyKey).includes("student typed secret"), true);
  console.log("PASS 6: backup failure blocks migration writes and leaves legacy data recoverable.");
}

{
  const storage = new MemoryStorage();
  const legacyKey = "memorisation-bank-session::AS::level-2-guided-cloze::group-2::guided-cloze::all::all";
  storage.setItem(
    legacyKey,
    JSON.stringify({
      version: 1,
      selectionKey: "AS::level-2-guided-cloze::group-2::guided-cloze::all::all",
      blankStates: [
        {
          id: "guided-cloze::group-2::unknown-source::0",
          value: "student typed secret",
          status: "wrong",
          wrongCount: 1,
          revealed: false,
        },
      ],
      easyQuestionStates: [
        {
          questionId: "guided-cloze::group-2::unknown-source",
          easyStep: "copy",
          selectedKeywordIds: ["keyword-1"],
          keywordStatus: "correct",
          copyValue: "wrong copy secret",
          copyStatus: "wrong",
        },
      ],
    })
  );

  migrateLegacySessionProgress({
    storage,
    now: () => baseNow,
    canonicalItems: makeCanonicalItems(),
    currentSessionVersion: 2,
  });
  const progressPayload = parseStored(storage, learningProgressStorageKey);

  assert.equal(progressPayload.unmatchedLegacyProgress.length, 2);
  assert.deepEqual(progressPayload.unmatchedLegacyProgress.map(entry => entry.legacyKind).sort(), [
    "blank",
    "easy-question",
  ]);
  assertNoPrivateValues(progressPayload);
  console.log("PASS 7: unmatched blank and Easy question ids are retained without typed or copy values.");
}

{
  const storage = new MemoryStorage();
  const legacyKey = "memorisation-bank-session::AS::level-2-guided-cloze::group-2::guided-cloze::all::all";
  storage.setItem(
    legacyKey,
    JSON.stringify({
      version: 1,
      selectionKey: "AS::level-2-guided-cloze::group-2::guided-cloze::all::all",
      blankStates: [
        {
          id: "guided-cloze::group-2::as-exp-003::1",
          value: "student typed secret",
          status: "wrong",
          wrongCount: 2,
          revealed: true,
        },
      ],
      easyQuestionStates: [],
    })
  );

  const first = migrateLegacySessionProgress({
    storage,
    now: () => baseNow,
    canonicalItems: makeCanonicalItems(),
    currentSessionVersion: 2,
  });
  const second = migrateLegacySessionProgress({
    storage,
    now: () => latestNow,
    canonicalItems: makeCanonicalItems(),
    currentSessionVersion: 2,
  });
  const record = getProgress(guidedContentId, { storage });
  const flag = parseStored(storage, progressMigratedStorageKey);

  assert.equal(first.migratedCount, 1);
  assert.equal(second.migratedCount, 0);
  assert.equal(second.skippedDuplicateCount, 1);
  assert.equal(record.wrongCount, 2);
  assert.equal(record.revealedCount, 1);
  assert.equal(record.legacySources.length, 1);
  assert.equal(flag.sourceKeyCount, 1);
  console.log("PASS 8: migration is idempotent and does not double-count legacy attempts.");
}

{
  const storage = new MemoryStorage();

  recordAttempt({ contentId: coreContentId, result: "correct" }, { storage, now: () => baseNow });
  recordAttempt({ contentId: coreContentId, result: "incorrect" }, { storage, now: () => laterNow });

  const incoming = {
    version: 1,
    progress: {
      version: 1,
      records: {
        [coreContentId]: {
          contentId: coreContentId,
          status: "learning",
          correctCount: 5,
          wrongCount: 1,
          hintCount: 3,
          gaveUpCount: 1,
          revealedCount: 2,
          streak: 4,
          lastSeenAt: "2026-04-29T10:00:00.000Z",
          nextReviewAt: "2026-04-26T09:00:00.000Z",
          masteryScore: 70,
          legacySources: [
            {
              storageKey: "memorisation-bank-session::AS::level-1-core::atomic-structure::core-definitions::all::all",
              legacyId: "core-definitions::atomic-structure::as-def-001::0",
              legacyKind: "blank",
              migratedAt: baseNow,
              contribution: { correctCount: 1, wrongCount: 0, hintCount: 0, gaveUpCount: 0, revealedCount: 0 },
            },
          ],
        },
      },
      unmatchedLegacyProgress: [
        {
          sourceStorageKey: "memorisation-bank-session::AS::level-1-core::unknown::core-definitions::all::all",
          legacyId: "unknown",
          legacyKind: "blank",
          parseStatus: "parsed",
          detectedVersion: 1,
          selectionKey: "AS::level-1-core::unknown::core-definitions::all::all",
          summaryCounts: { status: "wrong", wrongCount: 1 },
          reviewReasons: ["wrong-answer"],
          capturedAt: baseNow,
        },
      ],
    },
    reviewList: {
      version: 1,
      items: {
        [coreContentId]: {
          contentId: coreContentId,
          reasons: ["imported-review"],
          addedAt: baseNow,
          nextReviewAt: "2026-04-26T09:00:00.000Z",
        },
      },
    },
    settings: { version: 1, localSetting: "imported" },
  };

  const result = importLearningState(incoming, { storage, now: () => latestNow });
  const record = getProgress(coreContentId, { storage });
  const due = createLearningStateStore({ storage, now: () => latestNow }).getDueReviewItems();

  assert.equal(result.ok, true);
  assert.equal(record.correctCount, 5);
  assert.equal(record.wrongCount, 1);
  assert.equal(record.hintCount, 3);
  assert.equal(record.gaveUpCount, 1);
  assert.equal(record.revealedCount, 2);
  assert.equal(record.lastSeenAt, "2026-04-29T10:00:00.000Z");
  assert.equal(record.nextReviewAt, "2026-04-26T09:00:00.000Z");
  assert.equal(due[0].reasons.includes("incorrect"), true);
  assert.equal(due[0].reasons.includes("imported-review"), true);
  assert.equal(parseStored(storage, learningProgressStorageKey).unmatchedLegacyProgress.length, 1);
  console.log("PASS 9: import merges records, review reasons, timestamps, legacy sources, and unmatched summaries.");
}

{
  const storage = new MemoryStorage();

  recordAttempt({ contentId: coreContentId, result: "correct" }, { storage, now: () => baseNow });
  const exported = exportLearningState({ storage, now: () => laterNow });

  assert.equal(exported.version, 1);
  assert.equal(exported.exportedAt, laterNow);
  assert.equal(exported.progress.version, 1);
  assert.equal(exported.reviewList.version, 1);
  assert.equal(exported.settings.version, 1);
  assert.equal(exported.progress.records[coreContentId].correctCount, 1);
  assertNoPrivateValues(exported);
  console.log("PASS 10: export uses the versioned schema and excludes raw legacy/private answer data.");
}

{
  const storage = new MemoryStorage();

  recordAttempt({ contentId: coreContentId, result: "correct" }, { storage, now: () => baseNow });
  recordAttempt({ contentId: topicChangeContentId, result: "incorrect" }, { storage, now: () => laterNow });

  const refreshedCore = getProgress(coreContentId, { storage });
  const refreshedTopic = getProgress(topicChangeContentId, { storage });
  const progressKeys = Object.keys(getAllProgress({ storage })).sort();

  assert.equal(refreshedCore.correctCount, 1);
  assert.equal(refreshedTopic.wrongCount, 1);
  assert.deepEqual(progressKeys, [coreContentId, topicChangeContentId].sort());
  assert.equal(parseStored(storage, reviewListStorageKey).items[topicChangeContentId].contentId, topicChangeContentId);
  console.log("PASS 11: progress is independent of current filters, topic, file, page, and session keys.");
}

{
  const index = buildCanonicalContentIndex(makeCanonicalItems());

  assert.equal(index.blankByLegacyId.get("core-definitions::atomic-structure::as-def-001::0"), coreContentId);
  assert.equal(index.questionByLegacyId.get("core-definitions::atomic-structure::as-def-001"), coreContentId);
  assert.equal(index.blankByLegacyId.get("guided-cloze::group-2::as-exp-003::1"), guidedContentId);
  assert.equal(index.questionByLegacyId.get("guided-cloze::group-2::as-exp-003"), undefined);
  console.log(
    "PASS 12: canonical content index maps runtime blank context without enabling cloze Easy question guesses."
  );
}

console.log("Memorisation learning-state checks passed: 12");
