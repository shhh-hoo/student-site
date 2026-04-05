import {
  createCTAButtonMarkup,
  createResourceCardMarkup,
  createSectionTitleMarkup,
  createTagMarkup,
} from "./homepage-components.js";

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

export function createStageHeroMarkup(hero) {
  const statsMarkup = (hero.stats || [])
    .map(
      (stat) => `
        <article class="stage-stat">
          <strong>${escapeHtml(stat.value)}</strong>
          <span>${escapeHtml(stat.label)}</span>
        </article>
      `,
    )
    .join("");
  const notesMarkup = (hero.notes || [])
    .map(
      (note) => `
        <article class="stage-note">
          <span class="stage-note__label">${escapeHtml(note.label)}</span>
          <strong>${escapeHtml(note.title)}</strong>
          <p>${escapeHtml(note.copy)}</p>
        </article>
      `,
    )
    .join("");
  const chipMarkup = (hero.supportingChips || [])
    .map((chip) => createTagMarkup({ label: chip, tone: "outline" }))
    .join("");

  return `
    <section class="stage-hero" aria-labelledby="stage-hero-title">
      <div class="stage-hero__poster">
        <div class="stage-hero__mark" aria-hidden="true">${escapeHtml(hero.stageMark || "")}</div>
        <div class="stage-hero__intro">
          <p class="stage-hero__kicker">${escapeHtml(hero.kicker)}</p>
          <span class="stage-hero__pill">${escapeHtml(hero.pill)}</span>
        </div>
        <div class="stage-hero__body">
          <div class="stage-hero__headline">
            <h1 id="stage-hero-title">${escapeHtml(hero.title)}</h1>
            <p class="stage-hero__copy">${escapeHtml(hero.copy)}</p>
          </div>
          ${hero.spotlight
            ? `
              <article class="stage-hero__spotlight">
                <span class="stage-hero__spotlight-label">${escapeHtml(hero.spotlight.label)}</span>
                <strong>${escapeHtml(hero.spotlight.title)}</strong>
                <p>${escapeHtml(hero.spotlight.copy)}</p>
              </article>
            `
            : ""}
        </div>
        ${chipMarkup ? `<div class="stage-hero__highlights">${chipMarkup}</div>` : ""}
        <div class="stage-hero__actions">
          ${(hero.actions || [])
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
      <div class="stage-hero__support">
        <article class="stage-hero__panel">
          <p class="stage-hero__panel-kicker">${escapeHtml(hero.snapshotLabel || "Snapshot")}</p>
          <div class="stage-hero__stats">${statsMarkup}</div>
        </article>
        <div class="stage-hero__notes">${notesMarkup}</div>
      </div>
    </section>
  `;
}

export function createStageFeaturedResourcesMarkup(section) {
  const resources = Array.isArray(section.resources) ? section.resources : [];
  const leadResource = resources[0] || null;
  const secondaryResources = resources.slice(1);

  return `
    <section class="stage-section stage-section--featured" id="stage-featured">
      <div class="stage-section__header stage-section__header--split">
        ${createSectionTitleMarkup({
          kicker: section.kicker,
          title: section.title,
          copy: section.copy,
          id: "stage-featured-heading",
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
      <div class="stage-editorial">
        <div class="stage-editorial__lead-wrap">
          ${leadResource ? createResourceCardMarkup(leadResource, { layout: "stage-featured-lead" }) : ""}
          ${section.footerNote
            ? `
              <article class="stage-editorial__note">
                <span>${escapeHtml(section.footerNote.label)}</span>
                <strong>${escapeHtml(section.footerNote.title)}</strong>
                <p>${escapeHtml(section.footerNote.copy)}</p>
              </article>
            `
            : ""}
        </div>
        ${secondaryResources.length > 0
          ? `
            <div class="stage-editorial__stack-wrap">
              <p class="stage-editorial__stack-label">${escapeHtml(section.stackLabel || "Also featured")}</p>
              <div class="stage-editorial__stack">
                ${secondaryResources
                  .map((resource) => createResourceCardMarkup(resource, { layout: "stage-featured-stack" }))
                  .join("")}
              </div>
            </div>
          `
          : ""}
      </div>
    </section>
  `;
}

export function createStageRoutesMarkup(section) {
  const cardsMarkup = (section.cards || [])
    .map((card, index) =>
      createStageRouteCardMarkup(card, {
        layout: index === 0 ? "lead" : "standard",
      }),
    )
    .join("");

  return `
    <section class="stage-section stage-section--routes" id="stage-routes">
      ${createSectionTitleMarkup({
        kicker: section.kicker,
        title: section.title,
        copy: section.copy,
        id: "stage-routes-heading",
      })}
      <div class="stage-route-grid">${cardsMarkup}</div>
    </section>
  `;
}

function createStageRouteCardMarkup(card, { layout = "standard" } = {}) {
  return `
    <article class="${joinClasses("stage-route-card", `stage-route-card--${card.tone || "teal"}`, `stage-route-card--${layout}`)}">
      <div class="stage-route-card__topline">
        <span class="stage-route-card__order">${escapeHtml(card.orderLabel || card.eyebrow)}</span>
        <span class="stage-route-card__count">${escapeHtml(card.countLabel)}</span>
      </div>
      <h3>${escapeHtml(card.title)}</h3>
      <p class="stage-route-card__copy">${escapeHtml(card.description)}</p>
      ${(card.chips || []).length > 0
        ? `
          <div class="stage-route-card__chips">
            ${(card.chips || []).map((chip) => createTagMarkup({ label: chip, tone: "outline" })).join("")}
          </div>
        `
        : ""}
      ${(card.supportingTags || []).length > 0
        ? `
          <div class="stage-route-card__topics">
            ${(card.supportingTags || [])
              .map((tag) => createTagMarkup({ label: tag, tone: "soft" }))
              .join("")}
          </div>
        `
        : ""}
      <div class="stage-route-card__footer">
        ${createCTAButtonMarkup({
          href: card.href,
          label: card.ctaLabel,
          variant: "primary",
          compact: true,
        })}
      </div>
    </article>
  `;
}

export function createStageFirstCutsMarkup(section) {
  const topicLinksMarkup = (section.topicLinks || [])
    .map((link) => createTagMarkup({ label: link.label, tone: "search", href: link.href }))
    .join("");
  const resourcesMarkup = (section.resources || [])
    .map((resource) => createResourceCardMarkup(resource, { layout: "stage-topic" }))
    .join("");

  return `
    <section class="stage-section stage-section--first-cuts" id="stage-first-cuts">
      ${createSectionTitleMarkup({
        kicker: section.kicker,
        title: section.title,
        copy: section.copy,
        id: "stage-first-cuts-heading",
      })}
      <div class="stage-topic-layout">
        <article class="stage-topic-board">
          <p class="stage-topic-board__label">${escapeHtml(section.topicPanel?.label || "Topic links")}</p>
          <h3>${escapeHtml(section.topicPanel?.title || "Jump in by topic")}</h3>
          <p class="stage-topic-board__copy">${escapeHtml(section.topicPanel?.copy || "")}</p>
          <div class="stage-tag-links">${topicLinksMarkup}</div>
        </article>
        <div class="${joinClasses("stage-resource-grid", "stage-resource-grid--topic")}">
          ${resourcesMarkup}
        </div>
      </div>
    </section>
  `;
}

export function createStageLaunchMarkup(section) {
  const resourcesMarkup = (section.resources || [])
    .map((resource) => createResourceCardMarkup(resource, { layout: "stage-launch" }))
    .join("");

  return `
    <section class="stage-section stage-section--launch" id="stage-launch">
      ${createSectionTitleMarkup({
        kicker: section.kicker,
        title: section.title,
        copy: section.copy,
        id: "stage-launch-heading",
      })}
      <div class="${joinClasses("stage-resource-grid", "stage-resource-grid--launch")}">
        ${resourcesMarkup}
      </div>
    </section>
  `;
}

export function createStageHandoffMarkup(section) {
  return `
    <section class="stage-section stage-section--handoff" id="stage-handoff">
      <article class="stage-handoff">
        <div class="stage-handoff__content">
          <p class="stage-handoff__kicker">${escapeHtml(section.kicker)}</p>
          <h2>${escapeHtml(section.title)}</h2>
          <p class="stage-handoff__copy">${escapeHtml(section.copy)}</p>
        </div>
        <div class="stage-handoff__actions">
          ${createCTAButtonMarkup({
            href: section.primaryAction.href,
            label: section.primaryAction.label,
            variant: "primary",
          })}
          ${section.secondaryAction
            ? createCTAButtonMarkup({
                href: section.secondaryAction.href,
                label: section.secondaryAction.label,
                variant: "secondary",
              })
            : ""}
        </div>
      </article>
    </section>
  `;
}
