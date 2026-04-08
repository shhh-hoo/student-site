import { loadInteractiveResources } from "../ui/site-data.js";

const interactiveList = document.getElementById("interactive-list");
const interactiveCountChip = document.getElementById("interactive-count-chip");

function preserveThemeHref(destination) {
  const preserveThemeOnUrl = window.StudentSiteTheme?.preserveThemeOnUrl;

  if (!preserveThemeOnUrl) {
    return String(destination || "");
  }

  return preserveThemeOnUrl(destination, window.location.href).toString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatLabel(value) {
  return String(value || "")
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function createChipMarkup(label) {
  return `<span class="interactive-hub-card__chip">${escapeHtml(label)}</span>`;
}

function createToolCardMarkup(resource) {
  const tags = Array.isArray(resource.tags) ? resource.tags.slice(0, 4).map(formatLabel) : [];
  const chips = [resource.stage, resource.part, ...tags].filter(Boolean).slice(0, 5);
  const meta = [resource.source_kind ? formatLabel(resource.source_kind) : "", "Interactive tool"]
    .filter(Boolean)
    .join(" · ");

  return `
    <article class="interactive-hub-card">
      <div class="interactive-hub-card__topline">
        <span>Interactive tool</span>
        <span>${escapeHtml(resource.stage || "AS+A2")}</span>
      </div>
      <div>
        <p class="interactive-hub-card__eyebrow">${escapeHtml(resource.part || "Interactive practice")}</p>
        <h3>${escapeHtml(resource.title || "Interactive practice")}</h3>
        <p>${escapeHtml(resource.description || "Short chemistry drill.")}</p>
      </div>
      <div class="interactive-hub-card__chips">
        ${chips.map((chip) => createChipMarkup(chip)).join("")}
      </div>
      <div class="interactive-hub-card__footer">
        <p class="interactive-hub-card__meta">${escapeHtml(meta)}</p>
        <a class="interactive-hub-card__cta" href="${escapeHtml(preserveThemeHref(resource.href))}">Open tool</a>
      </div>
    </article>
  `;
}

function renderError(message) {
  interactiveCountChip.textContent = "Tools unavailable";
  interactiveList.innerHTML = `
    <article class="interactive-hub-card interactive-hub-card--error">
      <p class="interactive-hub-card__eyebrow">Interactive hub unavailable</p>
      <h3>Could not load the current interactive list.</h3>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}

async function init() {
  try {
    const resources = await loadInteractiveResources("../");

    interactiveCountChip.textContent = `${resources.length} tool${resources.length === 1 ? "" : "s"}`;

    if (!resources.length) {
      interactiveList.innerHTML = `
        <article class="interactive-hub-card interactive-hub-card--placeholder">
          <p class="interactive-hub-card__eyebrow">No tools listed</p>
          <h3>The interactive hub is empty.</h3>
          <p>Add a tool to the interactive registry to show it here.</p>
        </article>
      `;
      return;
    }

    interactiveList.innerHTML = resources.map(createToolCardMarkup).join("");
  } catch (error) {
    renderError(error.message);
  }
}

init();
