import { createAnswerModel as buildAnswerModel, evaluateAnswerModel } from "./matcher.mjs";
import { buildSoftHighlightModel } from "./display-feedback.mjs";
import { resolveActiveBlankId, resolvePreferredBlankId } from "./active-blank-state.mjs";

const definitionScopeOptions = [
  { id: "all", label: "All" },
  { id: "paper_only", label: "Past paper only" },
  { id: "syllabus_only", label: "Syllabus only" },
  { id: "paper_and_syllabus", label: "Paper + syllabus" },
];

const levelOrder = ["level-1-core", "level-2-guided-cloze", "level-3-multi-round-cloze", "level-4-full-reconstruction"];

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

const reviewPageSize = 4;
const questionPageSizeByFile = {
  "full-reconstruction": 2,
  "guided-cloze": 3,
  "multi-round-cloze": 3,
  default: 5,
};

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
const sessionStorageVersion = 1;
const sessionStoragePrefix = "memorisation-bank-session";
const inputPersistDelayMs = 150;
const answerFieldResizeFrames = new WeakMap();
let persistSessionStateTimeoutId = 0;

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
const currentSetSummary = document.getElementById("current-set-summary");
const currentSetCopy = document.getElementById("current-set-copy");
const pageCounter = document.getElementById("page-counter");
const completionChip = document.getElementById("completion-chip");
const reviewChip = document.getElementById("review-chip");
const filtersBackdrop = document.getElementById("filters-backdrop");
const filtersSheet = document.getElementById("filters-sheet");
const filtersToggleButton = document.getElementById("filters-toggle");
const filtersCloseButton = document.getElementById("filters-close");
const prevBlankButton = document.getElementById("prev-blank");
const checkBlankButton = document.getElementById("check-blank");
const revealBlankButton = document.getElementById("reveal-blank");
const nextBlankButton = document.getElementById("next-blank");
const reviewToggleButton = document.getElementById("review-toggle");
const sessionBanner = document.getElementById("session-banner");
const sessionPage = document.getElementById("session-page");
const sessionOutline = document.getElementById("session-outline");
const actionBar = document.querySelector(".memorisation-action-bar");
const drillRulesDialog = document.getElementById("drill-rules-dialog");
const drillRulesOpenButton = document.getElementById("drill-rules-open");
const drillRulesCloseButton = document.getElementById("drill-rules-close");
let lastDrillRulesTrigger = null;

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
  lastMainBlankId: "",
  lastReviewBlankId: "",
  interactionTick: 0,
  filtersOpen: false,
  revealedQuestionIds: new Set(),
  blankInputRefs: new Map(),
  blankInputMirrorRefs: new Map(),
};

function fetchJson(path) {
  return fetch(path, { cache: "no-store" }).then(response => {
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
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatDefinitionScope(scope) {
  return definitionScopeOptions.find(option => option.id === scope)?.label || formatLabel(scope);
}

function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function setFeedbackMessage(element, message, tone = "neutral") {
  element.textContent = message;
  element.dataset.tone = tone;
}

function hasBlankBeenChecked(blankState) {
  return Boolean(blankState && blankState.status !== "idle");
}

function renderInlineFeedbackSegments(target, segments) {
  target.replaceChildren();

  if (!segments.length) {
    return;
  }

  const fragment = document.createDocumentFragment();

  segments.forEach(segment => {
    const piece = document.createElement("span");
    piece.className = `memorisation-display-segment memorisation-display-segment--${segment.tone}`;
    piece.textContent = segment.text;
    fragment.append(piece);
  });

  target.append(fragment);
}

function syncMirroredFieldScroll(field, mirror) {
  mirror.scrollTop = field.scrollTop;
  mirror.scrollLeft = field.scrollLeft;
}

function getAnswerFieldHeightBounds(field) {
  const computedStyles = window.getComputedStyle(field);

  return {
    minHeight: parseFloat(computedStyles.minHeight) || field.scrollHeight || 0,
    maxHeight: parseFloat(computedStyles.maxHeight) || field.scrollHeight || 0,
  };
}

function resizeAnswerField(field, mirror) {
  if (!field || !mirror) {
    return;
  }

  const { minHeight, maxHeight } = getAnswerFieldHeightBounds(field);

  field.style.height = "auto";
  const nextHeight = Math.min(maxHeight, Math.max(minHeight, field.scrollHeight));

  field.style.height = `${nextHeight}px`;
  mirror.style.height = `${nextHeight}px`;
  field.style.overflowY = field.scrollHeight > maxHeight + 1 ? "auto" : "hidden";
  syncMirroredFieldScroll(field, mirror);
}

function scheduleAnswerFieldResize(field, mirror) {
  if (!field || !mirror) {
    return;
  }

  const pendingFrame = answerFieldResizeFrames.get(field);

  if (pendingFrame) {
    cancelAnimationFrame(pendingFrame);
  }

  const nextFrame = requestAnimationFrame(() => {
    answerFieldResizeFrames.delete(field);
    resizeAnswerField(field, mirror);
  });

  answerFieldResizeFrames.set(field, nextFrame);
}

function updateBlankInlineDisplay(blank, blankState, mirror, field) {
  renderInlineFeedbackSegments(
    mirror,
    buildSoftHighlightModel(
      blankState?.value || "",
      blank.answerModel.full_answer,
      hasBlankBeenChecked(blankState),
      blank.answerModel.matcherConfig?.type
    ).segments
  );
  scheduleAnswerFieldResize(field, mirror);
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
  return getStageEntries().find(stage => stage.id === stageId) || null;
}

function getLevelEntries(stageId = appState.stage) {
  return getStageEntry(stageId)?.levels || [];
}

function getLevelEntry(stageId = appState.stage, levelId = appState.level) {
  return getLevelEntries(stageId).find(level => level.id === levelId) || null;
}

function getTopicEntries(stageId = appState.stage, levelId = appState.level) {
  return getLevelEntry(stageId, levelId)?.topics || [];
}

function getTopicEntry(stageId = appState.stage, levelId = appState.level, topicId = appState.topic) {
  return getTopicEntries(stageId, levelId).find(topic => topic.id === topicId) || null;
}

function getSelectedTopicEntries(stageId = appState.stage, levelId = appState.level, topicId = appState.topic) {
  const topicEntries = getTopicEntries(stageId, levelId);

  if (!topicId) {
    return topicEntries;
  }

  return topicEntries.filter(topic => topic.id === topicId);
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

function getFileEntries(stageId = appState.stage, levelId = appState.level, topicId = appState.topic) {
  const fileMap = new Map();

  getSelectedTopicEntries(stageId, levelId, topicId).forEach(topicEntry => {
    (topicEntry.files || []).forEach(fileEntry => {
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
        fileEntry.definition_source_counts
      );
      (fileEntry.rounds || []).forEach(roundValue => {
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

  return Array.from(fileMap.values()).map(fileEntry => ({
    ...fileEntry,
    rounds: Array.from(fileEntry.rounds).sort((left, right) => left - right),
  }));
}

function getFileEntry(
  stageId = appState.stage,
  levelId = appState.level,
  topicId = appState.topic,
  fileId = appState.file
) {
  return getFileEntries(stageId, levelId, topicId).find(file => file.id === fileId) || null;
}

function getStageSourceTotal(stageEntry) {
  return Object.values(stageEntry?.counts || {}).reduce((sum, count) => sum + Number(count || 0), 0);
}

function getDefaultLevelId(stageId) {
  return (
    getLevelEntries(stageId).find(level => (level.topics || []).length > 0)?.id || getLevelEntries(stageId)[0]?.id || ""
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

function buildSessionSelectionKey(selection = getSelectionSnapshot()) {
  return [
    selection.stage || "",
    selection.level || "",
    selection.topic || "",
    selection.file || "",
    selection.definitionScope || "all",
    selection.round || "all",
  ].join("::");
}

function getSessionStorageKey(selection = getSelectionSnapshot()) {
  return `${sessionStoragePrefix}::${buildSessionSelectionKey(selection)}`;
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
  const stageId = stageEntries.some(stage => stage.id === requestedSelection.stage)
    ? requestedSelection.stage
    : stageEntries[0]?.id || "";
  const levelEntries = getLevelEntries(stageId);
  const levelId = levelEntries.some(level => level.id === requestedSelection.level)
    ? requestedSelection.level
    : getDefaultLevelId(stageId);
  const topicEntries = getTopicEntries(stageId, levelId);
  const topicId = topicEntries.some(topic => topic.id === requestedSelection.topic) ? requestedSelection.topic : "";
  const fileEntries = getFileEntries(stageId, levelId, topicId);
  const fileId = fileEntries.some(file => file.id === requestedSelection.file)
    ? requestedSelection.file
    : getDefaultFileId(stageId, levelId, topicId);
  const fileEntry = getFileEntry(stageId, levelId, topicId, fileId);
  const definitionScope =
    fileId === "core-definitions" &&
    definitionScopeOptions.some(option => option.id === requestedSelection.definitionScope)
      ? requestedSelection.definitionScope
      : "all";
  const round =
    fileId === "multi-round-cloze" &&
    fileEntry?.rounds?.some(roundNumber => String(roundNumber) === requestedSelection.round)
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

function isCompactViewport() {
  return window.matchMedia("(max-width: 980px)").matches;
}

function setFiltersOpen(nextOpen) {
  appState.filtersOpen = Boolean(nextOpen);
  filtersSheet.hidden = !appState.filtersOpen;
  filtersBackdrop.hidden = !appState.filtersOpen || !isCompactViewport();
  filtersToggleButton.setAttribute("aria-expanded", String(appState.filtersOpen));
  document.body.classList.toggle("memorisation-filters-open", appState.filtersOpen && isCompactViewport());
}

function closeFilters() {
  setFiltersOpen(false);
}

function restoreDrillRulesTriggerFocus() {
  const focusTarget = lastDrillRulesTrigger || drillRulesOpenButton;

  if (focusTarget && typeof focusTarget.focus === "function") {
    focusTarget.focus();
  }

  lastDrillRulesTrigger = null;
}

function openDrillRulesDialog() {
  if (!drillRulesDialog) {
    return;
  }

  lastDrillRulesTrigger =
    document.activeElement instanceof HTMLElement ? document.activeElement : drillRulesOpenButton;

  if (typeof drillRulesDialog.showModal === "function") {
    if (!drillRulesDialog.open) {
      drillRulesDialog.showModal();
    }
  } else {
    drillRulesDialog.hidden = false;
    drillRulesDialog.setAttribute("open", "");
  }

  requestAnimationFrame(() => {
    try {
      drillRulesCloseButton?.focus({ preventScroll: true });
    } catch (error) {
      drillRulesCloseButton?.focus();
    }
  });
}

function closeDrillRulesDialog() {
  if (!drillRulesDialog) {
    return;
  }

  if (typeof drillRulesDialog.close === "function" && drillRulesDialog.open) {
    drillRulesDialog.close();
    return;
  }

  drillRulesDialog.hidden = true;
  drillRulesDialog.removeAttribute("open");
  restoreDrillRulesTriggerFocus();
}

function setTrackedBlankId(blankId, reviewMode = appState.reviewMode) {
  if (!blankId) {
    return;
  }

  appState.currentBlankId = blankId;

  if (reviewMode) {
    appState.lastReviewBlankId = blankId;
    return;
  }

  appState.lastMainBlankId = blankId;
}

function getActiveBlankId(blankOrder = getCurrentModeBlankOrder()) {
  return resolveActiveBlankId(blankOrder, appState.pendingFocusBlankId, appState.currentBlankId);
}

function getBlankOrderIndex(blankId, blankOrder = getCurrentModeBlankOrder()) {
  return blankOrder.indexOf(blankId);
}

function getAdjacentBlankId(blankId, direction, blankOrder = getCurrentModeBlankOrder()) {
  const currentIndex = getBlankOrderIndex(blankId, blankOrder);

  if (currentIndex < 0) {
    return "";
  }

  return blankOrder[currentIndex + direction] || "";
}

function focusAdjacentBlank(direction) {
  const nextBlankId = getAdjacentBlankId(getActiveBlankId(), direction);

  if (nextBlankId) {
    focusBlank(nextBlankId);
  }
}

function getStickyActionBarClearance() {
  if (!actionBar) {
    return 24;
  }

  const actionBarRect = actionBar.getBoundingClientRect();

  if (!actionBarRect.height) {
    return 24;
  }

  const bottomOffset = parseFloat(window.getComputedStyle(actionBar).bottom) || 0;
  return actionBarRect.height + bottomOffset + 24;
}

function ensureElementVisibleAboveStickyBar(element) {
  if (!element) {
    return;
  }

  try {
    element.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  } catch (error) {
    // Fall through to manual scroll adjustments below.
  }

  const topInset = 24;
  const bottomInset = window.innerHeight - getStickyActionBarClearance();
  const elementRect = element.getBoundingClientRect();

  if (elementRect.top < topInset) {
    window.scrollBy({
      top: elementRect.top - topInset,
      behavior: "auto",
    });
    return;
  }

  if (elementRect.bottom > bottomInset) {
    window.scrollBy({
      top: elementRect.bottom - bottomInset,
      behavior: "auto",
    });
  }
}

function ensurePracticeViewportForBlank(blankId, { includeReveal = false } = {}) {
  requestAnimationFrame(() => {
    const field = appState.blankInputRefs.get(blankId);

    if (field) {
      ensureElementVisibleAboveStickyBar(field);
    }

    if (!includeReveal) {
      return;
    }

    const revealPanel = sessionPage.querySelector(`.memorisation-reveal[data-blank-id="${blankId}"]`);

    if (revealPanel) {
      ensureElementVisibleAboveStickyBar(revealPanel);
    }
  });
}

function getFileCountLabel(fileEntry) {
  if (!fileEntry) {
    return "0 items";
  }

  if (fileEntry.id === "multi-round-cloze") {
    return `${pluralise(fileEntry.count, "prompt")} · ${pluralise(fileEntry.runtime_unit_count, "round")}`;
  }

  return pluralise(fileEntry.count, "item");
}

function applySelection(nextSelection) {
  flushPersistedSessionState();
  synchroniseSelection(nextSelection);
  if (isCompactViewport()) {
    closeFilters();
  }
  renderControls();
  updateUrlFromState();
  refreshSession({ allowCatalogResync: true });
}

function renderStageSwitcher() {
  stageSwitcher.innerHTML = getStageEntries()
    .map(stageEntry => {
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

  stageSwitcher.querySelectorAll("[data-stage-id]").forEach(button => {
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
        })
      );
    });
  });
}

function renderLevelSwitcher() {
  levelSwitcher.innerHTML = getLevelEntries()
    .slice()
    .sort((left, right) => levelOrder.indexOf(left.id) - levelOrder.indexOf(right.id))
    .map(
      levelEntry => `
        <button
          class="memorisation-toggle"
          type="button"
          data-level-id="${levelEntry.id}"
          data-active="${levelEntry.id === appState.level ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${levelEntry.label}</span>
          <span class="memorisation-toggle__count">${pluralise(levelEntry.count, "source item")}</span>
        </button>
      `
    )
    .join("");

  levelSwitcher.querySelectorAll("[data-level-id]").forEach(button => {
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
        })
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
        ...topics.map(topic => `<option value="${topic.id}">${topic.label}</option>`),
      ].join("")
    : '<option value="">No topics available</option>';

  if (appState.topic && !topics.some(topic => topic.id === appState.topic)) {
    appState.topic = "";
  }

  topicFilter.value = appState.topic;
}

function renderFileSwitcher() {
  fileSwitcher.innerHTML = getFileEntries()
    .slice()
    .sort((left, right) => fileOrder.indexOf(left.id) - fileOrder.indexOf(right.id))
    .map(
      fileEntry => `
        <button
          class="memorisation-toggle memorisation-toggle--compact"
          type="button"
          data-file-id="${fileEntry.id}"
          data-active="${fileEntry.id === appState.file ? "true" : "false"}"
        >
          <span class="memorisation-toggle__label">${fileEntry.label}</span>
          <span class="memorisation-toggle__count">${getFileCountLabel(fileEntry)}</span>
        </button>
      `
    )
    .join("");

  fileSwitcher.querySelectorAll("[data-file-id]").forEach(button => {
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
        })
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
    .map(option => {
      const count = option.id === "all" ? fileEntry.count : Number(definitionSourceCounts[option.id] || 0);

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

  definitionFilterGrid.querySelectorAll("[data-definition-scope]").forEach(button => {
    button.addEventListener("click", () => {
      const nextScope = button.dataset.definitionScope;

      if (!nextScope || nextScope === appState.definitionScope) {
        return;
      }

      flushPersistedSessionState();
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
  const roundOptions = ["all", ...fileEntry.rounds.map(round => String(round))];

  if (!roundOptions.includes(appState.round)) {
    appState.round = "all";
  }

  roundSwitcher.innerHTML = roundOptions
    .map(option => {
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

  roundSwitcher.querySelectorAll("[data-round-value]").forEach(button => {
    button.addEventListener("click", () => {
      const nextRound = button.dataset.roundValue;

      if (!nextRound || nextRound === appState.round) {
        return;
      }

      flushPersistedSessionState();
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
    ? items.map(item => ({
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
    fileEntry.sources.map(async source => {
      const items = await loadFileItems(source.path);

      return items.map(item => ({
        ...item,
        topic: normalizeTopicKey(item.topic || source.topicId),
        topicLabel: source.topicLabel,
      }));
    })
  );

  return settledSources.flat();
}

async function loadCatalogResources({ preserveSelection = true } = {}) {
  const fallbackSelection = preserveSelection ? getSelectionSnapshot() : getInitialSelectionFromUrl();
  const catalog = await fetchJson("./data/catalog.json");

  if (!Array.isArray(catalog?.stages) || catalog.stages.length === 0) {
    throw new Error("The memorisation catalog is empty or malformed.");
  }

  let topicNormalizationMap = appState.topicNormalizationMap;

  try {
    const loadedMap = await fetchJson("./data/context/topic_normalization_map.json");
    topicNormalizationMap = loadedMap && typeof loadedMap === "object" && !Array.isArray(loadedMap) ? loadedMap : {};
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
  const answerModel = buildAnswerModel({
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
    buildAnswerModel({
      answer,
      fullAnswer: answer,
      minimalPass: item.minimal_pass_answers?.[answerIndex],
      fileId: fileEntry.id,
      prompt: item.prompt,
      question: item.question,
      type: item.type,
      sourceScope: item.source_scope,
    })
  );

  question.fullAnswer = item.full_answer || fillPromptBlanks(item.prompt, answers);
  question.minimalPass = fillPromptBlanks(
    item.prompt,
    answerModels.map(answerModel => answerModel.minimal_pass)
  );
  question.conceptGroups = answerModels.flatMap(answerModel => answerModel.concept_groups);
  question.contradictions = answerModels.flatMap(answerModel => answerModel.contradictions);
  question.promptParts = String(item.prompt || "").split(blankPattern);
  question.blanks = answerModels.map((answerModel, blankIndex) =>
    createBlankModel(question, blankIndex, answerModel, {
      label: `Blank ${blankIndex + 1}`,
      placeholder: `Blank ${blankIndex + 1}`,
    })
  );

  return question;
}

function buildMultiRoundQuestions(item, fileEntry) {
  const rounds = Array.isArray(item.rounds) ? item.rounds : [];

  return rounds
    .filter((round, roundIndex) => appState.round === "all" || String(round.round ?? roundIndex + 1) === appState.round)
    .map((round, roundIndex) => {
      const roundNumber = Number(round.round ?? roundIndex + 1);
      const questionId = `${fileEntry.id}::${item.topic}::${item.id}::round-${roundNumber}`;
      const questionText = item.question || round.prompt || "";
      const question = createQuestionBase(item, fileEntry, questionId, "cloze", questionText, round.prompt);
      const answers = Array.isArray(round.answers) ? round.answers : [];
      const blankPattern = /_{4,}/g;
      const blankCount = (String(round.prompt || "").match(blankPattern) || []).length;

      if (answers.length !== blankCount) {
        return null;
      }

      const answerModels = answers.map((answer, answerIndex) =>
        buildAnswerModel({
          answer,
          fullAnswer: answer,
          minimalPass: item.minimal_pass_answers?.[answerIndex],
          fileId: fileEntry.id,
          prompt: round.prompt,
          question: item.question,
          type: item.type,
          sourceScope: item.source_scope,
        })
      );

      question.round = roundNumber;
      question.roundTotal = rounds.length;
      question.fullAnswer = item.full_answer || fillPromptBlanks(round.prompt, answers);
      question.minimalPass = fillPromptBlanks(
        round.prompt,
        answerModels.map(answerModel => answerModel.minimal_pass)
      );
      question.conceptGroups = answerModels.flatMap(answerModel => answerModel.concept_groups);
      question.contradictions = answerModels.flatMap(answerModel => answerModel.contradictions);
      question.promptParts = String(round.prompt || "").split(blankPattern);
      question.blanks = answerModels.map((answerModel, blankIndex) =>
        createBlankModel(question, blankIndex, answerModel, {
          label: `Blank ${blankIndex + 1}`,
          placeholder: `Blank ${blankIndex + 1}`,
        })
      );

      return question;
    })
    .filter(Boolean);
}

function buildFullReconstructionQuestion(item, fileEntry) {
  const questionId = `${fileEntry.id}::${item.topic}::${item.id}`;
  const questionText = item.question || item.prompt || "";
  const question = createQuestionBase(item, fileEntry, questionId, "reconstruction", questionText, questionText);
  const answerModel = buildAnswerModel({
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
      ? items.filter(item => item.source_scope === appState.definitionScope)
      : items;

  if (fileEntry.id === "guided-cloze") {
    return filteredItems.map(item => buildGuidedClozeQuestion(item, fileEntry)).filter(Boolean);
  }

  if (fileEntry.id === "multi-round-cloze") {
    return filteredItems.flatMap(item => buildMultiRoundQuestions(item, fileEntry));
  }

  if (fileEntry.id === "full-reconstruction") {
    return filteredItems.map(item => buildFullReconstructionQuestion(item, fileEntry));
  }

  return filteredItems.map(item => buildSingleQuestion(item, fileEntry));
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
    missingGroups: blank.answerModel.concept_groups.filter(group => group.required).map(group => group.id),
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
  appState.sessionQuestionIds = sessionQuestions.map(question => question.id);
  appState.sessionQuestionMap = new Map(sessionQuestions.map(question => [question.id, question]));
  appState.sessionBlankIds = sessionQuestions.flatMap(question => question.blanks.map(blank => blank.id));
  appState.sessionBlankMap = new Map(
    sessionQuestions.flatMap(question => question.blanks.map(blank => [blank.id, blank]))
  );
  appState.blankStates = new Map(
    appState.sessionBlankIds.map(blankId => [blankId, createBlankState(appState.sessionBlankMap.get(blankId))])
  );
  appState.pages = chunkIntoPages(appState.sessionQuestionIds, getPageSizeForCurrentFile());
  appState.currentPageIndex = 0;
  appState.reviewQueueBlankIds = [];
  appState.reviewPages = [];
  appState.reviewPageIndex = 0;
  appState.reviewMode = false;
  appState.currentBlankId = appState.sessionBlankIds[0] || "";
  appState.pendingFocusBlankId = appState.currentBlankId;
  appState.lastMainBlankId = appState.currentBlankId;
  appState.lastReviewBlankId = "";
  appState.revealedQuestionIds = new Set();
  appState.blankInputRefs = new Map();
  appState.blankInputMirrorRefs = new Map();
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

function serializeBlankState(blankState) {
  if (!blankState) {
    return null;
  }

  return {
    id: blankState.id,
    value: blankState.value,
    status: blankState.status,
    wrongCount: blankState.wrongCount,
    revealed: blankState.revealed,
    coveredGroups: blankState.coveredGroups,
    missingGroups: blankState.missingGroups,
    contradictionHits: blankState.contradictionHits,
    reviewPriority: blankState.reviewPriority,
    lastReviewSignalAt: blankState.lastReviewSignalAt,
    matchState: blankState.matchState,
  };
}

function buildPersistedSessionState() {
  if (!appState.sessionBlankIds.length) {
    return null;
  }

  return {
    version: sessionStorageVersion,
    selectionKey: buildSessionSelectionKey(),
    currentBlankId: getActiveBlankId(),
    lastMainBlankId: resolvePreferredBlankId(appState.sessionBlankIds, [appState.lastMainBlankId]),
    lastReviewBlankId: resolvePreferredBlankId(appState.reviewQueueBlankIds, [
      appState.lastReviewBlankId,
    ]),
    reviewMode: Boolean(appState.reviewMode && appState.reviewQueueBlankIds.length),
    interactionTick: appState.interactionTick,
    blankStates: appState.sessionBlankIds
      .map((blankId) => serializeBlankState(getBlankState(blankId)))
      .filter(Boolean),
  };
}

function persistSessionStateNow() {
  const persistedSessionState = buildPersistedSessionState();

  if (!persistedSessionState) {
    return;
  }

  try {
    window.localStorage.setItem(
      getSessionStorageKey(),
      JSON.stringify(persistedSessionState),
    );
  } catch (error) {
    // Ignore storage failures so practice flow is not blocked.
  }
}

function schedulePersistSessionState() {
  if (persistSessionStateTimeoutId) {
    window.clearTimeout(persistSessionStateTimeoutId);
  }

  persistSessionStateTimeoutId = window.setTimeout(() => {
    persistSessionStateTimeoutId = 0;
    persistSessionStateNow();
  }, inputPersistDelayMs);
}

function flushPersistedSessionState() {
  if (persistSessionStateTimeoutId) {
    window.clearTimeout(persistSessionStateTimeoutId);
    persistSessionStateTimeoutId = 0;
  }

  persistSessionStateNow();
}

function clearPersistedSessionState(selection = getSelectionSnapshot()) {
  try {
    window.localStorage.removeItem(getSessionStorageKey(selection));
  } catch (error) {
    // Ignore storage failures so empty/error states can still render.
  }
}

function rebuildRevealedQuestionIds() {
  appState.revealedQuestionIds = new Set(
    appState.sessionBlankIds
      .filter((blankId) => getBlankState(blankId)?.revealed)
      .map((blankId) => getBlank(blankId)?.questionId)
      .filter(Boolean),
  );
}

function restoreBlankState(blankState, restoredBlankState) {
  if (!blankState || !restoredBlankState) {
    return;
  }

  const blank = getBlank(blankState.id);
  const validConceptGroupIds = new Set(blank?.answerModel.concept_groups.map((group) => group.id) || []);

  blankState.value = String(restoredBlankState.value || "");
  blankState.status = ["idle", "correct", "wrong", "revealed"].includes(restoredBlankState.status)
    ? restoredBlankState.status
    : "idle";
  blankState.wrongCount = Math.max(0, Number(restoredBlankState.wrongCount) || 0);
  blankState.revealed = Boolean(restoredBlankState.revealed || blankState.status === "revealed");
  blankState.coveredGroups = Array.isArray(restoredBlankState.coveredGroups)
    ? restoredBlankState.coveredGroups.filter((groupId) => validConceptGroupIds.has(groupId))
    : [];
  blankState.missingGroups = Array.isArray(restoredBlankState.missingGroups)
    ? restoredBlankState.missingGroups.filter((groupId) => validConceptGroupIds.has(groupId))
    : blankState.missingGroups;
  blankState.contradictionHits = Array.isArray(restoredBlankState.contradictionHits)
    ? restoredBlankState.contradictionHits.filter(Boolean)
    : [];
  blankState.lastReviewSignalAt = Math.max(0, Number(restoredBlankState.lastReviewSignalAt) || 0);
  blankState.matchState =
    typeof restoredBlankState.matchState === "string"
      ? restoredBlankState.matchState
      : "untouched";
  blankState.reviewPriority =
    Number(restoredBlankState.reviewPriority) || buildReviewPriority(blankState);
}

function syncPageIndexForBlank(blankId, reviewMode = appState.reviewMode) {
  if (!blankId) {
    return;
  }

  const targetPageIndex = getCurrentModePageIndexForBlank(blankId, reviewMode);

  if (targetPageIndex < 0) {
    return;
  }

  if (reviewMode) {
    appState.reviewPageIndex = targetPageIndex;
    return;
  }

  appState.currentPageIndex = targetPageIndex;
}

function restoreSessionStateFromStorage() {
  if (!appState.sessionBlankIds.length) {
    return false;
  }

  let restoredSessionState = null;

  try {
    restoredSessionState = JSON.parse(window.localStorage.getItem(getSessionStorageKey()) || "null");
  } catch (error) {
    return false;
  }

  if (
    !restoredSessionState ||
    restoredSessionState.version !== sessionStorageVersion ||
    restoredSessionState.selectionKey !== buildSessionSelectionKey()
  ) {
    return false;
  }

  const restoredBlankStates = Array.isArray(restoredSessionState.blankStates)
    ? restoredSessionState.blankStates
    : [];

  restoredBlankStates.forEach((restoredBlankState) => {
    const blankState = getBlankState(restoredBlankState?.id);

    if (blankState) {
      restoreBlankState(blankState, restoredBlankState);
    }
  });

  appState.interactionTick = Math.max(0, Number(restoredSessionState.interactionTick) || 0);
  rebuildRevealedQuestionIds();
  updateReviewQueue();

  appState.lastMainBlankId = resolvePreferredBlankId(appState.sessionBlankIds, [
    restoredSessionState.lastMainBlankId,
    restoredSessionState.currentBlankId,
  ]);
  appState.lastReviewBlankId = resolvePreferredBlankId(appState.reviewQueueBlankIds, [
    restoredSessionState.lastReviewBlankId,
    restoredSessionState.currentBlankId,
  ]);
  appState.reviewMode =
    Boolean(restoredSessionState.reviewMode) && appState.reviewQueueBlankIds.length > 0;

  const restoredActiveBlankId = appState.reviewMode
    ? resolvePreferredBlankId(appState.reviewQueueBlankIds, [
        appState.lastReviewBlankId,
        restoredSessionState.currentBlankId,
      ])
    : resolvePreferredBlankId(appState.sessionBlankIds, [
        appState.lastMainBlankId,
        restoredSessionState.currentBlankId,
        findNextIncompleteBlankAfter("", appState.sessionBlankIds),
      ]);

  appState.pendingFocusBlankId = restoredActiveBlankId;
  setTrackedBlankId(restoredActiveBlankId, appState.reviewMode);

  syncPageIndexForBlank(appState.lastMainBlankId, false);
  syncPageIndexForBlank(appState.lastReviewBlankId, true);
  syncPageIndexForBlank(restoredActiveBlankId, appState.reviewMode);

  return Boolean(restoredActiveBlankId);
}

function isBlankComplete(blankId) {
  const blankState = getBlankState(blankId);
  return Boolean(blankState && (blankState.status === "correct" || blankState.status === "revealed"));
}

function getCompletedBlankCount() {
  return appState.sessionBlankIds.filter(blankId => isBlankComplete(blankId)).length;
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
    .filter(blankId => {
      const blankState = getBlankState(blankId);

      return Boolean(blankState && (blankState.status === "wrong" || blankState.revealed || blankState.wrongCount > 0));
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

function getCurrentModePageIndexForBlank(blankId, reviewMode = appState.reviewMode) {
  const pages = reviewMode ? appState.reviewPages : appState.pages;

  if (reviewMode) {
    return pages.findIndex((page) => page.includes(blankId));
  }

  const questionId = getBlank(blankId)?.questionId;
  return pages.findIndex(page => page.includes(questionId));
}

function findNextIncompleteBlankAfter(blankId = "", blankOrder = getCurrentModeBlankOrder()) {

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

function queueFocusBlank(blankId, { includeReveal = false } = {}) {
  if (!blankId) {
    return;
  }

  appState.pendingFocusBlankId = blankId;
  requestAnimationFrame(() => {
    if (appState.pendingFocusBlankId !== blankId) {
      return;
    }

    const field = appState.blankInputRefs.get(blankId);
    const mirror = appState.blankInputMirrorRefs.get(blankId);

    if (!field || !mirror) {
      return;
    }

    scheduleAnswerFieldResize(field, mirror);

    try {
      field.focus({ preventScroll: true });
    } catch (error) {
      field.focus();
    }

    if (typeof field.setSelectionRange === "function") {
      const caretPosition = field.value.length;
      field.setSelectionRange(caretPosition, caretPosition);
    }

    setTrackedBlankId(blankId);
    appState.pendingFocusBlankId = "";
    ensurePracticeViewportForBlank(blankId, { includeReveal });
  });
}

function focusBlank(blankId) {
  if (!blankId) {
    return;
  }

  syncPageIndexForBlank(blankId);

  renderSession({ focusBlankId: blankId });
}

function moveToNextBlank(blankId = getActiveBlankId()) {
  const nextBlankId = getAdjacentBlankId(blankId, 1);

  if (nextBlankId) {
    focusBlank(nextBlankId);
  }
}

function moveToPreviousBlank(blankId = getActiveBlankId()) {
  const previousBlankId = getAdjacentBlankId(blankId, -1);

  if (previousBlankId) {
    focusBlank(previousBlankId);
  }
}

function checkCurrentBlank() {
  const activeBlankId = getActiveBlankId();

  if (!activeBlankId) {
    return;
  }

  checkBlank(activeBlankId);
  renderSession({ focusBlankId: activeBlankId });
}

function setBlankValue(blankId, value) {
  const blankState = getBlankState(blankId);

  if (!blankState) {
    return;
  }

  blankState.value = value;
}

function evaluateConceptMatcher(blank, userValue) {
  return evaluateAnswerModel(blank.answerModel, userValue);
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

function revealQuestion(questionId, focusBlankId = getActiveBlankId()) {
  const question = getQuestion(questionId);

  if (!question) {
    return;
  }

  appState.revealedQuestionIds.add(questionId);

  question.blanks.forEach(blank => {
    const blankState = getBlankState(blank.id);

    if (!blankState || blankState.status === "correct") {
      return;
    }

    blankState.status = "revealed";
    blankState.revealed = true;
    blankState.coveredGroups = [];
    blankState.missingGroups = blank.answerModel.concept_groups.filter(group => group.required).map(group => group.id);
    blankState.contradictionHits = [];
    blankState.lastReviewSignalAt = nextInteractionTick();
    blankState.reviewPriority = buildReviewPriority(blankState);
  });

  updateReviewQueue();
  renderSession({
    focusBlankId: resolvePreferredBlankId(getCurrentModeBlankOrder(), [focusBlankId]),
  });
}

function onBlankEnter(blankId) {
  const blankState = getBlankState(blankId);

  if (!blankState) {
    return;
  }

  checkBlank(blankId);
  renderSession({ focusBlankId: blankId });
}

function setReviewMode(reviewMode) {
  if (reviewMode && appState.reviewQueueBlankIds.length === 0) {
    return;
  }

  const activeBlankId = getActiveBlankId();

  if (appState.reviewMode === reviewMode) {
    return;
  }

  if (appState.reviewMode) {
    appState.lastReviewBlankId = activeBlankId;
  } else {
    appState.lastMainBlankId = activeBlankId;
  }

  appState.reviewMode = reviewMode;
  const nextFocusBlankId = reviewMode
    ? resolvePreferredBlankId(appState.reviewQueueBlankIds, [appState.lastReviewBlankId])
    : resolvePreferredBlankId(appState.sessionBlankIds, [
        appState.lastMainBlankId,
        findNextIncompleteBlankAfter("", appState.sessionBlankIds),
        activeBlankId,
      ]);

  if (reviewMode) {
    appState.lastReviewBlankId = nextFocusBlankId;
  } else {
    appState.lastMainBlankId = nextFocusBlankId;
  }

  renderSession({ focusBlankId: nextFocusBlankId });
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
  currentSetSummary.textContent = "Loading session...";
  currentSetCopy.textContent = "Building the current drill set.";
  pageCounter.textContent = "Prompt 0 / 0";
  completionChip.textContent = "0 / 0 blanks completed";
  reviewChip.textContent = "Review queue: 0";
  sessionBanner.hidden = true;
  sessionBanner.innerHTML = "";
  sessionPage.innerHTML = `<p class="memorisation-empty">${message}</p>`;
  sessionOutline.innerHTML = `<p class="memorisation-empty">${message}</p>`;
  prevBlankButton.disabled = true;
  checkBlankButton.disabled = true;
  revealBlankButton.disabled = true;
  nextBlankButton.disabled = true;
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
      appState.definitionScope === "all" ? "All definition sources" : formatDefinitionScope(appState.definitionScope);
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

function getRevealNote(question) {
  if (question.type === "definition" && question.sourceScope && question.sourceScope !== "paper_only") {
    return "Minimum pass uses the stored syllabus-style definition wording for this item.";
  }

  if (question.fileId === "core-equations") {
    return "Minimum pass keeps equation species and arrows strict while normalizing spacing and arrow variants.";
  }

  return "Hints stay concept-level during checking. Reveal shows the full answer and the minimum acceptable pass wording together.";
}

function getReviewReasonSummary(blankId) {
  const blankState = getBlankState(blankId);

  if (!blankState) {
    return "";
  }

  const reasons = [];

  if (blankState.revealed) {
    reasons.push("revealed");
  }

  if (blankState.wrongCount > 0) {
    reasons.push(`${blankState.wrongCount} wrong ${blankState.wrongCount === 1 ? "attempt" : "attempts"}`);
  }

  if (!blankState.revealed && blankState.wrongCount > 0 && blankState.status === "correct") {
    reasons.push("later corrected");
  }

  return reasons.join(" · ");
}

function getMissingGuidanceItems(blank, blankState, limit = 2) {
  if (!blank || !blankState) {
    return [];
  }

  const seenHints = new Set();

  return blank.answerModel.concept_groups
    .filter((group) => blankState.missingGroups.includes(group.id))
    .map((group) => group.hint || "Include the missing chemistry idea.")
    .filter((hint) => {
      if (!hint || seenHints.has(hint)) {
        return false;
      }

      seenHints.add(hint);
      return true;
    })
    .slice(0, limit);
}

function getBlankFeedbackDescriptor(blank, blankState) {
  const hasAnswer = Boolean(String(blankState?.value || "").trim());

  if (blankState.status === "correct") {
    return {
      label: "Accepted",
      tone: "correct",
      message: "Accepted. The required chemistry ideas are in place.",
      guidanceItems: [],
    };
  }

  if (blankState.status === "revealed") {
    return {
      label: "Answer revealed",
      tone: "revealed",
      message: "Compare your wording with the canonical answer and minimum pass below.",
      guidanceItems: [],
    };
  }

  if (blankState.status === "wrong") {
    const firstMissingGroup = blank.answerModel.concept_groups.find(group =>
      blankState.missingGroups.includes(group.id)
    );
    const contradictionWarning = blankState.contradictionHits.length
      ? " Remove the contradictory idea and try again."
      : "";
    const isNearMatch =
      blankState.matchState === "near_miss_preposition" ||
      (blankState.coveredGroups.length > 0 && blankState.missingGroups.length > 0);
    const nearMatchGuidanceItems = getMissingGuidanceItems(
      blank,
      blankState,
      blankState.matchState === "near_miss_preposition" ? 1 : 2,
    );

    if (isNearMatch) {
      return {
        label: "Near match",
        tone: "near",
        message: `Near match. ${
          blankState.matchState === "near_miss_preposition"
            ? "The remaining issue looks like a small preposition or phrasing shift."
            : firstMissingGroup?.hint || "Tighten the remaining chemistry wording."
        }${contradictionWarning}`,
        guidanceItems: nearMatchGuidanceItems,
      };
    }

    return {
      label: "Needs revision",
      tone: "wrong",
      message: `Needs revision. ${
        firstMissingGroup?.hint || "Add the missing chemistry idea."
      }${contradictionWarning}`,
      guidanceItems: [],
    };
  }

  if (!hasAnswer) {
    return {
      label: "No answer yet",
      tone: "neutral",
      message: blank.multiline
        ? "Type first, then use Check. Shift+Enter adds a new line."
        : "Type first, then use Check.",
      guidanceItems: [],
    };
  }

  return {
    label: "Ready to check",
    tone: "neutral",
    message: "Use Check to compare this draft against the minimum pass wording.",
    guidanceItems: [],
  };
}

function createAnswerField(blank) {
  const blankState = getBlankState(blank.id);
  const fieldShell = document.createElement("div");
  fieldShell.className = "memorisation-answer-card__field";

  const label = document.createElement("label");
  label.className = "memorisation-field__label";
  label.textContent = blank.label;
  label.setAttribute("for", blank.id);

  const inputShell = document.createElement("div");
  inputShell.className = "memorisation-input-shell";

  const mirror = document.createElement("div");
  mirror.className = "memorisation-input__mirror";
  mirror.setAttribute("aria-hidden", "true");

  const field = document.createElement("textarea");

  field.id = blank.id;
  field.className = "memorisation-input";
  field.spellcheck = false;
  field.autocomplete = "off";
  field.autocapitalize = "off";
  field.placeholder = blank.placeholder;
  field.value = blankState?.value || "";
  field.rows = blank.multiline ? 8 : 5;
  field.dataset.status = blankState?.status || "idle";
  field.addEventListener("focus", () => {
    setTrackedBlankId(blank.id);
  });
  field.addEventListener("input", event => {
    setBlankValue(blank.id, event.target.value);
    updateBlankInlineDisplay(blank, getBlankState(blank.id), mirror, field);
    schedulePersistSessionState();
  });
  field.addEventListener("scroll", () => {
    syncMirroredFieldScroll(field, mirror);
  });
  field.addEventListener("keydown", event => {
    const isEnter = event.key === "Enter";
    const allowNewLine = event.shiftKey;

    if (!isEnter || allowNewLine || event.isComposing || event.keyCode === 229) {
      return;
    }

    event.preventDefault();
    onBlankEnter(blank.id);
  });

  inputShell.append(mirror, field);
  updateBlankInlineDisplay(blank, blankState, mirror, field);

  appState.blankInputRefs.set(blank.id, field);
  appState.blankInputMirrorRefs.set(blank.id, mirror);
  fieldShell.append(label, inputShell);
  return fieldShell;
}

function createFeedbackCard(blank) {
  const blankState = getBlankState(blank.id);
  const descriptor = getBlankFeedbackDescriptor(blank, blankState);
  const shell = document.createElement("section");
  shell.className = "memorisation-feedback-card";
  shell.dataset.tone = descriptor.tone;
  shell.setAttribute("aria-live", "polite");
  shell.setAttribute("aria-atomic", "true");

  const label = document.createElement("p");
  label.className = "memorisation-feedback-card__label";
  label.textContent = "Feedback";

  const title = document.createElement("h4");
  title.className = "memorisation-feedback-card__title";
  title.textContent = descriptor.label;

  const copy = document.createElement("p");
  copy.className = "memorisation-feedback";
  copy.dataset.tone = descriptor.tone;
  copy.textContent = descriptor.message;

  shell.append(label, title, copy);

  if (descriptor.guidanceItems.length) {
    const guidanceList = document.createElement("ul");
    guidanceList.className = "memorisation-feedback__guidance";

    descriptor.guidanceItems.forEach((guidanceItem) => {
      const listItem = document.createElement("li");
      listItem.textContent = guidanceItem;
      guidanceList.append(listItem);
    });

    shell.append(guidanceList);
  }

  return shell;
}

function createRevealPanel(question, blank) {
  const shell = document.createElement("section");
  shell.className = "interactive-subtle-panel memorisation-reveal";
  shell.dataset.blankId = blank.id;

  const headerLabel = document.createElement("p");
  headerLabel.className = "memorisation-question-label";
  headerLabel.textContent = "Canonical answer";

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

  const note = document.createElement("p");
  note.className = "memorisation-answer__note";
  note.textContent = [question.blanks.length > 1 ? `Current target: ${blank.label}.` : "", getRevealNote(question)]
    .filter(Boolean)
    .join(" ");

  shell.append(headerLabel, fullAnswerBlock, minimumPassBlock, note);
  return shell;
}

function renderProgressHeader() {
  const blankOrder = getCurrentModeBlankOrder();
  const activeBlankId = getActiveBlankId();
  const activeBlankIndex = getBlankOrderIndex(activeBlankId, blankOrder);
  const activeQuestion = getQuestion(getBlank(activeBlankId)?.questionId || "");
  const totalBlanks = appState.sessionBlankIds.length;
  const completedBlanks = getCompletedBlankCount();
  const reviewCount = appState.reviewQueueBlankIds.length;
  const promptLabel = activeBlankIndex >= 0 ? activeBlankIndex + 1 : 0;

  pageCounter.textContent = `${appState.reviewMode ? "Review" : "Prompt"} ${promptLabel} / ${blankOrder.length}`;
  completionChip.textContent = `${completedBlanks} / ${totalBlanks} blanks completed`;
  reviewChip.textContent = appState.reviewMode
    ? `Review queue: ${reviewCount} active`
    : `Review queue: ${reviewCount}`;
  prevBlankButton.disabled = activeBlankIndex <= 0;
  nextBlankButton.disabled = activeBlankIndex < 0 || activeBlankIndex >= blankOrder.length - 1;
  checkBlankButton.disabled = !activeBlankId;
  revealBlankButton.disabled = !activeQuestion || appState.revealedQuestionIds.has(activeQuestion.id);
  revealBlankButton.textContent =
    activeQuestion && appState.revealedQuestionIds.has(activeQuestion.id) ? "Shown" : "Reveal";

  reviewToggleButton.hidden = reviewCount === 0;
  reviewToggleButton.textContent = appState.reviewMode
    ? "Back to main session"
    : `Review queue (${reviewCount})`;
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
          ${completedBlanks} blanks completed. ${reviewCount} blank${reviewCount === 1 ? "" : "s"} queued for review.
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
        <p class="memorisation-question-copy">
          Ordering: revealed first, then higher wrong counts, then the most recent unresolved items.
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
    questionLabel.textContent = "Focused review";
    questionTitle.textContent = `${fileEntry?.label || "Training file"} review queue`;
    questionCopy.textContent = `Return to missed or revealed blanks from ${
      stageEntry?.id || "stage"
    } · ${levelEntry?.label || "level"} · ${topicText}.`;
    currentSetSummary.textContent = `Reviewing ${topicText}`;
    currentSetCopy.textContent = `${stageEntry?.id || "Stage"} · ${
      levelEntry?.label || "Level"
    } · ${pluralise(appState.reviewQueueBlankIds.length, "blank")} queued`;
    return;
  }

  questionLabel.textContent = "Continuous session";
  questionTitle.textContent = `${fileEntry?.label || "Training file"} · ${levelEntry?.label || "Level"}`;
  questionCopy.textContent = `Follow the drill loop: read, type, check, then move on. The review queue collects reveals and misses for a second pass.`;
  currentSetSummary.textContent = `${topicText} · ${fileEntry?.label || "Training file"}`;
  currentSetCopy.textContent = `${stageEntry?.id || "Stage"} · ${
    levelEntry?.label || "Level"
  } · ${getFileCountLabel(fileEntry)}`;
}

function getOutlineStatusLabel(blank, blankState) {
  if (!blank || !blankState) {
    return "Not started";
  }

  return getBlankFeedbackDescriptor(blank, blankState).label;
}

function getOutlinePromptTitle(blankId, blankOrder = getCurrentModeBlankOrder()) {
  const promptIndex = getBlankOrderIndex(blankId, blankOrder);
  const promptLabel = appState.reviewMode ? "Review" : "Prompt";
  return `${promptLabel} ${promptIndex >= 0 ? promptIndex + 1 : 0}`;
}

function getOutlinePromptMeta(question, blank) {
  if (!question || !blank) {
    return "";
  }

  const parts = [];

  if (question.topicLabel) {
    parts.push(question.topicLabel);
  } else if (question.subtopic) {
    parts.push(formatLabel(question.subtopic));
  }

  if (question.round) {
    parts.push(`Round ${question.round}`);
  }

  if (question.blanks.length > 1) {
    parts.push(blank.label);
  }

  return parts.join(" · ") || question.type || "Current prompt";
}

function renderSessionOutline() {
  sessionOutline.replaceChildren();

  const blankOrder = getCurrentModeBlankOrder();

  if (!blankOrder.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "memorisation-empty";
    emptyState.textContent = "No prompts in this session yet.";
    sessionOutline.append(emptyState);
    return;
  }

  const activeBlankId = getActiveBlankId();
  const currentIndex = Math.max(getBlankOrderIndex(activeBlankId, blankOrder), 0);
  const maxVisible = 7;
  let startIndex = Math.max(0, currentIndex - 2);
  let endIndex = Math.min(blankOrder.length, startIndex + maxVisible);

  if (endIndex - startIndex < maxVisible) {
    startIndex = Math.max(0, endIndex - maxVisible);
  }

  blankOrder.slice(startIndex, endIndex).forEach(blankId => {
    const blank = getBlank(blankId);
    const question = getQuestion(blank?.questionId || "");
    const blankState = getBlankState(blankId);

    if (!blank || !question || !blankState) {
      return;
    }

    const item = document.createElement("button");
    item.type = "button";
    item.className = "memorisation-outline__item";
    item.dataset.current = String(blankId === activeBlankId);
    item.dataset.status = blankState.status;
    item.setAttribute(
      "aria-label",
      `${getOutlinePromptTitle(blankId, blankOrder)}. ${question.question}`,
    );
    item.addEventListener("click", () => {
      focusBlank(blankId);
    });

    const title = document.createElement("span");
    title.className = "memorisation-outline__title";
    title.textContent = getOutlinePromptTitle(blankId, blankOrder);

    const meta = document.createElement("p");
    meta.className = "memorisation-outline__meta";
    meta.textContent = getOutlinePromptMeta(question, blank);

    const status = document.createElement("span");
    status.className = "memorisation-outline__status";
    status.textContent = getOutlineStatusLabel(blank, blankState);

    item.append(title, meta, status);
    sessionOutline.append(item);
  });

  if (startIndex > 0 || endIndex < blankOrder.length) {
    const overflow = document.createElement("p");
    overflow.className = "memorisation-outline__overflow";
    overflow.textContent = `${blankOrder.length - (endIndex - startIndex)} more prompt${
      blankOrder.length - (endIndex - startIndex) === 1 ? "" : "s"
    } in this session.`;
    sessionOutline.append(overflow);
  }
}

function renderActivePractice() {
  sessionPage.replaceChildren();
  appState.blankInputRefs = new Map();
  appState.blankInputMirrorRefs = new Map();

  const activeBlankId = getActiveBlankId();
  const blank = getBlank(activeBlankId);
  const question = getQuestion(blank?.questionId || "");

  if (!blank || !question) {
    renderStatusCard(sessionPage, "No active prompt is available for the current session.");
    return;
  }

  const promptCard = document.createElement("article");
  promptCard.className = "interactive-subtle-panel memorisation-prompt-card";
  promptCard.dataset.blankId = blank.id;

  const promptChips = document.createElement("div");
  promptChips.className = "memorisation-card-chips";

  const topicChip = document.createElement("span");
  topicChip.className = "memorisation-card-chip";
  topicChip.textContent = question.topicLabel || "Current topic";

  const typeChip = document.createElement("span");
  typeChip.className = "memorisation-card-chip";
  typeChip.textContent = question.type || question.fileLabel;

  promptChips.append(topicChip, typeChip);

  if (question.blanks.length > 1) {
    const blankChip = document.createElement("span");
    blankChip.id = "active-blank-chip";
    blankChip.className = "memorisation-card-chip memorisation-card-chip--muted";
    blankChip.textContent = blank.label;
    promptChips.append(blankChip);
  }

  const promptLabel = document.createElement("p");
  promptLabel.className = "memorisation-question-label";
  promptLabel.textContent = appState.reviewMode ? "Review prompt" : "Active prompt";

  const promptTitle = document.createElement("h3");
  promptTitle.id = "active-prompt-title";
  promptTitle.textContent = question.question;

  const promptMeta = document.createElement("p");
  promptMeta.className = "memorisation-prompt-card__meta";
  promptMeta.textContent = [buildQuestionMeta(question), getReviewReasonSummary(blank.id)].filter(Boolean).join(" · ");

  promptCard.append(promptChips, promptLabel, promptTitle, promptMeta);

  if (question.prompt && (question.kind === "cloze" || question.prompt !== question.question)) {
    const contextBlock = document.createElement("div");
    contextBlock.className = "memorisation-prompt-context";

    const contextLabel = document.createElement("p");
    contextLabel.className = "memorisation-prompt-context__label";
    contextLabel.textContent = question.kind === "cloze" ? "Prompt context" : "Prompt";

    const contextText = document.createElement("p");
    contextText.id = "active-prompt-context";
    contextText.className = "memorisation-prompt-context__text";
    contextText.textContent = question.prompt;

    contextBlock.append(contextLabel, contextText);
    promptCard.append(contextBlock);
  }

  const answerCard = document.createElement("article");
  answerCard.className = "interactive-subtle-panel memorisation-answer-card";
  answerCard.dataset.blankId = blank.id;

  const answerHeader = document.createElement("div");
  answerHeader.className = "memorisation-answer-card__header";

  const answerHeaderCopy = document.createElement("div");

  const answerLabel = document.createElement("p");
  answerLabel.className = "memorisation-question-label";
  answerLabel.textContent = "Your answer";

  const answerCopy = document.createElement("p");
  answerCopy.className = "memorisation-answer-card__copy";
  answerCopy.textContent = blank.multiline
    ? "Use a full multi-line response. Shift+Enter adds a new line without checking."
    : "Keep the wording tight, then use Check to compare it against the minimum pass.";

  answerHeaderCopy.append(answerLabel, answerCopy);

  const statusPill = document.createElement("span");
  const descriptor = getBlankFeedbackDescriptor(blank, getBlankState(blank.id));
  statusPill.className = "memorisation-status-pill";
  statusPill.dataset.tone = descriptor.tone;
  statusPill.textContent = descriptor.label;

  answerHeader.append(answerHeaderCopy, statusPill);
  answerCard.append(answerHeader, createAnswerField(blank));

  sessionPage.append(promptCard, answerCard, createFeedbackCard(blank));

  if (appState.revealedQuestionIds.has(question.id)) {
    sessionPage.append(createRevealPanel(question, blank));
  }

  queueFocusBlank(appState.pendingFocusBlankId || activeBlankId, {
    includeReveal: appState.revealedQuestionIds.has(question.id),
  });
}

function renderPageContent() {
  renderActivePractice();
}

function renderEmptyState(message) {
  renderStats();
  updateBadges();
  questionLabel.textContent = "No session questions";
  questionTitle.textContent = "Nothing matches the current selection.";
  questionCopy.textContent = message;
  currentSetSummary.textContent = "Nothing matches this set";
  currentSetCopy.textContent = message;
  pageCounter.textContent = "Prompt 0 / 0";
  completionChip.textContent = "0 / 0 blanks completed";
  reviewChip.textContent = "Review queue: 0";
  sessionBanner.hidden = true;
  sessionBanner.innerHTML = "";
  renderStatusCard(sessionPage, message);
  renderSessionOutline();
  prevBlankButton.disabled = true;
  checkBlankButton.disabled = true;
  revealBlankButton.disabled = true;
  nextBlankButton.disabled = true;
  reviewToggleButton.hidden = true;
  updateUrlFromState();
  clearPersistedSessionState();
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
  questionCopy.textContent = "The catalog or its supporting files could not be loaded. Retry this page in a moment.";
  currentSetSummary.textContent = "Memorisation bank unavailable";
  currentSetCopy.textContent = "The catalog or its supporting files could not be loaded.";
  pageCounter.textContent = "Prompt 0 / 0";
  completionChip.textContent = "0 / 0 blanks completed";
  reviewChip.textContent = "Review queue: 0";
  sessionBanner.hidden = true;
  sessionBanner.innerHTML = "";
  renderStatusCard(sessionPage, message, "Retry loading", () => {
    bootRuntime({ preserveSelection: false });
  });
  renderSessionOutline();
  prevBlankButton.disabled = true;
  checkBlankButton.disabled = true;
  revealBlankButton.disabled = true;
  nextBlankButton.disabled = true;
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
  currentSetSummary.textContent = "Could not load this set";
  currentSetCopy.textContent = message;
  pageCounter.textContent = "Prompt 0 / 0";
  completionChip.textContent = "0 / 0 blanks completed";
  reviewChip.textContent = "Review queue: 0";
  sessionBanner.hidden = true;
  sessionBanner.innerHTML = "";
  renderStatusCard(sessionPage, message, "Retry loading", () => {
    refreshSession({ allowCatalogResync: true });
  });
  renderSessionOutline();
  prevBlankButton.disabled = true;
  checkBlankButton.disabled = true;
  revealBlankButton.disabled = true;
  nextBlankButton.disabled = true;
  reviewToggleButton.hidden = true;
  updateUrlFromState();
}

function renderSession({ focusBlankId = "" } = {}) {
  if (focusBlankId) {
    appState.pendingFocusBlankId = focusBlankId;

    if (appState.reviewMode) {
      appState.lastReviewBlankId = focusBlankId;
    } else {
      appState.lastMainBlankId = focusBlankId;
    }
  }

  renderStats();
  updateBadges();
  renderSessionHeaderCopy();
  renderProgressHeader();
  renderBanner();
  renderPageContent();
  renderSessionOutline();
  updateUrlFromState();
  persistSessionStateNow();
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
    restoreSessionStateFromStorage();
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

  filtersToggleButton.addEventListener("click", () => {
    setFiltersOpen(!appState.filtersOpen);
  });

  filtersCloseButton.addEventListener("click", () => {
    closeFilters();
  });

  filtersBackdrop.addEventListener("click", () => {
    closeFilters();
  });

  drillRulesOpenButton?.addEventListener("click", () => {
    openDrillRulesDialog();
  });

  drillRulesCloseButton?.addEventListener("click", () => {
    closeDrillRulesDialog();
  });

  drillRulesDialog?.addEventListener("click", (event) => {
    if (event.target === drillRulesDialog) {
      closeDrillRulesDialog();
    }
  });

  drillRulesDialog?.addEventListener("close", () => {
    restoreDrillRulesTriggerFocus();
  });

  topicFilter.addEventListener("change", (event) => {
    applySelection(
      getSelectionSnapshot({
        topic: normalizeTopicKey(event.target.value || ""),
        file: "",
        definitionScope: "all",
        round: "all",
      })
    );
  });

  prevBlankButton.addEventListener("click", () => {
    moveToPreviousBlank(getActiveBlankId());
  });

  checkBlankButton.addEventListener("click", () => {
    checkCurrentBlank();
  });

  revealBlankButton.addEventListener("click", () => {
    const activeBlankId = getActiveBlankId();
    const questionId = getBlank(activeBlankId)?.questionId;

    if (questionId) {
      revealQuestion(questionId, activeBlankId);
    }
  });

  nextBlankButton.addEventListener("click", () => {
    moveToNextBlank(getActiveBlankId());
  });

  reviewToggleButton.addEventListener("click", () => {
    setReviewMode(!appState.reviewMode);
  });

  window.addEventListener("resize", () => {
    setFiltersOpen(appState.filtersOpen);
    appState.blankInputRefs.forEach((field, blankId) => {
      scheduleAnswerFieldResize(field, appState.blankInputMirrorRefs.get(blankId));
    });
  });

  window.addEventListener("pagehide", () => {
    flushPersistedSessionState();
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
