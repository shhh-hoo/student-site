const contentIdVersion = "v1";
const emptyPartFallback = "unknown";

function normalizeContentIdPart(value, fallback = emptyPartFallback) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function normalizeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

export function buildStableContentId(itemContext = {}) {
  const {
    stage,
    levelId,
    level,
    topicSlug,
    topic,
    fileId,
    packId,
    sourceId,
    canonicalSourceId,
    id,
    kind,
    type,
    round,
    blankIndex = 0,
    duplicateKey = "",
  } = itemContext;

  const parts = [
    "mb",
    "canonical",
    contentIdVersion,
    normalizeContentIdPart(stage),
    normalizeContentIdPart(levelId ?? level),
    normalizeContentIdPart(topicSlug ?? topic),
    normalizeContentIdPart(packId ?? fileId),
    normalizeContentIdPart(canonicalSourceId ?? sourceId ?? id),
    normalizeContentIdPart(kind ?? type),
  ];

  if (round !== undefined && round !== null && round !== "") {
    parts.push(`round-${normalizeContentIdPart(round)}`);
  }

  parts.push(`blank-${normalizeInteger(blankIndex)}`);

  if (duplicateKey) {
    parts.push(`dup-${normalizeContentIdPart(duplicateKey)}`);
  }

  return parts.join(":");
}

export function classifyLegacyBlankState(blankState = {}) {
  if (!blankState || typeof blankState !== "object" || Array.isArray(blankState)) {
    return {
      kind: "blank",
      parseStatus: "invalid",
      legacyId: "",
      progressStatus: "unseen",
      correctDelta: 0,
      wrongDelta: 0,
      revealedDelta: 0,
      gaveUpDelta: 0,
      hasReviewDebt: false,
      masteryEvidence: "none",
      reviewReasons: [],
      summary: {
        status: "",
        wrongCount: 0,
        revealed: false,
        reviewPriority: 0,
        matchState: "",
        conceptSummary: false,
        contradictionSummary: false,
      },
    };
  }

  const status = String(blankState.status || "idle");
  const wrongCount = Math.max(0, Number(blankState.wrongCount) || 0);
  const revealed = Boolean(blankState.revealed || status === "revealed");
  const correct = status === "correct";
  const wrong = status === "wrong" || wrongCount > 0;
  const reviewReasons = [];

  if (wrong) {
    reviewReasons.push("wrong-answer");
  }

  if (revealed) {
    reviewReasons.push("revealed-answer");
  }

  const hasReviewDebt = wrong || revealed;
  const progressStatus = hasReviewDebt ? "reviewing" : correct ? "learning" : "unseen";
  const masteryEvidence = revealed
    ? "revealed-not-mastery"
    : wrong
      ? "review-debt"
      : correct
        ? "checked-correct"
        : "activity-only";

  return {
    kind: "blank",
    parseStatus: "parsed",
    legacyId: String(blankState.id || ""),
    progressStatus,
    correctDelta: correct && !revealed ? 1 : 0,
    wrongDelta: wrongCount || (status === "wrong" ? 1 : 0),
    revealedDelta: revealed ? 1 : 0,
    gaveUpDelta: 0,
    hasReviewDebt,
    masteryEvidence,
    reviewReasons,
    summary: {
      status,
      wrongCount,
      revealed,
      reviewPriority: Math.max(0, Number(blankState.reviewPriority) || 0),
      matchState: String(blankState.matchState || ""),
      conceptSummary: Array.isArray(blankState.coveredGroups) || Array.isArray(blankState.missingGroups),
      contradictionSummary: Array.isArray(blankState.contradictionHits),
    },
  };
}

export function classifyLegacyEasyQuestionState(easyQuestionState = {}) {
  if (!easyQuestionState || typeof easyQuestionState !== "object" || Array.isArray(easyQuestionState)) {
    return {
      kind: "easy-question",
      parseStatus: "invalid",
      legacyId: "",
      progressStatus: "unseen",
      correctDelta: 0,
      wrongDelta: 0,
      hintDelta: 0,
      hasReviewDebt: false,
      masteryEvidence: "none",
      reviewReasons: [],
      summary: {
        easyStep: "",
        keywordStatus: "",
        copyStatus: "",
        selectedKeywordCount: 0,
        hasCopyValue: false,
      },
    };
  }

  const easyStep = String(easyQuestionState.easyStep || "keywords");
  const keywordStatus = String(easyQuestionState.keywordStatus || "idle");
  const copyStatus = String(easyQuestionState.copyStatus || "idle");
  const copyCorrect = copyStatus === "correct";
  const copyWrong = copyStatus === "wrong";
  const reviewReasons = [];

  if (copyWrong) {
    reviewReasons.push("easy-copy-wrong");
  }

  const selectedKeywordCount = Array.isArray(easyQuestionState.selectedKeywordIds)
    ? easyQuestionState.selectedKeywordIds.length
    : 0;
  const hasCopyValue = String(easyQuestionState.copyValue || "").length > 0;

  return {
    kind: "easy-question",
    parseStatus: "parsed",
    legacyId: String(easyQuestionState.questionId || ""),
    progressStatus: copyWrong ? "reviewing" : copyCorrect ? "learning" : "unseen",
    correctDelta: copyCorrect ? 1 : 0,
    wrongDelta: copyWrong ? 1 : 0,
    hintDelta: 0,
    hasReviewDebt: copyWrong,
    masteryEvidence: copyCorrect
      ? "easy-copy-correct-low-confidence"
      : copyWrong
        ? "easy-copy-review-debt"
        : keywordStatus === "correct" || easyStep === "copy"
          ? "keyword-activity-only"
          : "activity-only",
    reviewReasons,
    summary: {
      easyStep,
      keywordStatus,
      copyStatus,
      selectedKeywordCount,
      hasCopyValue,
    },
  };
}
