import { createSiteHeaderMarkup } from "./ui/homepage-components.js";
import {
  createStageDocumentsMarkup,
  createStageHeroMarkup,
  createStageOverviewMarkup,
} from "./ui/stage-components.js";
import { buildStagePageViewModel } from "./ui/stage-data.js";
import { fetchLibraryDocuments, loadCurationBundle } from "./ui/site-data.js";
import {
  buildDocumentLinkHref,
  buildLibraryHref,
  buildOverviewFilterGroups,
  buildSiteHref,
  filterOverviewItems,
  getContentFormatLabel,
  getDocumentDisplayTitle,
  getDocumentUiTags,
  getReadableLabel,
  getSourceKindLabel,
  getTagDisplayLabel,
} from "./ui/site-helpers.js";

const siteHeaderRoot = document.getElementById("site-header-root");
const stageHeroRoot = document.getElementById("stage-hero-root");
const stageOverviewRoot = document.getElementById("stage-overview-root");
const stageDocumentsRoot = document.getElementById("stage-documents-root");

const stageKey = String(document.body.dataset.stage || "")
  .trim()
  .toUpperCase();
const sitePrefix = document.body.dataset.sitePrefix || "./";
const stagePageState = {
  filters: {
    type: "",
    topic: "",
    stage: "",
  },
  viewModel: null,
};

function getStageReturnSearch() {
  const searchParams = new URLSearchParams();

  if (stageKey) {
    searchParams.set("stage", stageKey);
  }

  return searchParams.toString();
}

function createStageHelpers() {
  return {
    buildDocumentLinkHref: (linkPath) =>
      buildDocumentLinkHref(linkPath, {
        sitePrefix,
        returnSearch: getStageReturnSearch(),
      }),
    buildLibraryHref: (filters, hashId = "library-panel") =>
      buildLibraryHref(filters, {
        sitePrefix,
        hashId,
      }),
    buildSiteHref: (relativePath) => buildSiteHref(relativePath, sitePrefix),
    getContentFormatLabel,
    getDocumentDisplayTitle,
    getDocumentUiTags,
    getReadableLabel,
    getSourceKindLabel,
    getTagDisplayLabel,
  };
}

function renderErrorState(message) {
  const errorMarkup = `
    <section class="stage-section">
      <article class="stage-handoff stage-handoff--error">
        <div>
          <p class="stage-handoff__kicker">Stage page unavailable</p>
          <h2>Could not load this stage page.</h2>
          <p class="stage-handoff__copy">${escapeHtml(message)}</p>
        </div>
      </article>
    </section>
  `;

  if (stageHeroRoot) {
    stageHeroRoot.innerHTML = errorMarkup;
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

function renderStageOverview() {
  if (!stageOverviewRoot || !stagePageState.viewModel) {
    return;
  }

  const overviewSection = stagePageState.viewModel.overviewSection;
  const allItems = overviewSection.items || [];
  const filteredItems = filterOverviewItems(allItems, stagePageState.filters);

  stageOverviewRoot.innerHTML = createStageOverviewMarkup({
    ...overviewSection,
    filterGroups: buildOverviewFilterGroups(allItems, stagePageState.filters),
    summary: {
      label: "Directory",
      copy:
        filteredItems.length === allItems.length
          ? `Showing the full ${stageKey} bank. Use type and topic filters to narrow the page.`
          : `Showing ${filteredItems.length} of ${allItems.length} ${allItems.length === 1 ? "document" : "documents"} in the ${stageKey} bank.`,
      countLabel: `${filteredItems.length} match${filteredItems.length === 1 ? "" : "es"}`,
    },
  });
}

function renderStageDocuments() {
  if (!stageDocumentsRoot || !stagePageState.viewModel) {
    return;
  }

  const documentsSection = stagePageState.viewModel.documentsSection;
  const allItems = documentsSection.items || [];
  const filteredItems = filterOverviewItems(allItems, stagePageState.filters);

  stageDocumentsRoot.innerHTML = createStageDocumentsMarkup({
    ...documentsSection,
    results: filteredItems,
    summary: {
      label: "Current results",
      copy:
        filteredItems.length === allItems.length
          ? `Open any ${stageKey} document directly from this page.`
          : `Filtered to ${filteredItems.length} of ${allItems.length} ${allItems.length === 1 ? "document" : "documents"}.`,
      countLabel: `${filteredItems.length} document${filteredItems.length === 1 ? "" : "s"}`,
    },
  });
}

function renderStagePage() {
  if (!stagePageState.viewModel) {
    return;
  }

  document.title = `${stagePageState.viewModel.hero.title} | Student Site`;

  if (siteHeaderRoot) {
    siteHeaderRoot.innerHTML = createSiteHeaderMarkup(stagePageState.viewModel.header);
  }

  if (stageHeroRoot) {
    stageHeroRoot.innerHTML = createStageHeroMarkup(stagePageState.viewModel.hero);
  }

  renderStageOverview();
  renderStageDocuments();
}

function initializeStageOverviewFilters() {
  if (!stageOverviewRoot || stageOverviewRoot.dataset.initialized === "true") {
    return;
  }

  stageOverviewRoot.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-filter-key]");

    if (!filterButton) {
      return;
    }

    const filterKey = filterButton.dataset.filterKey;

    if (!filterKey || !(filterKey in stagePageState.filters)) {
      return;
    }

    stagePageState.filters[filterKey] = filterButton.dataset.filterValue || "";
    renderStageOverview();
    renderStageDocuments();
  });

  stageOverviewRoot.dataset.initialized = "true";
}

async function initStagePage() {
  if (!stageKey) {
    renderErrorState("No stage was provided for this page.");
    return;
  }

  try {
    const [documents, curationBundle] = await Promise.all([
      fetchLibraryDocuments(sitePrefix),
      loadCurationBundle(sitePrefix),
    ]);
    const helpers = createStageHelpers();

    stagePageState.viewModel = buildStagePageViewModel({
      stage: stageKey,
      documents,
      curationBundle,
      helpers,
    });

    renderStagePage();
    initializeStageOverviewFilters();
  } catch (error) {
    renderErrorState(error.message);
  }
}

initStagePage();
