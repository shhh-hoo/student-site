export const legacySessionBackupKey = "mb:legacy-session-backup:v1";
export const legacySessionBackupVersion = 1;

const defaultSessionStoragePrefix = "memorisation-bank-session";
const riskyClassifications = new Set(["legacy-compatible", "malformed", "un-restored"]);

function getSessionKeyPrefix(sessionStoragePrefix = defaultSessionStoragePrefix) {
  return `${sessionStoragePrefix}::`;
}

export function isLegacySessionStorageKey(key, sessionStoragePrefix = defaultSessionStoragePrefix) {
  return String(key || "").startsWith(getSessionKeyPrefix(sessionStoragePrefix));
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseStoredJson(rawValue) {
  try {
    return {
      ok: true,
      value: JSON.parse(String(rawValue ?? "null")),
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      value: null,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

function hasRecognizedSessionShape(payload) {
  return (
    isObject(payload) &&
    (typeof payload.selectionKey === "string" ||
      typeof payload.currentBlankId === "string" ||
      Array.isArray(payload.blankStates) ||
      Array.isArray(payload.easyQuestionStates))
  );
}

function hasCurrentSessionShape(payload) {
  return (
    hasRecognizedSessionShape(payload) &&
    typeof payload.selectionKey === "string" &&
    Array.isArray(payload.blankStates) &&
    Array.isArray(payload.easyQuestionStates)
  );
}

function getDetectedVersion(payload) {
  if (!isObject(payload) || payload.version === undefined || payload.version === null) {
    return null;
  }

  if (typeof payload.version === "number" && Number.isFinite(payload.version)) {
    return payload.version;
  }

  const numericVersion = Number(payload.version);
  return Number.isFinite(numericVersion) ? numericVersion : String(payload.version);
}

function getLegacyCreatedAt(payload) {
  if (!isObject(payload) || payload.createdAt === undefined || payload.createdAt === null) {
    return null;
  }

  return String(payload.createdAt);
}

function getItemCounts(payload) {
  if (!isObject(payload)) {
    return {
      blankStates: 0,
      easyQuestionStates: 0,
      reviewCandidates: 0,
    };
  }

  const blankStates = Array.isArray(payload.blankStates) ? payload.blankStates : [];
  const easyQuestionStates = Array.isArray(payload.easyQuestionStates) ? payload.easyQuestionStates : [];

  return {
    blankStates: blankStates.length,
    easyQuestionStates: easyQuestionStates.length,
    reviewCandidates: blankStates.filter(
      blankState =>
        blankState &&
        (blankState.status === "wrong" ||
          blankState.status === "revealed" ||
          blankState.revealed === true ||
          Number(blankState.wrongCount) > 0)
    ).length,
  };
}

export function classifyLegacySessionValue(rawValue, options = {}) {
  const { currentVersion = 0, expectedSelectionKey = "" } = options;
  const parsed = parseStoredJson(rawValue);

  if (!parsed.ok) {
    return {
      classification: "malformed",
      parseStatus: "malformed",
      detectedVersion: null,
      itemCounts: getItemCounts(null),
      legacyCreatedAt: null,
      error: parsed.error,
    };
  }

  const payload = parsed.value;
  const detectedVersion = getDetectedVersion(payload);
  const sessionLike = hasRecognizedSessionShape(payload);
  const currentVersionNumber = Number(currentVersion);
  const detectedVersionNumber = Number(detectedVersion);
  const hasNumericDetectedVersion = Number.isFinite(detectedVersionNumber);
  let classification = "un-restored";

  if (
    hasNumericDetectedVersion &&
    Number.isFinite(currentVersionNumber) &&
    detectedVersionNumber === currentVersionNumber &&
    hasCurrentSessionShape(payload) &&
    (!expectedSelectionKey || payload.selectionKey === expectedSelectionKey)
  ) {
    classification = "current-compatible";
  } else if (
    sessionLike &&
    hasNumericDetectedVersion &&
    Number.isFinite(currentVersionNumber) &&
    detectedVersionNumber < currentVersionNumber
  ) {
    classification = "legacy-compatible";
  }

  return {
    classification,
    parseStatus: "parsed",
    detectedVersion,
    itemCounts: getItemCounts(payload),
    legacyCreatedAt: getLegacyCreatedAt(payload),
    error: "",
  };
}

export function shouldSkipSessionWriteForClassification(classification) {
  return riskyClassifications.has(classification);
}

export function listLegacySessionStorageKeys(storage, sessionStoragePrefix = defaultSessionStoragePrefix) {
  const keys = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (isLegacySessionStorageKey(key, sessionStoragePrefix)) {
      keys.push(key);
    }
  }

  return keys.sort();
}

function normalizeExistingBackup(rawBackup) {
  if (!rawBackup) {
    return {
      ok: true,
      backup: {
        version: legacySessionBackupVersion,
        entries: [],
      },
      error: "",
    };
  }

  const parsed = parseStoredJson(rawBackup);

  if (!parsed.ok || !isObject(parsed.value) || !Array.isArray(parsed.value.entries)) {
    return {
      ok: false,
      backup: null,
      error: parsed.error || "Existing backup is not a recognized backup payload.",
    };
  }

  return {
    ok: true,
    backup: {
      version: Number(parsed.value.version) || legacySessionBackupVersion,
      entries: parsed.value.entries.filter(entry => isObject(entry) && typeof entry.key === "string"),
    },
    error: "",
  };
}

export function ensureLegacyBackupSnapshot(storage, options = {}) {
  const {
    sessionStoragePrefix = defaultSessionStoragePrefix,
    backupKey = legacySessionBackupKey,
    currentVersion = 0,
    now = () => new Date().toISOString(),
  } = options;

  try {
    const sessionKeys = listLegacySessionStorageKeys(storage, sessionStoragePrefix);
    const existingBackup = normalizeExistingBackup(storage.getItem(backupKey));

    if (!existingBackup.ok) {
      return {
        ok: false,
        wrote: false,
        appendedKeys: [],
        errorType: "json",
        error: existingBackup.error,
      };
    }

    const backup = existingBackup.backup;
    const existingKeys = new Set(backup.entries.map(entry => entry.key));
    const appendedEntries = [];

    sessionKeys.forEach(key => {
      if (existingKeys.has(key)) {
        return;
      }

      const rawValue = storage.getItem(key);
      const classification = classifyLegacySessionValue(rawValue, { currentVersion });

      appendedEntries.push({
        key,
        rawValue,
        detectedVersion: classification.detectedVersion,
        parseStatus: classification.parseStatus,
        legacyCreatedAt: classification.legacyCreatedAt,
        backupCapturedAt: now(),
      });
    });

    if (!appendedEntries.length) {
      return {
        ok: true,
        wrote: false,
        appendedKeys: [],
        entryCount: backup.entries.length,
      };
    }

    const nextBackup = {
      version: legacySessionBackupVersion,
      entries: [...backup.entries, ...appendedEntries],
    };

    storage.setItem(backupKey, JSON.stringify(nextBackup));

    return {
      ok: true,
      wrote: true,
      appendedKeys: appendedEntries.map(entry => entry.key),
      entryCount: nextBackup.entries.length,
    };
  } catch (error) {
    return {
      ok: false,
      wrote: false,
      appendedKeys: [],
      errorType: error?.name === "QuotaExceededError" ? "quota" : "storage",
      error: error instanceof Error ? error.message : "Storage access failed.",
    };
  }
}

function summarizeBackupEntry(entry) {
  const classification = classifyLegacySessionValue(entry.rawValue, {});

  return {
    key: entry.key,
    detectedVersion: entry.detectedVersion ?? classification.detectedVersion,
    parseStatus: entry.parseStatus || classification.parseStatus,
    itemCounts: classification.itemCounts,
    legacyCreatedAt: entry.legacyCreatedAt || classification.legacyCreatedAt,
    backupCapturedAt: entry.backupCapturedAt || null,
  };
}

export function buildLegacyProgressReport(storage, options = {}) {
  const {
    sessionStoragePrefix = defaultSessionStoragePrefix,
    backupKey = legacySessionBackupKey,
    currentVersion = 0,
    expectedSelectionKey = "",
  } = options;

  try {
    const sessionKeys = listLegacySessionStorageKeys(storage, sessionStoragePrefix);
    const sessions = sessionKeys.map(key => {
      const classification = classifyLegacySessionValue(storage.getItem(key), {
        currentVersion,
        expectedSelectionKey: expectedSelectionKey && key.endsWith(expectedSelectionKey) ? expectedSelectionKey : "",
      });

      return {
        key,
        classification: classification.classification,
        detectedVersion: classification.detectedVersion,
        parseStatus: classification.parseStatus,
        itemCounts: classification.itemCounts,
        legacyCreatedAt: classification.legacyCreatedAt,
      };
    });
    const existingBackup = normalizeExistingBackup(storage.getItem(backupKey));
    const backupEntries = existingBackup.ok ? existingBackup.backup.entries.map(summarizeBackupEntry) : [];

    return {
      ok: true,
      backupKey,
      sessionKeyCount: sessions.length,
      sessions,
      backup: {
        parseStatus: existingBackup.ok ? "parsed" : "malformed",
        entryCount: backupEntries.length,
        entries: backupEntries,
      },
    };
  } catch (error) {
    return {
      ok: false,
      backupKey,
      error: error instanceof Error ? error.message : "Storage access failed.",
      sessions: [],
      backup: {
        parseStatus: "unavailable",
        entryCount: 0,
        entries: [],
      },
    };
  }
}

export function exportRawLegacyBackup(storage, backupKey = legacySessionBackupKey) {
  const rawBackup = storage.getItem(backupKey);

  return {
    warning: "This raw legacy backup may contain private learning data, typed answers, and copied answer values.",
    backupKey,
    rawBackup,
  };
}
