import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { constants as fsConstants, createReadStream } from "node:fs";
import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const studentSiteRoot = path.resolve(scriptDirectory, "..");
const targetPath =
  "/interactive/9701-memorisation-bank/?stage=AS&level=level-2-guided-cloze&topic=group-2&file=guided-cloze";
const expectedPromptTitle = "Explain the trend in thermal stability of Group 2 carbonates.";
const expectedPromptContext =
  "Down the group the M2+ ion has lower _____ _____. So it polarises the carbonate ion _____. The carbonate ion is less distorted and is less likely to decompose.";
const configuredWindowSize = process.env.MEMORISATION_WINDOW_SIZE || "1440,1600";
const runMobileVisibilityCheck = process.env.MEMORISATION_MOBILE_CHECK === "1";
const browserEnvKeys = ["MEMORISATION_BROWSER_BIN", "CHROME_BIN", "BROWSER_BIN"];
const browserCommandCandidates = process.platform === "win32"
  ? ["chrome.exe", "google-chrome.exe", "chromium.exe"]
  : [
      "google-chrome",
      "google-chrome-stable",
      "chromium",
      "chromium-browser",
      "chrome",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ];

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isExecutable(filePath) {
  if (!filePath) {
    return false;
  }

  try {
    await access(filePath, fsConstants.X_OK);
    return true;
  } catch (error) {
    return false;
  }
}

async function resolveBrowserPath() {
  for (const envKey of browserEnvKeys) {
    const configuredPath = String(process.env[envKey] || "").trim();

    if (await isExecutable(configuredPath)) {
      return configuredPath;
    }
  }

  const pathEntries = String(process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean);

  for (const candidate of browserCommandCandidates) {
    if (path.isAbsolute(candidate)) {
      if (await isExecutable(candidate)) {
        return candidate;
      }

      continue;
    }

    for (const pathEntry of pathEntries) {
      const candidatePath = path.join(pathEntry, candidate);

      if (await isExecutable(candidatePath)) {
        return candidatePath;
      }
    }
  }

  throw new Error(
    `Could not find a Chrome/Chromium binary. Set one of ${browserEnvKeys.join(", ")} or install one of: ${browserCommandCandidates.join(", ")}.`,
  );
}

function createStaticServer(rootDirectory) {
  return http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);

      if (pathname.endsWith("/")) {
        pathname = `${pathname}index.html`;
      }

      const filePath = path.normalize(path.join(rootDirectory, pathname));

      if (!filePath.startsWith(rootDirectory)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const fileStats = await stat(filePath);

      if (!fileStats.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });

      createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(404);
      response.end("Not found");
    }
  });
}

async function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(address.port);
    });
  });
}

async function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function waitForDevToolsPort(userDataDirectory, chromeProcess) {
  const activePortPath = path.join(userDataDirectory, "DevToolsActivePort");
  const start = Date.now();

  while (Date.now() - start < 10_000) {
    if (chromeProcess.exitCode != null) {
      throw new Error(`Chrome exited early with code ${chromeProcess.exitCode}.`);
    }

    try {
      const activePortContents = await readFile(activePortPath, "utf8");
      const [portValue] = activePortContents.trim().split("\n");
      const port = Number(portValue);

      if (port) {
        return port;
      }
    } catch (error) {
      // Keep polling until Chrome writes the DevTools port file.
    }

    await sleep(100);
  }

  throw new Error("Timed out waiting for Chrome DevTools port.");
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed for ${url} (${response.status}).`);
  }

  return response.json();
}

async function getPageWebSocketUrl(devToolsPort, targetUrl) {
  const start = Date.now();

  while (Date.now() - start < 10_000) {
    const pageTargets = await fetchJson(`http://127.0.0.1:${devToolsPort}/json/list`);
    const matchingTarget = pageTargets.find(
      (target) => target.type === "page" && target.url === targetUrl,
    );

    if (matchingTarget?.webSocketDebuggerUrl) {
      return matchingTarget.webSocketDebuggerUrl;
    }

    await sleep(100);
  }

  throw new Error("Timed out waiting for the memorisation bank page target.");
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextCommandId = 0;
    this.pendingCommands = new Map();
    this.socket = null;
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);

    this.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(String(event.data));

      if (!payload.id) {
        return;
      }

      const pendingCommand = this.pendingCommands.get(payload.id);

      if (!pendingCommand) {
        return;
      }

      this.pendingCommands.delete(payload.id);

      if (payload.error) {
        pendingCommand.reject(new Error(payload.error.message));
        return;
      }

      pendingCommand.resolve(payload.result);
    });

    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
  }

  async send(method, params = {}) {
    const commandId = ++this.nextCommandId;

    return new Promise((resolve, reject) => {
      this.pendingCommands.set(commandId, { resolve, reject });
      this.socket.send(JSON.stringify({ id: commandId, method, params }));
    });
  }

  async close() {
    if (!this.socket) {
      return;
    }

    await new Promise((resolve) => {
      this.socket.addEventListener("close", resolve, { once: true });
      this.socket.close();
    });
  }
}

async function evaluate(client, expression) {
  const { result, exceptionDetails } = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  if (exceptionDetails) {
    throw new Error(exceptionDetails.text || "Runtime evaluation failed.");
  }

  return result.value;
}

async function getSnapshot(client) {
  return evaluate(
    client,
    `(() => ({
      title: document.getElementById("active-prompt-title")?.textContent?.trim() || "",
      blankChip: document.getElementById("active-blank-chip")?.textContent?.trim() || "",
      promptContext: document.getElementById("active-prompt-context")?.textContent?.trim() || "",
      activeElementId: document.activeElement?.id || "",
      inputValue: document.querySelector("textarea.memorisation-input")?.value || "",
      feedbackTitle:
        document.querySelector(".memorisation-feedback-card__title")?.textContent?.trim() || "",
      revealNote:
        document.querySelector(".memorisation-reveal .memorisation-answer__note")?.textContent?.trim() || "",
      reviewToggleText:
        document.getElementById("review-toggle")?.hidden
          ? ""
          : document.getElementById("review-toggle").textContent.trim(),
      pageCounter: document.getElementById("page-counter")?.textContent?.trim() || ""
    }))()`,
  );
}

async function setActiveTextareaValue(client, value) {
  await evaluate(
    client,
    `(() => {
      const field = document.querySelector("textarea.memorisation-input");

      if (!field) {
        throw new Error("Missing active textarea.");
      }

      field.value = ${JSON.stringify(value)};
      field.dispatchEvent(new Event("input", { bubbles: true }));
      return field.value;
    })()`,
  );
}

async function waitForSnapshot(client, predicate, message) {
  const start = Date.now();
  let latestSnapshot = null;

  while (Date.now() - start < 10_000) {
    latestSnapshot = await getSnapshot(client);

    if (predicate(latestSnapshot)) {
      return latestSnapshot;
    }

    await sleep(100);
  }

  throw new Error(`${message}\nLast snapshot: ${JSON.stringify(latestSnapshot, null, 2)}`);
}

async function waitForEvaluation(client, expression, predicate, message) {
  const start = Date.now();
  let latestValue = null;

  while (Date.now() - start < 10_000) {
    latestValue = await evaluate(client, expression);

    if (predicate(latestValue)) {
      return latestValue;
    }

    await sleep(100);
  }

  throw new Error(`${message}\nLast value: ${JSON.stringify(latestValue, null, 2)}`);
}

async function clickElement(client, elementId) {
  await evaluate(
    client,
    `(() => {
      const element = document.getElementById(${JSON.stringify(elementId)});

      if (!element) {
        throw new Error(${JSON.stringify(`Missing element: ${elementId}`)});
      }

      element.click();
      return true;
    })()`,
  );
}

async function run() {
  const server = createStaticServer(studentSiteRoot);
  const serverPort = await listen(server);
  const targetUrl = `http://127.0.0.1:${serverPort}${targetPath}`;
  const userDataDirectory = await mkdtemp(path.join(os.tmpdir(), "memorisation-bank-chrome-"));
  const browserPath = await resolveBrowserPath();
  const chromeProcess = spawn(
    browserPath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-port=0",
      `--window-size=${configuredWindowSize}`,
      `--user-data-dir=${userDataDirectory}`,
      targetUrl,
    ],
    {
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let chromeStderr = "";

  chromeProcess.stderr.on("data", (chunk) => {
    chromeStderr += String(chunk);
  });

  const devToolsPort = await waitForDevToolsPort(userDataDirectory, chromeProcess);
  const pageWebSocketUrl = await getPageWebSocketUrl(devToolsPort, targetUrl);
  const client = new CdpClient(pageWebSocketUrl);

  try {
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    const initialSnapshot = await waitForSnapshot(
      client,
      (snapshot) =>
        snapshot.title === expectedPromptTitle &&
        snapshot.blankChip === "Blank 1" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::0",
      "Initial active blank did not render with focus.",
    );

    assert.equal(initialSnapshot.promptContext, expectedPromptContext);
    console.log("PASS 1: Initial prompt rendered with Blank 1 focused.");

    await clickElement(client, "next-blank");
    const afterFirstNext = await waitForSnapshot(
      client,
      (snapshot) =>
        snapshot.title === expectedPromptTitle &&
        snapshot.blankChip === "Blank 2" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1",
      "Next did not advance to Blank 2 with focus restored.",
    );

    assert.equal(afterFirstNext.promptContext, expectedPromptContext);
    console.log("PASS 2: Next advanced to Blank 2 and returned focus to the textarea.");

    await clickElement(client, "next-blank");
    const afterSecondNext = await waitForSnapshot(
      client,
      (snapshot) =>
        snapshot.title === expectedPromptTitle &&
        snapshot.blankChip === "Blank 3" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::2",
      "Repeated Next kept stale blank content instead of advancing to Blank 3.",
    );

    assert.equal(afterSecondNext.promptContext, expectedPromptContext);
    console.log("PASS 3: Repeated Next advanced to Blank 3 without stale prompt state.");

    await clickElement(client, "prev-blank");
    const afterPrevious = await waitForSnapshot(
      client,
      (snapshot) =>
        snapshot.title === expectedPromptTitle &&
        snapshot.blankChip === "Blank 2" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1",
      "Previous did not return to Blank 2 with focus restored.",
    );

    assert.equal(afterPrevious.promptContext, expectedPromptContext);
    console.log("PASS 4: Previous returned to Blank 2 and restored focus to the textarea.");

    await setActiveTextareaValue(client, "density draft");
    await sleep(250);
    await client.send("Page.reload");

    const afterReload = await waitForSnapshot(
      client,
      (snapshot) =>
        snapshot.title === expectedPromptTitle &&
        snapshot.blankChip === "Blank 2" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1" &&
        snapshot.inputValue === "density draft",
      "Refresh did not restore the active blank and draft answer.",
    );

    assert.equal(afterReload.promptContext, expectedPromptContext);
    console.log("PASS 5: Refresh restored the active blank and draft answer.");

    await clickElement(client, "reveal-blank");
    const afterReveal = await waitForSnapshot(
      client,
      (snapshot) =>
        snapshot.feedbackTitle === "Answer revealed" &&
        snapshot.revealNote.includes("Current target: Blank 2.") &&
        snapshot.reviewToggleText === "Review queue (3)" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1",
      "Reveal did not apply to the active blank or expose the review queue correctly.",
    );

    console.log("PASS 6: Reveal applied to Blank 2 and kept focus on the active textarea.");

    if (runMobileVisibilityCheck) {
      await waitForSnapshot(
        client,
        (snapshot) => snapshot.revealNote.includes("Current target: Blank 2."),
        "Reveal note did not stay attached to the active blank during the mobile visibility check.",
      );

      const mobileVisibilityMetrics = await waitForEvaluation(
        client,
        `(() => {
          const field = document.activeElement;
          const revealPanel = document.querySelector(".memorisation-reveal");
          const actionBar = document.querySelector(".memorisation-action-bar");

          if (!field || !revealPanel || !actionBar) {
            return null;
          }

          const fieldRect = field.getBoundingClientRect();
          const revealRect = revealPanel.getBoundingClientRect();
          const actionBarRect = actionBar.getBoundingClientRect();

          return {
            fieldBottom: fieldRect.bottom,
            revealTop: revealRect.top,
            actionBarTop: actionBarRect.top,
          };
        })()`,
        (metrics) =>
          Boolean(metrics) &&
          metrics.fieldBottom <= metrics.actionBarTop &&
          metrics.revealTop < metrics.actionBarTop,
        "Sticky mobile action bar still obscures the focused or revealed content.",
      );

      console.log("PASS 6b: Mobile sticky action bar left the focused field and reveal content visible.");
    }

    await clickElement(client, "review-toggle");
    const reviewSnapshot = await waitForSnapshot(
      client,
      (snapshot) =>
        snapshot.pageCounter === "Review 1 / 3" &&
        snapshot.blankChip === "Blank 3" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::2",
      "Review queue did not open on the expected active blank.",
    );

    assert.equal(reviewSnapshot.title, expectedPromptTitle);
    console.log("PASS 7: Review queue opened on the highest-priority revealed blank.");

    await clickElement(client, "review-toggle");
    const backToMainSnapshot = await waitForSnapshot(
      client,
      (snapshot) =>
        snapshot.pageCounter.startsWith("Prompt ") &&
        snapshot.blankChip === "Blank 2" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1",
      "Back to main session did not restore the pre-review active blank.",
    );

    assert.equal(backToMainSnapshot.title, expectedPromptTitle);
    console.log("PASS 8: Leaving review restored the main-session active blank.");
    console.log("Browser active-blank regression checks passed: 8");
  } catch (error) {
    const chromeExitDetails =
      chromeProcess.exitCode != null ? ` Chrome exit code: ${chromeProcess.exitCode}.` : "";
    const stderrDetails = chromeStderr ? ` Chrome stderr: ${chromeStderr.trim()}` : "";
    throw new Error(`${error.message}${chromeExitDetails}${stderrDetails}`);
  } finally {
    await client.close().catch(() => {});
    chromeProcess.kill("SIGTERM");
    await closeServer(server).catch(() => {});
    await rm(userDataDirectory, { recursive: true, force: true }).catch(() => {});
  }
}

run().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
