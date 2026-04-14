#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteRoot = path.resolve(__dirname, "..");
const sourceRoot = path.resolve(siteRoot, "..", "content-source", "curation");
const outputRoot = path.resolve(siteRoot, "public", "data", "curation");
const curationFileNames = ["homepage.json", "as.json", "a2.json", "interactive.json"];

async function main() {
  await mkdir(outputRoot, { recursive: true });

  for (const fileName of curationFileNames) {
    const sourcePath = path.join(sourceRoot, fileName);
    const outputPath = path.join(outputRoot, fileName);
    const json = JSON.parse(await readFile(sourcePath, "utf8"));

    await writeFile(outputPath, `${JSON.stringify(json, null, 2)}\n`, "utf8");
  }

  console.log(
    `Synced ${curationFileNames.length} curation file${curationFileNames.length === 1 ? "" : "s"} to ${path.relative(siteRoot, outputRoot)}.`
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
