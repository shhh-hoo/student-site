import {
  createDocumentResourceModel,
  createInteractiveResourceModel,
  loadCurationBundle,
  loadInteractiveResources,
} from "./site-data.js";
import {
  getOverviewStageValue,
  getOverviewTopicLabel,
  getOverviewTypeLabel,
  resourceOrDefault,
  truncateText,
} from "./site-helpers.js";

export { createDocumentResourceModel, loadCurationBundle, loadInteractiveResources };

const homepageOverviewPreviewLimit = 6;

export function buildHomepageViewModel(documents, interactiveResources, _curationBundle, helpers) {
  const documentItems = Array.isArray(documents) ? documents.filter(item => item.type === "document") : [];
  const interactiveCount = interactiveResources.length;
  const asCount = documentItems.filter(item => String(item.stage || "").trim() === "AS").length;
  const a2Count = documentItems.filter(item => String(item.stage || "").trim() === "A2").length;
  const overviewItems = [
    ...documentItems.map(documentItem => createHomepageOverviewItem(documentItem, helpers)),
    ...interactiveResources.map(interactiveResource => createHomepageInteractiveOverviewItem(interactiveResource)),
  ].filter(Boolean);

  return {
    header: {
      eyebrow: "Student Site",
      title: "Chemistry Resource Bank",
      homeHref: helpers.buildSiteHref("index.html"),
      navLinks: [
        { href: helpers.buildSiteHref("index.html"), label: "Home", current: true },
        { href: helpers.buildSiteHref("as/"), label: "AS" },
        { href: helpers.buildSiteHref("a2/"), label: "A2" },
        { href: helpers.buildSiteHref("interactive/"), label: "Interactive" },
      ],
      quickAction: {
        href: "#library-panel",
        label: "Browse full library",
      },
    },
    hero: {
      kicker: "Entry page",
      pill: "CAIE Chemistry 9701",
      title: "Open AS, A2, interactive practice, or the full chemistry library.",
      copy: "Start here, then move into AS, A2, interactive practice, or the full library with the same shared navigation and browse flow.",
      panelKicker: "Site snapshot",
      actions: [
        {
          href: helpers.buildSiteHref("as/"),
          label: "Open AS",
          variant: "primary",
        },
        {
          href: helpers.buildSiteHref("a2/"),
          label: "Open A2",
          variant: "secondary",
        },
      ],
      stats: [
        {
          value: `${documentItems.length}`,
          label: `document${documentItems.length === 1 ? "" : "s"}`,
        },
        {
          value: "2",
          label: "stage pages",
        },
        {
          value: `${interactiveCount}`,
          label: `interactive tool${interactiveCount === 1 ? "" : "s"}`,
        },
      ],
      notes: [
        {
          label: "Page role",
          title: "Home stays light so the other pages can stay focused",
          copy: "Use Home as the entry page, then move into AS, A2, interactive, or the full library when you want a more specific browse view.",
        },
        {
          label: "Browse flow",
          title: "Use overview for a quick scan, then open the full library",
          copy: "The overview below works like a directory. Open the library when you want the full document set and filters in one place.",
        },
      ],
    },
    entrySection: {
      kicker: "Directory",
      title: "Open a page",
      copy: "Choose the page you want, then browse from there.",
      cards: [
        {
          eyebrow: "Stage page",
          title: "AS",
          countLabel: `${asCount} document${asCount === 1 ? "" : "s"}`,
          description: "Browse the AS bank by type and topic.",
          href: helpers.buildSiteHref("as/"),
          ctaLabel: "Open AS",
          chips: ["AS"],
        },
        {
          eyebrow: "Stage page",
          title: "A2",
          countLabel: `${a2Count} document${a2Count === 1 ? "" : "s"}`,
          description: "Browse the A2 bank by type and topic.",
          href: helpers.buildSiteHref("a2/"),
          ctaLabel: "Open A2",
          chips: ["A2"],
        },
        {
          eyebrow: "Interactive",
          title: "Interactive",
          countLabel: `${interactiveCount} tool${interactiveCount === 1 ? "" : "s"}`,
          description: "Keep short practice and trainers together on the interactive hub.",
          href: helpers.buildSiteHref("interactive/"),
          ctaLabel: "Open interactive",
          chips: ["Practice"],
        },
        {
          eyebrow: "Browse page",
          title: "Library",
          countLabel: `${documentItems.length} document${documentItems.length === 1 ? "" : "s"}`,
          description: "Open the full document set and use the main browse controls.",
          href: "#library-panel",
          ctaLabel: "Open library",
          chips: ["All"],
        },
      ],
    },
    overviewSection: {
      kicker: "Overview",
      title: "Browse by type and topic",
      copy: "Filter the bank by resource type, chemistry topic, and stage.",
      items: overviewItems,
      previewLimit: homepageOverviewPreviewLimit,
      emptyTitle: "No resources match these filters.",
      emptyCopy: "Try a different type, topic, or stage, or open the full library below.",
      action: {
        href: "#library-panel",
        label: "Open full library",
        variant: "secondary",
      },
    },
    interactiveSection: buildInteractiveSection(interactiveResources, helpers),
    searchIndex: [],
  };
}

function buildInteractiveSection(interactiveResources, helpers) {
  const resources = interactiveResources.map(interactiveResource =>
    createInteractiveResourceModel(interactiveResource, helpers, {
      eyebrow: "Practice tool",
      title: resourceOrDefault(interactiveResource.display_title, interactiveResource.title || "Interactive practice"),
      ctaLabel: "Open tool",
      description: truncateText(
        resourceOrDefault(
          interactiveResource.description,
          "Open quick drills and return to the document bank when you need fuller notes."
        ),
        120
      ),
      tagLimit: 4,
      note: "Use this for short drills rather than as the main navigation path.",
    })
  );

  return {
    kicker: "Interactive",
    title: "Choose a drill from the interactive hub",
    copy: "Interactive tools stay on their own page so the document bank can stay calm and browseable.",
    resources,
    action: {
      href: helpers.buildSiteHref("interactive/"),
      label: "Open hub",
      variant: "secondary",
    },
  };
}

function createHomepageOverviewItem(documentItem, helpers) {
  const linkPath = documentItem.view_path || documentItem.public_file_path;

  return {
    id: documentItem.document_id,
    kind: "document",
    eyebrow: "Document",
    title: helpers.getDocumentDisplayTitle(documentItem, {
      short: true,
    }),
    description: truncateText(resourceOrDefault(documentItem.description, "No description provided."), 112),
    href: helpers.buildDocumentLinkHref(linkPath),
    ctaLabel: "Open",
    typeLabel: getOverviewTypeLabel(documentItem),
    topicLabel: getOverviewTopicLabel(documentItem),
    stageValue: getOverviewStageValue(documentItem.stage),
  };
}

function createHomepageInteractiveOverviewItem(resource) {
  return {
    id: resource.asset_id || resource.href || "interactive-resource",
    kind: "interactive",
    eyebrow: "Interactive",
    title: resource.display_title || resource.title || "Interactive practice",
    description: truncateText(
      resourceOrDefault(resource.description, "Short interactive practice for quick chemistry checks."),
      112
    ),
    href: resource.href,
    ctaLabel: "Open",
    typeLabel: getOverviewTypeLabel(resource),
    topicLabel: getOverviewTopicLabel(resource),
    stageValue: getOverviewStageValue(resource.stage),
  };
}
