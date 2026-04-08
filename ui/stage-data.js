import {
  getOverviewStageValue,
  getOverviewTopicLabel,
  getOverviewTypeLabel,
  resourceOrDefault,
  truncateText,
} from "./site-helpers.js";

export function buildStagePageViewModel({
  stage,
  documents,
  curationBundle: _curationBundle,
  helpers,
}) {
  const stageKey = String(stage || "")
    .trim()
    .toUpperCase();
  const stageIdentity = getStageIdentity(stageKey);
  const documentItems = Array.isArray(documents)
    ? documents.filter((item) => item.type === "document")
    : [];
  const stageDocuments = documentItems.filter(
    (item) => String(item.stage || "").trim() === stageKey,
  );
  const overviewItems = stageDocuments.map((documentItem) =>
    createStageOverviewItem(documentItem, helpers),
  );
  const typeCount = new Set(overviewItems.map((item) => item.typeLabel)).size;
  const topicCount = new Set(overviewItems.map((item) => item.topicLabel)).size;

  return {
    header: {
      eyebrow: "Student Site",
      title: "Chemistry Resource Bank",
      homeHref: helpers.buildSiteHref("index.html"),
      navLinks: [
        { href: helpers.buildSiteHref("index.html"), label: "Home" },
        { href: helpers.buildSiteHref("as/"), label: "AS", current: stageKey === "AS" },
        { href: helpers.buildSiteHref("a2/"), label: "A2", current: stageKey === "A2" },
        { href: helpers.buildSiteHref("interactive/"), label: "Interactive" },
      ],
      quickAction: {
        href: helpers.buildLibraryHref({}, "library-panel"),
        label: "Browse full library",
      },
    },
    hero: {
      kicker: "Stage directory",
      pill: `CAIE Chemistry 9701 · ${stageKey}`,
      title: stageIdentity.title,
      copy: stageIdentity.copy,
      stageMark: stageKey,
      snapshotLabel: "Stage snapshot",
      supportingChips: stageIdentity.supportingChips,
      spotlight: {
        label: "Browse flow",
        title: stageIdentity.spotlightTitle,
        copy: stageIdentity.spotlightCopy,
      },
      actions: [
        {
          href: "#stage-overview",
          label: "Overview",
          variant: "primary",
        },
        {
          href: helpers.buildLibraryHref({ stage: stageKey }, "library-panel"),
          label: `Open ${stageKey} library`,
          variant: "secondary",
        },
      ],
      stats: [
        {
          value: `${stageDocuments.length}`,
          label: "documents",
        },
        {
          value: `${typeCount}`,
          label: "types",
        },
        {
          value: `${topicCount}`,
          label: "topics",
        },
      ],
      notes: [
        {
          label: "Page role",
          title: `Browse the ${stageKey} bank by type and topic`,
          copy: stageIdentity.directoryCopy,
        },
        {
          label: "Library path",
          title: `Keep ${stageKey} focused, then widen out when needed`,
          copy: `Use the ${stageKey} page for stage-specific browsing, then open the main library when you want the wider document set.`,
        },
      ],
    },
    overviewSection: {
      kicker: "Overview",
      title: stageIdentity.overviewTitle,
      copy: stageIdentity.overviewCopy,
      items: overviewItems,
    },
    documentsSection: {
      kicker: "Documents",
      title: stageIdentity.documentsTitle,
      copy: stageIdentity.documentsCopy,
      items: overviewItems,
      action: {
        href: helpers.buildLibraryHref({ stage: stageKey }, "library-panel"),
        label: `Browse ${stageKey} library`,
        variant: "secondary",
      },
      emptyTitle: `No ${stageKey} documents match these filters.`,
      emptyCopy: "Try a different type or topic, or open the stage library.",
    },
  };
}

function getStageIdentity(stageKey) {
  if (stageKey === "A2") {
    return {
      title: "A2 Chemistry",
      copy: "Browse the A2 bank by type and topic, then open any document directly.",
      supportingChips: ["Physical", "Organic", "Comparison"],
      spotlightTitle: "Use overview first, then open a document",
      spotlightCopy:
        "Filter the A2 bank by type and topic first, then open the document you need directly from the current stage view.",
      directoryCopy:
        "The A2 page keeps the filters simple and the document set visible at a glance.",
      overviewTitle: "Browse the A2 bank",
      overviewCopy: "Filter the A2 bank by type and topic.",
      documentsTitle: "A2 document set",
      documentsCopy: "Open any A2 document directly from the current filtered set.",
    };
  }

  return {
    title: "AS Chemistry",
    copy: "Browse the AS bank by type and topic, then open any document directly.",
    supportingChips: ["Organic", "Inorganic", "Practical"],
    spotlightTitle: "Use overview first, then open a document",
    spotlightCopy:
      "Filter the AS bank by type and topic first, then open the document you need directly from the current stage view.",
    directoryCopy:
      "The AS page stays focused on overview filters and the full stage document list.",
    overviewTitle: "Browse the AS bank",
    overviewCopy: "Filter the AS bank by type and topic.",
    documentsTitle: "AS document set",
    documentsCopy: "Open any AS document directly from the current filtered set.",
  };
}

function createStageOverviewItem(documentItem, helpers) {
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
