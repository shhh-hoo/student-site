import {
  createSiteHeaderMarkup,
} from "./ui/homepage-components.js";
import {
  createStageFeaturedResourcesMarkup,
  createStageFirstCutsMarkup,
  createStageHandoffMarkup,
  createStageHeroMarkup,
  createStageLaunchMarkup,
  createStageRoutesMarkup,
} from "./ui/stage-components.js";
import { buildStagePageViewModel } from "./ui/stage-data.js";
import { fetchLibraryDocuments, loadCurationBundle } from "./ui/site-data.js";
import {
  buildDocumentLinkHref,
  buildLibraryHref,
  buildSiteHref,
  getContentFormatLabel,
  getDocumentDisplayTitle,
  getDocumentUiTags,
  getReadableLabel,
  getSourceKindLabel,
  getTagDisplayLabel,
} from "./ui/site-helpers.js";

const siteHeaderRoot = document.getElementById("site-header-root");
const stageHeroRoot = document.getElementById("stage-hero-root");
const stageFeaturedRoot = document.getElementById("stage-featured-root");
const stageRoutesRoot = document.getElementById("stage-routes-root");
const stageFirstCutsRoot = document.getElementById("stage-first-cuts-root");
const stageLaunchRoot = document.getElementById("stage-launch-root");
const stageHandoffRoot = document.getElementById("stage-handoff-root");

const stageKey = String(document.body.dataset.stage || "").trim().toUpperCase();
const sitePrefix = document.body.dataset.sitePrefix || "./";

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
    const viewModel = buildStagePageViewModel({
      stage: stageKey,
      documents,
      curationBundle,
      helpers,
    });

    document.title = `${viewModel.hero.title} | Student Site`;

    if (siteHeaderRoot) {
      siteHeaderRoot.innerHTML = createSiteHeaderMarkup(viewModel.header);
    }

    if (stageHeroRoot) {
      stageHeroRoot.innerHTML = createStageHeroMarkup(viewModel.hero);
    }

    if (stageFeaturedRoot) {
      stageFeaturedRoot.innerHTML = createStageFeaturedResourcesMarkup(viewModel.featuredSection);
    }

    if (stageRoutesRoot) {
      stageRoutesRoot.innerHTML = createStageRoutesMarkup(viewModel.routesSection);
    }

    if (stageFirstCutsRoot) {
      stageFirstCutsRoot.innerHTML = createStageFirstCutsMarkup(viewModel.firstCutsSection);
    }

    if (stageLaunchRoot) {
      stageLaunchRoot.innerHTML = createStageLaunchMarkup(viewModel.launchSection);
    }

    if (stageHandoffRoot) {
      stageHandoffRoot.innerHTML = createStageHandoffMarkup(viewModel.handoffSection);
    }
  } catch (error) {
    renderErrorState(error.message);
  }
}

initStagePage();
