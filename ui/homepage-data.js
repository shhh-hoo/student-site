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
  const documentItems = Array.isArray(documents)
    ? documents.filter((item) => item.type === "document")
    : [];
  const interactiveResource = interactiveResources[0] || null;
  const asCount = documentItems.filter((item) => String(item.stage || "").trim() === "AS").length;
  const a2Count = documentItems.filter((item) => String(item.stage || "").trim() === "A2").length;
  const overviewItems = [
    ...documentItems.map((documentItem) => createHomepageOverviewItem(documentItem, helpers)),
    interactiveResource ? createHomepageInteractiveOverviewItem(interactiveResource) : null,
  ].filter(Boolean);

  return {
    header: {
      eyebrow: "Student Site",
      title: "Chemistry Resource Bank",
      homeHref: helpers.buildSiteHref("index.html"),
      navLinks: [
        { href: helpers.buildSiteHref("as/"), label: "AS" },
        { href: helpers.buildSiteHref("a2/"), label: "A2" },
        { href: helpers.buildSiteHref("interactive/ir-past-paper-trainer/"), label: "Interactive" },
        { href: "#library-panel", label: "Library" },
      ],
      quickAction: {
        href: "#library-panel",
        label: "Browse library",
      },
    },
    hero: {
      kicker: "Home",
      pill: "CAIE Chemistry 9701",
      title: "Open AS, A2, interactive practice, or the full chemistry library.",
      copy: "Use the homepage as the entry page. AS and A2 stay separate, the interactive tools stay separate, and the library stays available for full browse.",
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
          value: interactiveResource ? "1" : "0",
          label: `interactive tool${interactiveResource ? "" : "s"}`,
        },
      ],
      notes: [
        {
          label: "Structure",
          title: "Separate pages for AS, A2, interactive, and library",
          copy: "Open the page you need first, then use overview filters when you want a faster scan of the bank.",
        },
        {
          label: "Overview",
          title: "Browse by type and topic",
          copy: "The overview below works like a directory, not a curated guide.",
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
          countLabel: interactiveResource ? "1 tool" : "0 tools",
          description: "Keep short practice and trainers on their own page.",
          href:
            interactiveResource?.href ||
            helpers.buildSiteHref("interactive/ir-past-paper-trainer/"),
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
    interactiveSection: buildInteractiveSection(interactiveResource, helpers),
    searchIndex: [],
  };
}

function buildInteractiveSection(interactiveResource, helpers) {
  return {
    kicker: "Interactive",
    title: "Keep quick practice separate",
    copy: "Interactive tools stay on their own page so the document bank can stay calm and browseable.",
    resource: interactiveResource
      ? createInteractiveResourceModel(interactiveResource, helpers, {
          eyebrow: "Practice tool",
          title: resourceOrDefault(
            interactiveResource.display_title,
            interactiveResource.title || "Interactive practice",
          ),
          ctaLabel: "Open interactive",
          description: truncateText(
            resourceOrDefault(
              interactiveResource.description,
              "Open quick drills and return to the document bank when you need fuller notes.",
            ),
            120,
          ),
          chips: ["Practice", "Analytical"],
          tagLimit: 0,
          metaLine: "Interactive tool",
          note: "Use this for short drills rather than as the main navigation path.",
        })
      : null,
    noteCard: interactiveResource
      ? {
          label: "Use it for",
          title: "Short analytical practice",
          copy: "The interactive page stays lightweight and separate from the AS, A2, and library browse flows.",
        }
      : null,
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
    description: truncateText(
      resourceOrDefault(documentItem.description, "No description provided."),
      112,
    ),
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
      resourceOrDefault(
        resource.description,
        "Short interactive practice for quick chemistry checks.",
      ),
      112,
    ),
    href: resource.href,
    ctaLabel: "Open",
    typeLabel: getOverviewTypeLabel(resource),
    topicLabel: getOverviewTopicLabel(resource),
    stageValue: getOverviewStageValue(resource.stage),
  };
}
