const libraryGrid = document.getElementById("library-grid");
const libraryStatus = document.getElementById("library-status");
const libraryFilters = document.getElementById("library-filters");
const stageFilter = document.getElementById("filter-stage");
const partFilter = document.getElementById("filter-part");
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

const filterQueryKeys = {
  stage: "stage",
  part: "part",
  tags: "tags",
};

const collapsedFilterTagCount = 10;
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
  try {
    const response = await fetch("./public/data/library.json", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Library request failed with status ${response.status}.`);
    }

    const documents = await response.json();
    libraryState.documents = Array.isArray(documents) ? documents : [];
    applyFiltersFromUrl({ replaceUrl: true });
  } catch (error) {
    libraryStatus.textContent = "Could not load library data.";
    libraryGrid.setAttribute("aria-busy", "false");

    if (libraryFilters) {
      libraryFilters.hidden = true;
    }

    libraryGrid.innerHTML = `
      <article class="empty-state">
        <strong>Library unavailable.</strong>
        <p>${escapeHtml(error.message)}</p>
      </article>
    `;
  }
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
      <article class="empty-state">
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
      <article class="empty-state">
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
  const tagValues = getUniqueTagValues(documents);

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

  libraryState.filters.tags = new Set(
    [...libraryState.filters.tags].filter((tag) => tagValues.includes(tag)),
  );

  const visibleTagValues = getVisibleFilterTags(tagValues);

  tagFilterList.innerHTML =
    visibleTagValues.length > 0
      ? visibleTagValues
          .map((tag) => {
            const isPressed = libraryState.filters.tags.has(tag);

            return `
              <button
                type="button"
                class="filter-tag"
                data-tag="${escapeHtml(tag)}"
                aria-pressed="${isPressed ? "true" : "false"}"
              >
                ${escapeHtml(getTagDisplayLabel(tag))}
              </button>
            `;
          })
          .join("")
      : '<span class="tag">No topics or skills available</span>';

  updateFilterTagToggle(tagValues, visibleTagValues);
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

function getDocumentUiTags(documentItem) {
  const tags = Array.isArray(documentItem.tags) ? documentItem.tags : [];

  return [...new Set(tags.map(normalizeUiTag).filter(Boolean))].sort(sortTagValues);
}

function getVisibleFilterTags(tagValues) {
  if (libraryState.showAllFilterTags || tagValues.length <= collapsedFilterTagCount) {
    return tagValues;
  }

  return tagValues.filter((tag, index) =>
    index < collapsedFilterTagCount || libraryState.filters.tags.has(tag),
  );
}

function updateFilterTagToggle(tagValues, visibleTagValues) {
  if (!toggleFilterTagsButton) {
    return;
  }

  const canToggle =
    libraryState.showAllFilterTags || visibleTagValues.length < tagValues.length;

  toggleFilterTagsButton.hidden = !canToggle;
  toggleFilterTagsButton.textContent = libraryState.showAllFilterTags
    ? "Show fewer topics"
    : "Show more topics";
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

function isDocumentViewerPath(pathname) {
  const normalizedPath = String(pathname || "");

  return normalizedPath.endsWith("/document.html") || normalizedPath.endsWith("document.html");
}

function createCardMarkup(documentItem) {
  const documentTags = getDocumentUiTags(documentItem);
  const visibleTags = documentTags.slice(0, cardVisibleTagCount);
  const hiddenTagCount = Math.max(0, documentTags.length - visibleTags.length);
  const structureChips = [
    documentItem.stage ? `<span class="structure-chip">${escapeHtml(documentItem.stage)}</span>` : "",
    documentItem.part ? `<span class="structure-chip">${escapeHtml(documentItem.part)}</span>` : "",
  ].filter(Boolean);
  const description = documentItem.description || "No description provided.";
  const sourceKind = getSourceKindLabel(documentItem.source_kind);
  const status = getReadableLabel(documentItem.status || "ready");
  const linkPath = documentItem.view_path || documentItem.public_file_path;
  const documentLinkHref = buildDocumentLinkHref(linkPath);
  const contentFormat = getContentFormatLabel(documentItem.content_format);

  return `
    <article class="card">
      <div class="card-header">
        <div>
          <p class="card-kicker">Synced document</p>
          <h3>${escapeHtml(documentItem.title || "Untitled document")}</h3>
        </div>
        <span class="status-badge">${escapeHtml(status)}</span>
      </div>
      ${structureChips.length > 0 ? `
      <div class="structure-chip-list">
        ${structureChips.join("")}
      </div>` : ""}
      ${visibleTags.length > 0 ? `
      <div class="tag-list">
        ${visibleTags.map((tag) => `<span class="tag">${escapeHtml(getTagDisplayLabel(tag))}</span>`).join("")}
        ${hiddenTagCount > 0 ? `<span class="tag tag-more">+${hiddenTagCount} more</span>` : ""}
      </div>` : ""}
      <p class="description">${escapeHtml(description)}</p>
      <div class="card-footer">
        <span class="source-kind">${escapeHtml(sourceKind)} · ${escapeHtml(contentFormat)}</span>
        <a class="doc-link" href="${escapeHtml(documentLinkHref)}">Open document</a>
      </div>
    </article>
  `;
}

function getSourceKindLabel(sourceKind) {
  const normalizedSourceKind = normalizeTagSlug(sourceKind);

  if (sourceKindLabelMap[normalizedSourceKind]) {
    return sourceKindLabelMap[normalizedSourceKind];
  }

  return getReadableLabel(sourceKind || "Unknown source");
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
