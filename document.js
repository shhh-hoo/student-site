const documentTitle = document.getElementById("document-title");
const documentDescription = document.getElementById("document-description");
const documentMeta = document.getElementById("document-meta");
const documentBody = document.getElementById("document-body");
const documentToc = document.getElementById("document-toc");
const documentFileKind = document.getElementById("document-file-kind");
const rawFileLink = document.getElementById("raw-file-link");
const syllabusLinksSection = document.getElementById("syllabus-links-section");
const documentSyllabusLinks = document.getElementById("document-syllabus-links");

async function initDocumentView() {
  const params = new URLSearchParams(window.location.search);
  const requestedDocumentId = params.get("doc");
  const documentId = normalizeDocumentId(requestedDocumentId);

  if (!documentId) {
    renderMissingState("No document id was provided in the page URL.");
    return;
  }

  try {
    const library = await fetchLibrary();
    const documentItem = library.find((item) => item.document_id === documentId);

    if (!documentItem) {
      renderMissingState(`Document "${documentId}" was not found in library.json.`);
      return;
    }

    renderDocumentHeader(documentItem);
    await renderDocumentContent(documentItem);
    buildTableOfContents();
  } catch (error) {
    renderMissingState(error.message);
  }
}

async function fetchLibrary() {
  const response = await fetch("./public/data/library.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load library.json (${response.status}).`);
  }

  const documents = await response.json();
  return Array.isArray(documents) ? documents : [];
}

function normalizeDocumentId(value) {
  let normalizedValue = typeof value === "string" ? value.trim() : "";

  if (!normalizedValue) {
    return "";
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const decodedValue = decodeURIComponent(normalizedValue);

      if (decodedValue === normalizedValue) {
        break;
      }

      normalizedValue = decodedValue;
    } catch {
      break;
    }
  }

  return normalizedValue;
}

function renderDocumentHeader(documentItem) {
  const metaChips = [];

  if (documentItem.subject) {
    metaChips.push(documentItem.subject);
  }
  if (documentItem.topic) {
    metaChips.push(documentItem.topic);
  }
  if (documentItem.part) {
    metaChips.push(documentItem.part);
  }
  if (documentItem.stage) {
    metaChips.push(documentItem.stage);
  }
  if (documentItem.stage_detail) {
    metaChips.push(documentItem.stage_detail);
  }

  document.title = `${documentItem.title || "Document"} | Student Site`;
  documentTitle.textContent = documentItem.title || "Untitled document";
  documentDescription.textContent =
    documentItem.description || "No description is available for this document.";
  documentMeta.innerHTML = metaChips
    .concat(Array.isArray(documentItem.tags) ? documentItem.tags : [])
    .map((value) => `<span class="meta-chip">${escapeHtml(value)}</span>`)
    .join("");
  renderSyllabusLinks(documentItem.syllabus_refs);

  documentFileKind.textContent = `Format: ${getContentFormatLabel(documentItem.content_format)}`;
  rawFileLink.href = documentItem.public_file_path;
}

function renderSyllabusLinks(syllabusRefs) {
  if (!syllabusLinksSection || !documentSyllabusLinks) {
    return;
  }

  const refs = Array.isArray(syllabusRefs)
    ? syllabusRefs.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  if (refs.length === 0) {
    syllabusLinksSection.hidden = true;
    documentSyllabusLinks.innerHTML = "";
    return;
  }

  syllabusLinksSection.hidden = false;
  documentSyllabusLinks.innerHTML = refs
    .map((value) => `<span class="meta-chip">${escapeHtml(value)}</span>`)
    .join("");
}

async function renderDocumentContent(documentItem) {
  documentBody.setAttribute("aria-busy", "true");

  switch (documentItem.content_format) {
    case "html":
      await renderHtmlFragment(documentItem);
      break;
    case "markdown":
      await renderMarkdownDocument(documentItem);
      break;
    case "pdf":
      renderPdfDocument(documentItem);
      break;
    default:
      renderUnsupportedDocument(documentItem);
      break;
  }

  documentBody.setAttribute("aria-busy", "false");
}

async function renderHtmlFragment(documentItem) {
  const response = await fetch(documentItem.public_file_path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load HTML fragment (${response.status}).`);
  }

  const markup = await response.text();
  const fragmentMarkup = wrapHtmlFragment(markup);
  documentBody.innerHTML = fragmentMarkup;
}

async function renderMarkdownDocument(documentItem) {
  const response = await fetch(documentItem.public_file_path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load Markdown content (${response.status}).`);
  }

  const markdown = await response.text();
  documentBody.innerHTML = `
    <article class="content-fragment">
      ${renderMarkdownToHtml(markdown)}
    </article>
  `;
}

function renderPdfDocument(documentItem) {
  documentBody.innerHTML = `
    <div class="document-placeholder empty-state">
      <strong>PDF documents open as files.</strong>
      <p>
        This viewer keeps the student-site shell consistent, but PDF content is still opened as a separate file.
      </p>
      <div class="document-actions">
        <a class="doc-link" href="${encodeURI(documentItem.public_file_path)}" target="_blank" rel="noreferrer">
          Open PDF
        </a>
      </div>
    </div>
  `;
}

function renderUnsupportedDocument(documentItem) {
  documentBody.innerHTML = `
    <div class="document-placeholder empty-state">
      <strong>Unsupported format.</strong>
      <p>
        The file format for ${escapeHtml(documentItem.title || "this document")} is not supported by the integrated viewer.
      </p>
      <div class="document-actions">
        <a class="secondary-link" href="${encodeURI(documentItem.public_file_path)}" target="_blank" rel="noreferrer">
          Open Raw File
        </a>
      </div>
    </div>
  `;
}

function renderMissingState(message) {
  document.title = "Document Viewer | Student Site";
  documentTitle.textContent = "Document unavailable";
  documentDescription.textContent = "The shared viewer could not load this document.";
  documentMeta.innerHTML = "";
  renderSyllabusLinks([]);
  documentFileKind.textContent = "Format: unavailable";
  rawFileLink.removeAttribute("href");
  documentBody.setAttribute("aria-busy", "false");
  documentBody.innerHTML = `
    <div class="document-placeholder empty-state">
      <strong>Viewer error.</strong>
      <p>${escapeHtml(message)}</p>
      <div class="document-actions">
        <a class="secondary-link" href="./index.html">Back to library</a>
      </div>
    </div>
  `;
  documentToc.innerHTML = `<p class="panel-copy">No page structure available.</p>`;
}

function buildTableOfContents() {
  const headings = [...documentBody.querySelectorAll("h2, h3")];

  if (headings.length === 0) {
    documentToc.innerHTML = `<p class="panel-copy">No headings were found in this document.</p>`;
    return;
  }

  const items = headings.map((heading, index) => {
    const anchorId = getOrCreateAnchorId(heading, index);
    return {
      id: anchorId,
      label: heading.textContent.trim(),
      depth: heading.tagName === "H3" ? "3" : "2",
    };
  });

  documentToc.innerHTML = `
    <ul class="toc-list">
      ${items
        .map(
          (item) => `
            <li>
              <a class="toc-link" data-depth="${item.depth}" href="#${item.id}">
                ${escapeHtml(item.label)}
              </a>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function getOrCreateAnchorId(heading, index) {
  if (heading.id) {
    return heading.id;
  }

  const parentWithId = heading.closest("[id]");
  if (parentWithId && parentWithId !== heading) {
    return parentWithId.id;
  }

  const anchorId = `section-${index + 1}`;
  heading.id = anchorId;
  return anchorId;
}

function wrapHtmlFragment(markup) {
  const trimmedMarkup = markup.trim();

  if (/^<article[\s>]/i.test(trimmedMarkup)) {
    return trimmedMarkup;
  }

  return `<article class="content-fragment">${trimmedMarkup}</article>`;
}

function renderMarkdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  let paragraph = [];
  let listMode = null;

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }

    output.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function closeList() {
    if (!listMode) {
      return;
    }

    output.push(listMode === "ol" ? "</ol>" : "</ul>");
    listMode = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = Math.min(headingMatch[1].length + 1, 4);
      output.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listMode !== "ul") {
        closeList();
        output.push("<ul>");
        listMode = "ul";
      }
      output.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listMode !== "ol") {
        closeList();
        output.push("<ol>");
        listMode = "ol";
      }
      output.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      closeList();
      output.push(
        `<blockquote><p>${renderInlineMarkdown(line.replace(/^>\s?/, ""))}</p></blockquote>`,
      );
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  closeList();

  return output.join("\n");
}

function renderInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function getContentFormatLabel(contentFormat) {
  switch (contentFormat) {
    case "html":
      return "Integrated HTML fragment";
    case "markdown":
      return "Integrated Markdown";
    case "pdf":
      return "PDF file";
    default:
      return "Unknown format";
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

initDocumentView();
