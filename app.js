const libraryGrid = document.getElementById("library-grid");
const libraryStatus = document.getElementById("library-status");

async function loadLibrary() {
  try {
    const response = await fetch("./public/data/library.json", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Library request failed with status ${response.status}.`);
    }

    const documents = await response.json();
    renderLibrary(Array.isArray(documents) ? documents : []);
  } catch (error) {
    libraryStatus.textContent = "Could not load library data.";
    libraryGrid.setAttribute("aria-busy", "false");
    libraryGrid.innerHTML = `
      <article class="empty-state">
        <strong>Library unavailable.</strong>
        <p>${escapeHtml(error.message)}</p>
      </article>
    `;
  }
}

function renderLibrary(documents) {
  libraryGrid.setAttribute("aria-busy", "false");

  if (documents.length === 0) {
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

  libraryStatus.textContent = `${documents.length} document${documents.length === 1 ? "" : "s"} available.`;
  libraryGrid.innerHTML = documents.map(createCardMarkup).join("");
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

loadLibrary();
