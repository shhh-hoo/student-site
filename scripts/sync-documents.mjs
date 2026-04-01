#!/usr/bin/env node

/**
 * Usage:
 *   node scripts/sync-documents.mjs
 *
 * This script scans ../content-source/documents for folders that contain
 * meta.json plus one supported content file (content.pdf, content.md, or
 * content.html). Matching files are copied into public/docs and a library
 * index is written to public/data/library.json.
 *
 * HTML files are normalised into fragment-style output for the integrated
 * student-site viewer. Shared styling is owned by student-site, not by each
 * source document file.
 */

import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteRoot = path.resolve(__dirname, "..");
const sourceRoot = path.resolve(siteRoot, "..", "content-source", "documents");
const docsOutputRoot = path.resolve(siteRoot, "public", "docs");
const dataOutputRoot = path.resolve(siteRoot, "public", "data");
const supportedContentFiles = ["content.pdf", "content.md", "content.html"];

async function main() {
  await rm(docsOutputRoot, { recursive: true, force: true });
  await mkdir(docsOutputRoot, { recursive: true });
  await mkdir(dataOutputRoot, { recursive: true });

  const documentFolders = await findDocumentFolders(sourceRoot);
  const library = [];

  for (const folderPath of documentFolders) {
    const metaPath = path.join(folderPath, "meta.json");
    const meta = await readJson(metaPath);
    const contentFileName = await findSupportedContentFile(folderPath);

    if (!contentFileName) {
      console.warn(
        `Skipping ${path.relative(siteRoot, folderPath)} because no supported content file was found.`,
      );
      continue;
    }

    const sourceFilePath = path.join(folderPath, contentFileName);
    const folderRelativeToSource = path.relative(sourceRoot, folderPath);
    const outputFilePath = path.join(docsOutputRoot, folderRelativeToSource, contentFileName);
    const contentFormat = getContentFormat(contentFileName);
    const documentId = normalizeSlashes(folderRelativeToSource);

    await mkdir(path.dirname(outputFilePath), { recursive: true });
    await writeDocumentOutput(sourceFilePath, outputFilePath, contentFormat);

    library.push({
      title: meta.title ?? "",
      subject: meta.subject ?? "",
      topic: meta.topic ?? "",
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      description: meta.description ?? "",
      source_kind: meta.source_kind ?? "",
      status: meta.status ?? "",
      stage: meta.stage ?? "",
      stage_detail: meta.stage_detail ?? "",
      part: meta.part ?? "",
      syllabus_refs: Array.isArray(meta.syllabus_refs) ? meta.syllabus_refs : [],
      original_relative_source_path: normalizeSlashes(
        path.relative(siteRoot, sourceFilePath),
      ),
      public_file_path: normalizeSlashes(
        path.relative(siteRoot, outputFilePath),
      ),
      document_id: documentId,
      content_file_name: contentFileName,
      content_format: contentFormat,
      view_path: `document.html?doc=${encodeURIComponent(documentId)}`,
    });
  }

  library.sort((left, right) => left.title.localeCompare(right.title));

  const libraryJsonPath = path.join(dataOutputRoot, "library.json");
  await writeFile(libraryJsonPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");

  console.log(
    `Synced ${library.length} document${library.length === 1 ? "" : "s"} to ${path.relative(siteRoot, libraryJsonPath)}.`,
  );
}

async function findDocumentFolders(startPath) {
  const matches = [];
  const entries = await readdir(startPath, { withFileTypes: true });

  const hasMetaJson = entries.some(
    (entry) => entry.isFile() && entry.name === "meta.json",
  );

  if (hasMetaJson) {
    matches.push(startPath);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    matches.push(...(await findDocumentFolders(path.join(startPath, entry.name))));
  }

  return matches;
}

async function findSupportedContentFile(folderPath) {
  for (const fileName of supportedContentFiles) {
    const candidatePath = path.join(folderPath, fileName);

    try {
      const candidateStats = await stat(candidatePath);

      if (candidateStats.isFile()) {
        return fileName;
      }
    } catch {
      // Ignore missing files and keep checking the supported list.
    }
  }

  return null;
}

async function readJson(filePath) {
  const fileContents = await readFile(filePath, "utf8");
  return JSON.parse(fileContents);
}

async function writeDocumentOutput(sourceFilePath, outputFilePath, contentFormat) {
  if (contentFormat === "html") {
    const sourceHtml = await readFile(sourceFilePath, "utf8");
    const fragmentHtml = normalizeHtmlFragment(sourceHtml);
    await writeFile(outputFilePath, `${fragmentHtml}\n`, "utf8");
    return;
  }

  await cp(sourceFilePath, outputFilePath);
}

function getContentFormat(fileName) {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case ".html":
      return "html";
    case ".md":
      return "markdown";
    case ".pdf":
      return "pdf";
    default:
      return "file";
  }
}

function normalizeHtmlFragment(sourceHtml) {
  let fragment = sourceHtml.trim();

  const bodyMatch = fragment.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    fragment = bodyMatch[1].trim();
  }

  fragment = fragment.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  fragment = fragment.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  const contentPanelMatch = fragment.match(
    /<main[^>]*class=(["'])[^"']*\bcontent-panel\b[^"']*\1[^>]*>([\s\S]*?)<\/main>/i,
  );

  if (contentPanelMatch) {
    fragment = contentPanelMatch[2].trim();
  } else {
    const mainMatch = fragment.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      fragment = mainMatch[1].trim();
    }
  }

  return fragment.trim();
}

function normalizeSlashes(value) {
  return value.split(path.sep).join("/");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
