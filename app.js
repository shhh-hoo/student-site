const libraryGrid = document.getElementById("library-grid");
const libraryStatus = document.getElementById("library-status");
const libraryFilters = document.getElementById("library-filters");
const stageFilter = document.getElementById("filter-stage");
const partFilter = document.getElementById("filter-part");
const tagFilterList = document.getElementById("filter-tags");
const resetFiltersButton = document.getElementById("reset-filters");
const libraryState = {
  documents: [],
  filters: {
    stage: "",
    part: "",
    tags: new Set(),
  },
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
    renderLibrary();
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
        <p>Try adjusting or resetting the stage, part, or tag filters.</p>
      </article>
    `;
    return;
  }

  libraryGrid.innerHTML = filteredDocuments.map(createCardMarkup).join("");
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

  tagFilterList.innerHTML =
    tagValues.length > 0
      ? tagValues
          .map((tag) => {
            const isPressed = libraryState.filters.tags.has(tag);

            return `
              <button
                type="button"
                class="filter-tag"
                data-tag="${escapeHtml(tag)}"
                aria-pressed="${isPressed ? "true" : "false"}"
              >
                ${escapeHtml(tag)}
              </button>
            `;
          })
          .join("")
      : '<span class="tag">No tags available</span>';

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
    documents.flatMap((documentItem) =>
      Array.isArray(documentItem.tags)
        ? documentItem.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
        : [],
    ),
  )].sort(sortText);
}

function matchesActiveFilters(documentItem) {
  const matchesStage =
    !libraryState.filters.stage ||
    String(documentItem.stage || "").trim() === libraryState.filters.stage;
  const matchesPart =
    !libraryState.filters.part ||
    String(documentItem.part || "").trim() === libraryState.filters.part;
  const documentTags = Array.isArray(documentItem.tags) ? documentItem.tags : [];
  const matchesTags =
    libraryState.filters.tags.size === 0 ||
    documentTags.some((tag) => libraryState.filters.tags.has(String(tag || "").trim()));

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

function resetFilters() {
  libraryState.filters.stage = "";
  libraryState.filters.part = "";
  libraryState.filters.tags = new Set();
  renderLibrary();
}

function handleSelectFilters() {
  libraryState.filters.stage = stageFilter ? stageFilter.value : "";
  libraryState.filters.part = partFilter ? partFilter.value : "";
  renderLibrary();
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
}

function createCardMarkup(documentItem) {
  const tags = Array.isArray(documentItem.tags) ? documentItem.tags : [];
  const topic = documentItem.topic || "General";
  const description = documentItem.description || "No description provided.";
  const sourceKind = documentItem.source_kind || "unknown";
  const status = documentItem.status || "unknown";
  const linkPath = documentItem.view_path || documentItem.public_file_path;
  const contentFormat = getContentFormatLabel(documentItem.content_format);

  return `
    <article class="card">
      <div class="card-header">
        <h3>${escapeHtml(documentItem.title || "Untitled document")}</h3>
        <span class="status-badge">${escapeHtml(status)}</span>
      </div>
      <div class="meta-row">
        <span>${escapeHtml(documentItem.subject || "Unknown subject")}</span>
        <span>•</span>
        <span>${escapeHtml(topic)}</span>
      </div>
      <div class="tag-list">
        ${tags.length > 0 ? tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("") : '<span class="tag">untagged</span>'}
      </div>
      <p class="description">${escapeHtml(description)}</p>
      <div class="card-footer">
        <span class="source-kind">${escapeHtml(sourceKind)} · ${escapeHtml(contentFormat)}</span>
        <a class="doc-link" href="${encodeURI(linkPath)}">Open document</a>
      </div>
    </article>
  `;
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

if (resetFiltersButton) {
  resetFiltersButton.addEventListener("click", resetFilters);
}

loadLibrary();
