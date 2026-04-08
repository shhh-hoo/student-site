const definitionScopeOptions = [
  { id: "all", label: "All" },
  { id: "paper_only", label: "Past paper only" },
  { id: "syllabus_only", label: "Syllabus only" },
  { id: "paper_and_syllabus", label: "Paper + syllabus" },
];

const levelOrder = [
  "level-1-core",
  "level-2-guided-cloze",
  "level-3-multi-round-cloze",
  "level-4-full-reconstruction",
];

const fileOrder = [
  "core-definitions",
  "core-reagents-conditions",
  "core-reaction-paths",
  "core-equations",
  "core-observations",
  "core-fixed-conclusions",
  "guided-cloze",
  "multi-round-cloze",
  "full-reconstruction",
];

const articleTokens = new Set(["a", "an", "the"]);
const prepositionTokens = new Set([
  "in",
  "on",
  "at",
  "of",
  "to",
  "from",
  "with",
  "by",
  "for",
  "into",
  "between",
  "under",
  "through",
  "over",
  "within",
  "without",
  "across",
  "after",
  "before",
  "around",
  "against",
  "among",
  "along",
  "during",
  "inside",
  "outside",
  "onto",
  "upon",
]);
const exactSuccessStates = new Set(["exact", "normalized_match"]);
const britishAmericanVariantMap = new Map([
  ["sulphur", "sulfur"],
  ["sulphate", "sulfate"],
  ["sulphates", "sulfates"],
  ["sulphite", "sulfite"],
  ["sulphites", "sulfites"],
  ["aluminium", "aluminum"],
  ["ionisation", "ionization"],
  ["ionisations", "ionizations"],
  ["ionise", "ionize"],
  ["ionised", "ionized"],
  ["ionises", "ionizes"],
  ["ionising", "ionizing"],
  ["oxidise", "oxidize"],
  ["oxidised", "oxidized"],
  ["oxidises", "oxidizes"],
  ["oxidising", "oxidizing"],
  ["polymerisation", "polymerization"],
  ["polymerisations", "polymerizations"],
  ["polymerise", "polymerize"],
  ["polymerised", "polymerized"],
  ["polymerises", "polymerizes"],
  ["polymerising", "polymerizing"],
]);

const hyphenLikePattern = /[‐‑‒–—−]/g;
const singleQuotePattern = /[‘’‚‛`´]/g;
const doubleQuotePattern = /[“”„‟]/g;
const punctuationSpacingPattern = /\s*([,.;:!?])\s*/g;
const bracketSpacingPattern = /\s*([()[\]{}])\s*/g;
const quoteCharacterPattern = /["']/g;
const stateSymbolPattern = /\(\s*(aq|s|l|g)\s*\)/gi;
const reversibleArrowPattern = /(?:⇌|↔|⟷|<=>)/g;
const forwardArrowPattern = /(?:⟶|⟹|→|=>)/g;

const reviewPageSize = 4;
const questionPageSizeByFile = {
  "full-reconstruction": 2,
  "guided-cloze": 3,
  "multi-round-cloze": 3,
  default: 5,
};
const conceptKeywordStopwords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "between",
  "by",
  "each",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "therefore",
  "to",
  "with",
]);
const contradictionPairs = [
  ["same", "different"],
  ["different", "same"],
  ["increase", "decrease"],
  ["decrease", "increase"],
  ["higher", "lower"],
  ["lower", "higher"],
  ["stronger", "weaker"],
  ["weaker", "stronger"],
  ["oxidised", "reduced"],
  ["reduced", "oxidised"],
  ["oxidation", "reduction"],
  ["reduction", "oxidation"],
  ["positive", "negative"],
  ["negative", "positive"],
];

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const stageSwitcher = document.getElementById("stage-switcher");
const levelSwitcher = document.getElementById("level-switcher");
const topicFilter = document.getElementById("topic-filter");
const fileSwitcher = document.getElementById("file-switcher");
const definitionFilterSection = document.getElementById("definition-filter-section");
const definitionFilterGrid = document.getElementById("definition-filter-grid");
const roundSwitcherSection = document.getElementById("round-switcher-section");
const roundSwitcher = document.getElementById("round-switcher");
const fileManifestCount = document.getElementById("file-manifest-count");
const poolCount = document.getElementById("pool-count");
const itemCounter = document.getElementById("item-counter");
const counterChip = document.getElementById("counter-chip");
const stageBadge = document.getElementById("stage-badge");
const levelBadge = document.getElementById("level-badge");
const topicBadge = document.getElementById("topic-badge");
const fileBadge = document.getElementById("file-badge");
const sourceBadge = document.getElementById("source-badge");
const roundBadge = document.getElementById("round-badge");
const questionLabel = document.getElementById("question-label");
const questionTitle = document.getElementById("question-title");
const questionCopy = document.getElementById("question-copy");
const pageCounter = document.getElementById("page-counter");
const completionChip = document.getElementById("completion-chip");
const reviewChip = document.getElementById("review-chip");
const prevPageButton = document.getElementById("prev-page");
const nextBlankButton = document.getElementById("next-blank");
const nextPageButton = document.getElementById("next-page");
const reviewToggleButton = document.getElementById("review-toggle");
const sessionBanner = document.getElementById("session-banner");
const sessionPage = document.getElementById("session-page");

const appState = {
  catalog: null,
  topicNormalizationMap: {},
  stage: "",
  level: "",
  topic: "",
  file: "",
  definitionScope: "all",
  round: "all",
  renderToken: 0,
  fileDataCache: new Map(),
  staticEventsRegistered: false,
  sessionQuestions: [],
  sessionQuestionIds: [],
  sessionQuestionMap: new Map(),
  sessionBlankIds: [],
  sessionBlankMap: new Map(),
  blankStates: new Map(),
  pages: [],
  currentPageIndex: 0,
  reviewQueueBlankIds: [],
  reviewPages: [],
  reviewPageIndex: 0,
  reviewMode: false,
  currentBlankId: "",
  pendingFocusBlankId: "",
  interactionTick: 0,
  revealedQuestionIds: new Set(),
  blankInputRefs: new Map(),
};

function fetchJson(path) {
  return fetch(path, { cache: "no-store" }).then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed for ${path} (${response.status}).`);
    }

    return response.json();
  });
}

function formatLabel(value) {
  return String(value || "")
    .trim()
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatDefinitionScope(scope) {
  return definitionScopeOptions.find((option) => option.id === scope)?.label || formatLabel(scope);
}

function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function normaliseUnicodeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(hyphenLikePattern, "-")
    .replace(singleQuotePattern, "'")
    .replace(doubleQuotePattern, '"')
    .replace(/\u00a0/g, " ");
}

function normaliseVariantToken(token) {
  return token
    .split("-")
    .map((segment) => britishAmericanVariantMap.get(segment) || segment)
    .join("-");
}

function buildControlledTextComparable(value, { ignorePrepositions = false } = {}) {
  const normalizedText = normaliseUnicodeText(value)
    .trim()
    .replace(bracketSpacingPattern, "$1")
    .replace(punctuationSpacingPattern, " ")
    .replace(quoteCharacterPattern, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

  if (!normalizedText) {
    return { text: "", tokens: [] };
  }

  const tokens = normalizedText
    .split(" ")
    .filter(Boolean)
    .map(normaliseVariantToken)
    .filter((token) => !articleTokens.has(token))
    .filter((token) => !(ignorePrepositions && prepositionTokens.has(token)));

  return {
    text: tokens.join(" "),
    tokens,
  };
}

function buildEquationComparable(value, { ignoreStateSymbols = true } = {}) {
  let normalizedText = normaliseUnicodeText(value)
    .trim()
    .replace(reversibleArrowPattern, "<->")
    .replace(forwardArrowPattern, "->");

  if (ignoreStateSymbols) {
    normalizedText = normalizedText.replace(stateSymbolPattern, "");
  }

  return normalizedText
    .replace(/\s*<->\s*/g, "<->")
    .replace(/\s*->\s*/g, "->")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function getMatcherConfig(unit) {
  if (unit?.fileId === "core-equations") {
    const sourceText = `${unit?.prompt || ""} ${unit?.question || ""}`;

    return {
      type: "equation",
      ignoreStateSymbols: !/state symbols?/i.test(sourceText),
    };
  }

  return {
    type: "controlled-text",
  };
}

function buildComparablePair(userValue, canonicalValue, matcherConfig) {
  if (matcherConfig.type === "equation") {
    return {
      canonicalText: buildEquationComparable(canonicalValue, matcherConfig),
      userText: buildEquationComparable(userValue, matcherConfig),
    };
  }

  return {
    canonicalText: buildControlledTextComparable(canonicalValue).text,
    userText: buildControlledTextComparable(userValue).text,
  };
}

function evaluateMatchResult(userValue, canonicalValue, matcherConfig) {
  const rawUserText = String(userValue ?? "");
  const comparablePair = buildComparablePair(rawUserText, canonicalValue, matcherConfig);

  if (!rawUserText.trim()) {
    return {
      state: "untouched",
      ...comparablePair,
    };
  }

  if (rawUserText === String(canonicalValue ?? "")) {
    return {
      state: "exact",
      ...comparablePair,
    };
  }

  if (comparablePair.userText === comparablePair.canonicalText) {
    return {
      state: "normalized_match",
      ...comparablePair,
    };
  }

  if (matcherConfig.type !== "equation") {
    const canonicalWithoutPrepositions = buildControlledTextComparable(canonicalValue, {
      ignorePrepositions: true,
    }).text;
    const userWithoutPrepositions = buildControlledTextComparable(rawUserText, {
      ignorePrepositions: true,
    }).text;

    if (
      canonicalWithoutPrepositions &&
      userWithoutPrepositions &&
      canonicalWithoutPrepositions === userWithoutPrepositions
    ) {
      return {
        state: "near_miss_preposition",
        ...comparablePair,
      };
    }
  }

  return {
    state: "incorrect",
    ...comparablePair,
  };
}

function isSuccessfulMatchState(state) {
  return exactSuccessStates.has(state);
}

function setFeedbackMessage(element, message, tone = "neutral") {
  element.textContent = message;
  element.dataset.tone = tone;
}

function chunkIntoPages(items, pageSize) {
  if (!items.length || pageSize <= 0) {
    return [];
  }

  const pages = [];

  for (let index = 0; index < items.length; index += pageSize) {
    pages.push(items.slice(index, index + pageSize));
  }

  return pages;
}

function nextInteractionTick() {
  appState.interactionTick += 1;
  return appState.interactionTick;
}

function normalizeTopicKeyWithMap(topicValue, topicNormalizationMap = appState.topicNormalizationMap) {
  const rawTopic = String(topicValue || "").trim();

  if (!rawTopic) {
    return "";
  }

  const hyphenatedTopic = rawTopic.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  const spacedTopic = rawTopic.toLowerCase().replace(/[-_]+/g, " ").trim();

  return (
    topicNormalizationMap[rawTopic] ||
    topicNormalizationMap[hyphenatedTopic] ||
    topicNormalizationMap[spacedTopic] ||
    hyphenatedTopic
  );
}

function normalizeTopicKey(topicValue) {
  return normalizeTopicKeyWithMap(topicValue, appState.topicNormalizationMap);
}

function getStageEntries() {
  return Array.isArray(appState.catalog?.stages) ? appState.catalog.stages : [];
}

function getStageEntry(stageId = appState.stage) {
  return getStageEntries().find((stage) => stage.id === stageId) || null;
}

function getLevelEntries(stageId = appState.stage) {
  return getStageEntry(stageId)?.levels || [];
}

function getLevelEntry(stageId = appState.stage, levelId = appState.level) {
  return getLevelEntries(stageId).find((level) => level.id === levelId) || null;
}

function getTopicEntries(stageId = appState.stage, levelId = appState.level) {
  return getLevelEntry(stageId, levelId)?.topics || [];
}

function getTopicEntry(
  stageId = appState.stage,
  levelId = appState.level,
  topicId = appState.topic,
) {
  return getTopicEntries(stageId, levelId).find((topic) => topic.id === topicId) || null;
}

function getSelectedTopicEntries(
  stageId = appState.stage,
  levelId = appState.level,
  topicId = appState.topic,
) {
  const topicEntries = getTopicEntries(stageId, levelId);

  if (!topicId) {
    return topicEntries;
  }

  return topicEntries.filter((topic) => topic.id === topicId);
}

function aggregateDefinitionSourceCounts(currentCounts, nextCounts) {
  if (!nextCounts) {
    return currentCounts;
  }

  const aggregated = currentCounts || {
    paper_only: 0,
    syllabus_only: 0,
    paper_and_syllabus: 0,
  };

  Object.entries(nextCounts).forEach(([key, value]) => {
    aggregated[key] = Number(aggregated[key] || 0) + Number(value || 0);
  });

  return aggregated;
}

function getFileEntries(
  stageId = appState.stage,
  levelId = appState.level,
  topicId = appState.topic,
) {
  const fileMap = new Map();

  getSelectedTopicEntries(stageId, levelId, topicId).forEach((topicEntry) => {
    (topicEntry.files || []).forEach((fileEntry) => {
      const existing = fileMap.get(fileEntry.id) || {
        id: fileEntry.id,
        label: fileEntry.label,
        count: 0,
        runtime_unit_count: 0,
        definition_source_counts: null,
        rounds: new Set(),
        sources: [],
      };

      existing.count += Number(fileEntry.count || 0);
      existing.runtime_unit_count += Number(fileEntry.runtime_unit_count || 0);
      existing.definition_source_counts = aggregateDefinitionSourceCounts(
        existing.definition_source_counts,
        fileEntry.definition_source_counts,
      );
      (fileEntry.rounds || []).forEach((roundValue) => {
        existing.rounds.add(Number(roundValue));
      });
      existing.sources.push({
        topicId: topicEntry.id,
        topicLabel: topicEntry.label,
        path: fileEntry.path,
      });

      fileMap.set(fileEntry.id, existing);
    });
  });

  return Array.from(fileMap.values()).map((fileEntry) => ({
    ...fileEntry,
    rounds: Array.from(fileEntry.rounds).sort((left, right) => left - right),
  }));
}

function getFileEntry(
  stageId = appState.stage,
  levelId = appState.level,
  topicId = appState.topic,
  fileId = appState.file,
) {
  return getFileEntries(stageId, levelId, topicId).find((file) => file.id === fileId) || null;
}

function getStageSourceTotal(stageEntry) {
  return Object.values(stageEntry?.counts || {}).reduce(
    (sum, count) => sum + Number(count || 0),
    0,
  );
}

function getDefaultLevelId(stageId) {
  return (
    getLevelEntries(stageId).find((level) => (level.topics || []).length > 0)?.id ||
    getLevelEntries(stageId)[0]?.id ||
    ""
  );
}

function getDefaultFileId(stageId, levelId, topicId) {
  return getFileEntries(stageId, levelId, topicId)[0]?.id || "";
}

function getSelectionSnapshot(overrides = {}) {
  return {
    stage: appState.stage,
    level: appState.level,
    topic: appState.topic,
    file: appState.file,
    definitionScope: appState.definitionScope,
    round: appState.round,
    ...overrides,
  };
}

function getInitialSelectionFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  const requestedRound = searchParams.get("round");

  return {
    stage: String(searchParams.get("stage") || "")
      .trim()
      .toUpperCase(),
    level: String(searchParams.get("level") || "").trim(),
    topic: normalizeTopicKey(String(searchParams.get("topic") || "").trim()),
    file: String(searchParams.get("file") || "").trim(),
    definitionScope: String(searchParams.get("definition_scope") || "all").trim(),
    round: requestedRound && requestedRound !== "all" ? String(Number(requestedRound)) : "all",
  };
}

function synchroniseSelection(requestedSelection = getSelectionSnapshot()) {
  const stageEntries = getStageEntries();
  const stageId = stageEntries.some((stage) => stage.id === requestedSelection.stage)
    ? requestedSelection.stage
    : stageEntries[0]?.id || "";
  const levelEntries = getLevelEntries(stageId);
  const levelId = levelEntries.some((level) => level.id === requestedSelection.level)
    ? requestedSelection.level
    : getDefaultLevelId(stageId);
  const topicEntries = getTopicEntries(stageId, levelId);
  const topicId = topicEntries.some((topic) => topic.id === requestedSelection.topic)
    ? requestedSelection.topic
    : "";
  const fileEntries = getFileEntries(stageId, levelId, topicId);
  const fileId = fileEntries.some((file) => file.id === requestedSelection.file)
    ? requestedSelection.file
    : getDefaultFileId(stageId, levelId, topicId);
  const fileEntry = getFileEntry(stageId, levelId, topicId, fileId);
  const definitionScope =
    fileId === "core-definitions" &&
    definitionScopeOptions.some((option) => option.id === requestedSelection.definitionScope)
      ? requestedSelection.definitionScope
      : "all";
  const round =
    fileId === "multi-round-cloze" &&
    fileEntry?.rounds?.some((roundNumber) => String(roundNumber) === requestedSelection.round)
      ? requestedSelection.round
      : "all";

  appState.stage = stageId;
  appState.level = levelId;
  appState.topic = topicId;
  appState.file = fileId;
  appState.definitionScope = definitionScope;
  appState.round = round;

  return fileEntry;
}

function updateUrlFromState() {
  const searchParams = new URLSearchParams(window.location.search);

  searchParams.set("stage", appState.stage);
  searchParams.set("level", appState.level);
  searchParams.set("file", appState.file);

  if (appState.topic) {
    searchParams.set("topic", appState.topic);
  } else {
    searchParams.delete("topic");
  }

  if (appState.definitionScope !== "all" && appState.file === "core-definitions") {
    searchParams.set("definition_scope", appState.definitionScope);
  } else {
    searchParams.delete("definition_scope");
  }

  if (appState.round !== "all" && appState.file === "multi-round-cloze") {
    searchParams.set("round", appState.round);
  } else {
    searchParams.delete("round");
  }

  const nextSearch = searchParams.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;

  window.history.replaceState(null, "", nextUrl);
}

function getFileCountLabel(fileEntry) {
  if (!fileEntry) {
    return "0 items";
  }

  if (fileEntry.id === "multi-round-cloze") {
    return `${pluralise(fileEntry.count, "prompt")} · ${pluralise(
      fileEntry.runtime_unit_count,
      "round",
    )}`;
  }

  return pluralise(fileEntry.count, "item");
}

function applySelection(nextSelection) {
  synchroniseSelection(nextSelection);
  renderControls();
  updateUrlFromState();
  refreshSession({ allowCatalogResync: true });
}

function renderStageSwitcher() {
  stageSwitcher.innerHTML = getStageEntries()
    .map((stageEntry) => {
      const countLabel = pluralise(getStageSourceTotal(stageEntry), "source item");

      return `
        <button
          class="memorisation-toggle"
          type="button"
          data-stage-id="${stageEntry.id}"
          data-active="${stageEntry.id === appState.stage ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${stageEntry.id}</span>
          <span class="memorisation-toggle__count">${countLabel}</span>
        </button>
      `;
    })
    .join("");

  stageSwitcher.querySelectorAll("[data-stage-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextStage = button.dataset.stageId;

      if (!nextStage || nextStage === appState.stage) {
        return;
      }

      applySelection(
        getSelectionSnapshot({
          stage: nextStage,
          level: "",
          topic: "",
          file: "",
          definitionScope: "all",
          round: "all",
        }),
      );
    });
  });
}

function renderLevelSwitcher() {
  levelSwitcher.innerHTML = getLevelEntries()
    .slice()
    .sort((left, right) => levelOrder.indexOf(left.id) - levelOrder.indexOf(right.id))
    .map(
      (levelEntry) => `
        <button
          class="memorisation-toggle"
          type="button"
          data-level-id="${levelEntry.id}"
          data-active="${levelEntry.id === appState.level ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${levelEntry.label}</span>
          <span class="memorisation-toggle__count">${pluralise(
            levelEntry.count,
            "source item",
          )}</span>
        </button>
      `,
    )
    .join("");

  levelSwitcher.querySelectorAll("[data-level-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextLevel = button.dataset.levelId;

      if (!nextLevel || nextLevel === appState.level) {
        return;
      }

      applySelection(
        getSelectionSnapshot({
          level: nextLevel,
          topic: "",
          file: "",
          definitionScope: "all",
          round: "all",
        }),
      );
    });
  });
}

function renderTopicFilter() {
  const topics = getTopicEntries()
    .slice()
    .sort((left, right) => collator.compare(left.label, right.label));

  topicFilter.disabled = topics.length === 0;
  topicFilter.innerHTML = topics.length
    ? [
        '<option value="">All topics</option>',
        ...topics.map((topic) => `<option value="${topic.id}">${topic.label}</option>`),
      ].join("")
    : '<option value="">No topics available</option>';

  if (appState.topic && !topics.some((topic) => topic.id === appState.topic)) {
    appState.topic = "";
  }

  topicFilter.value = appState.topic;
}

function renderFileSwitcher() {
  fileSwitcher.innerHTML = getFileEntries()
    .slice()
    .sort((left, right) => fileOrder.indexOf(left.id) - fileOrder.indexOf(right.id))
    .map(
      (fileEntry) => `
        <button
          class="memorisation-toggle memorisation-toggle--compact"
          type="button"
          data-file-id="${fileEntry.id}"
          data-active="${fileEntry.id === appState.file ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${fileEntry.label}</span>
          <span class="memorisation-toggle__count">${getFileCountLabel(fileEntry)}</span>
        </button>
      `,
    )
    .join("");

  fileSwitcher.querySelectorAll("[data-file-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextFile = button.dataset.fileId;

      if (!nextFile || nextFile === appState.file) {
        return;
      }

      applySelection(
        getSelectionSnapshot({
          file: nextFile,
          definitionScope: "all",
          round: "all",
        }),
      );
    });
  });
}

function renderDefinitionFilter() {
  const fileEntry = getFileEntry();

  if (fileEntry?.id !== "core-definitions") {
    definitionFilterSection.hidden = true;
    definitionFilterGrid.innerHTML = "";
    appState.definitionScope = "all";
    return;
  }

  definitionFilterSection.hidden = false;

  const definitionSourceCounts = fileEntry.definition_source_counts || {};
  definitionFilterGrid.innerHTML = definitionScopeOptions
    .map((option) => {
      const count =
        option.id === "all" ? fileEntry.count : Number(definitionSourceCounts[option.id] || 0);

      return `
        <button
          class="memorisation-toggle memorisation-toggle--compact"
          type="button"
          data-definition-scope="${option.id}"
          data-active="${option.id === appState.definitionScope ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${option.label}</span>
          <span class="memorisation-toggle__count">${pluralise(count, "item")}</span>
        </button>
      `;
    })
    .join("");

  definitionFilterGrid.querySelectorAll("[data-definition-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextScope = button.dataset.definitionScope;

      if (!nextScope || nextScope === appState.definitionScope) {
        return;
      }

      appState.definitionScope = nextScope;
      renderDefinitionFilter();
      updateUrlFromState();
      refreshSession({ allowCatalogResync: true });
    });
  });
}

function renderRoundSwitcher() {
  const fileEntry = getFileEntry();

  if (fileEntry?.id !== "multi-round-cloze") {
    roundSwitcherSection.hidden = true;
    roundSwitcher.innerHTML = "";
    appState.round = "all";
    return;
  }

  roundSwitcherSection.hidden = false;
  const roundOptions = ["all", ...fileEntry.rounds.map((round) => String(round))];

  if (!roundOptions.includes(appState.round)) {
    appState.round = "all";
  }

  roundSwitcher.innerHTML = roundOptions
    .map((option) => {
      const label = option === "all" ? "All rounds" : `Round ${option}`;

      return `
        <button
          class="memorisation-toggle memorisation-toggle--compact"
          type="button"
          data-round-value="${option}"
          data-active="${option === appState.round ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${label}</span>
        </button>
      `;
    })
    .join("");

  roundSwitcher.querySelectorAll("[data-round-value]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextRound = button.dataset.roundValue;

      if (!nextRound || nextRound === appState.round) {
        return;
      }

      appState.round = nextRound;
      renderRoundSwitcher();
      updateUrlFromState();
      refreshSession({ allowCatalogResync: true });
    });
  });
}

function renderControls() {
  renderStageSwitcher();
  renderLevelSwitcher();
  renderTopicFilter();
  renderFileSwitcher();
  renderDefinitionFilter();
  renderRoundSwitcher();
}

async function loadFileItems(path) {
  if (appState.fileDataCache.has(path)) {
    return appState.fileDataCache.get(path);
  }

  const items = await fetchJson(`./data/${path}`);
  const normalizedItems = Array.isArray(items)
    ? items.map((item) => ({
        ...item,
        topic: normalizeTopicKey(item.topic),
      }))
    : [];

  appState.fileDataCache.set(path, normalizedItems);
  return normalizedItems;
}

async function loadSessionSourceItems(fileEntry) {
  if (!fileEntry) {
    return [];
  }

  const settledSources = await Promise.all(
    fileEntry.sources.map(async (source) => {
      const items = await loadFileItems(source.path);

      return items.map((item) => ({
        ...item,
        topic: normalizeTopicKey(item.topic || source.topicId),
        topicLabel: source.topicLabel,
      }));
    }),
  );

  return settledSources.flat();
}

async function loadCatalogResources({ preserveSelection = true } = {}) {
  const fallbackSelection = preserveSelection
    ? getSelectionSnapshot()
    : getInitialSelectionFromUrl();
  const catalog = await fetchJson("./data/catalog.json");

  if (!Array.isArray(catalog?.stages) || catalog.stages.length === 0) {
    throw new Error("The memorisation catalog is empty or malformed.");
  }

  let topicNormalizationMap = appState.topicNormalizationMap;

  try {
    const loadedMap = await fetchJson("./data/context/topic_normalization_map.json");
    topicNormalizationMap =
      loadedMap && typeof loadedMap === "object" && !Array.isArray(loadedMap) ? loadedMap : {};
  } catch (error) {
    topicNormalizationMap = preserveSelection ? appState.topicNormalizationMap : {};
  }

  appState.catalog = catalog;
  appState.topicNormalizationMap = topicNormalizationMap;
  appState.fileDataCache.clear();

  synchroniseSelection({
    ...fallbackSelection,
    topic: normalizeTopicKeyWithMap(fallbackSelection.topic, topicNormalizationMap),
  });
}

function getPageSizeForCurrentFile(fileId = appState.file) {
  return questionPageSizeByFile[fileId] || questionPageSizeByFile.default;
}

function fillPromptBlanks(prompt, values) {
  const promptText = String(prompt || "");
  const parts = promptText.split(/_{4,}/g);
  const blanks = promptText.match(/_{4,}/g) || [];

  if (!blanks.length || values.length !== blanks.length) {
    return "";
  }

  return parts.reduce((built, part, index) => {
    if (index === 0) {
      return `${part}${values[0] || ""}`;
    }

    if (index === parts.length - 1) {
      return `${built}${part}`;
    }

    return `${built}${part}${values[index] || ""}`;
  }, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitConceptPhrases(text) {
  const normalized = String(text || "").trim();

  if (!normalized) {
    return [];
  }

  let phrases = normalized
    .replace(/;\s+/g, "|")
    .replace(/\.\s+/g, "|")
    .replace(/\s+but\s+/gi, "|")
    .replace(/\s+because\s+/gi, "|because ")
    .replace(/\s+therefore\s+/gi, "|therefore ")
    .replace(/\s+to form\s+/gi, "|form ")
    .replace(/\s+to produce\s+/gi, "|produce ")
    .split("|")
    .map((phrase) => phrase.trim())
    .filter(Boolean);

  if (phrases.length === 1 && phrases[0].split(/\s+/).length > 10) {
    phrases = phrases[0]
      .replace(/,\s+(?=(and|which|while)\b)/gi, "|")
      .split("|")
      .map((phrase) => phrase.trim())
      .filter(Boolean);
  }

  return phrases.length ? phrases : [normalized];
}

function buildConceptKeywords(text, matcherConfig) {
  if (matcherConfig.type === "equation") {
    return [];
  }

  return buildControlledTextComparable(text).tokens.filter(
    (token) => token && !conceptKeywordStopwords.has(token) && !prepositionTokens.has(token),
  );
}

function buildConceptHint(phrase, keywords) {
  const lowered = String(phrase || "").toLowerCase();

  if (lowered.includes("electron") && lowered.includes("remove")) {
    return "Mention the electron-removal step.";
  }

  if (lowered.includes("ion") && lowered.includes("form")) {
    return "Mention the ions formed.";
  }

  if (lowered.includes("proton") && lowered.includes("number")) {
    return "Mention the proton-number condition.";
  }

  if (lowered.includes("neutron")) {
    return "Mention what differs about neutrons.";
  }

  if (lowered.includes("lone pair")) {
    return "Mention the lone-pair part of the idea.";
  }

  if (lowered.includes("electrostatic")) {
    return "Mention the electrostatic attraction.";
  }

  if (lowered.includes("gaseous")) {
    return "Mention the gaseous species involved.";
  }

  if (keywords.length === 1) {
    return `Mention ${keywords[0]}.`;
  }

  if (keywords.length >= 2) {
    return `Include the ${keywords.slice(0, 2).join(" / ")} idea.`;
  }

  return "Include the missing chemistry idea.";
}

function buildContradictionsForPhrase(phrase, matcherConfig, groupId) {
  if (matcherConfig.type === "equation") {
    return [];
  }

  return contradictionPairs
    .map(([fromToken, toToken]) => {
      const tokenPattern = new RegExp(`\\b${escapeRegExp(fromToken)}\\b`, "i");

      if (!tokenPattern.test(phrase)) {
        return null;
      }

      const contradictionText = phrase.replace(tokenPattern, toToken);
      const normalizedVariant = buildControlledTextComparable(contradictionText).text;

      if (!normalizedVariant) {
        return null;
      }

      return {
        id: `${groupId}::${fromToken}-vs-${toToken}`,
        variants: [contradictionText],
        normalized_variants: [normalizedVariant],
      };
    })
    .filter(Boolean);
}

function normalizeConceptGroups(conceptGroups, matcherConfig) {
  return conceptGroups
    .map((group, groupIndex) => {
      const variants = Array.isArray(group.variants) ? group.variants.filter(Boolean) : [];
      const normalizedVariants = variants
        .map((variant) =>
          matcherConfig.type === "equation"
            ? buildEquationComparable(variant, matcherConfig)
            : buildControlledTextComparable(variant).text,
        )
        .filter(Boolean);

      if (!normalizedVariants.length) {
        return null;
      }

      const keywords = buildConceptKeywords(variants[0], matcherConfig);

      return {
        id: group.id || `group-${groupIndex + 1}`,
        required: group.required !== false,
        variants,
        normalized_variants: normalizedVariants,
        keywords,
        minimum_keyword_matches: Number(
          group.minimum_keyword_matches ??
            (matcherConfig.type === "equation"
              ? 0
              : Math.min(4, Math.max(1, Math.ceil(keywords.length * 0.6)))),
        ),
        hint: group.hint || buildConceptHint(variants[0], keywords),
      };
    })
    .filter(Boolean);
}

function normalizeContradictions(contradictions, matcherConfig) {
  return contradictions
    .map((contradiction, contradictionIndex) => {
      const variants = Array.isArray(contradiction.variants)
        ? contradiction.variants.filter(Boolean)
        : [];
      const normalizedVariants = variants
        .map((variant) =>
          matcherConfig.type === "equation"
            ? buildEquationComparable(variant, matcherConfig)
            : buildControlledTextComparable(variant).text,
        )
        .filter(Boolean);

      if (!normalizedVariants.length) {
        return null;
      }

      return {
        id: contradiction.id || `contradiction-${contradictionIndex + 1}`,
        variants,
        normalized_variants: normalizedVariants,
      };
    })
    .filter(Boolean);
}

function deriveConceptGroups(minimalPass, matcherConfig) {
  if (matcherConfig.type === "equation") {
    return normalizeConceptGroups(
      [
        {
          id: "equation-match",
          required: true,
          variants: [minimalPass],
          hint: "Match the stored equation.",
        },
      ],
      matcherConfig,
    );
  }

  return normalizeConceptGroups(
    splitConceptPhrases(minimalPass).map((phrase, phraseIndex) => ({
      id: `group-${phraseIndex + 1}`,
      required: true,
      variants: [phrase],
      hint: buildConceptHint(phrase, buildConceptKeywords(phrase, matcherConfig)),
    })),
    matcherConfig,
  );
}

function createAnswerModel({
  answer,
  fullAnswer,
  minimalPass,
  conceptGroups,
  contradictions,
  fileId,
  prompt,
  question,
  type,
  sourceScope,
}) {
  const canonicalValue = String(answer ?? fullAnswer ?? minimalPass ?? "").trim();
  const resolvedFullAnswer = String(fullAnswer ?? canonicalValue).trim() || canonicalValue;
  const resolvedMinimalPass =
    String(
      minimalPass ??
        (type === "definition" && sourceScope && sourceScope !== "paper_only"
          ? canonicalValue
          : canonicalValue),
    ).trim() || resolvedFullAnswer;
  const matcherConfig = getMatcherConfig({
    fileId,
    prompt,
    question,
  });
  const resolvedConceptGroups = normalizeConceptGroups(conceptGroups || [], matcherConfig);
  const derivedConceptGroups = resolvedConceptGroups.length
    ? resolvedConceptGroups
    : deriveConceptGroups(resolvedMinimalPass, matcherConfig);
  const resolvedContradictions = normalizeContradictions(contradictions || [], matcherConfig);
  const derivedContradictions =
    resolvedContradictions.length > 0
      ? resolvedContradictions
      : derivedConceptGroups.flatMap((group) =>
          buildContradictionsForPhrase(group.variants[0], matcherConfig, group.id),
        );

  return {
    full_answer: resolvedFullAnswer,
    minimal_pass: resolvedMinimalPass,
    concept_groups: derivedConceptGroups,
    contradictions: derivedContradictions,
    matcherConfig,
  };
}

function createQuestionBase(item, fileEntry, questionId, kind, questionText, promptText) {
  return {
    id: questionId,
    sourceId: item.id,
    stage: item.stage || appState.stage,
    level: item.level || appState.level,
    topic: item.topic,
    topicLabel: item.topicLabel || getTopicEntry(appState.stage, appState.level, item.topic)?.label,
    subtopic: item.subtopic || "",
    fileId: fileEntry.id,
    fileLabel: fileEntry.label,
    kind,
    type: item.type,
    question: questionText,
    prompt: promptText,
    sourceScope: item.source_scope || "",
    round: null,
    roundTotal: null,
    fullAnswer: "",
    minimalPass: "",
    conceptGroups: [],
    contradictions: [],
    blanks: [],
  };
}

function createBlankModel(question, blankIndex, answerModel, options = {}) {
  return {
    id: `${question.id}::${blankIndex}`,
    questionId: question.id,
    blankIndex,
    label: options.label || `Blank ${blankIndex + 1}`,
    multiline: Boolean(options.multiline),
    placeholder: options.placeholder || (options.multiline ? "Type your answer." : "Type here."),
    answerModel,
  };
}

function buildSingleQuestion(item, fileEntry) {
  const questionId = `${fileEntry.id}::${item.topic}::${item.id}`;
  const promptText = item.prompt || item.question || "";
  const question = createQuestionBase(item, fileEntry, questionId, "single", promptText, promptText);
  const answerModel = createAnswerModel({
    answer: item.answer,
    fullAnswer: item.full_answer || item.answer,
    minimalPass: item.minimal_pass,
    conceptGroups: item.concept_groups,
    contradictions: item.contradictions,
    fileId: fileEntry.id,
    prompt: item.prompt,
    question: item.question,
    type: item.type,
    sourceScope: item.source_scope,
  });
  const blank = createBlankModel(question, 0, answerModel, {
    label: "Your answer",
    placeholder: "Type your answer.",
  });

  question.fullAnswer = answerModel.full_answer;
  question.minimalPass = answerModel.minimal_pass;
  question.conceptGroups = answerModel.concept_groups;
  question.contradictions = answerModel.contradictions;
  question.blanks = [blank];

  return question;
}

function buildGuidedClozeQuestion(item, fileEntry) {
  const questionId = `${fileEntry.id}::${item.topic}::${item.id}`;
  const questionText = item.question || item.prompt || "";
  const question = createQuestionBase(item, fileEntry, questionId, "cloze", questionText, item.prompt);
  const answers = Array.isArray(item.answers) ? item.answers : [];
  const blankPattern = /_{4,}/g;
  const blankCount = (String(item.prompt || "").match(blankPattern) || []).length;

  if (answers.length !== blankCount) {
    return null;
  }

  const answerModels = answers.map((answer, answerIndex) =>
    createAnswerModel({
      answer,
      fullAnswer: answer,
      minimalPass: item.minimal_pass_answers?.[answerIndex],
      fileId: fileEntry.id,
      prompt: item.prompt,
      question: item.question,
      type: item.type,
      sourceScope: item.source_scope,
    }),
  );

  question.fullAnswer = item.full_answer || fillPromptBlanks(item.prompt, answers);
  question.minimalPass = fillPromptBlanks(
    item.prompt,
    answerModels.map((answerModel) => answerModel.minimal_pass),
  );
  question.conceptGroups = answerModels.flatMap((answerModel) => answerModel.concept_groups);
  question.contradictions = answerModels.flatMap((answerModel) => answerModel.contradictions);
  question.promptParts = String(item.prompt || "").split(blankPattern);
  question.blanks = answerModels.map((answerModel, blankIndex) =>
    createBlankModel(question, blankIndex, answerModel, {
      label: `Blank ${blankIndex + 1}`,
      placeholder: `Blank ${blankIndex + 1}`,
    }),
  );

  return question;
}

function buildMultiRoundQuestions(item, fileEntry) {
  const rounds = Array.isArray(item.rounds) ? item.rounds : [];

  return rounds
    .filter(
      (round, roundIndex) =>
        appState.round === "all" || String(round.round ?? roundIndex + 1) === appState.round,
    )
    .map((round, roundIndex) => {
      const roundNumber = Number(round.round ?? roundIndex + 1);
      const questionId = `${fileEntry.id}::${item.topic}::${item.id}::round-${roundNumber}`;
      const questionText = item.question || round.prompt || "";
      const question = createQuestionBase(
        item,
        fileEntry,
        questionId,
        "cloze",
        questionText,
        round.prompt,
      );
      const answers = Array.isArray(round.answers) ? round.answers : [];
      const blankPattern = /_{4,}/g;
      const blankCount = (String(round.prompt || "").match(blankPattern) || []).length;

      if (answers.length !== blankCount) {
        return null;
      }

      const answerModels = answers.map((answer, answerIndex) =>
        createAnswerModel({
          answer,
          fullAnswer: answer,
          minimalPass: item.minimal_pass_answers?.[answerIndex],
          fileId: fileEntry.id,
          prompt: round.prompt,
          question: item.question,
          type: item.type,
          sourceScope: item.source_scope,
        }),
      );

      question.round = roundNumber;
      question.roundTotal = rounds.length;
      question.fullAnswer = item.full_answer || fillPromptBlanks(round.prompt, answers);
      question.minimalPass = fillPromptBlanks(
        round.prompt,
        answerModels.map((answerModel) => answerModel.minimal_pass),
      );
      question.conceptGroups = answerModels.flatMap((answerModel) => answerModel.concept_groups);
      question.contradictions = answerModels.flatMap((answerModel) => answerModel.contradictions);
      question.promptParts = String(round.prompt || "").split(blankPattern);
      question.blanks = answerModels.map((answerModel, blankIndex) =>
        createBlankModel(question, blankIndex, answerModel, {
          label: `Blank ${blankIndex + 1}`,
          placeholder: `Blank ${blankIndex + 1}`,
        }),
      );

      return question;
    })
    .filter(Boolean);
}

function buildFullReconstructionQuestion(item, fileEntry) {
  const questionId = `${fileEntry.id}::${item.topic}::${item.id}`;
  const questionText = item.question || item.prompt || "";
  const question = createQuestionBase(
    item,
    fileEntry,
    questionId,
    "reconstruction",
    questionText,
    questionText,
  );
  const answerModel = createAnswerModel({
    answer: item.answer,
    fullAnswer: item.answer,
    minimalPass: item.minimal_pass,
    conceptGroups: item.concept_groups,
    contradictions: item.contradictions,
    fileId: fileEntry.id,
    prompt: item.prompt,
    question: item.question,
    type: item.type,
    sourceScope: item.source_scope,
  });
  const blank = createBlankModel(question, 0, answerModel, {
    label: "Your full answer",
    placeholder: "Type your full answer.",
    multiline: true,
  });

  question.fullAnswer = answerModel.full_answer;
  question.minimalPass = answerModel.minimal_pass;
  question.conceptGroups = answerModel.concept_groups;
  question.contradictions = answerModel.contradictions;
  question.blanks = [blank];

  return question;
}

function buildSessionQuestions(items, fileEntry) {
  const filteredItems =
    fileEntry.id === "core-definitions" && appState.definitionScope !== "all"
      ? items.filter((item) => item.source_scope === appState.definitionScope)
      : items;

  if (fileEntry.id === "guided-cloze") {
    return filteredItems.map((item) => buildGuidedClozeQuestion(item, fileEntry)).filter(Boolean);
  }

  if (fileEntry.id === "multi-round-cloze") {
    return filteredItems.flatMap((item) => buildMultiRoundQuestions(item, fileEntry));
  }

  if (fileEntry.id === "full-reconstruction") {
    return filteredItems.map((item) => buildFullReconstructionQuestion(item, fileEntry));
  }

  return filteredItems.map((item) => buildSingleQuestion(item, fileEntry));
}

function createBlankState(blank) {
  return {
    id: blank.id,
    questionId: blank.questionId,
    status: "idle",
    value: "",
    wrongCount: 0,
    revealed: false,
    coveredGroups: [],
    missingGroups: blank.answerModel.concept_groups
      .filter((group) => group.required)
      .map((group) => group.id),
    contradictionHits: [],
    reviewPriority: 0,
    lastReviewSignalAt: 0,
    matchState: "untouched",
  };
}

function buildReviewPriority(blankState) {
  return (
    (blankState.revealed ? 1_000_000 : 0) +
    blankState.wrongCount * 10_000 +
    (blankState.status === "wrong" ? 1_000 : 0) +
    blankState.lastReviewSignalAt
  );
}

function rebuildSessionRuntime(sessionQuestions) {
  appState.sessionQuestions = sessionQuestions;
  appState.sessionQuestionIds = sessionQuestions.map((question) => question.id);
  appState.sessionQuestionMap = new Map(sessionQuestions.map((question) => [question.id, question]));
  appState.sessionBlankIds = sessionQuestions.flatMap((question) =>
    question.blanks.map((blank) => blank.id),
  );
  appState.sessionBlankMap = new Map(
    sessionQuestions.flatMap((question) => question.blanks.map((blank) => [blank.id, blank])),
  );
  appState.blankStates = new Map(
    appState.sessionBlankIds.map((blankId) => [
      blankId,
      createBlankState(appState.sessionBlankMap.get(blankId)),
    ]),
  );
  appState.pages = chunkIntoPages(appState.sessionQuestionIds, getPageSizeForCurrentFile());
  appState.currentPageIndex = 0;
  appState.reviewQueueBlankIds = [];
  appState.reviewPages = [];
  appState.reviewPageIndex = 0;
  appState.reviewMode = false;
  appState.currentBlankId = appState.sessionBlankIds[0] || "";
  appState.pendingFocusBlankId = appState.currentBlankId;
  appState.revealedQuestionIds = new Set();
  appState.blankInputRefs = new Map();
  updateReviewQueue();
}

function getQuestion(questionId) {
  return appState.sessionQuestionMap.get(questionId) || null;
}

function getBlank(blankId) {
  return appState.sessionBlankMap.get(blankId) || null;
}

function getBlankState(blankId) {
  return appState.blankStates.get(blankId) || null;
}

function isBlankComplete(blankId) {
  const blankState = getBlankState(blankId);
  return Boolean(blankState && (blankState.status === "correct" || blankState.status === "revealed"));
}

function getCompletedBlankCount() {
  return appState.sessionBlankIds.filter((blankId) => isBlankComplete(blankId)).length;
}

function getPageSet() {
  return appState.reviewMode ? appState.reviewPages : appState.pages;
}

function getCurrentPageIndex() {
  return appState.reviewMode ? appState.reviewPageIndex : appState.currentPageIndex;
}

function getCurrentPageEntries() {
  const pages = getPageSet();
  return pages[getCurrentPageIndex()] || [];
}

function updateReviewQueue() {
  appState.reviewQueueBlankIds = appState.sessionBlankIds
    .filter((blankId) => {
      const blankState = getBlankState(blankId);

      return Boolean(
        blankState &&
          (blankState.status === "wrong" || blankState.revealed || blankState.wrongCount > 0),
      );
    })
    .sort((leftBlankId, rightBlankId) => {
      const leftPriority = buildReviewPriority(getBlankState(leftBlankId));
      const rightPriority = buildReviewPriority(getBlankState(rightBlankId));
      return rightPriority - leftPriority;
    });

  appState.reviewPages = chunkIntoPages(appState.reviewQueueBlankIds, reviewPageSize);

  if (appState.reviewPageIndex >= appState.reviewPages.length) {
    appState.reviewPageIndex = Math.max(0, appState.reviewPages.length - 1);
  }
}

function getCurrentModeBlankOrder() {
  return appState.reviewMode ? appState.reviewQueueBlankIds : appState.sessionBlankIds;
}

function getCurrentModePageIndexForBlank(blankId) {
  const pages = getPageSet();

  if (appState.reviewMode) {
    return pages.findIndex((page) => page.includes(blankId));
  }

  const questionId = getBlank(blankId)?.questionId;
  return pages.findIndex((page) => page.includes(questionId));
}

function findNextIncompleteBlankAfter(blankId = "") {
  const blankOrder = getCurrentModeBlankOrder();

  if (!blankOrder.length) {
    return "";
  }

  const startIndex = Math.max(blankOrder.indexOf(blankId), -1) + 1;

  for (let index = startIndex; index < blankOrder.length; index += 1) {
    if (!isBlankComplete(blankOrder[index])) {
      return blankOrder[index];
    }
  }

  for (let index = 0; index < startIndex; index += 1) {
    if (!isBlankComplete(blankOrder[index])) {
      return blankOrder[index];
    }
  }

  return "";
}

function queueFocusBlank(blankId) {
  if (!blankId) {
    return;
  }

  appState.pendingFocusBlankId = blankId;
  requestAnimationFrame(() => {
    if (appState.pendingFocusBlankId !== blankId) {
      return;
    }

    const field = appState.blankInputRefs.get(blankId);

    if (!field) {
      return;
    }

    field.focus();
    if (typeof field.select === "function" && field.tagName !== "TEXTAREA") {
      field.select();
    }

    appState.currentBlankId = blankId;
    appState.pendingFocusBlankId = "";
  });
}

function focusBlank(blankId) {
  if (!blankId) {
    return;
  }

  const targetPageIndex = getCurrentModePageIndexForBlank(blankId);

  if (targetPageIndex >= 0) {
    if (appState.reviewMode) {
      appState.reviewPageIndex = targetPageIndex;
    } else {
      appState.currentPageIndex = targetPageIndex;
    }
  }

  renderSession({ focusBlankId: blankId });
}

function moveToNextBlank(blankId = appState.currentBlankId) {
  const nextBlankId = findNextIncompleteBlankAfter(blankId);

  if (!nextBlankId) {
    renderSession();
    return;
  }

  focusBlank(nextBlankId);
}

function setBlankValue(blankId, value) {
  const blankState = getBlankState(blankId);

  if (!blankState) {
    return;
  }

  blankState.value = value;
}

function buildComparableInput(value, matcherConfig) {
  if (matcherConfig.type === "equation") {
    const text = buildEquationComparable(value, matcherConfig);

    return {
      text,
      tokens: text ? [text] : [],
      tokenSet: new Set(text ? [text] : []),
      ngrams: new Set(text ? [text] : []),
    };
  }

  const comparable = buildControlledTextComparable(value);
  const ngrams = new Set();

  for (let length = Math.min(comparable.tokens.length, 6); length > 0; length -= 1) {
    for (let startIndex = 0; startIndex <= comparable.tokens.length - length; startIndex += 1) {
      ngrams.add(comparable.tokens.slice(startIndex, startIndex + length).join(" "));
    }
  }

  return {
    text: comparable.text,
    tokens: comparable.tokens,
    tokenSet: new Set(comparable.tokens),
    ngrams,
  };
}

function evaluateConceptMatcher(blank, userValue) {
  const answerModel = blank.answerModel;
  const comparableInput = buildComparableInput(userValue, answerModel.matcherConfig);
  const legacyResult = evaluateMatchResult(
    userValue,
    answerModel.minimal_pass,
    answerModel.matcherConfig,
  );
  const coveredGroups = [];
  const missingGroups = [];

  answerModel.concept_groups.forEach((group) => {
    const phraseCovered = group.normalized_variants.some(
      (variant) => comparableInput.text === variant || comparableInput.ngrams.has(variant),
    );
    const keywordMatches = group.keywords.filter((keyword) => comparableInput.tokenSet.has(keyword));
    const keywordCovered =
      answerModel.matcherConfig.type !== "equation" &&
      group.minimum_keyword_matches > 0 &&
      keywordMatches.length >= group.minimum_keyword_matches;

    if (phraseCovered || keywordCovered) {
      coveredGroups.push(group.id);
      return;
    }

    if (group.required) {
      missingGroups.push(group.id);
    }
  });

  const contradictionHits = answerModel.contradictions
    .filter((contradiction) =>
      contradiction.normalized_variants.some(
        (variant) => comparableInput.text === variant || comparableInput.ngrams.has(variant),
      ),
    )
    .map((contradiction) => contradiction.id);
  const minimumPassSatisfied = missingGroups.length === 0 && contradictionHits.length === 0;

  return {
    status: minimumPassSatisfied ? "correct" : "wrong",
    coveredGroups,
    missingGroups,
    contradictionHits,
    minimumPassSatisfied,
    matchState: legacyResult.state,
  };
}

function checkBlank(blankId) {
  const blank = getBlank(blankId);
  const blankState = getBlankState(blankId);

  if (!blank || !blankState) {
    return {
      status: "wrong",
      coveredGroups: [],
      missingGroups: [],
      contradictionHits: [],
      minimumPassSatisfied: false,
      matchState: "incorrect",
    };
  }

  const result = evaluateConceptMatcher(blank, blankState.value);

  blankState.coveredGroups = result.coveredGroups;
  blankState.missingGroups = result.missingGroups;
  blankState.contradictionHits = result.contradictionHits;
  blankState.matchState = result.matchState;

  if (result.status === "correct") {
    blankState.status = "correct";
  } else {
    blankState.status = "wrong";
    blankState.wrongCount += 1;
    blankState.lastReviewSignalAt = nextInteractionTick();
  }

  blankState.reviewPriority = buildReviewPriority(blankState);
  updateReviewQueue();
  return result;
}

function revealQuestion(questionId) {
  const question = getQuestion(questionId);

  if (!question) {
    return;
  }

  appState.revealedQuestionIds.add(questionId);

  question.blanks.forEach((blank) => {
    const blankState = getBlankState(blank.id);

    if (!blankState || blankState.status === "correct") {
      return;
    }

    blankState.status = "revealed";
    blankState.revealed = true;
    blankState.coveredGroups = [];
    blankState.missingGroups = blank.answerModel.concept_groups
      .filter((group) => group.required)
      .map((group) => group.id);
    blankState.contradictionHits = [];
    blankState.lastReviewSignalAt = nextInteractionTick();
    blankState.reviewPriority = buildReviewPriority(blankState);
  });

  updateReviewQueue();
  renderSession({ focusBlankId: appState.currentBlankId });
}

function onBlankEnter(blankId) {
  const blankState = getBlankState(blankId);

  if (!blankState) {
    return;
  }

  if (blankState.status === "correct") {
    moveToNextBlank(blankId);
    return;
  }

  const result = checkBlank(blankId);
  renderSession({ focusBlankId: blankId });

  if (result.status === "correct") {
    return;
  }
}

function setReviewMode(reviewMode) {
  if (reviewMode && appState.reviewQueueBlankIds.length === 0) {
    return;
  }

  appState.reviewMode = reviewMode;
  appState.pendingFocusBlankId = reviewMode
    ? appState.reviewQueueBlankIds[0] || ""
    : findNextIncompleteBlankAfter("") || appState.currentBlankId;
  renderSession({ focusBlankId: appState.pendingFocusBlankId });
}

function goToPage(nextPageIndex) {
  const pages = getPageSet();
  const boundedIndex = Math.min(Math.max(nextPageIndex, 0), Math.max(0, pages.length - 1));

  if (appState.reviewMode) {
    appState.reviewPageIndex = boundedIndex;
  } else {
    appState.currentPageIndex = boundedIndex;
  }

  const pageEntries = pages[boundedIndex] || [];
  const firstTargetBlankId = appState.reviewMode
    ? pageEntries[0] || ""
    : getQuestion(pageEntries[0])?.blanks[0]?.id || "";

  renderSession({ focusBlankId: firstTargetBlankId });
}

function getEmptyStateMessage() {
  const fileEntry = getFileEntry();

  if (!fileEntry) {
    return "No training file is available for the current selection.";
  }

  if (fileEntry.id === "core-definitions" && appState.definitionScope !== "all") {
    return "No definition items match the selected source filter in this session.";
  }

  if (fileEntry.id === "multi-round-cloze" && appState.round !== "all") {
    return `No prompts expose ${`Round ${appState.round}`} in this session scope.`;
  }

  return "No session questions are available for the current selection.";
}

function setLoadingState(message = "Loading current session...") {
  questionLabel.textContent = "Loading session";
  questionTitle.textContent = message;
  questionCopy.textContent = "Flattening the selected training file into one continuous session.";
  pageCounter.textContent = "Page 0 / 0";
  completionChip.textContent = "0 / 0 blanks completed";
  reviewChip.textContent = "0 to review";
  sessionBanner.hidden = true;
  sessionBanner.innerHTML = "";
  sessionPage.innerHTML = `<p class="memorisation-empty">${message}</p>`;
  prevPageButton.disabled = true;
  nextBlankButton.disabled = true;
  nextPageButton.disabled = true;
  reviewToggleButton.hidden = true;
}

function renderStatusCard(target, message, actionLabel = "", actionHandler = null) {
  const shell = document.createElement("div");
  shell.className = "memorisation-status-card";

  const copy = document.createElement("p");
  copy.className = "memorisation-empty";
  copy.textContent = message;
  shell.append(copy);

  if (actionLabel && typeof actionHandler === "function") {
    const actions = document.createElement("div");
    actions.className = "memorisation-status-actions";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-link";
    button.textContent = actionLabel;
    button.addEventListener("click", actionHandler);

    actions.append(button);
    shell.append(actions);
  }

  target.replaceChildren(shell);
}

function renderStats() {
  const fileEntry = getFileEntry();
  const totalBlanks = appState.sessionBlankIds.length;

  fileManifestCount.textContent = getFileCountLabel(fileEntry);
  poolCount.textContent = pluralise(appState.sessionQuestionIds.length, "session question");
  itemCounter.textContent = pluralise(totalBlanks, "session blank");
  counterChip.textContent = appState.reviewMode ? "Review queue" : "Main session";
}

function updateBadges() {
  const stageEntry = getStageEntry();
  const levelEntry = getLevelEntry();
  const topicEntry = getTopicEntry();
  const fileEntry = getFileEntry();

  stageBadge.textContent = stageEntry?.id || "Stage";
  levelBadge.textContent = levelEntry?.label || "Level";
  topicBadge.textContent = topicEntry?.label || "All topics";
  fileBadge.textContent = fileEntry?.label || "Training file";

  if (fileEntry?.id === "core-definitions") {
    sourceBadge.hidden = false;
    sourceBadge.textContent =
      appState.definitionScope === "all"
        ? "All definition sources"
        : formatDefinitionScope(appState.definitionScope);
  } else {
    sourceBadge.hidden = true;
  }

  if (fileEntry?.id === "multi-round-cloze") {
    roundBadge.hidden = false;
    roundBadge.textContent = appState.round === "all" ? "All rounds" : `Round ${appState.round}`;
  } else {
    roundBadge.hidden = true;
  }
}

function buildQuestionMeta(question) {
  const parts = [];

  if (question.topicLabel) {
    parts.push(question.topicLabel);
  }

  if (question.subtopic) {
    parts.push(formatLabel(question.subtopic));
  }

  if (question.sourceScope) {
    parts.push(formatDefinitionScope(question.sourceScope));
  }

  if (question.round) {
    parts.push(`Round ${question.round} of ${question.roundTotal}`);
  }

  parts.push(pluralise(question.blanks.length, "blank"));
  return parts.join(" · ");
}

function getBlankFeedbackDescriptor(blank, blankState) {
  if (blankState.status === "correct") {
    return {
      label: "correct",
      tone: "correct",
      message: "Correct. Press Enter again to move to the next incomplete blank.",
    };
  }

  if (blankState.status === "revealed") {
    return {
      label: "revealed",
      tone: "revealed",
      message: "Revealed. Compare your wording with the minimum pass below.",
    };
  }

  if (blankState.status === "wrong") {
    const firstMissingGroup = blank.answerModel.concept_groups.find((group) =>
      blankState.missingGroups.includes(group.id),
    );
    const contradictionWarning = blankState.contradictionHits.length
      ? " Remove the contradictory idea and try again."
      : "";

    if (blankState.matchState === "near_miss_preposition") {
      return {
        label: "wrong",
        tone: "wrong",
        message: "Wrong. You are close, but the remaining issue looks like a preposition.",
      };
    }

    return {
      label: "wrong",
      tone: "wrong",
      message: `Wrong. ${firstMissingGroup?.hint || "Add the missing chemistry idea."}${contradictionWarning}`,
    };
  }

  if (blank.multiline) {
    return {
      label: "idle",
      tone: "neutral",
      message: "Press Enter to check this blank. Use Shift+Enter for a new line.",
    };
  }

  return {
    label: "idle",
    tone: "neutral",
    message: "Press Enter to check this blank.",
  };
}

function createBlankField(blank) {
  const blankState = getBlankState(blank.id);
  const fieldShell = document.createElement("div");
  fieldShell.className = "memorisation-blank";
  fieldShell.dataset.status = blankState?.status || "idle";
  fieldShell.dataset.blankId = blank.id;

  const fieldHeader = document.createElement("div");
  fieldHeader.className = "memorisation-blank__header";

  const label = document.createElement("label");
  label.className = "memorisation-field__label";
  label.textContent = blank.label;
  label.setAttribute("for", blank.id);

  const status = document.createElement("span");
  status.className = "memorisation-blank__status";

  const descriptor = getBlankFeedbackDescriptor(blank, blankState);
  status.textContent = descriptor.label;
  status.dataset.tone = descriptor.tone;

  fieldHeader.append(label, status);

  const field = document.createElement(blank.multiline ? "textarea" : "input");

  if (!blank.multiline) {
    field.type = "text";
  }

  field.id = blank.id;
  field.className = "memorisation-input";
  field.spellcheck = false;
  field.autocomplete = "off";
  field.autocapitalize = "off";
  field.placeholder = blank.placeholder;
  field.value = blankState?.value || "";
  field.rows = blank.multiline ? 5 : undefined;
  field.dataset.status = blankState?.status || "idle";
  field.addEventListener("focus", () => {
    appState.currentBlankId = blank.id;
  });
  field.addEventListener("input", (event) => {
    setBlankValue(blank.id, event.target.value);
  });
  field.addEventListener("keydown", (event) => {
    const isEnter = event.key === "Enter";
    const allowNewLine = blank.multiline && event.shiftKey;

    if (!isEnter || allowNewLine || event.isComposing || event.keyCode === 229) {
      return;
    }

    event.preventDefault();
    onBlankEnter(blank.id);
  });

  const feedback = document.createElement("p");
  feedback.className = "memorisation-feedback";
  feedback.dataset.tone = descriptor.tone;
  feedback.textContent = descriptor.message;

  appState.blankInputRefs.set(blank.id, field);
  fieldShell.append(fieldHeader, field, feedback);
  return fieldShell;
}

function createRevealPanel(question) {
  const shell = document.createElement("section");
  shell.className = "memorisation-reveal";

  const fullAnswerBlock = document.createElement("div");
  fullAnswerBlock.className = "memorisation-reveal__block";

  const fullAnswerLabel = document.createElement("span");
  fullAnswerLabel.className = "memorisation-answer__label";
  fullAnswerLabel.textContent = "Full answer";

  const fullAnswerText = document.createElement("p");
  fullAnswerText.className = "memorisation-answer__text";
  fullAnswerText.textContent = question.fullAnswer;

  fullAnswerBlock.append(fullAnswerLabel, fullAnswerText);

  const minimumPassBlock = document.createElement("div");
  minimumPassBlock.className = "memorisation-reveal__block";

  const minimumPassLabel = document.createElement("span");
  minimumPassLabel.className = "memorisation-answer__label";
  minimumPassLabel.textContent = "Minimum pass";

  const minimumPassText = document.createElement("p");
  minimumPassText.className = "memorisation-answer__text";
  minimumPassText.textContent = question.minimalPass;

  minimumPassBlock.append(minimumPassLabel, minimumPassText);
  shell.append(fullAnswerBlock, minimumPassBlock);
  return shell;
}

function renderQuestionCard(question) {
  const card = document.createElement("article");
  card.className = "interactive-subtle-panel memorisation-question-card";

  const header = document.createElement("div");
  header.className = "memorisation-question-card__header";

  const titleBlock = document.createElement("div");
  titleBlock.className = "memorisation-question-card__title";

  const metaLabel = document.createElement("p");
  metaLabel.className = "memorisation-question-label";
  metaLabel.textContent = question.fileLabel;

  const title = document.createElement("h3");
  title.textContent = question.question;

  const meta = document.createElement("p");
  meta.className = "memorisation-question-copy";
  meta.textContent = buildQuestionMeta(question);

  titleBlock.append(metaLabel, title, meta);

  const actions = document.createElement("div");
  actions.className = "memorisation-question-card__actions";

  const revealButton = document.createElement("button");
  revealButton.type = "button";
  revealButton.className = "secondary-link";
  revealButton.textContent = appState.revealedQuestionIds.has(question.id)
    ? "Answer shown"
    : "Reveal answer";
  revealButton.disabled = appState.revealedQuestionIds.has(question.id);
  revealButton.addEventListener("click", () => {
    revealQuestion(question.id);
  });

  actions.append(revealButton);
  header.append(titleBlock, actions);
  card.append(header);

  if (question.kind === "cloze") {
    const stem = document.createElement("p");
    stem.className = "memorisation-question-stem";
    stem.textContent = question.prompt;
    card.append(stem);
  }

  const blankList = document.createElement("div");
  blankList.className = "memorisation-blank-list";
  question.blanks.forEach((blank) => {
    blankList.append(createBlankField(blank));
  });
  card.append(blankList);

  if (appState.revealedQuestionIds.has(question.id)) {
    card.append(createRevealPanel(question));
  }

  return card;
}

function renderReviewCard(blankId) {
  const blank = getBlank(blankId);
  const question = getQuestion(blank?.questionId || "");

  if (!blank || !question) {
    return null;
  }

  const card = document.createElement("article");
  card.className = "interactive-subtle-panel memorisation-question-card memorisation-question-card--review";

  const header = document.createElement("div");
  header.className = "memorisation-question-card__header";

  const titleBlock = document.createElement("div");
  titleBlock.className = "memorisation-question-card__title";

  const metaLabel = document.createElement("p");
  metaLabel.className = "memorisation-question-label";
  metaLabel.textContent = "Review blank";

  const title = document.createElement("h3");
  title.textContent = question.question;

  const meta = document.createElement("p");
  meta.className = "memorisation-question-copy";
  meta.textContent = `${buildQuestionMeta(question)} · ${blank.label}`;

  titleBlock.append(metaLabel, title, meta);

  const actions = document.createElement("div");
  actions.className = "memorisation-question-card__actions";

  const revealButton = document.createElement("button");
  revealButton.type = "button";
  revealButton.className = "secondary-link";
  revealButton.textContent = appState.revealedQuestionIds.has(question.id)
    ? "Answer shown"
    : "Reveal answer";
  revealButton.disabled = appState.revealedQuestionIds.has(question.id);
  revealButton.addEventListener("click", () => {
    revealQuestion(question.id);
  });

  actions.append(revealButton);
  header.append(titleBlock, actions);
  card.append(header);

  if (question.kind === "cloze") {
    const stem = document.createElement("p");
    stem.className = "memorisation-question-stem";
    stem.textContent = question.prompt;
    card.append(stem);
  }

  const blankList = document.createElement("div");
  blankList.className = "memorisation-blank-list";
  blankList.append(createBlankField(blank));
  card.append(blankList);

  if (appState.revealedQuestionIds.has(question.id)) {
    card.append(createRevealPanel(question));
  }

  return card;
}

function renderProgressHeader() {
  const pages = getPageSet();
  const currentPageIndex = getCurrentPageIndex();
  const totalBlanks = appState.sessionBlankIds.length;
  const completedBlanks = getCompletedBlankCount();
  const reviewCount = appState.reviewQueueBlankIds.length;
  const pageLabel = pages.length ? currentPageIndex + 1 : 0;

  pageCounter.textContent = `Page ${pageLabel} / ${pages.length}`;
  completionChip.textContent = `${completedBlanks} / ${totalBlanks} blanks completed`;
  reviewChip.textContent = `${reviewCount} to review`;
  prevPageButton.disabled = currentPageIndex <= 0;
  nextPageButton.disabled = currentPageIndex >= pages.length - 1;
  nextBlankButton.disabled = !findNextIncompleteBlankAfter(appState.currentBlankId);

  reviewToggleButton.hidden =
    reviewCount === 0 || (!appState.reviewMode && completedBlanks !== totalBlanks);
  reviewToggleButton.textContent = appState.reviewMode
    ? "Back to main session"
    : `Review missed / revealed blanks (${reviewCount})`;
}

function renderBanner() {
  const totalBlanks = appState.sessionBlankIds.length;
  const completedBlanks = getCompletedBlankCount();
  const reviewCount = appState.reviewQueueBlankIds.length;

  if (!totalBlanks) {
    sessionBanner.hidden = true;
    sessionBanner.innerHTML = "";
    return;
  }

  if (!appState.reviewMode && completedBlanks === totalBlanks) {
    sessionBanner.hidden = false;
    sessionBanner.innerHTML = `
      <div class="memorisation-banner__content">
        <p class="memorisation-question-label">Session complete</p>
        <h3>Main pass finished.</h3>
        <p class="memorisation-question-copy">
          ${completedBlanks} blanks completed. ${reviewCount} blank${
            reviewCount === 1 ? "" : "s"
          } queued for review.
        </p>
      </div>
    `;
    return;
  }

  if (appState.reviewMode) {
    sessionBanner.hidden = false;
    sessionBanner.innerHTML = `
      <div class="memorisation-banner__content">
        <p class="memorisation-question-label">Review queue</p>
        <h3>Focused second pass.</h3>
        <p class="memorisation-question-copy">
          ${pluralise(appState.reviewQueueBlankIds.length, "blank")} selected from wrong attempts,
          reveals, and blanks that were corrected after earlier misses.
        </p>
      </div>
    `;
    return;
  }

  sessionBanner.hidden = true;
  sessionBanner.innerHTML = "";
}

function renderSessionHeaderCopy() {
  const fileEntry = getFileEntry();
  const stageEntry = getStageEntry();
  const levelEntry = getLevelEntry();
  const topicText = appState.topic ? getTopicEntry()?.label || "Current topic" : "All topics";

  if (appState.reviewMode) {
    questionLabel.textContent = "Session review";
    questionTitle.textContent = `${fileEntry?.label || "Training file"} review queue`;
    questionCopy.textContent = `Reviewing flagged blanks from ${stageEntry?.id || "stage"} · ${
      levelEntry?.label || "level"
    } · ${topicText}.`;
    return;
  }

  questionLabel.textContent = "Continuous session";
  questionTitle.textContent = `${fileEntry?.label || "Training file"} · ${
    levelEntry?.label || "Level"
  }`;
  questionCopy.textContent = `Flattened across ${topicText}. Use Enter to check the current blank and Next blank to follow session order.`;
}

function renderPageContent() {
  sessionPage.replaceChildren();
  appState.blankInputRefs = new Map();

  const pageEntries = getCurrentPageEntries();

  if (!pageEntries.length) {
    renderStatusCard(sessionPage, "No page entries are available for the current session.");
    return;
  }

  if (appState.reviewMode) {
    pageEntries.forEach((blankId) => {
      const reviewCard = renderReviewCard(blankId);
      if (reviewCard) {
        sessionPage.append(reviewCard);
      }
    });
  } else {
    pageEntries.forEach((questionId) => {
      const question = getQuestion(questionId);
      if (question) {
        sessionPage.append(renderQuestionCard(question));
      }
    });
  }

  const focusBlankId =
    appState.pendingFocusBlankId ||
    (appState.reviewMode
      ? pageEntries[0] || ""
      : getQuestion(pageEntries[0])?.blanks[0]?.id || "");

  queueFocusBlank(focusBlankId);
}

function renderEmptyState(message) {
  renderStats();
  updateBadges();
  questionLabel.textContent = "No session questions";
  questionTitle.textContent = "Nothing matches the current selection.";
  questionCopy.textContent = message;
  pageCounter.textContent = "Page 0 / 0";
  completionChip.textContent = "0 / 0 blanks completed";
  reviewChip.textContent = "0 to review";
  sessionBanner.hidden = true;
  sessionBanner.innerHTML = "";
  renderStatusCard(sessionPage, message);
  prevPageButton.disabled = true;
  nextBlankButton.disabled = true;
  nextPageButton.disabled = true;
  reviewToggleButton.hidden = true;
  updateUrlFromState();
}

function renderCatalogErrorState(message) {
  appState.catalog = null;
  appState.topicNormalizationMap = {};
  appState.fileDataCache.clear();
  appState.sessionQuestions = [];
  appState.sessionQuestionIds = [];
  appState.sessionQuestionMap = new Map();
  appState.sessionBlankIds = [];
  appState.sessionBlankMap = new Map();
  appState.blankStates = new Map();
  appState.pages = [];
  appState.reviewQueueBlankIds = [];
  appState.reviewPages = [];
  appState.reviewMode = false;
  appState.revealedQuestionIds = new Set();
  renderControls();
  renderStats();
  updateBadges();
  questionLabel.textContent = "Memorisation bank unavailable";
  questionTitle.textContent = "Could not load memorisation data.";
  questionCopy.textContent =
    "The catalog or its supporting files could not be loaded. Retry this page in a moment.";
  pageCounter.textContent = "Page 0 / 0";
  completionChip.textContent = "0 / 0 blanks completed";
  reviewChip.textContent = "0 to review";
  sessionBanner.hidden = true;
  sessionBanner.innerHTML = "";
  renderStatusCard(sessionPage, message, "Retry loading", () => {
    bootRuntime({ preserveSelection: false });
  });
  prevPageButton.disabled = true;
  nextBlankButton.disabled = true;
  nextPageButton.disabled = true;
  reviewToggleButton.hidden = true;
}

function renderFileErrorState(fileEntry, message) {
  appState.sessionQuestions = [];
  appState.sessionQuestionIds = [];
  appState.sessionQuestionMap = new Map();
  appState.sessionBlankIds = [];
  appState.sessionBlankMap = new Map();
  appState.blankStates = new Map();
  appState.pages = [];
  appState.reviewQueueBlankIds = [];
  appState.reviewPages = [];
  appState.reviewMode = false;
  appState.revealedQuestionIds = new Set();
  renderStats();
  updateBadges();
  questionLabel.textContent = "Loading error";
  questionTitle.textContent = `Could not load ${fileEntry?.label || "the selected training file"}.`;
  questionCopy.textContent = message;
  pageCounter.textContent = "Page 0 / 0";
  completionChip.textContent = "0 / 0 blanks completed";
  reviewChip.textContent = "0 to review";
  sessionBanner.hidden = true;
  sessionBanner.innerHTML = "";
  renderStatusCard(sessionPage, message, "Retry loading", () => {
    refreshSession({ allowCatalogResync: true });
  });
  prevPageButton.disabled = true;
  nextBlankButton.disabled = true;
  nextPageButton.disabled = true;
  reviewToggleButton.hidden = true;
  updateUrlFromState();
}

function renderSession({ focusBlankId = "" } = {}) {
  if (focusBlankId) {
    appState.pendingFocusBlankId = focusBlankId;
  }

  renderStats();
  updateBadges();
  renderSessionHeaderCopy();
  renderProgressHeader();
  renderBanner();
  renderPageContent();
  updateUrlFromState();
}

async function refreshSession({ allowCatalogResync = true } = {}) {
  synchroniseSelection();
  const fileEntry = getFileEntry();

  if (!fileEntry) {
    appState.sessionQuestions = [];
    appState.sessionQuestionIds = [];
    appState.sessionQuestionMap = new Map();
    appState.sessionBlankIds = [];
    appState.sessionBlankMap = new Map();
    appState.blankStates = new Map();
    appState.pages = [];
    appState.reviewQueueBlankIds = [];
    appState.reviewPages = [];
    appState.reviewMode = false;
    renderEmptyState("No training file is available for the current selection.");
    return;
  }

  setLoadingState(`Loading ${fileEntry.label.toLowerCase()} session...`);

  const renderToken = ++appState.renderToken;

  try {
    const items = await loadSessionSourceItems(fileEntry);

    if (renderToken !== appState.renderToken) {
      return;
    }

    const sessionQuestions = buildSessionQuestions(items, fileEntry);

    if (!sessionQuestions.length) {
      appState.sessionQuestions = [];
      appState.sessionQuestionIds = [];
      appState.sessionQuestionMap = new Map();
      appState.sessionBlankIds = [];
      appState.sessionBlankMap = new Map();
      appState.blankStates = new Map();
      appState.pages = [];
      appState.reviewQueueBlankIds = [];
      appState.reviewPages = [];
      appState.reviewMode = false;
      renderEmptyState(getEmptyStateMessage());
      return;
    }

    rebuildSessionRuntime(sessionQuestions);
    renderSession({ focusBlankId: appState.currentBlankId });
  } catch (error) {
    if (renderToken !== appState.renderToken) {
      return;
    }

    if (allowCatalogResync) {
      try {
        await loadCatalogResources({ preserveSelection: true });

        if (renderToken !== appState.renderToken) {
          return;
        }

        renderControls();
        updateUrlFromState();
        await refreshSession({ allowCatalogResync: false });
        return;
      } catch (catalogError) {
        if (renderToken !== appState.renderToken) {
          return;
        }
      }
    }

    renderFileErrorState(fileEntry, `${error.message} Retry to try the current selection again.`);
  }
}

function registerStaticEvents() {
  if (appState.staticEventsRegistered) {
    return;
  }

  topicFilter.addEventListener("change", (event) => {
    applySelection(
      getSelectionSnapshot({
        topic: normalizeTopicKey(event.target.value || ""),
        file: "",
        definitionScope: "all",
        round: "all",
      }),
    );
  });

  prevPageButton.addEventListener("click", () => {
    goToPage(getCurrentPageIndex() - 1);
  });

  nextPageButton.addEventListener("click", () => {
    goToPage(getCurrentPageIndex() + 1);
  });

  nextBlankButton.addEventListener("click", () => {
    moveToNextBlank(appState.currentBlankId);
  });

  reviewToggleButton.addEventListener("click", () => {
    setReviewMode(!appState.reviewMode);
  });

  appState.staticEventsRegistered = true;
}

async function bootRuntime({ preserveSelection = true } = {}) {
  setLoadingState("Loading memorisation bank...");

  try {
    await loadCatalogResources({ preserveSelection });
    renderControls();
    updateUrlFromState();
    await refreshSession({ allowCatalogResync: false });
  } catch (error) {
    renderCatalogErrorState(error.message);
  }
}

async function init() {
  registerStaticEvents();
  bootRuntime({ preserveSelection: false });
}

init();
