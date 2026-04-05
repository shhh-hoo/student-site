function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function joinClasses(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

export function createTagMarkup({ label, tone = "neutral", href = "" }) {
  const className = joinClasses("brand-tag", `brand-tag--${tone}`, href && "brand-tag--link");

  if (href) {
    return `<a class="${className}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  }

  return `<span class="${className}">${escapeHtml(label)}</span>`;
}

export function createCTAButtonMarkup({
  href,
  label,
  variant = "primary",
  compact = false,
}) {
  return `
    <a
      class="${joinClasses("cta-button", `cta-button--${variant}`, compact && "cta-button--compact")}"
      href="${escapeHtml(href)}"
    >
      ${escapeHtml(label)}
    </a>
  `;
}

export function createSectionTitleMarkup({ kicker, title, copy, id }) {
  return `
    <div class="section-title">
      ${kicker ? `<p class="section-title__kicker">${escapeHtml(kicker)}</p>` : ""}
      <h2${id ? ` id="${escapeHtml(id)}"` : ""}>${escapeHtml(title)}</h2>
      ${copy ? `<p class="section-title__copy">${escapeHtml(copy)}</p>` : ""}
    </div>
  `;
}

export function createSearchBarMarkup(search) {
  const suggestionsMarkup = (search.suggestions || [])
    .map(
      (suggestion) => `
        <option
          value="${escapeHtml(suggestion.value)}"
          label="${escapeHtml(suggestion.hint || "")}"
        ></option>
      `,
    )
    .join("");
  const quickTagsMarkup = (search.quickLinks || [])
    .map((quickLink) => createTagMarkup({ label: quickLink.label, tone: "search", href: quickLink.href }))
    .join("");

  return `
    <form id="homepage-search-form" class="search-bar" novalidate>
      <div class="search-bar__header">
        <label class="search-bar__label" for="homepage-search-input">
          ${escapeHtml(search.label)}
        </label>
        <span class="search-bar__stamp">Search entry</span>
      </div>
      <div class="search-bar__controls">
        <input
          id="homepage-search-input"
          class="search-bar__input"
          name="query"
          list="homepage-search-suggestions"
          autocomplete="off"
          placeholder="${escapeHtml(search.placeholder)}"
        />
        <datalist id="homepage-search-suggestions">${suggestionsMarkup}</datalist>
        <button class="cta-button cta-button--primary search-bar__submit" type="submit">
          ${escapeHtml(search.submitLabel)}
        </button>
        <a class="cta-button cta-button--secondary" href="${escapeHtml(search.browseHref)}">
          ${escapeHtml(search.browseLabel)}
        </a>
      </div>
      ${search.helper ? `<p class="search-bar__helper">${escapeHtml(search.helper)}</p>` : ""}
      ${quickTagsMarkup ? `<div class="search-bar__quick-links">${quickTagsMarkup}</div>` : ""}
      <p id="homepage-search-feedback" class="search-bar__feedback" aria-live="polite"></p>
    </form>
  `;
}

export function createSiteHeaderMarkup(header) {
  const navMarkup = (header.navLinks || [])
    .map(
      (link) => `
        <a class="site-header__nav-link" href="${escapeHtml(link.href)}">
          ${escapeHtml(link.label)}
        </a>
      `,
    )
    .join("");

  return `
    <div class="site-header">
      <div class="site-header__brand">
        <span class="site-header__mark" aria-hidden="true">J2</span>
        <div>
          <p class="site-header__eyebrow">${escapeHtml(header.eyebrow)}</p>
          <a class="site-header__title" href="${escapeHtml(header.homeHref || "./index.html")}">${escapeHtml(header.title)}</a>
        </div>
      </div>
      <nav class="site-header__nav" aria-label="Primary">
        ${navMarkup}
      </nav>
      <div class="site-header__action">
        ${header.quickAction
          ? createCTAButtonMarkup({
              href: header.quickAction.href,
              label: header.quickAction.label,
              variant: "secondary",
              compact: true,
            })
          : ""}
      </div>
    </div>
  `;
}

export function createHomepageHeroMarkup(hero) {
  const statsMarkup = (hero.stats || [])
    .map(
      (stat) => `
        <article class="hero-stat">
          <strong>${escapeHtml(stat.value)}</strong>
          <span>${escapeHtml(stat.label)}</span>
        </article>
      `,
    )
    .join("");
  const workflowMarkup = (hero.workflow || [])
    .map(
      (item) => `
        <article class="workflow-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.copy)}</p>
        </article>
      `,
    )
    .join("");

  return `
    <section class="homepage-hero" aria-labelledby="homepage-hero-title">
      <div class="homepage-hero__poster">
        <div class="homepage-hero__content">
          <div class="homepage-hero__intro">
            <p class="homepage-hero__kicker">${escapeHtml(hero.kicker)}</p>
            <span class="homepage-hero__pill">${escapeHtml(hero.pill)}</span>
          </div>
          <h1 id="homepage-hero-title">${escapeHtml(hero.title)}</h1>
          <p class="homepage-hero__copy">${escapeHtml(hero.copy)}</p>
          <div class="homepage-hero__actions">
            ${hero.actions
              .map((action) =>
                createCTAButtonMarkup({
                  href: action.href,
                  label: action.label,
                  variant: action.variant,
                }),
              )
              .join("")}
          </div>
        </div>
      </div>
      <div class="homepage-hero__support">
        <div class="homepage-hero__panel homepage-hero__panel--search">
          ${createSearchBarMarkup(hero.search)}
        </div>
        <div class="homepage-hero__stack" aria-label="Study options overview">
          <div class="homepage-hero__panel homepage-hero__panel--stats">
            <p class="homepage-hero__panel-kicker">${escapeHtml(hero.panelKicker)}</p>
            <div class="homepage-hero__stats">${statsMarkup}</div>
          </div>
          <div class="homepage-hero__workflow">${workflowMarkup}</div>
        </div>
      </div>
    </section>
  `;
}

export function createFeatureCardMarkup(card, { layout = "standard" } = {}) {
  return `
    <article
      class="${joinClasses(
        "feature-card",
        `feature-card--${card.tone || "teal"}`,
        `feature-card--${layout}`,
        card.kind && `feature-card--route-${card.kind}`,
      )}"
    >
      <div class="feature-card__topline">
        <span class="feature-card__eyebrow">${escapeHtml(card.eyebrow)}</span>
        <span class="feature-card__count">${escapeHtml(card.countLabel)}</span>
      </div>
      <h3>${escapeHtml(card.title)}</h3>
      <p class="feature-card__copy">${escapeHtml(card.description)}</p>
      <div class="feature-card__chips">
        ${(card.chips || []).map((chip) => createTagMarkup({ label: chip, tone: "outline" })).join("")}
      </div>
      ${(card.supportingTags || []).length > 0
        ? `
          <div class="feature-card__supporting">
            ${(card.supportingTags || [])
              .map((tag) => createTagMarkup({ label: tag, tone: "soft" }))
              .join("")}
          </div>
        `
        : ""}
      <div class="feature-card__footer">
        ${createCTAButtonMarkup({
          href: card.href,
          label: card.ctaLabel,
          variant: card.ctaVariant || "primary",
          compact: true,
        })}
      </div>
    </article>
  `;
}

export function createResourceCardMarkup(resource, { layout = "standard" } = {}) {
  const metaMarkup = createResourceMetaMarkup(resource, layout);

  return `
    <article
      class="${joinClasses(
        "resource-card",
        `resource-card--${resource.kind || "document"}`,
        `resource-card--${layout}`,
      )}"
    >
      <div class="resource-card__header">
        <div>
          <p class="resource-card__eyebrow">${escapeHtml(resource.eyebrow)}</p>
          <h3>${escapeHtml(resource.title)}</h3>
        </div>
        ${resource.status
          ? `<span class="resource-card__status">${escapeHtml(resource.status)}</span>`
          : ""}
      </div>
      <p class="resource-card__description">${escapeHtml(resource.description)}</p>
      ${(resource.chips || []).length > 0
        ? `
          <div class="resource-card__chips">
            ${(resource.chips || []).map((chip) => createTagMarkup({ label: chip, tone: "outline" })).join("")}
          </div>
        `
        : ""}
      ${(resource.tags || []).length > 0
        ? `
          <div class="resource-card__tags">
            ${(resource.tags || []).map((tag) => createTagMarkup({ label: tag, tone: "soft" })).join("")}
          </div>
        `
        : ""}
      ${resource.note ? `<p class="resource-card__note">${escapeHtml(resource.note)}</p>` : ""}
      <div class="resource-card__footer">
        ${metaMarkup}
        ${createCTAButtonMarkup({
          href: resource.href,
          label: resource.ctaLabel,
          variant: resource.kind === "interactive" ? "interactive" : "primary",
          compact: true,
        })}
      </div>
    </article>
  `;
}

function createResourceMetaMarkup(resource, layout) {
  const metaItems = getResourceMetaItems(resource, layout);

  if (metaItems.length === 0) {
    return "";
  }

  if (metaItems.length === 1) {
    return `<span class="resource-card__meta">${escapeHtml(metaItems[0])}</span>`;
  }

  return `
    <div class="resource-card__meta-list">
      ${metaItems
        .map((metaItem) => `<span class="resource-card__meta">${escapeHtml(metaItem)}</span>`)
        .join("")}
    </div>
  `;
}

function getResourceMetaItems(resource, layout) {
  if (Array.isArray(resource.metaItems)) {
    return resource.metaItems.filter(Boolean);
  }

  const metaLine = typeof resource.metaLine === "string" ? resource.metaLine.trim() : "";

  if (!metaLine) {
    return [];
  }

  if (
    layout.startsWith("stage-") &&
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 760px)").matches &&
    metaLine.includes(" · ")
  ) {
    return metaLine.split(/\s+·\s+/).map((item) => item.trim()).filter(Boolean);
  }

  return [metaLine];
}

export function createRoutesSectionMarkup(section) {
  const cardCount = Array.isArray(section.cards) ? section.cards.length : 0;
  const cardsMarkup = (section.cards || [])
    .map((card, index, cards) => {
      const layout =
        index === 0 ? "lead" : index === cards.length - 1 && cards.length > 3 ? "wide" : "standard";

      return createFeatureCardMarkup(card, { layout });
    })
    .join("");

  return `
    <section
      class="homepage-section homepage-section--routes"
      id="study-routes"
      aria-labelledby="study-routes-heading"
    >
      ${createSectionTitleMarkup({
        kicker: section.kicker,
        title: section.title,
        copy: section.copy,
        id: "study-routes-heading",
      })}
      <div class="${joinClasses("feature-grid", "feature-grid--routes", `feature-grid--count-${cardCount}`)}">
        ${cardsMarkup}
      </div>
    </section>
  `;
}

export function createFeaturedResourcesMarkup(section) {
  const resources = Array.isArray(section.resources) ? section.resources : [];
  const leadResource = resources[0] || null;
  const secondaryResources = resources.slice(1);

  return `
    <section
      class="homepage-section homepage-section--featured"
      id="featured-resources"
      aria-labelledby="featured-resources-heading"
    >
      <div class="homepage-section__header homepage-section__header--split">
        ${createSectionTitleMarkup({
          kicker: section.kicker,
          title: section.title,
          copy: section.copy,
          id: "featured-resources-heading",
        })}
        ${section.action
          ? createCTAButtonMarkup({
              href: section.action.href,
              label: section.action.label,
              variant: section.action.variant || "secondary",
              compact: true,
            })
          : ""}
      </div>
      <div class="featured-showcase">
        ${leadResource ? createResourceCardMarkup(leadResource, { layout: "featured-lead" }) : ""}
        ${secondaryResources.length > 0
          ? `
            <div class="featured-showcase__stack-wrap">
              <p class="featured-showcase__stack-label">Also in the set</p>
              <div class="featured-showcase__stack">
                ${secondaryResources
                  .map((resource) => createResourceCardMarkup(resource, { layout: "featured-stack" }))
                  .join("")}
              </div>
            </div>
          `
          : ""}
      </div>
      ${section.footerNote
        ? `
          <article class="featured-note">
            <span>${escapeHtml(section.footerNote.label)}</span>
            <strong>${escapeHtml(section.footerNote.title)}</strong>
            <p>${escapeHtml(section.footerNote.copy)}</p>
          </article>
        `
        : ""}
    </section>
  `;
}

export function createInteractiveSectionMarkup(section) {
  if (!section.resource) {
    return `
      <section class="homepage-section homepage-section--interactive" id="interactive-lab">
        ${createSectionTitleMarkup({
          kicker: section.kicker,
          title: section.title,
          copy: section.copy,
          id: "interactive-heading",
        })}
      </section>
    `;
  }

  const supportNotesMarkup = (section.supportNotes || [])
    .map(
      (note) => `
        <article class="interactive-note interactive-note--support">
          <span>${escapeHtml(note.label)}</span>
          <strong>${escapeHtml(note.title)}</strong>
          <p>${escapeHtml(note.copy)}</p>
        </article>
      `,
    )
    .join("");

  return `
    <section
      class="homepage-section homepage-section--interactive"
      id="interactive-lab"
      aria-labelledby="interactive-heading"
    >
      <div class="homepage-section__header homepage-section__header--split">
        ${createSectionTitleMarkup({
          kicker: section.kicker,
          title: section.title,
          copy: section.copy,
          id: "interactive-heading",
        })}
        ${section.badge
          ? `<span class="homepage-section__badge">${escapeHtml(section.badge)}</span>`
          : ""}
      </div>
      <div class="interactive-shell">
        <div class="interactive-shell__spotlight">
          ${createResourceCardMarkup(section.resource, { layout: "spotlight" })}
        </div>
        <div class="interactive-shell__notes">
          ${section.noteCard
            ? `
              <article class="interactive-note interactive-note--emphasis">
                <span>${escapeHtml(section.noteCard.label)}</span>
                <strong>${escapeHtml(section.noteCard.title)}</strong>
                <p>${escapeHtml(section.noteCard.copy)}</p>
              </article>
            `
            : ""}
          ${supportNotesMarkup}
        </div>
      </div>
    </section>
  `;
}
