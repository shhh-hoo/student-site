import {
  buildStableContentId,
  classifyLegacyBlankState,
  classifyLegacyEasyQuestionState,
} from "./learning-state-id.mjs";
import {
  classifyLegacySessionValue,
  ensureLegacyBackupSnapshot,
  listLegacySessionStorageKeys,
} from "./legacy-progress-safety.mjs";

export const learningProgressStorageKey = "mb:progress:v1";
export const reviewListStorageKey = "mb:review-list:v1";
// Reserved for PR4. PR2B must not read from or write to custom review items.
export const customItemsStorageKey = "mb:custom-items:v1";
export const settingsStorageKey = "mb:settings:v1";
export const progressMigratedStorageKey = "mb:progress:migrated:v1";

const schemaVersion = 1;
const defaultSessionStoragePrefix = "memorisation-bank-session";
const allowedStatuses = new Set(["unseen", "learning", "reviewing", "mastered"]);
const allowedAttemptResults = new Set(["correct", "incorrect", "gave_up", "revealed"]);

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getDefaultStorage() {
  if (typeof globalThis.localStorage === "undefined") {
    throw new Error("Memorisation learning state requires localStorage or an injected storage object.");
  }

  return globalThis.localStorage;
}

function getStorage(options = {}) {
  return options.storage || getDefaultStorage();
}

function getNow(options = {}) {
  const now = options.now || (() => new Date().toISOString());
  return typeof now === "function" ? now() : String(now);
}

function parseJson(rawValue, fallback) {
  if (!rawValue) {
    return clone(fallback);
  }

  try {
    const parsed = JSON.parse(rawValue);
    return parsed === null || parsed === undefined ? clone(fallback) : parsed;
  } catch (error) {
    return clone(fallback);
  }
}

function safeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function clampScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
}

function normalizeIsoString(value) {
  if (!value) {
    return null;
  }

  const text = String(value);
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function compareIso(left, right) {
  const leftTime = Date.parse(left || "");
  const rightTime = Date.parse(right || "");

  if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) {
    return 0;
  }

  if (!Number.isFinite(leftTime)) {
    return 1;
  }

  if (!Number.isFinite(rightTime)) {
    return -1;
  }

  return leftTime - rightTime;
}

function latestIso(left, right) {
  const normalizedLeft = normalizeIsoString(left);
  const normalizedRight = normalizeIsoString(right);

  if (!normalizedLeft) {
    return normalizedRight;
  }

  if (!normalizedRight) {
    return normalizedLeft;
  }

  return compareIso(normalizedLeft, normalizedRight) >= 0 ? normalizedLeft : normalizedRight;
}

function earliestIso(left, right) {
  const normalizedLeft = normalizeIsoString(left);
  const normalizedRight = normalizeIsoString(right);

  if (!normalizedLeft) {
    return normalizedRight;
  }

  if (!normalizedRight) {
    return normalizedLeft;
  }

  return compareIso(normalizedLeft, normalizedRight) <= 0 ? normalizedLeft : normalizedRight;
}

function addDays(isoDate, days) {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function getProgressKey(options = {}) {
  return options.progressKey || learningProgressStorageKey;
}

function getReviewListKey(options = {}) {
  return options.reviewListKey || reviewListStorageKey;
}

function getSettingsKey(options = {}) {
  return options.settingsKey || settingsStorageKey;
}

function getMigrationFlagKey(options = {}) {
  return options.migrationFlagKey || progressMigratedStorageKey;
}

function createEmptyProgressPayload() {
  return {
    version: schemaVersion,
    records: {},
    unmatchedLegacyProgress: [],
    updatedAt: null,
  };
}

function createEmptyReviewListPayload() {
  return {
    version: schemaVersion,
    items: {},
    updatedAt: null,
  };
}

function createEmptySettingsPayload() {
  return {
    version: schemaVersion,
  };
}

function createDefaultProgressRecord(contentId) {
  return {
    contentId: String(contentId || ""),
    status: "unseen",
    correctCount: 0,
    wrongCount: 0,
    hintCount: 0,
    gaveUpCount: 0,
    revealedCount: 0,
    streak: 0,
    lastSeenAt: null,
    nextReviewAt: null,
    masteryScore: 0,
    legacySources: [],
  };
}

function normalizeLegacySource(source = {}) {
  if (!isObject(source)) {
    return null;
  }

  const storageKey = String(source.storageKey || source.sourceStorageKey || "");
  const legacyId = String(source.legacyId || "");
  const legacyKind = String(source.legacyKind || "");

  if (!storageKey || !legacyKind) {
    return null;
  }

  return {
    storageKey,
    legacyId,
    legacyKind,
    migratedAt: normalizeIsoString(source.migratedAt) || null,
    contribution: {
      correctCount: safeInteger(source.contribution?.correctCount),
      wrongCount: safeInteger(source.contribution?.wrongCount),
      hintCount: safeInteger(source.contribution?.hintCount),
      gaveUpCount: safeInteger(source.contribution?.gaveUpCount),
      revealedCount: safeInteger(source.contribution?.revealedCount),
    },
  };
}

function getLegacySourceMarker(source = {}) {
  return [
    String(source.storageKey || source.sourceStorageKey || ""),
    String(source.legacyKind || ""),
    String(source.legacyId || ""),
  ].join("::");
}

function mergeLegacySources(left = [], right = []) {
  const merged = [];
  const seen = new Set();

  [...left, ...right].forEach(source => {
    const normalized = normalizeLegacySource(source);

    if (!normalized) {
      return;
    }

    const marker = getLegacySourceMarker(normalized);

    if (seen.has(marker)) {
      return;
    }

    seen.add(marker);
    merged.push(normalized);
  });

  return merged;
}

function normalizeProgressRecord(record, fallbackContentId = "") {
  const contentId = String(record?.contentId || fallbackContentId || "");
  const normalized = createDefaultProgressRecord(contentId);

  if (!contentId || !isObject(record)) {
    return normalized;
  }

  normalized.status = allowedStatuses.has(record.status) ? record.status : normalized.status;
  normalized.correctCount = safeInteger(record.correctCount);
  normalized.wrongCount = safeInteger(record.wrongCount);
  normalized.hintCount = safeInteger(record.hintCount);
  normalized.gaveUpCount = safeInteger(record.gaveUpCount);
  normalized.revealedCount = safeInteger(record.revealedCount);
  normalized.streak = safeInteger(record.streak);
  normalized.lastSeenAt = normalizeIsoString(record.lastSeenAt);
  normalized.nextReviewAt = normalizeIsoString(record.nextReviewAt);
  normalized.masteryScore = clampScore(record.masteryScore);
  normalized.legacySources = mergeLegacySources(record.legacySources || []);

  return normalized;
}

function readProgressPayload(storage, options = {}) {
  const parsed = parseJson(storage.getItem(getProgressKey(options)), createEmptyProgressPayload());
  const payload = createEmptyProgressPayload();
  const rawRecords = isObject(parsed.records) ? parsed.records : {};

  Object.entries(rawRecords).forEach(([contentId, record]) => {
    const normalized = normalizeProgressRecord(record, contentId);

    if (normalized.contentId) {
      payload.records[normalized.contentId] = normalized;
    }
  });

  payload.unmatchedLegacyProgress = normalizeUnmatchedLegacyProgress(parsed.unmatchedLegacyProgress);
  payload.updatedAt = normalizeIsoString(parsed.updatedAt);

  return payload;
}

function writeProgressPayload(storage, payload, options = {}) {
  const nextPayload = {
    version: schemaVersion,
    records: payload.records || {},
    unmatchedLegacyProgress: normalizeUnmatchedLegacyProgress(payload.unmatchedLegacyProgress),
    updatedAt: getNow(options),
  };

  storage.setItem(getProgressKey(options), JSON.stringify(nextPayload));
  return nextPayload;
}

function normalizeReviewItem(item, fallbackContentId = "") {
  const contentId = String(item?.contentId || fallbackContentId || "");

  if (!contentId) {
    return null;
  }

  const reasons = Array.isArray(item?.reasons)
    ? item.reasons.map(reason => String(reason || "")).filter(Boolean)
    : item?.reason
      ? [String(item.reason)]
      : [];

  return {
    contentId,
    reasons: [...new Set(reasons)],
    addedAt: normalizeIsoString(item?.addedAt) || null,
    nextReviewAt: normalizeIsoString(item?.nextReviewAt) || null,
  };
}

function readReviewListPayload(storage, options = {}) {
  const parsed = parseJson(storage.getItem(getReviewListKey(options)), createEmptyReviewListPayload());
  const payload = createEmptyReviewListPayload();
  const rawItems = isObject(parsed.items) ? parsed.items : {};

  Object.entries(rawItems).forEach(([contentId, item]) => {
    const normalized = normalizeReviewItem(item, contentId);

    if (normalized) {
      payload.items[normalized.contentId] = normalized;
    }
  });

  payload.updatedAt = normalizeIsoString(parsed.updatedAt);

  return payload;
}

function writeReviewListPayload(storage, payload, options = {}) {
  const nextPayload = {
    version: schemaVersion,
    items: payload.items || {},
    updatedAt: getNow(options),
  };

  storage.setItem(getReviewListKey(options), JSON.stringify(nextPayload));
  return nextPayload;
}

function readSettingsPayload(storage, options = {}) {
  const parsed = parseJson(storage.getItem(getSettingsKey(options)), createEmptySettingsPayload());

  if (!isObject(parsed)) {
    return createEmptySettingsPayload();
  }

  return {
    ...parsed,
    version: schemaVersion,
  };
}

function writeSettingsPayload(storage, payload, options = {}) {
  const nextPayload = {
    ...createEmptySettingsPayload(),
    ...(isObject(payload) ? payload : {}),
    version: schemaVersion,
  };

  storage.setItem(getSettingsKey(options), JSON.stringify(nextPayload));
  return nextPayload;
}

function mergeReasons(left = [], right = []) {
  return [...new Set([...left, ...right].map(reason => String(reason || "")).filter(Boolean))];
}

function mergeReviewItem(left, right) {
  const normalizedLeft = normalizeReviewItem(left, right?.contentId);
  const normalizedRight = normalizeReviewItem(right, left?.contentId);

  if (!normalizedLeft) {
    return normalizedRight;
  }

  if (!normalizedRight) {
    return normalizedLeft;
  }

  return {
    contentId: normalizedLeft.contentId,
    reasons: mergeReasons(normalizedLeft.reasons, normalizedRight.reasons),
    addedAt: earliestIso(normalizedLeft.addedAt, normalizedRight.addedAt),
    nextReviewAt: earliestIso(normalizedLeft.nextReviewAt, normalizedRight.nextReviewAt),
  };
}

function resolveMergedStatus(left, right) {
  if (left.status === "reviewing" || right.status === "reviewing") {
    return "reviewing";
  }

  if (left.status === "mastered" || right.status === "mastered") {
    return "mastered";
  }

  if (
    left.status === "learning" ||
    right.status === "learning" ||
    left.correctCount > 0 ||
    right.correctCount > 0 ||
    left.wrongCount > 0 ||
    right.wrongCount > 0
  ) {
    return "learning";
  }

  return "unseen";
}

function mergeProgressRecord(left, right) {
  const normalizedLeft = normalizeProgressRecord(left, right?.contentId);
  const normalizedRight = normalizeProgressRecord(right, left?.contentId);
  const contentId = normalizedLeft.contentId || normalizedRight.contentId;

  return {
    contentId,
    status: resolveMergedStatus(normalizedLeft, normalizedRight),
    correctCount: Math.max(normalizedLeft.correctCount, normalizedRight.correctCount),
    wrongCount: Math.max(normalizedLeft.wrongCount, normalizedRight.wrongCount),
    hintCount: Math.max(normalizedLeft.hintCount, normalizedRight.hintCount),
    gaveUpCount: Math.max(normalizedLeft.gaveUpCount, normalizedRight.gaveUpCount),
    revealedCount: Math.max(normalizedLeft.revealedCount, normalizedRight.revealedCount),
    streak: Math.max(normalizedLeft.streak, normalizedRight.streak),
    lastSeenAt: latestIso(normalizedLeft.lastSeenAt, normalizedRight.lastSeenAt),
    nextReviewAt: earliestIso(normalizedLeft.nextReviewAt, normalizedRight.nextReviewAt),
    masteryScore: Math.max(normalizedLeft.masteryScore, normalizedRight.masteryScore),
    legacySources: mergeLegacySources(normalizedLeft.legacySources, normalizedRight.legacySources),
  };
}

function updateRecordStatusFromScore(record) {
  if (record.status === "reviewing") {
    return record;
  }

  if (record.streak >= 3 && record.masteryScore >= 80) {
    record.status = "mastered";
  } else if (
    record.correctCount > 0 ||
    record.wrongCount > 0 ||
    record.hintCount > 0 ||
    record.gaveUpCount > 0 ||
    record.revealedCount > 0
  ) {
    record.status = "learning";
  } else {
    record.status = "unseen";
  }

  return record;
}

function addReviewItemToPayload(reviewPayload, contentId, reason, now, nextReviewAt = now) {
  const existing = reviewPayload.items[contentId];
  const next = mergeReviewItem(existing, {
    contentId,
    reasons: reason ? [reason] : [],
    addedAt: existing?.addedAt || now,
    nextReviewAt,
  });

  if (next) {
    reviewPayload.items[contentId] = next;
  }
}

function removeReviewItemFromPayload(reviewPayload, contentId) {
  delete reviewPayload.items[contentId];
}

function normalizeUnmatchedLegacyProgress(entries = []) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  entries.forEach(entry => {
    if (!isObject(entry)) {
      return;
    }

    const sourceStorageKey = String(entry.sourceStorageKey || entry.storageKey || "");
    const legacyId = String(entry.legacyId || "");
    const legacyKind = String(entry.legacyKind || "session");
    const marker = [sourceStorageKey, legacyKind, legacyId, entry.parseStatus || ""].join("::");

    if (!sourceStorageKey || seen.has(marker)) {
      return;
    }

    seen.add(marker);
    normalized.push({
      sourceStorageKey,
      legacyId,
      legacyKind,
      parseStatus: String(entry.parseStatus || "parsed"),
      detectedVersion: entry.detectedVersion ?? null,
      selectionKey: String(entry.selectionKey || ""),
      summaryCounts: isObject(entry.summaryCounts) ? clone(entry.summaryCounts) : {},
      reviewReasons: Array.isArray(entry.reviewReasons)
        ? entry.reviewReasons.map(reason => String(reason || "")).filter(Boolean)
        : [],
      reason: String(entry.reason || ""),
      capturedAt: normalizeIsoString(entry.capturedAt) || null,
    });
  });

  return normalized;
}

function mergeUnmatchedLegacyProgress(left = [], right = []) {
  return normalizeUnmatchedLegacyProgress([...left, ...right]);
}

function buildUnmatchedEntry({
  storageKey,
  legacyId = "",
  legacyKind,
  sessionClassification,
  selectionKey,
  summaryCounts,
  reviewReasons,
  reason = "",
  capturedAt,
}) {
  return {
    sourceStorageKey: storageKey,
    legacyId,
    legacyKind,
    parseStatus: sessionClassification?.parseStatus || "parsed",
    detectedVersion: sessionClassification?.detectedVersion ?? null,
    selectionKey: selectionKey || "",
    summaryCounts: summaryCounts || {},
    reviewReasons: reviewReasons || [],
    reason,
    capturedAt,
  };
}

function hasProgressContribution(classification = {}) {
  return (
    safeInteger(classification.correctDelta) > 0 ||
    safeInteger(classification.wrongDelta) > 0 ||
    safeInteger(classification.hintDelta) > 0 ||
    safeInteger(classification.gaveUpDelta) > 0 ||
    safeInteger(classification.revealedDelta) > 0 ||
    Boolean(classification.hasReviewDebt)
  );
}

function hasLegacyActivityOnly(classification = {}) {
  if (classification.kind === "easy-question") {
    return (
      safeInteger(classification.summary?.selectedKeywordCount) > 0 ||
      ["wrong", "correct"].includes(classification.summary?.keywordStatus) ||
      classification.summary?.easyStep === "copy" ||
      Boolean(classification.summary?.hasCopyValue)
    );
  }

  return !["", "idle"].includes(classification.summary?.status) || classification.summary?.matchState === "checked";
}

function parseLegacyPayload(rawValue) {
  try {
    return {
      ok: true,
      payload: JSON.parse(String(rawValue ?? "null")),
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      payload: null,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

function addIndexEntry(map, key, contentId) {
  const normalizedKey = String(key || "");

  if (!normalizedKey || !contentId) {
    return;
  }

  if (map.has(normalizedKey) && map.get(normalizedKey) !== contentId) {
    map.set(normalizedKey, null);
    return;
  }

  map.set(normalizedKey, contentId);
}

function getIndexedContentId(map, key) {
  const contentId = map.get(String(key || ""));
  return typeof contentId === "string" && contentId ? contentId : "";
}

function indexCanonicalQuestion(index, question) {
  const blanks = Array.isArray(question.blanks) ? question.blanks : [];

  blanks.forEach(blank => {
    const context = {
      stage: question.stage,
      levelId: question.levelId || question.level,
      topicSlug: question.topicSlug || question.topic,
      fileId: question.fileId,
      sourceId: question.sourceId,
      kind: question.kind,
      round: question.round,
      blankIndex: blank.blankIndex,
      duplicateKey: blank.duplicateKey || question.duplicateKey,
    };
    const contentId = blank.contentId || buildStableContentId(context);

    addIndexEntry(index.blankByLegacyId, blank.id || blank.legacyBlankId, contentId);
    addIndexEntry(index.contentById, contentId, contentId);

    if (blanks.length === 1 || question.kind === "single") {
      addIndexEntry(index.questionByLegacyId, question.id || question.legacyQuestionId, contentId);
    }
  });
}

export function buildCanonicalContentIndex(canonicalItems = []) {
  const index = {
    blankByLegacyId: new Map(),
    questionByLegacyId: new Map(),
    contentById: new Map(),
  };

  canonicalItems.forEach(item => {
    if (!isObject(item)) {
      return;
    }

    if (Array.isArray(item.blanks)) {
      indexCanonicalQuestion(index, item);
      return;
    }

    const contentId = item.contentId || buildStableContentId(item);

    addIndexEntry(index.contentById, contentId, contentId);
    addIndexEntry(index.blankByLegacyId, item.legacyBlankId || item.blankId, contentId);
    addIndexEntry(index.questionByLegacyId, item.legacyQuestionId || item.questionId, contentId);
  });

  return index;
}

function getCanonicalIndex(options = {}) {
  if (options.contentIndex) {
    return options.contentIndex;
  }

  return buildCanonicalContentIndex(options.canonicalItems || []);
}

function hasLegacySource(record, source) {
  const marker = getLegacySourceMarker(source);
  return record.legacySources.some(existing => getLegacySourceMarker(existing) === marker);
}

function applyMigratedContribution(progressPayload, reviewPayload, { contentId, classification, source, migratedAt }) {
  const existing = progressPayload.records[contentId] || createDefaultProgressRecord(contentId);

  if (hasLegacySource(existing, source)) {
    return false;
  }

  const record = clone(existing);
  const contribution = source.contribution || {};
  const correctDelta = safeInteger(contribution.correctCount);
  const wrongDelta = safeInteger(contribution.wrongCount);
  const hintDelta = safeInteger(contribution.hintCount);
  const gaveUpDelta = safeInteger(contribution.gaveUpCount);
  const revealedDelta = safeInteger(contribution.revealedCount);

  record.correctCount += correctDelta;
  record.wrongCount += wrongDelta;
  record.hintCount += hintDelta;
  record.gaveUpCount += gaveUpDelta;
  record.revealedCount += revealedDelta;

  if (correctDelta > 0 && !classification.hasReviewDebt) {
    record.streak += correctDelta;
    record.masteryScore = clampScore(
      record.masteryScore + (classification.masteryEvidence === "easy-copy-correct-low-confidence" ? 8 : 12)
    );
  }

  if (classification.hasReviewDebt) {
    record.streak = 0;
    record.status = "reviewing";
    record.nextReviewAt = earliestIso(record.nextReviewAt, migratedAt);
    classification.reviewReasons.forEach(reason =>
      addReviewItemToPayload(reviewPayload, contentId, reason, migratedAt)
    );
  } else {
    record.status = record.status === "mastered" ? "mastered" : classification.progressStatus;
    record.nextReviewAt = record.nextReviewAt || null;
  }

  record.lastSeenAt = latestIso(record.lastSeenAt, migratedAt);
  record.legacySources = mergeLegacySources(record.legacySources, [source]);
  progressPayload.records[contentId] = updateRecordStatusFromScore(record);

  return true;
}

function getLegacySelectionKey(payload) {
  return isObject(payload) && typeof payload.selectionKey === "string" ? payload.selectionKey : "";
}

function migrateLegacyBlankState(progressPayload, reviewPayload, context) {
  const { blankState, storageKey, sessionClassification, selectionKey, contentIndex, migratedAt } = context;
  const classification = classifyLegacyBlankState(blankState);
  const contentId = getIndexedContentId(contentIndex.blankByLegacyId, classification.legacyId);

  if (!contentId || classification.parseStatus !== "parsed" || !hasProgressContribution(classification)) {
    if (contentId && classification.parseStatus === "parsed" && !hasLegacyActivityOnly(classification)) {
      return false;
    }

    const reason =
      contentId && classification.parseStatus === "parsed" && hasLegacyActivityOnly(classification)
        ? "activity-only-no-progress-contribution"
        : "";

    progressPayload.unmatchedLegacyProgress = mergeUnmatchedLegacyProgress(progressPayload.unmatchedLegacyProgress, [
      buildUnmatchedEntry({
        storageKey,
        legacyId: classification.legacyId,
        legacyKind: "blank",
        sessionClassification,
        selectionKey,
        summaryCounts: classification.summary,
        reviewReasons: classification.reviewReasons,
        reason,
        capturedAt: migratedAt,
      }),
    ]);
    return false;
  }

  return applyMigratedContribution(progressPayload, reviewPayload, {
    contentId,
    classification,
    migratedAt,
    source: {
      storageKey,
      legacyId: classification.legacyId,
      legacyKind: "blank",
      migratedAt,
      contribution: {
        correctCount: classification.correctDelta,
        wrongCount: classification.wrongDelta,
        hintCount: 0,
        gaveUpCount: classification.gaveUpDelta,
        revealedCount: classification.revealedDelta,
      },
    },
  });
}

function migrateLegacyEasyQuestionState(progressPayload, reviewPayload, context) {
  const { easyQuestionState, storageKey, sessionClassification, selectionKey, contentIndex, migratedAt } = context;
  const classification = classifyLegacyEasyQuestionState(easyQuestionState);
  const contentId = getIndexedContentId(contentIndex.questionByLegacyId, classification.legacyId);

  if (!contentId || classification.parseStatus !== "parsed" || !hasProgressContribution(classification)) {
    if (contentId && classification.parseStatus === "parsed" && !hasLegacyActivityOnly(classification)) {
      return false;
    }

    const reason =
      contentId && classification.parseStatus === "parsed" && hasLegacyActivityOnly(classification)
        ? "activity-only-no-progress-contribution"
        : "";

    progressPayload.unmatchedLegacyProgress = mergeUnmatchedLegacyProgress(progressPayload.unmatchedLegacyProgress, [
      buildUnmatchedEntry({
        storageKey,
        legacyId: classification.legacyId,
        legacyKind: "easy-question",
        sessionClassification,
        selectionKey,
        summaryCounts: classification.summary,
        reviewReasons: classification.reviewReasons,
        reason,
        capturedAt: migratedAt,
      }),
    ]);
    return false;
  }

  return applyMigratedContribution(progressPayload, reviewPayload, {
    contentId,
    classification,
    migratedAt,
    source: {
      storageKey,
      legacyId: classification.legacyId,
      legacyKind: "easy-question",
      migratedAt,
      contribution: {
        correctCount: classification.correctDelta,
        wrongCount: classification.wrongDelta,
        hintCount: classification.hintDelta,
        gaveUpCount: 0,
        revealedCount: 0,
      },
    },
  });
}

export function getProgress(contentId, options = {}) {
  const storage = getStorage(options);
  const payload = readProgressPayload(storage, options);
  const record = payload.records[String(contentId || "")] || createDefaultProgressRecord(contentId);

  return clone(record);
}

export function getAllProgress(options = {}) {
  const storage = getStorage(options);
  return clone(readProgressPayload(storage, options).records);
}

export function recordAttempt({ contentId, result, hintsUsed = 0, historical = false } = {}, options = {}) {
  const normalizedContentId = String(contentId || "");

  if (!normalizedContentId) {
    throw new Error("recordAttempt requires a contentId.");
  }

  if (!allowedAttemptResults.has(result)) {
    throw new Error(`Unsupported attempt result: ${result}`);
  }

  const storage = getStorage(options);
  const now = getNow(options);
  const hintDelta = safeInteger(hintsUsed);
  const progressPayload = readProgressPayload(storage, options);
  const reviewPayload = readReviewListPayload(storage, options);
  const record = progressPayload.records[normalizedContentId] || createDefaultProgressRecord(normalizedContentId);

  record.hintCount += hintDelta;
  record.lastSeenAt = now;

  if (result === "correct") {
    record.correctCount += 1;
    record.streak += 1;
    record.masteryScore = clampScore(record.masteryScore + (hintDelta > 0 ? 12 : 20));
    record.status = "learning";
    record.nextReviewAt = record.nextReviewAt || addDays(now, 1);
    updateRecordStatusFromScore(record);

    if (record.status === "mastered") {
      removeReviewItemFromPayload(reviewPayload, normalizedContentId);
      record.nextReviewAt = addDays(now, 7);
    }
  }

  if (result === "incorrect") {
    record.wrongCount += 1;
    record.streak = 0;
    record.masteryScore = clampScore(record.masteryScore - 15);
    record.status = "reviewing";
    record.nextReviewAt = now;
    addReviewItemToPayload(reviewPayload, normalizedContentId, "incorrect", now);
  }

  if (result === "gave_up") {
    record.gaveUpCount += 1;
    record.streak = 0;
    record.masteryScore = clampScore(record.masteryScore - 10);
    record.status = "reviewing";
    record.nextReviewAt = now;
    addReviewItemToPayload(reviewPayload, normalizedContentId, "gave-up", now);
  }

  if (result === "revealed") {
    record.revealedCount += 1;
    record.streak = historical && record.status === "mastered" ? record.streak : 0;
    record.masteryScore =
      historical && record.status === "mastered" ? record.masteryScore : clampScore(record.masteryScore - 8);

    if (!(historical && record.status === "mastered")) {
      record.status = "reviewing";
      record.nextReviewAt = now;
      addReviewItemToPayload(reviewPayload, normalizedContentId, "revealed", now);
    }
  }

  progressPayload.records[normalizedContentId] = normalizeProgressRecord(record, normalizedContentId);
  writeProgressPayload(storage, progressPayload, { ...options, now: () => now });
  writeReviewListPayload(storage, reviewPayload, { ...options, now: () => now });

  return clone(progressPayload.records[normalizedContentId]);
}

export function addToReview(contentId, reason = "manual", options = {}) {
  const normalizedContentId = String(contentId || "");

  if (!normalizedContentId) {
    throw new Error("addToReview requires a contentId.");
  }

  const storage = getStorage(options);
  const now = getNow(options);
  const progressPayload = readProgressPayload(storage, options);
  const reviewPayload = readReviewListPayload(storage, options);
  const record = progressPayload.records[normalizedContentId] || createDefaultProgressRecord(normalizedContentId);

  record.status = "reviewing";
  record.nextReviewAt = earliestIso(record.nextReviewAt, now);
  progressPayload.records[normalizedContentId] = normalizeProgressRecord(record, normalizedContentId);
  addReviewItemToPayload(reviewPayload, normalizedContentId, reason, now);
  writeProgressPayload(storage, progressPayload, { ...options, now: () => now });
  writeReviewListPayload(storage, reviewPayload, { ...options, now: () => now });

  return clone(reviewPayload.items[normalizedContentId]);
}

export function removeFromReview(contentId, options = {}) {
  const normalizedContentId = String(contentId || "");

  if (!normalizedContentId) {
    throw new Error("removeFromReview requires a contentId.");
  }

  const storage = getStorage(options);
  const progressPayload = readProgressPayload(storage, options);
  const reviewPayload = readReviewListPayload(storage, options);
  const record = progressPayload.records[normalizedContentId];

  removeReviewItemFromPayload(reviewPayload, normalizedContentId);

  if (record) {
    record.nextReviewAt = null;
    progressPayload.records[normalizedContentId] = normalizeProgressRecord(record, normalizedContentId);
    writeProgressPayload(storage, progressPayload, options);
  }

  writeReviewListPayload(storage, reviewPayload, options);

  return true;
}

export function getDueReviewItems(options = {}) {
  const storage = getStorage(options);
  const now = getNow(options);
  const nowTime = Date.parse(now);
  const progressPayload = readProgressPayload(storage, options);
  const reviewPayload = readReviewListPayload(storage, options);

  return Object.values(reviewPayload.items)
    .filter(item => {
      const dueTime = Date.parse(item.nextReviewAt || now);
      return !Number.isFinite(dueTime) || dueTime <= nowTime;
    })
    .sort((left, right) => compareIso(left.nextReviewAt, right.nextReviewAt))
    .map(item => ({
      ...clone(item),
      progress: clone(progressPayload.records[item.contentId] || createDefaultProgressRecord(item.contentId)),
    }));
}

export function exportLearningState(options = {}) {
  const storage = getStorage(options);

  return {
    version: schemaVersion,
    exportedAt: getNow(options),
    storageKeys: {
      progress: getProgressKey(options),
      reviewList: getReviewListKey(options),
      settings: getSettingsKey(options),
    },
    progress: readProgressPayload(storage, options),
    reviewList: readReviewListPayload(storage, options),
    settings: readSettingsPayload(storage, options),
  };
}

export function importLearningState(payload, options = {}) {
  if (!isObject(payload) || Number(payload.version) !== schemaVersion) {
    throw new Error("Unsupported Memorisation Bank learning state export version.");
  }

  const storage = getStorage(options);
  const progressPayload = readProgressPayload(storage, options);
  const reviewPayload = readReviewListPayload(storage, options);
  const settingsPayload = readSettingsPayload(storage, options);
  const incomingProgress = isObject(payload.progress) ? payload.progress : {};
  const incomingRecords = isObject(incomingProgress.records) ? incomingProgress.records : {};
  const incomingReviewList = isObject(payload.reviewList) ? payload.reviewList : {};
  const incomingReviewItems = isObject(incomingReviewList.items) ? incomingReviewList.items : {};
  const importedAt = getNow(options);

  Object.entries(incomingRecords).forEach(([contentId, record]) => {
    const normalized = normalizeProgressRecord(record, contentId);

    if (!normalized.contentId) {
      return;
    }

    progressPayload.records[normalized.contentId] = mergeProgressRecord(
      progressPayload.records[normalized.contentId],
      normalized
    );
  });

  progressPayload.unmatchedLegacyProgress = mergeUnmatchedLegacyProgress(
    progressPayload.unmatchedLegacyProgress,
    incomingProgress.unmatchedLegacyProgress
  );

  Object.entries(incomingReviewItems).forEach(([contentId, item]) => {
    const normalized = normalizeReviewItem(item, contentId);

    if (!normalized) {
      return;
    }

    reviewPayload.items[normalized.contentId] = mergeReviewItem(reviewPayload.items[normalized.contentId], normalized);
  });

  const incomingSettings = isObject(payload.settings) ? payload.settings : {};
  // Settings import is non-destructive: progress/review merge, and local settings win for now.
  writeProgressPayload(storage, progressPayload, { ...options, now: () => importedAt });
  writeReviewListPayload(storage, reviewPayload, { ...options, now: () => importedAt });
  writeSettingsPayload(storage, { ...incomingSettings, ...settingsPayload, version: schemaVersion }, options);

  return {
    ok: true,
    importedAt,
    recordCount: Object.keys(progressPayload.records).length,
    reviewCount: Object.keys(reviewPayload.items).length,
    unmatchedCount: progressPayload.unmatchedLegacyProgress.length,
  };
}

export function migrateLegacySessionProgress(options = {}) {
  const storage = getStorage(options);
  const migratedAt = getNow(options);
  const currentVersion = options.currentSessionVersion ?? options.currentVersion ?? 2;
  const backupResult = ensureLegacyBackupSnapshot(storage, {
    sessionStoragePrefix: options.sessionStoragePrefix || defaultSessionStoragePrefix,
    currentVersion,
    now: () => migratedAt,
  });

  if (!backupResult.ok) {
    return {
      ok: false,
      migrated: false,
      backup: backupResult,
      migratedCount: 0,
      unmatchedCount: 0,
      skippedDuplicateCount: 0,
      error: backupResult.error,
    };
  }

  const contentIndex = getCanonicalIndex(options);
  const sessionKeys = listLegacySessionStorageKeys(
    storage,
    options.sessionStoragePrefix || defaultSessionStoragePrefix
  );

  if (!sessionKeys.length) {
    return {
      ok: true,
      migrated: false,
      skipped: true,
      backup: backupResult,
      sourceKeyCount: 0,
      migratedCount: 0,
      unmatchedCount: 0,
      skippedDuplicateCount: 0,
    };
  }

  const progressPayload = readProgressPayload(storage, options);
  const reviewPayload = readReviewListPayload(storage, options);
  let migratedCount = 0;
  let skippedDuplicateCount = 0;

  sessionKeys.forEach(storageKey => {
    const rawValue = storage.getItem(storageKey);
    const sessionClassification = classifyLegacySessionValue(rawValue, { currentVersion });
    const parsed = parseLegacyPayload(rawValue);

    if (!parsed.ok || !isObject(parsed.payload)) {
      progressPayload.unmatchedLegacyProgress = mergeUnmatchedLegacyProgress(progressPayload.unmatchedLegacyProgress, [
        buildUnmatchedEntry({
          storageKey,
          legacyKind: "session",
          sessionClassification,
          selectionKey: "",
          summaryCounts: sessionClassification.itemCounts,
          reviewReasons: [],
          capturedAt: migratedAt,
        }),
      ]);
      return;
    }

    const selectionKey = getLegacySelectionKey(parsed.payload);
    const blankStates = Array.isArray(parsed.payload.blankStates) ? parsed.payload.blankStates : [];
    const easyQuestionStates = Array.isArray(parsed.payload.easyQuestionStates)
      ? parsed.payload.easyQuestionStates
      : [];

    blankStates.forEach(blankState => {
      const changed = migrateLegacyBlankState(progressPayload, reviewPayload, {
        blankState,
        storageKey,
        sessionClassification,
        selectionKey,
        contentIndex,
        migratedAt,
      });

      if (changed) {
        migratedCount += 1;
      } else if (classifyLegacyBlankState(blankState).parseStatus === "parsed") {
        const contentId = getIndexedContentId(
          contentIndex.blankByLegacyId,
          classifyLegacyBlankState(blankState).legacyId
        );
        const record = contentId ? progressPayload.records[contentId] : null;
        const source = {
          storageKey,
          legacyId: classifyLegacyBlankState(blankState).legacyId,
          legacyKind: "blank",
        };

        if (record && hasLegacySource(record, source)) {
          skippedDuplicateCount += 1;
        }
      }
    });

    easyQuestionStates.forEach(easyQuestionState => {
      const changed = migrateLegacyEasyQuestionState(progressPayload, reviewPayload, {
        easyQuestionState,
        storageKey,
        sessionClassification,
        selectionKey,
        contentIndex,
        migratedAt,
      });

      if (changed) {
        migratedCount += 1;
      } else if (classifyLegacyEasyQuestionState(easyQuestionState).parseStatus === "parsed") {
        const contentId = getIndexedContentId(
          contentIndex.questionByLegacyId,
          classifyLegacyEasyQuestionState(easyQuestionState).legacyId
        );
        const record = contentId ? progressPayload.records[contentId] : null;
        const source = {
          storageKey,
          legacyId: classifyLegacyEasyQuestionState(easyQuestionState).legacyId,
          legacyKind: "easy-question",
        };

        if (record && hasLegacySource(record, source)) {
          skippedDuplicateCount += 1;
        }
      }
    });
  });

  writeProgressPayload(storage, progressPayload, { ...options, now: () => migratedAt });
  writeReviewListPayload(storage, reviewPayload, { ...options, now: () => migratedAt });
  storage.setItem(
    getMigrationFlagKey(options),
    JSON.stringify({
      version: schemaVersion,
      migratedAt,
      sourceKeyCount: sessionKeys.length,
      migratedCount,
      unmatchedCount: progressPayload.unmatchedLegacyProgress.length,
    })
  );

  return {
    ok: true,
    migrated: true,
    backup: backupResult,
    sourceKeyCount: sessionKeys.length,
    migratedCount,
    unmatchedCount: progressPayload.unmatchedLegacyProgress.length,
    skippedDuplicateCount,
  };
}

export function createLearningStateStore(defaultOptions = {}) {
  return {
    getProgress: contentId => getProgress(contentId, defaultOptions),
    getAllProgress: () => getAllProgress(defaultOptions),
    recordAttempt: attempt => recordAttempt(attempt, defaultOptions),
    addToReview: (contentId, reason) => addToReview(contentId, reason, defaultOptions),
    removeFromReview: contentId => removeFromReview(contentId, defaultOptions),
    getDueReviewItems: () => getDueReviewItems(defaultOptions),
    exportLearningState: () => exportLearningState(defaultOptions),
    importLearningState: payload => importLearningState(payload, defaultOptions),
    migrateLegacySessionProgress: options => migrateLegacySessionProgress({ ...defaultOptions, ...options }),
  };
}
