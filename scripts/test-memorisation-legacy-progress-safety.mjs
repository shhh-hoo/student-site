import assert from "node:assert/strict";

import {
  buildLegacyProgressReport,
  classifyLegacySessionValue,
  ensureLegacyBackupSnapshot,
  exportRawLegacyBackup,
  legacySessionBackupKey,
  shouldSkipSessionWriteForClassification,
} from "../interactive/9701-memorisation-bank/legacy-progress-safety.mjs";

class MemoryStorage {
  constructor(entries = []) {
    this.map = new Map(entries);
    this.failSetItem = false;
  }

  get length() {
    return this.map.size;
  }

  key(index) {
    return Array.from(this.map.keys())[index] || null;
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    if (this.failSetItem) {
      const error = new Error("Quota exceeded");
      error.name = "QuotaExceededError";
      throw error;
    }

    this.map.set(String(key), String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }
}

const currentVersion = 2;
const legacyKey = "memorisation-bank-session::AS::level-2-guided-cloze::group-2::guided-cloze::all::all";
const nextLegacyKey = "memorisation-bank-session::AS::level-1-core::atomic-structure::core-definitions::all::all";
const secretValue = "student typed secret";
const legacyPayload = {
  version: 1,
  selectionKey: "AS::level-2-guided-cloze::group-2::guided-cloze::all::all",
  createdAt: "2026-01-02T03:04:05.000Z",
  blankStates: [
    {
      id: "guided-cloze::group-2::as-exp-003::0",
      value: secretValue,
      status: "wrong",
      wrongCount: 2,
    },
  ],
  easyQuestionStates: [
    {
      questionId: "guided-cloze::group-2::as-exp-003",
      copyValue: "student copy secret",
    },
  ],
};

{
  const classification = classifyLegacySessionValue(JSON.stringify(legacyPayload), { currentVersion });

  assert.equal(classification.classification, "legacy-compatible");
  assert.equal(shouldSkipSessionWriteForClassification(classification.classification), true);
  assert.equal(classification.detectedVersion, 1);
  assert.equal(classification.itemCounts.blankStates, 1);
  assert.equal(classification.itemCounts.easyQuestionStates, 1);
  assert.equal(classification.legacyCreatedAt, legacyPayload.createdAt);
  console.log("PASS 1: older session payloads are classified as protected legacy progress.");
}

{
  const storage = new MemoryStorage([[legacyKey, JSON.stringify(legacyPayload)]]);
  const result = ensureLegacyBackupSnapshot(storage, {
    currentVersion,
    now: () => "2026-04-26T00:00:00.000Z",
  });
  const backup = JSON.parse(storage.getItem(legacySessionBackupKey));

  assert.equal(result.ok, true);
  assert.equal(result.wrote, true);
  assert.deepEqual(result.appendedKeys, [legacyKey]);
  assert.equal(backup.entries.length, 1);
  assert.equal(backup.entries[0].key, legacyKey);
  assert.equal(backup.entries[0].rawValue, JSON.stringify(legacyPayload));
  assert.equal(backup.entries[0].legacyCreatedAt, legacyPayload.createdAt);
  assert.equal(backup.entries[0].backupCapturedAt, "2026-04-26T00:00:00.000Z");
  console.log("PASS 2: backup captures raw legacy data once with legacy and backup timestamps.");
}

{
  const storage = new MemoryStorage([[legacyKey, JSON.stringify(legacyPayload)]]);
  ensureLegacyBackupSnapshot(storage, {
    currentVersion,
    now: () => "2026-04-26T00:00:00.000Z",
  });
  const originalBackup = JSON.parse(storage.getItem(legacySessionBackupKey));
  const changedPayload = {
    version: currentVersion,
    selectionKey: legacyPayload.selectionKey,
    blankStates: [],
    easyQuestionStates: [],
  };

  storage.setItem(legacyKey, JSON.stringify(changedPayload));
  storage.setItem(nextLegacyKey, "{malformed");
  const secondResult = ensureLegacyBackupSnapshot(storage, {
    currentVersion,
    now: () => "2026-04-26T01:00:00.000Z",
  });
  const nextBackup = JSON.parse(storage.getItem(legacySessionBackupKey));

  assert.equal(secondResult.ok, true);
  assert.equal(secondResult.wrote, true);
  assert.deepEqual(secondResult.appendedKeys, [nextLegacyKey]);
  assert.equal(nextBackup.entries.length, 2);
  assert.equal(nextBackup.entries[0].rawValue, originalBackup.entries[0].rawValue);
  assert.equal(nextBackup.entries[0].backupCapturedAt, originalBackup.entries[0].backupCapturedAt);
  assert.equal(nextBackup.entries[1].key, nextLegacyKey);
  assert.equal(nextBackup.entries[1].parseStatus, "malformed");
  console.log("PASS 3: backup appends new keys without mutating existing backup entries.");
}

{
  const storage = new MemoryStorage([[legacyKey, "{malformed"]]);
  const report = buildLegacyProgressReport(storage, { currentVersion });
  const serializedReport = JSON.stringify(report);

  assert.equal(report.ok, true);
  assert.equal(report.sessions[0].classification, "malformed");
  assert.equal(report.sessions[0].parseStatus, "malformed");
  assert.equal(serializedReport.includes("{malformed"), false);
  assert.equal(serializedReport.includes(secretValue), false);
  console.log("PASS 4: malformed legacy JSON is reported without exposing raw values.");
}

{
  const unRestoredPayload = {
    version: currentVersion,
    selectionKey: legacyPayload.selectionKey,
    currentBlankId: "guided-cloze::group-2::as-exp-003::0",
  };
  const classification = classifyLegacySessionValue(JSON.stringify(unRestoredPayload), {
    currentVersion,
    expectedSelectionKey: legacyPayload.selectionKey,
  });

  assert.equal(classification.classification, "un-restored");
  assert.equal(shouldSkipSessionWriteForClassification(classification.classification), true);
  console.log("PASS 5: current-version payloads rejected by restore logic are protected from overwrite.");
}

{
  const storage = new MemoryStorage([[legacyKey, JSON.stringify(legacyPayload)]]);
  ensureLegacyBackupSnapshot(storage, { currentVersion });
  const report = buildLegacyProgressReport(storage, { currentVersion });
  const serializedReport = JSON.stringify(report);
  const rawExport = exportRawLegacyBackup(storage);

  assert.equal(serializedReport.includes(secretValue), false);
  assert.equal(serializedReport.includes("student copy secret"), false);
  assert.equal(serializedReport.includes("rawValue"), false);
  assert.equal(rawExport.warning.includes("private learning data"), true);
  assert.equal(rawExport.rawBackup.includes(secretValue), true);
  console.log("PASS 6: debug report redacts typed values while raw export remains explicit.");
}

{
  const storage = new MemoryStorage([[legacyKey, JSON.stringify(legacyPayload)]]);
  storage.failSetItem = true;
  const result = ensureLegacyBackupSnapshot(storage, { currentVersion });

  assert.equal(result.ok, false);
  assert.equal(result.errorType, "quota");
  console.log("PASS 7: backup failures are surfaced so risky auto-save can be disabled.");
}

{
  assert.equal(shouldSkipSessionWriteForClassification("legacy-compatible"), true);
  assert.equal(shouldSkipSessionWriteForClassification("malformed"), true);
  assert.equal(shouldSkipSessionWriteForClassification("un-restored"), true);
  assert.equal(shouldSkipSessionWriteForClassification("empty"), false);
  assert.equal(shouldSkipSessionWriteForClassification("current-compatible"), false);
  console.log("PASS 8: write skipping is limited to protected legacy and un-restored classifications.");
}

console.log("Memorisation legacy progress safety checks passed: 8");
