import {
  buildHomepageViewModel,
  createDocumentResourceModel,
  loadCurationBundle,
  loadInteractiveResources,
} from "./ui/homepage-data.js";
import {
  createFeaturedResourcesMarkup,
  createHomepageHeroMarkup,
  createInteractiveSectionMarkup,
  createResourceCardMarkup,
  createRoutesSectionMarkup,
  createSiteHeaderMarkup,
} from "./ui/homepage-components.js";

const siteHeaderRoot = document.getElementById("site-header-root");
const homepageHeroRoot = document.getElementById("homepage-hero-root");
const homepageRoutesRoot = document.getElementById("homepage-routes-root");
const homepageFeaturedRoot = document.getElementById("homepage-featured-root");
const homepageInteractiveRoot = document.getElementById("homepage-interactive-root");
const homepageSearchFeedback = () => document.getElementById("homepage-search-feedback");
const homepageSearchInput = () => document.getElementById("homepage-search-input");
const libraryPanel = document.getElementById("library-panel");
const libraryGrid = document.getElementById("library-grid");
const libraryStatus = document.getElementById("library-status");
const libraryFilters = document.getElementById("library-filters");
const stageFilter = document.getElementById("filter-stage");
const partFilter = document.getElementById("filter-part");
const filterHelper = document.getElementById("filter-helper");
const filterTopicSummary = document.getElementById("filter-topic-summary");
const filterTopicCount = document.getElementById("filter-topic-count");
const tagFilterList = document.getElementById("filter-tags");
const toggleFilterTagsButton = document.getElementById("toggle-filter-tags");
const resetFiltersButton = document.getElementById("reset-filters");

const libraryState = {
  documents: [],
  filters: {
    stage: "",
    part: "",
    tags: new Set(),
  },
  showAllFilterTags: false,
};
const homepageState = {
  curationBundle: {},
  interactiveResources: [],
  searchIndex: [],
};

const filterQueryKeys = {
  stage: "stage",
  part: "part",
  tags: "tags",
};

const collapsedPrimaryFilterTagCount = 5;
const cardVisibleTagCount = 4;
const structuralUiTags = new Set([
  "9701",
  "equation-bank",
  "as",
  "a2",
  "organic",
  "inorganic",
  "physical",
  "analysis",
  "equations",
  "index",
  "cross-stage",
  "cross-part",
]);
const uiTagAliasMap = {
  "ir-spectroscopy": "ir-spectroscopy",
  infrared: "ir-spectroscopy",
  spectroscopy: "ir-spectroscopy",
  "qualitative-tests": "qualitative-tests",
  tests: "qualitative-tests",
  "polymer-chemistry": "polymer-chemistry",
  polymerisation: "polymer-chemistry",
  polymers: "polymer-chemistry",
  "electronic-effects": "electronic-effects",
  "inductive-effect": "electronic-effects",
  delocalisation: "electronic-effects",
  "conjugate-base-stability": "electronic-effects",
  "lone-pair-availability": "electronic-effects",
};
const tagDisplayLabelMap = {
  "acyl-chlorides": "Acyl chlorides",
  alcohols: "Alcohols",
  alkenes: "Alkenes",
  amides: "Amides",
  amines: "Amines",
  "amino-acids": "Amino acids",
  arenes: "Arenes",
  "azo-coupling": "Azo coupling",
  basicity: "Basicity",
  buffers: "Buffers",
  carbonyls: "Carbonyls",
  "carboxylic-acids": "Carboxylic acids",
  electrochemistry: "Electrochemistry",
  "electronic-effects": "Electronic effects",
  "functional-groups": "Functional groups",
  "group-2": "Group 2",
  "group-17": "Group 17",
  "halogenoalkanes": "Halogenoalkanes",
  "halogenoarenes": "Halogenoarenes",
  "hcn-addition": "HCN addition",
  hydrocarbons: "Hydrocarbons",
  "ir-spectroscopy": "IR spectroscopy",
  mechanisms: "Mechanisms",
  nitriles: "Nitriles",
  "nitrogen-sulfur": "Nitrogen and sulfur",
  "past-paper": "Past paper",
  phenol: "Phenol",
  "period-3": "Period 3",
  pka: "pKa",
  pkb: "pKb",
  practical: "Practical",
  "polymer-chemistry": "Polymer chemistry",
  "qualitative-tests": "Qualitative tests",
  redox: "Redox",
  "transition-elements": "Transition elements",
  acidity: "Acidity",
};
const topicPriorityWeightMap = {
  "ir-spectroscopy": 140,
  carbonyls: 132,
  alcohols: 130,
  "carboxylic-acids": 128,
  "qualitative-tests": 126,
  mechanisms: 124,
  amines: 122,
  alkenes: 118,
  hydrocarbons: 116,
  halogenoalkanes: 114,
  "electronic-effects": 112,
  acidity: 110,
  basicity: 108,
  electrochemistry: 104,
  redox: 102,
  "transition-elements": 100,
  practical: 98,
  "polymer-chemistry": 96,
  nitriles: 94,
  amides: 92,
  arenes: 90,
  phenol: 88,
  "acyl-chlorides": 86,
  "group-2": 84,
  "group-17": 82,
  "period-3": 80,
};
const sourceKindLabelMap = {
  official: "Official",
  "teacher-made": "Teacher-made",
  "ai-generated": "AI-generated",
};
const textCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

async function loadLibrary() {
  const interactiveResourcesPromise = loadInteractiveResources();
  const curationBundlePromise = loadCurationBundle();

  try {
    libraryState.documents = await fetchLibraryDocuments();
    homepageState.interactiveResources = await interactiveResourcesPromise.catch(() => []);
    homepageState.curationBundle = await curationBundlePromise.catch(() => ({}));
    renderHomepage();
    applyFiltersFromUrl({ replaceUrl: true });
  } catch (error) {
    homepageState.interactiveResources = await interactiveResourcesPromise.catch(() => []);
    homepageState.curationBundle = await curationBundlePromise.catch(() => ({}));
    renderHomepage();
    libraryStatus.textContent = "Could not load library data.";
    libraryGrid.setAttribute("aria-busy", "false");

    if (libraryFilters) {
      libraryFilters.hidden = true;
    }

    libraryGrid.innerHTML = `
      <article class="empty-state empty-state--library empty-state--error">
        <strong>Library unavailable.</strong>
        <p>${escapeHtml(error.message)}</p>
      </article>
    `;
  }
}

async function fetchLibraryDocuments() {
  const response = await fetch("./public/data/library.json", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Library request failed with status ${response.status}.`);
  }

  const documents = await response.json();

  return Array.isArray(documents) ? documents : [];
}

function renderHomepage() {
  const helpers = {
    buildDocumentLinkHref,
    buildLibraryHref,
    buildSiteHref,
    getContentFormatLabel,
    getDocumentDisplayTitle,
    getDocumentUiTags,
    getReadableLabel,
    getSourceKindLabel,
    getTagDisplayLabel,
  };
  const homepageViewModel = buildHomepageViewModel(
    libraryState.documents,
    homepageState.interactiveResources,
    homepageState.curationBundle,
    helpers,
  );

  homepageState.searchIndex = Array.isArray(homepageViewModel.searchIndex)
    ? homepageViewModel.searchIndex
    : [];

  if (siteHeaderRoot) {
    siteHeaderRoot.innerHTML = createSiteHeaderMarkup(homepageViewModel.header);
  }

  if (homepageHeroRoot) {
    homepageHeroRoot.innerHTML = createHomepageHeroMarkup(homepageViewModel.hero);
  }

  if (homepageRoutesRoot) {
    homepageRoutesRoot.innerHTML = createRoutesSectionMarkup(homepageViewModel.routesSection);
  }

  if (homepageFeaturedRoot) {
    homepageFeaturedRoot.innerHTML = createFeaturedResourcesMarkup(homepageViewModel.featuredSection);
  }

  if (homepageInteractiveRoot) {
    homepageInteractiveRoot.innerHTML = createInteractiveSectionMarkup(
      homepageViewModel.interactiveSection,
    );
  }

  initializeHomepageSearch();
}

function renderLibrary() {
  const documents = libraryState.documents;

  libraryGrid.setAttribute("aria-busy", "false");

  if (documents.length === 0) {
    libraryState.filters.stage = "";
    libraryState.filters.part = "";
    libraryState.filters.tags = new Set();

    if (libraryFilters) {
      libraryFilters.hidden = true;
    }

    libraryStatus.textContent =
      "No synced document files were found. Run the sync script after adding content.pdf, content.md, or content.html inside a document folder.";
    libraryGrid.innerHTML = `
      <article class="empty-state empty-state--library">
        <strong>No documents yet.</strong>
        <p>Add a supported content file inside a folder under <code>content-source/documents</code>, then rerun the sync script.</p>
      </article>
    `;
    return;
  }

  renderFilterControls(documents);

  const filteredDocuments = documents.filter(matchesActiveFilters);
  const hasActiveFilters = hasFiltersApplied();

  libraryStatus.textContent = hasActiveFilters
    ? `${filteredDocuments.length} of ${documents.length} document${documents.length === 1 ? "" : "s"} shown.`
    : `${documents.length} document${documents.length === 1 ? "" : "s"} available.`;

  if (filteredDocuments.length === 0) {
    libraryGrid.innerHTML = `
      <article class="empty-state empty-state--library">
        <strong>No matching documents.</strong>
        <p>Try adjusting or resetting the Stage, Part, or Topics &amp; Skills filters.</p>
      </article>
    `;
    return;
  }

  libraryGrid.innerHTML = filteredDocuments.map(createCardMarkup).join("");
}

function applyFiltersFromUrl({ replaceUrl = false } = {}) {
  setFilters(parseFiltersFromUrl());
  renderLibrary();

  if (replaceUrl) {
    writeFiltersToUrl({ replace: true });
  }
}

function parseFiltersFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);

  return {
    stage: normalizeFilterParam(searchParams.get(filterQueryKeys.stage)),
    part: normalizeFilterParam(searchParams.get(filterQueryKeys.part)),
    tags: new Set(normalizeTagParams(searchParams.getAll(filterQueryKeys.tags))),
  };
}

function writeFiltersToUrl({ replace = false } = {}) {
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  const tags = [...libraryState.filters.tags].sort(sortTagValues);

  if (libraryState.filters.stage) {
    searchParams.set(filterQueryKeys.stage, libraryState.filters.stage);
  } else {
    searchParams.delete(filterQueryKeys.stage);
  }

  if (libraryState.filters.part) {
    searchParams.set(filterQueryKeys.part, libraryState.filters.part);
  } else {
    searchParams.delete(filterQueryKeys.part);
  }

  if (tags.length > 0) {
    searchParams.set(filterQueryKeys.tags, tags.join(","));
  } else {
    searchParams.delete(filterQueryKeys.tags);
  }

  const nextSearch = searchParams.toString();
  const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl === currentUrl) {
    return;
  }

  const historyMethod = replace ? "replaceState" : "pushState";
  window.history[historyMethod](null, "", nextUrl);
}

function normalizeFilterParam(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTagParams(values) {
  const tagValues = Array.isArray(values) ? values : [values];

  return [...new Set(
    tagValues
      .flatMap((value) => String(value || "").split(","))
      .map(normalizeUiTag)
      .filter(Boolean),
  )].sort(sortTagValues);
}

function normalizeUiTag(value) {
  const normalizedValue = normalizeTagSlug(value);

  if (!normalizedValue) {
    return "";
  }

  const canonicalValue = uiTagAliasMap[normalizedValue] || normalizedValue;

  if (structuralUiTags.has(canonicalValue)) {
    return "";
  }

  return canonicalValue;
}

function normalizeTagSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^\w+\s-]/g, "")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function setFilters(filters) {
  libraryState.filters.stage = filters.stage;
  libraryState.filters.part = filters.part;
  libraryState.filters.tags = new Set(filters.tags);
}

function renderFilterControls(documents) {
  if (!libraryFilters || !stageFilter || !partFilter || !tagFilterList || !resetFiltersButton) {
    return;
  }

  libraryFilters.hidden = false;

  const stageValues = getUniqueValues(documents, "stage");
  const partValues = getUniqueValues(documents, "part");

  populateSelectOptions(stageFilter, stageValues);
  populateSelectOptions(partFilter, partValues);

  stageFilter.value = stageValues.includes(libraryState.filters.stage)
    ? libraryState.filters.stage
    : "";
  partFilter.value = partValues.includes(libraryState.filters.part)
    ? libraryState.filters.part
    : "";

  if (!stageValues.includes(libraryState.filters.stage)) {
    libraryState.filters.stage = "";
  }

  if (!partValues.includes(libraryState.filters.part)) {
    libraryState.filters.part = "";
  }

  const stageAndPartDocuments = getDocumentsMatchingStageAndPart(documents);
  const tagValues = getUniqueTagValues(stageAndPartDocuments);
  const localTagCounts = getTagCounts(stageAndPartDocuments);
  const globalTagCounts = getTagCounts(documents);
  const stageAndPartParts = getUniqueValues(stageAndPartDocuments, "part");
  const tagPartMap = getTagPartMap(stageAndPartDocuments);

  pruneInvalidSelectedTags(tagValues);

  const tagGroups = getVisibleFilterTagGroups(
    tagValues,
    localTagCounts,
    globalTagCounts,
    stageAndPartParts,
    tagPartMap,
  );

  tagFilterList.innerHTML =
    tagGroups.groups.length > 0
      ? tagGroups.groups
          .map(({ title, description, tags, secondary = false }) =>
            createFilterTagGroupMarkup(title, description, tags, {
              secondary,
            }))
          .join("")
      : '<span class="tag">No topics or skills available for this Stage and Part.</span>';

  updateFilterCopy(stageAndPartDocuments, tagValues, tagGroups);
  updatePrimaryFilterState(stageFilter);
  updatePrimaryFilterState(partFilter);
  updateTopicFilterState();
  updateFilterTagToggle(tagGroups.hiddenCount);
  resetFiltersButton.disabled = !hasFiltersApplied();
}

function populateSelectOptions(selectElement, values) {
  const defaultLabel =
    selectElement.dataset.defaultLabel || selectElement.options[0]?.textContent || "All";

  selectElement.innerHTML = [
    `<option value="">${escapeHtml(defaultLabel)}</option>`,
    ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
  ].join("");
}

function getUniqueValues(documents, key) {
  return [...new Set(
    documents
      .map((documentItem) => String(documentItem[key] || "").trim())
      .filter(Boolean),
  )].sort(sortText);
}

function getUniqueTagValues(documents) {
  return [...new Set(
    documents.flatMap(getDocumentUiTags),
  )].sort(sortTagValues);
}

function getDocumentsMatchingStageAndPart(documents) {
  return documents.filter((documentItem) => {
    const matchesStage =
      !libraryState.filters.stage ||
      String(documentItem.stage || "").trim() === libraryState.filters.stage;
    const matchesPart =
      !libraryState.filters.part ||
      String(documentItem.part || "").trim() === libraryState.filters.part;

    return matchesStage && matchesPart;
  });
}

function getDocumentUiTags(documentItem) {
  const tags = Array.isArray(documentItem.tags) ? documentItem.tags : [];

  return [...new Set(tags.map(normalizeUiTag).filter(Boolean))].sort(sortTagValues);
}

function getTagCounts(documents) {
  return documents.reduce((counts, documentItem) => {
    getDocumentUiTags(documentItem).forEach((tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
    });

    return counts;
  }, {});
}

function getTagPartMap(documents) {
  return documents.reduce((tagPartMap, documentItem) => {
    const documentPart = String(documentItem.part || "").trim();

    getDocumentUiTags(documentItem).forEach((tag) => {
      if (!tagPartMap[tag]) {
        tagPartMap[tag] = new Set();
      }

      if (documentPart) {
        tagPartMap[tag].add(documentPart);
      }
    });

    return tagPartMap;
  }, {});
}

function pruneInvalidSelectedTags(tagValues) {
  const availableTags = new Set(tagValues);
  const nextTags = [...libraryState.filters.tags].filter((tag) => availableTags.has(tag));

  libraryState.filters.tags = new Set(nextTags);
}

function getVisibleFilterTagGroups(
  tagValues,
  localTagCounts,
  globalTagCounts,
  availableParts,
  tagPartMap,
) {
  const rankedTagValues = [...tagValues].sort((left, right) =>
    compareFilterTagPriority(left, right, localTagCounts, globalTagCounts),
  );
  const priorityTags = getPriorityFilterTags(rankedTagValues, availableParts, tagPartMap);
  const secondaryTags = rankedTagValues.filter((tag) => !priorityTags.includes(tag));
  const selectedSecondaryTags = secondaryTags.filter((tag) => libraryState.filters.tags.has(tag));
  const groups = [];

  if (priorityTags.length > 0) {
    groups.push({
      title: "Best first cuts",
      description: "Start here before opening the long tail.",
      tags: priorityTags,
    });
  }

  if (libraryState.showAllFilterTags && secondaryTags.length > 0) {
    groups.push({
      title: "More from this stage and part",
      description: "Long-tail topics still available in the current subset.",
      tags: secondaryTags,
      secondary: true,
    });
  } else if (selectedSecondaryTags.length > 0) {
    groups.push({
      title: "Selected from more topics",
      description: "Pinned here because they are active.",
      tags: selectedSecondaryTags,
      secondary: true,
    });
  }

  return {
    groups,
    hiddenCount: Math.max(0, secondaryTags.length - selectedSecondaryTags.length),
  };
}

function getPriorityFilterTags(rankedTagValues, availableParts, tagPartMap) {
  if (libraryState.filters.part || availableParts.length <= 1) {
    return rankedTagValues.slice(0, collapsedPrimaryFilterTagCount);
  }

  const priorityTags = [];
  const coveredParts = new Set();
  const topOverallTag = rankedTagValues[0];

  if (topOverallTag) {
    priorityTags.push(topOverallTag);

    (tagPartMap[topOverallTag] || []).forEach((part) => {
      coveredParts.add(part);
    });
  }

  availableParts.forEach((part) => {
    if (priorityTags.length >= collapsedPrimaryFilterTagCount || coveredParts.has(part)) {
      return;
    }

    const partCandidate = rankedTagValues.find((tag) =>
      !priorityTags.includes(tag) && (tagPartMap[tag] || new Set()).has(part),
    );

    if (!partCandidate) {
      return;
    }

    priorityTags.push(partCandidate);

    (tagPartMap[partCandidate] || []).forEach((tagPart) => {
      coveredParts.add(tagPart);
    });
  });

  rankedTagValues.forEach((tag) => {
    if (priorityTags.length >= collapsedPrimaryFilterTagCount || priorityTags.includes(tag)) {
      return;
    }

    priorityTags.push(tag);
  });

  return priorityTags;
}

function compareFilterTagPriority(left, right, localTagCounts, globalTagCounts) {
  const canonicalDelta = getTopicPriorityWeight(right) - getTopicPriorityWeight(left);

  if (canonicalDelta !== 0) {
    return canonicalDelta;
  }

  const localDelta = (localTagCounts[right] || 0) - (localTagCounts[left] || 0);

  if (localDelta !== 0) {
    return localDelta;
  }

  const globalDelta = (globalTagCounts[right] || 0) - (globalTagCounts[left] || 0);

  if (globalDelta !== 0) {
    return globalDelta;
  }

  return sortTagValues(left, right);
}

function getTopicPriorityWeight(tag) {
  return topicPriorityWeightMap[tag] || 0;
}

function createFilterTagGroupMarkup(title, description, tags, { secondary = false } = {}) {
  return `
    <section class="filter-tag-group${secondary ? " filter-tag-group-secondary" : ""}">
      <div class="filter-tag-group-header">
        <span class="filter-tag-group-title">${escapeHtml(title)}</span>
        <span class="filter-tag-group-copy">${escapeHtml(description)}</span>
      </div>
      <div class="filter-tag-cluster">
        ${tags.map((tag) => createFilterTagButtonMarkup(tag, { secondary })).join("")}
      </div>
    </section>
  `;
}

function createFilterTagButtonMarkup(tag, { secondary = false } = {}) {
  const isPressed = libraryState.filters.tags.has(tag);
  const toneClass = secondary ? "brand-tag--soft" : "brand-tag--outline";

  return `
    <button
      type="button"
      class="brand-tag ${toneClass} filter-tag${secondary ? " filter-tag-secondary" : " filter-tag-priority"}"
      data-tag="${escapeHtml(tag)}"
      aria-pressed="${isPressed ? "true" : "false"}"
    >
      <span class="filter-tag-label">${escapeHtml(getTagDisplayLabel(tag))}</span>
    </button>
  `;
}

function updateFilterCopy(stageAndPartDocuments, tagValues, tagGroups) {
  if (filterHelper) {
    filterHelper.textContent =
      "Stage and Part set the pool first. Topics & Skills now shows the strongest entry points for that subset.";
  }

  if (filterTopicSummary) {
    const selectedCount = libraryState.filters.tags.size;
    const stageAndPartDocumentLabel = `${stageAndPartDocuments.length} document${stageAndPartDocuments.length === 1 ? "" : "s"}`;
    const priorityCount =
      tagGroups.groups.find(({ title }) => title === "Best first cuts")?.tags.length || 0;

    filterTopicSummary.textContent = selectedCount > 0
      ? `${selectedCount} topic${selectedCount === 1 ? "" : "s"} selected. Results are narrowed inside ${stageAndPartDocumentLabel}.`
      : tagGroups.hiddenCount > 0
        ? `Showing ${priorityCount} priority topic${priorityCount === 1 ? "" : "s"} first from ${stageAndPartDocumentLabel}. Expand to reveal ${tagGroups.hiddenCount} more.`
        : `${tagValues.length} topic${tagValues.length === 1 ? "" : "s"} available in this Stage + Part view.`;
  }

  if (filterTopicCount) {
    const selectedCount = libraryState.filters.tags.size;

    filterTopicCount.hidden = selectedCount === 0;
    filterTopicCount.textContent = selectedCount > 0
      ? `${selectedCount} selected`
      : "";
  }
}

function updatePrimaryFilterState(selectElement) {
  const filterField = selectElement?.closest(".filter-field");

  if (selectElement) {
    selectElement.dataset.active = selectElement.value ? "true" : "false";
  }

  if (!filterField) {
    return;
  }

  filterField.dataset.active = selectElement.value ? "true" : "false";
}

function updateTopicFilterState() {
  const filterField = tagFilterList?.closest(".filter-field");

  if (!filterField) {
    return;
  }

  filterField.dataset.active = libraryState.filters.tags.size > 0 ? "true" : "false";
}

function updateFilterTagToggle(hiddenCount) {
  if (!toggleFilterTagsButton) {
    return;
  }

  const canToggle = libraryState.showAllFilterTags || hiddenCount > 0;

  if (!canToggle) {
    libraryState.showAllFilterTags = false;
  }

  toggleFilterTagsButton.hidden = !canToggle;
  toggleFilterTagsButton.textContent = libraryState.showAllFilterTags
    ? "Show fewer topics"
    : `Show ${hiddenCount} more topic${hiddenCount === 1 ? "" : "s"}`;
  toggleFilterTagsButton.setAttribute(
    "aria-expanded",
    libraryState.showAllFilterTags ? "true" : "false",
  );
}

function matchesActiveFilters(documentItem) {
  const matchesStage =
    !libraryState.filters.stage ||
    String(documentItem.stage || "").trim() === libraryState.filters.stage;
  const matchesPart =
    !libraryState.filters.part ||
    String(documentItem.part || "").trim() === libraryState.filters.part;
  const documentTags = getDocumentUiTags(documentItem);
  const matchesTags =
    libraryState.filters.tags.size === 0 ||
    documentTags.some((tag) => libraryState.filters.tags.has(tag));

  return matchesStage && matchesPart && matchesTags;
}

function hasFiltersApplied() {
  return Boolean(
    libraryState.filters.stage ||
      libraryState.filters.part ||
      libraryState.filters.tags.size > 0,
  );
}

function sortText(left, right) {
  return textCollator.compare(left, right);
}

function sortTagValues(left, right) {
  return sortText(getTagDisplayLabel(left), getTagDisplayLabel(right));
}

function resetFilters() {
  libraryState.filters.stage = "";
  libraryState.filters.part = "";
  libraryState.filters.tags = new Set();
  libraryState.showAllFilterTags = false;
  renderLibrary();
  writeFiltersToUrl();
}

function handleSelectFilters() {
  libraryState.filters.stage = stageFilter ? stageFilter.value : "";
  libraryState.filters.part = partFilter ? partFilter.value : "";
  libraryState.showAllFilterTags = false;
  renderLibrary();
  writeFiltersToUrl();
}

function handleTagFilterClick(event) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const tagButton = target.closest("[data-tag]");

  if (!(tagButton instanceof HTMLElement)) {
    return;
  }

  const { tag } = tagButton.dataset;

  if (!tag) {
    return;
  }

  if (libraryState.filters.tags.has(tag)) {
    libraryState.filters.tags.delete(tag);
  } else {
    libraryState.filters.tags.add(tag);
  }

  renderLibrary();
  writeFiltersToUrl();
}

function handleFilterTagToggle() {
  libraryState.showAllFilterTags = !libraryState.showAllFilterTags;
  renderFilterControls(libraryState.documents);
}

function buildDocumentLinkHref(linkPath) {
  const normalizedLinkPath = typeof linkPath === "string" ? linkPath.trim() : "";

  if (!normalizedLinkPath) {
    return "#";
  }

  try {
    const destination = new URL(normalizedLinkPath, window.location.href);

    if (!isDocumentViewerPath(destination.pathname)) {
      return encodeURI(normalizedLinkPath);
    }

    const currentLibrarySearch = window.location.search.replace(/^\?/, "");

    if (currentLibrarySearch) {
      destination.searchParams.set("from", currentLibrarySearch);
    } else {
      destination.searchParams.delete("from");
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return encodeURI(normalizedLinkPath);
  }
}

function buildLibraryHref({ stage = "", part = "", tags = [] } = {}, hashId = "library-panel") {
  const searchParams = new URLSearchParams();
  const normalizedTags = [...new Set(
    (Array.isArray(tags) ? tags : [tags])
      .map(normalizeUiTag)
      .filter(Boolean),
  )].sort(sortTagValues);

  if (stage) {
    searchParams.set(filterQueryKeys.stage, stage);
  }

  if (part) {
    searchParams.set(filterQueryKeys.part, part);
  }

  if (normalizedTags.length > 0) {
    searchParams.set(filterQueryKeys.tags, normalizedTags.join(","));
  }

  const search = searchParams.toString();
  return `./index.html${search ? `?${search}` : ""}${hashId ? `#${hashId}` : ""}`;
}

function isDocumentViewerPath(pathname) {
  const normalizedPath = String(pathname || "");

  return normalizedPath.endsWith("/document.html") || normalizedPath.endsWith("document.html");
}

function createCardMarkup(documentItem) {
  const resourceCard = createDocumentResourceModel(
    documentItem,
    {
      buildDocumentLinkHref,
      getContentFormatLabel,
      getDocumentDisplayTitle,
      getDocumentUiTags,
      getReadableLabel,
      getSourceKindLabel,
      getTagDisplayLabel,
    },
    {
      eyebrow: "Document",
      tagLimit: cardVisibleTagCount,
    },
  );

  return createResourceCardMarkup(resourceCard, { layout: "library" });
}

function buildSiteHref(relativePath) {
  const normalizedPath = String(relativePath || "").trim();

  if (!normalizedPath) {
    return "#";
  }

  try {
    const destination = new URL(normalizedPath, window.location.href);
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return encodeURI(normalizedPath);
  }
}

function getSourceKindLabel(sourceKind) {
  const normalizedSourceKind = normalizeTagSlug(sourceKind);

  if (sourceKindLabelMap[normalizedSourceKind]) {
    return sourceKindLabelMap[normalizedSourceKind];
  }

  return getReadableLabel(sourceKind || "Unknown source");
}

function getDocumentDisplayTitle(documentItem, { short = false } = {}) {
  if (short && documentItem?.short_title) {
    return String(documentItem.short_title).trim();
  }

  if (documentItem?.display_title) {
    return String(documentItem.display_title).trim();
  }

  return String(documentItem?.title || "Untitled document").trim() || "Untitled document";
}

function getReadableLabel(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue
    .split(/[\s-]+/)
    .map((word) => {
      if (word.toLowerCase() === "ai") {
        return "AI";
      }

      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function getTagDisplayLabel(tag) {
  const normalizedTag = normalizeUiTag(tag);

  if (!normalizedTag) {
    return "";
  }

  if (tagDisplayLabelMap[normalizedTag]) {
    return tagDisplayLabelMap[normalizedTag];
  }

  return normalizedTag
    .split("-")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function getContentFormatLabel(contentFormat) {
  switch (contentFormat) {
    case "html":
      return "Integrated HTML";
    case "markdown":
      return "Integrated Markdown";
    case "pdf":
      return "PDF";
    default:
      return "Document";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function initializeHomepageSearch() {
  const searchForm = document.getElementById("homepage-search-form");
  const searchInputElement = homepageSearchInput();

  if (!searchForm || !searchInputElement) {
    return;
  }

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = searchInputElement.value.trim();
    const searchMatch = findHomepageSearchMatch(query);

    if (searchMatch?.href) {
      window.location.assign(searchMatch.href);
      return;
    }

    updateHomepageSearchFeedback(
      query
        ? "No direct match found. Jumping to the library instead."
        : "Jumping to the full library.",
    );
    focusLibraryPanel();
  });
}

function findHomepageSearchMatch(query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return {
      href: "#library-panel",
    };
  }

  const exactMatch = homepageState.searchIndex.find((entry) =>
    entry.tokens.some((token) => token === normalizedQuery),
  );

  if (exactMatch) {
    updateHomepageSearchFeedback(`Opening ${exactMatch.value}.`);
    return exactMatch;
  }

  const partialMatches = homepageState.searchIndex.filter((entry) =>
    entry.tokens.some((token) => token.includes(normalizedQuery)),
  );

  if (partialMatches.length === 1) {
    updateHomepageSearchFeedback(`Opening ${partialMatches[0].value}.`);
    return partialMatches[0];
  }

  return null;
}

function normalizeSearchText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w+\s-]/g, " ")
    .replace(/\s+/g, " ");
}

function updateHomepageSearchFeedback(message) {
  const feedbackElement = homepageSearchFeedback();

  if (feedbackElement) {
    feedbackElement.textContent = message;
  }
}

function focusLibraryPanel() {
  if (!libraryPanel) {
    return;
  }

  libraryPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", "#library-panel");
}

if (stageFilter) {
  stageFilter.addEventListener("change", handleSelectFilters);
}

if (partFilter) {
  partFilter.addEventListener("change", handleSelectFilters);
}

if (tagFilterList) {
  tagFilterList.addEventListener("click", handleTagFilterClick);
}

if (toggleFilterTagsButton) {
  toggleFilterTagsButton.addEventListener("click", handleFilterTagToggle);
}

if (resetFiltersButton) {
  resetFiltersButton.addEventListener("click", resetFilters);
}

window.addEventListener("popstate", () => {
  applyFiltersFromUrl({ replaceUrl: true });
});

loadLibrary();
