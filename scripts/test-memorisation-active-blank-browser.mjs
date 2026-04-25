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
const coreDefinitionPath =
  "/interactive/9701-memorisation-bank/?stage=AS&level=level-1-core&topic=atomic-structure&file=core-definitions";
const expectedPromptTitle = "Explain the trend in thermal stability of Group 2 carbonates.";
const expectedPromptContext =
  "Down the group the M2+ ion has lower _____ _____. So it polarises the carbonate ion _____. The carbonate ion is less distorted and is less likely to decompose.";
const expectedFullAnswer =
  "Down the group the M2+ ion has lower charge density. So it polarises the carbonate ion less. The carbonate ion is less distorted and is less likely to decompose.";
const runMobileVisibilityCheck = process.env.MEMORISATION_MOBILE_CHECK === "1";
const configuredWindowSize =
  process.env.MEMORISATION_WINDOW_SIZE || (runMobileVisibilityCheck ? "390,900" : "1440,1600");
const browserEnvKeys = ["MEMORISATION_BROWSER_BIN", "CHROME_BIN", "BROWSER_BIN"];
const browserCommandCandidates =
  process.platform === "win32"
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
  return new Promise(resolve => setTimeout(resolve, ms));
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
    `Could not find a Chrome/Chromium binary. Set one of ${browserEnvKeys.join(", ")} or install one of: ${browserCommandCandidates.join(", ")}.`
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
    server.close(error => {
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
    const matchingTarget = pageTargets.find(target => target.type === "page" && target.url === targetUrl);

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

    this.socket.addEventListener("message", event => {
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

    await new Promise(resolve => {
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
    throw new Error(exceptionDetails.exception?.description || exceptionDetails.text || "Runtime evaluation failed.");
  }

  return result.value;
}

async function getSnapshot(client) {
  return evaluate(
    client,
    `(() => ({
      title: document.getElementById("active-prompt-title")?.textContent?.trim() || "",
      currentUrl: location.href,
      blankChip: document.getElementById("active-blank-chip")?.textContent?.trim() || "",
      promptContext: document.getElementById("active-prompt-context")?.textContent?.trim() || "",
      activeElementId: document.activeElement?.id || "",
      inputValue: document.querySelector("textarea.memorisation-input")?.value || "",
      feedbackTitle:
        document.querySelector(".memorisation-feedback-card__title")?.textContent?.trim() || "",
      revealNote:
        document.querySelector(".memorisation-reveal .memorisation-answer__note")?.textContent?.trim() || "",
      revealAnswerText:
        document
          .querySelector(".memorisation-reveal .memorisation-answer__text")
          ?.textContent?.replace(/\\s+/g, " ")
          .trim() || "",
      revealTokenCount:
        document.querySelectorAll(".memorisation-reveal .memorisation-diff__tokens, .memorisation-reveal .memorisation-diff-token").length,
      revealMatchMarkCount:
        document.querySelectorAll('.memorisation-reveal .memorisation-inline-mark[data-tone="match"]').length,
      revealProblemMarkCount:
        document.querySelectorAll(
          '.memorisation-reveal .memorisation-inline-mark[data-tone="missing"], .memorisation-reveal .memorisation-inline-mark[data-tone="wrong"], .memorisation-reveal .memorisation-inline-mark[data-tone="extra"]'
        ).length,
      diffTokenCount:
        document.querySelectorAll(".memorisation-diff__tokens, .memorisation-diff-token").length,
      diffInlineMarkCount:
        document.querySelectorAll(".memorisation-diff .memorisation-inline-mark").length,
      diffSentenceText:
        Array.from(document.querySelectorAll(".memorisation-diff__sentence"))
          .map(sentence => sentence.textContent?.replace(/\\s+/g, " ").trim())
          .filter(Boolean)
          .join(" | "),
      modeEasyActive:
        document.getElementById("mode-scaffold")?.dataset.active === "true",
      modeFullActive:
        document.getElementById("mode-full")?.dataset.active === "true",
      modeReviewActive:
        document.getElementById("mode-review")?.dataset.active === "true",
      modeEasyDisabled:
        document.getElementById("mode-scaffold")?.disabled ?? true,
      modeEasyLabel:
        document.getElementById("mode-scaffold")?.textContent?.replace(/\\s+/g, " ").trim() || "",
      actionBarState:
        document.querySelector(".memorisation-action-bar")?.dataset.state || "",
      actionBarVisible: (() => {
        const actionBar = document.querySelector(".memorisation-action-bar");
        const rect = actionBar?.getBoundingClientRect();
        return Boolean(
          actionBar &&
            !actionBar.hidden &&
            window.getComputedStyle(actionBar).display !== "none" &&
            rect.width > 0 &&
            rect.height > 0
        );
      })(),
      actionLabels: Array.from(document.querySelectorAll(".memorisation-action-bar button")).map(
        button => button.textContent?.trim() || ""
      ),
      visibleActionLabels: Array.from(document.querySelectorAll(".memorisation-action-bar button, .memorisation-easy-action"))
        .filter(button => {
          const styles = window.getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return styles.display !== "none" && styles.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        })
        .map(button => button.textContent?.trim() || ""),
      textareaCount:
        document.querySelectorAll("textarea.memorisation-input").length,
      easyStep:
        document.querySelector(".memorisation-easy-panel")?.dataset.step || "",
      easyKeywordCount:
        document.querySelectorAll(".memorisation-easy-keyword").length,
      easySelectedKeywordCount:
        document.querySelectorAll('.memorisation-easy-keyword[data-selected="true"]').length,
      easyCopyAnswer:
        document
          .querySelector(".memorisation-easy-copy-answer .memorisation-answer__text")
          ?.textContent?.replace(/\\s+/g, " ")
          .trim() || "",
      activeStatusText:
        document.querySelector(".memorisation-active-status")?.textContent?.replace(/\\s+/g, " ").trim() || "",
      setupHidden:
        document.getElementById("session-setup")?.hidden ?? false,
      practiceHidden:
        document.getElementById("practice-shell")?.hidden ?? false,
      startButtonText:
        document.getElementById("session-start")?.textContent?.trim() || "",
      activeSetupButtonText:
        document.querySelector(".memorisation-practice-refine")?.textContent?.trim() || "",
      skeletonExists:
        Boolean(document.querySelector(".memorisation-easy-skeleton")),
      skeletonBlankCount:
        document.querySelectorAll(".memorisation-easy-skeleton__blank").length,
      skeletonFilledBlankCount:
        document.querySelectorAll('.memorisation-easy-skeleton__blank[data-filled="true"]').length,
      skeletonFilledText:
        Array.from(document.querySelectorAll('.memorisation-easy-skeleton__blank[data-filled="true"]'))
          .map(blank => blank.textContent?.trim() || "")
          .filter(Boolean)
          .join(" "),
      skeletonSupportText:
        Array.from(document.querySelectorAll(".memorisation-easy-skeleton__word"))
          .map(word => word.textContent?.trim() || "")
          .filter(Boolean)
          .join(" "),
      skeletonClipped: (() => {
        const line = document.querySelector(".memorisation-easy-skeleton__line");
        return line ? line.scrollHeight > line.clientHeight + 1 || line.scrollWidth > line.clientWidth + 1 : false;
      })(),
      wordBankToggle:
        document.querySelector(".memorisation-word-bank .secondary-link")?.textContent?.trim() || "",
      wordBankChipCount:
        document.querySelectorAll(".memorisation-word-bank__chip").length,
      wordBankMessage:
        document.querySelector(".memorisation-word-bank__message")?.textContent?.trim() || "",
      wordBankOpen:
        document.querySelector(".memorisation-word-bank")?.dataset.open === "true",
      wordBankPosition:
        document.querySelector(".memorisation-word-bank")
          ? window.getComputedStyle(document.querySelector(".memorisation-word-bank")).position
          : "",
      hasHorizontalScroll:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      reviewToggleText:
        !document.getElementById("review-toggle") || document.getElementById("review-toggle").hidden
          ? ""
          : document.getElementById("review-toggle").textContent.trim(),
      pageCounter: document.getElementById("page-counter")?.textContent?.trim() || "",
      pageText: document.body?.textContent?.replace(/\\s+/g, " ").trim() || ""
    }))()`
  );
}

async function getMobileLayoutSnapshot(client) {
  return evaluate(
    client,
    `(() => {
      const rectFor = selector => {
        const element = document.querySelector(selector);

        if (!element) {
          return null;
        }

        const rect = element.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
          offsetTop: element.offsetTop,
        };
      };
      const visibleActionButtons = Array.from(
        document.querySelectorAll(".memorisation-action-bar button, .memorisation-easy-action")
      ).filter(
        button => {
          const styles = window.getComputedStyle(button);
          const rect = button.getBoundingClientRect();
          return styles.display !== "none" && styles.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        }
      );
      const modeButtons = Array.from(document.querySelectorAll(".memorisation-mode-button"));
      const modeRects = modeButtons.map(button => button.getBoundingClientRect());
      const modeDescriptionVisible = modeButtons.some(button => {
        const small = button.querySelector("small");
        const rect = small?.getBoundingClientRect();
        return small && window.getComputedStyle(small).display !== "none" && rect.width > 0 && rect.height > 0;
      });
      const wordBank = document.querySelector(".memorisation-word-bank");
      const wordBankRect = wordBank?.getBoundingClientRect();
      const wordBankStyles = wordBank ? window.getComputedStyle(wordBank) : null;
      const currentRow = document.querySelector(".memorisation-current-row");
      const currentRowStyles = currentRow ? window.getComputedStyle(currentRow) : null;
      const skeletonLine = document.querySelector(".memorisation-easy-skeleton__line");

      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        prompt: rectFor(".memorisation-prompt-card"),
        answer: rectFor(".memorisation-answer-card"),
        activeStatus: rectFor(".memorisation-active-status"),
        textarea: rectFor("textarea.memorisation-input"),
        controlBand: rectFor(".memorisation-control-band"),
        easySkeleton: rectFor(".memorisation-easy-skeleton"),
        easyPanel: rectFor(".memorisation-easy-panel"),
        actionBar: rectFor(".memorisation-action-bar"),
        feedback: rectFor(".memorisation-feedback-card"),
        mobileStudyHeader: rectFor(".memorisation-page-header"),
        mobileStudyHeaderVisible:
          window.getComputedStyle(document.querySelector(".memorisation-page-header") || document.body).display !==
          "none",
        modeTopSpread: modeRects.length
          ? Math.max(...modeRects.map(rect => rect.top)) - Math.min(...modeRects.map(rect => rect.top))
          : 0,
        modeMaxHeight: modeRects.length ? Math.max(...modeRects.map(rect => rect.height)) : 0,
        modeDescriptionVisible,
        visibleActionLabels: visibleActionButtons.map(button => button.textContent?.trim() || ""),
        primaryActionWidth:
          document.querySelector(".memorisation-easy-action")?.getBoundingClientRect().width ||
          document.getElementById("check-blank")?.getBoundingClientRect().width ||
          0,
        currentRowVisible:
          Boolean(currentRow) &&
          currentRowStyles.display !== "none" &&
          currentRow.getBoundingClientRect().height > 0,
        skeletonClipped: skeletonLine
          ? skeletonLine.scrollHeight > skeletonLine.clientHeight + 1 ||
            skeletonLine.scrollWidth > skeletonLine.clientWidth + 1
          : false,
        textareaCount: document.querySelectorAll("textarea.memorisation-input").length,
        wordBankPosition: wordBankStyles?.position || "",
        wordBankRect: wordBankRect
          ? {
              top: wordBankRect.top,
              bottom: wordBankRect.bottom,
              height: wordBankRect.height,
            }
          : null,
      };
    })()`
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
    })()`
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
    })()`
  );
}

async function clickSelector(client, selector) {
  await evaluate(
    client,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});

      if (!element) {
        throw new Error(${JSON.stringify(`Missing selector: ${selector}`)});
      }

      element.click();
      return true;
    })()`
  );
}

async function pressEnter(client, { shift = false } = {}) {
  const modifiers = shift ? 8 : 0;

  await client.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
    modifiers,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
    modifiers,
  });
}

async function pressShiftEnterInTextarea(client) {
  await pressEnter(client, { shift: true });
  await client.send("Input.insertText", {
    text: "\n",
  });
}

async function clickAllEasyKeywordChips(client) {
  const initialSnapshot = await getSnapshot(client);

  if (!initialSnapshot.easyKeywordCount) {
    throw new Error("Missing Easy Mode keyword chips.");
  }

  for (let index = 0; index < initialSnapshot.easyKeywordCount; index += 1) {
    const beforeClick = await getSnapshot(client);

    if (beforeClick.easySelectedKeywordCount === beforeClick.easyKeywordCount) {
      return;
    }

    await evaluate(
      client,
      `(() => {
        const chip = Array.from(document.querySelectorAll(".memorisation-easy-keyword")).find(
          candidate => candidate.dataset.selected !== "true"
        );

        if (!chip) {
          return false;
        }

        chip.click();
        return true;
      })()`
    );
    await waitForSnapshot(
      client,
      snapshot => snapshot.easySelectedKeywordCount > beforeClick.easySelectedKeywordCount,
      "Easy Mode keyword chip did not become selected."
    );
  }
}

async function clearLocalStateAndReload(client) {
  await evaluate(
    client,
    `(() => {
      localStorage.clear();
      Storage.prototype.setItem = function noopSetItem() {};
      location.reload();
      return true;
    })()`
  );
}

async function run() {
  const server = createStaticServer(studentSiteRoot);
  const serverPort = await listen(server);
  const targetUrl = `http://127.0.0.1:${serverPort}${targetPath}`;
  const coreDefinitionUrl = `http://127.0.0.1:${serverPort}${coreDefinitionPath}`;
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
    }
  );
  let chromeStderr = "";

  chromeProcess.stderr.on("data", chunk => {
    chromeStderr += String(chunk);
  });

  const devToolsPort = await waitForDevToolsPort(userDataDirectory, chromeProcess);
  const pageWebSocketUrl = await getPageWebSocketUrl(devToolsPort, targetUrl);
  const client = new CdpClient(pageWebSocketUrl);

  try {
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    if (runMobileVisibilityCheck) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 900,
        deviceScaleFactor: 1,
        mobile: true,
      });
      await client.send("Page.reload");
    }

    const launcherSnapshot = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.currentUrl.includes("file=guided-cloze") &&
        snapshot.modeEasyActive &&
        snapshot.practiceHidden &&
        !snapshot.setupHidden &&
        snapshot.startButtonText === "Start Easy Mode",
      "Setup launcher did not render with Easy Mode selected."
    );

    assert.equal(launcherSnapshot.modeEasyLabel.includes("Easy Mode"), true);
    assert.equal(launcherSnapshot.activeStatusText, "");
    console.log("PASS 0: Setup launcher rendered with mode selection before practice.");

    await clickElement(client, "session-start");
    const initialSnapshot = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.title === expectedPromptTitle &&
        snapshot.modeEasyActive &&
        snapshot.easyStep === "keywords" &&
        snapshot.setupHidden &&
        !snapshot.practiceHidden,
      "Starting Easy Mode did not open the active keyword step."
    );

    assert.equal(initialSnapshot.promptContext, expectedPromptContext);
    assert.equal(initialSnapshot.modeEasyLabel.includes("Easy Mode"), true);
    assert.equal(initialSnapshot.activeStatusText, "");
    assert.equal(initialSnapshot.activeSetupButtonText, "Return");
    assert.equal(initialSnapshot.textareaCount, 0, "Easy Mode Step 1 should not render a textarea.");
    assert.equal(initialSnapshot.actionBarVisible, false, "Easy Mode should not render the bottom session actions.");
    assert.equal(initialSnapshot.activeElementId, "", "Easy Mode Step 1 should not focus a typing field.");
    assert.ok(initialSnapshot.easyKeywordCount > 0, "Easy Mode Step 1 should render keyword chips.");
    assert.equal(initialSnapshot.skeletonExists, true, "Easy Mode Step 1 should render the answer skeleton.");
    assert.ok(initialSnapshot.skeletonBlankCount > 0, "Easy Mode skeleton should expose fillable slots.");
    assert.equal(initialSnapshot.skeletonFilledBlankCount, 0, "Easy Mode skeleton should start empty.");
    assert.equal(initialSnapshot.visibleActionLabels.includes("Check key words"), true);
    assert.equal(initialSnapshot.wordBankToggle, "");
    assert.equal(initialSnapshot.pageText.toLowerCase().includes("minimum pass"), false);
    console.log("PASS 1: Easy Mode opened on keyword recognition without a textarea.");

    await clickSelector(client, ".memorisation-practice-refine");
    const afterReturnSetup = await waitForSnapshot(
      client,
      snapshot =>
        !snapshot.setupHidden &&
        snapshot.practiceHidden &&
        snapshot.modeEasyActive &&
        snapshot.startButtonText === "Start Easy Mode" &&
        snapshot.currentUrl.includes("topic=group-2"),
      "Returning to setup did not preserve Easy mode and filters."
    );
    assert.equal(afterReturnSetup.modeEasyActive, true);
    console.log("PASS 1a: Returning to setup preserved selected filters and Easy mode.");

    await clickElement(client, "session-start");
    await waitForSnapshot(
      client,
      snapshot => snapshot.title === expectedPromptTitle && snapshot.easyStep === "keywords" && snapshot.setupHidden,
      "Restarting from setup did not return to Easy keyword practice."
    );

    if (runMobileVisibilityCheck) {
      const mobileClosedLayout = await getMobileLayoutSnapshot(client);

      assert.equal(mobileClosedLayout.viewportWidth, 390);
      assert.equal(mobileClosedLayout.hasHorizontalScroll, false, JSON.stringify(mobileClosedLayout));
      assert.equal(mobileClosedLayout.mobileStudyHeaderVisible, false, JSON.stringify(mobileClosedLayout));
      assert.ok(
        !mobileClosedLayout.controlBand || mobileClosedLayout.controlBand.height < 1,
        "Active practice should hide setup mode controls."
      );
      assert.equal(mobileClosedLayout.currentRowVisible, false, JSON.stringify(mobileClosedLayout));
      assert.ok(
        mobileClosedLayout.prompt.offsetTop < 430,
        `Active prompt should appear quickly after compact study chrome: ${JSON.stringify(mobileClosedLayout)}`
      );
      assert.equal(mobileClosedLayout.activeStatus, null, "Active practice should not render duplicate status chrome.");
      assert.ok(
        mobileClosedLayout.easyPanel.height <= 430,
        `Easy Mode keyword panel should show the full hint bank without becoming unwieldy: ${JSON.stringify(mobileClosedLayout)}`
      );
      assert.equal(mobileClosedLayout.textareaCount, 0, "Mobile Easy Step 1 should not render a textarea.");
      assert.ok(
        mobileClosedLayout.answer.top < 680,
        "Answer surface should be reached quickly in the mobile study flow."
      );
      assert.equal(mobileClosedLayout.modeMaxHeight, 0, "Mode controls should not render in active practice.");
      assert.equal(mobileClosedLayout.modeDescriptionVisible, false, JSON.stringify(mobileClosedLayout));

      await client.send("Page.navigate", { url: coreDefinitionUrl });
      const mobileCoreDefinitionSnapshot = await waitForSnapshot(
        client,
        snapshot =>
          snapshot.currentUrl.includes("file=core-definitions") &&
          snapshot.modeFullActive &&
          snapshot.modeEasyDisabled === false,
        "Mobile core definitions should open with Easy Mode available."
      );

      assert.equal(mobileCoreDefinitionSnapshot.easyStep, "");
      await clickElement(client, "mode-scaffold");
      await waitForSnapshot(
        client,
        snapshot => snapshot.modeEasyActive && snapshot.startButtonText === "Start Easy Mode",
        "Mobile core-definition setup did not select Easy Mode."
      );
      await clickElement(client, "session-start");
      const mobileCoreEasySnapshot = await waitForSnapshot(
        client,
        snapshot =>
          snapshot.currentUrl.includes("file=core-definitions") &&
          snapshot.modeEasyActive &&
          snapshot.easyStep === "keywords" &&
          snapshot.easyKeywordCount > 0 &&
          snapshot.textareaCount === 0,
        "Mobile core-definition Easy Mode should render keyword chips without typing UI."
      );
      assert.equal(mobileCoreEasySnapshot.currentUrl.includes("file=core-definitions"), true);

      await client.send("Page.navigate", { url: targetUrl });
      await waitForSnapshot(
        client,
        snapshot => snapshot.currentUrl.includes("file=guided-cloze") && snapshot.startButtonText === "Start Easy Mode",
        "Guided cloze setup did not restore after the mobile core-definition Easy Mode regression."
      );
      await clickElement(client, "session-start");
      await waitForSnapshot(
        client,
        snapshot => snapshot.title === expectedPromptTitle && snapshot.easyStep === "keywords",
        "Guided cloze did not restore after the mobile core-definition Easy Mode regression."
      );
    }

    await clickAllEasyKeywordChips(client);
    const afterKeywordSelection = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.easyStep === "keywords" &&
        snapshot.easySelectedKeywordCount === snapshot.easyKeywordCount &&
        snapshot.visibleActionLabels.includes("Continue to copy"),
      "Selecting all Easy Mode keywords did not enable Continue to copy."
    );

    assert.equal(afterKeywordSelection.textareaCount, 0);
    assert.ok(
      afterKeywordSelection.skeletonFilledBlankCount >= afterKeywordSelection.easyKeywordCount,
      "Selected keyword chips should fill all matching skeleton slots, including repeated words."
    );
    assert.ok(afterKeywordSelection.skeletonFilledText.includes("charge"));
    assert.ok(afterKeywordSelection.skeletonFilledText.includes("density"));
    console.log("PASS 1b: Selecting all Easy Mode keyword chips enabled copy practice.");

    await pressEnter(client);
    const copyStepSnapshot = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.easyStep === "copy" &&
        snapshot.easyCopyAnswer === expectedFullAnswer &&
        snapshot.inputValue === "" &&
        snapshot.activeElementId.startsWith("easy-copy-"),
      "Easy Mode did not advance to an empty assisted-copy textarea."
    );

    assert.equal(copyStepSnapshot.wordBankToggle, "");
    assert.equal(copyStepSnapshot.visibleActionLabels.includes("Check copy"), true);
    console.log("PASS 1c: Easy Mode copy step showed the full answer and an empty textarea.");

    await pressShiftEnterInTextarea(client);
    const afterCopyShiftEnter = await waitForSnapshot(
      client,
      snapshot => snapshot.easyStep === "copy" && snapshot.inputValue === "\n",
      "Shift+Enter should insert a newline in the Easy copy textarea."
    );
    assert.equal(afterCopyShiftEnter.inputValue, "\n");

    await setActiveTextareaValue(client, "Down the group the M2+ ion has lower charge density.");
    await pressEnter(client);
    const afterWrongCopy = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.easyStep === "copy" &&
        snapshot.inputValue === "Down the group the M2+ ion has lower charge density." &&
        snapshot.reviewToggleText === "",
      "Wrong Easy Mode copy should stay in copy practice without adding review debt."
    );

    assert.equal(afterWrongCopy.inputValue, "Down the group the M2+ ion has lower charge density.");
    console.log("PASS 1d: Wrong Easy copy stayed manual and did not add review debt.");

    await setActiveTextareaValue(client, expectedFullAnswer);
    await pressEnter(client);
    const afterCorrectCopy = await waitForSnapshot(
      client,
      snapshot => snapshot.title !== expectedPromptTitle && snapshot.pageCounter === "Prompt 2 / 3",
      "Correct Easy Mode copy did not complete the question and advance by question."
    );

    assert.equal(afterCorrectCopy.reviewToggleText, "");
    console.log("PASS 1e: Correct Easy copy completed the cloze item and advanced by question.");

    if (!runMobileVisibilityCheck) {
      await evaluate(client, "localStorage.clear(); true");
      await client.send("Page.navigate", { url: coreDefinitionUrl });
      const coreDefinitionSnapshot = await waitForSnapshot(
        client,
        snapshot =>
          snapshot.currentUrl.includes("file=core-definitions") &&
          snapshot.modeFullActive &&
          snapshot.modeEasyDisabled === false &&
          snapshot.practiceHidden &&
          snapshot.easyStep === "",
        "Core definitions should open in Full Dictation with Easy Mode available but not active."
      );

      assert.equal(coreDefinitionSnapshot.currentUrl.includes("file=core-definitions"), true);
      assert.equal(coreDefinitionSnapshot.modeEasyDisabled, false);

      await clickElement(client, "mode-scaffold");
      await waitForSnapshot(
        client,
        snapshot => snapshot.modeEasyActive && snapshot.startButtonText === "Start Easy Mode",
        "Easy Mode should be selectable for a core definition."
      );
      await clickElement(client, "session-start");
      const coreEasySnapshot = await waitForSnapshot(
        client,
        snapshot =>
          snapshot.currentUrl.includes("file=core-definitions") &&
          snapshot.modeEasyActive &&
          snapshot.modeEasyDisabled === false &&
          snapshot.easyStep === "keywords" &&
          snapshot.easyKeywordCount > 0 &&
          snapshot.textareaCount === 0,
        "Easy Mode should activate on a core definition without switching the selected file."
      );

      assert.equal(coreEasySnapshot.currentUrl.includes("file=core-definitions"), true);
      console.log("PASS 1f: Core definitions support Easy Mode keyword recognition.");

      await evaluate(client, "localStorage.clear(); true");
      await client.send("Page.navigate", { url: targetUrl });
      await waitForSnapshot(
        client,
        snapshot => snapshot.currentUrl.includes("file=guided-cloze") && snapshot.startButtonText === "Start Easy Mode",
        "Guided cloze setup did not restore after the core-definition Easy Mode regression."
      );
      await clickElement(client, "session-start");
      await waitForSnapshot(
        client,
        snapshot => snapshot.title === expectedPromptTitle && snapshot.easyStep === "keywords",
        "Guided cloze did not restore after the core-definition Easy Mode regression."
      );
    }

    if (runMobileVisibilityCheck) {
      await clickAllEasyKeywordChips(client);
      await waitForSnapshot(
        client,
        snapshot => snapshot.easyStep === "keywords" && snapshot.visibleActionLabels.includes("Continue to copy"),
        "Mobile Easy Mode did not prepare the next item for copy practice."
      );
      await clickElement(client, "check-blank");
      await waitForSnapshot(
        client,
        snapshot => snapshot.easyStep === "copy" && snapshot.visibleActionLabels.includes("Check copy"),
        "Mobile Easy Mode did not enter copy practice for the next item."
      );
      const mobileCopyLayout = await getMobileLayoutSnapshot(client);

      assert.ok(
        mobileCopyLayout.visibleActionLabels.length <= 1 && mobileCopyLayout.visibleActionLabels.includes("Check copy"),
        "Mobile action bar should expose one primary action and at most one secondary action."
      );
      assert.ok(
        mobileCopyLayout.primaryActionWidth > mobileCopyLayout.viewportWidth * 0.7,
        "Primary mobile Easy action should be thumb-friendly inside the practice panel."
      );
      assert.equal(mobileCopyLayout.wordBankRect, null, "Mobile Easy Step 2 should not render a Word Bank sheet.");
      console.log("PASS 1g: Mobile Easy Mode keeps Step 1 keyboard-free and Step 2 free of Word Bank.");
    }

    await clearLocalStateAndReload(client);
    await waitForSnapshot(
      client,
      snapshot => snapshot.startButtonText === "Start Easy Mode" && snapshot.practiceHidden,
      "Guided cloze did not reset before Full Dictation regression checks."
    );
    await clickElement(client, "mode-full");
    await waitForSnapshot(
      client,
      snapshot => snapshot.modeFullActive && snapshot.startButtonText === "Start Full Dictation",
      "Full Dictation was not selected in setup."
    );
    await clickElement(client, "session-start");
    await waitForSnapshot(
      client,
      snapshot =>
        snapshot.modeFullActive &&
        snapshot.title === expectedPromptTitle &&
        snapshot.blankChip === "Blank 1" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::0",
      "Full Dictation did not restore the per-blank textarea."
    );

    await clickElement(client, "next-blank");
    const afterFirstNext = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.title === expectedPromptTitle &&
        snapshot.blankChip === "Blank 2" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1",
      "Next did not advance to Blank 2 with focus restored."
    );

    assert.equal(afterFirstNext.promptContext, expectedPromptContext);
    console.log("PASS 2: Next advanced to Blank 2 and returned focus to the textarea.");

    await clickElement(client, "next-blank");
    const afterSecondNext = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.title === expectedPromptTitle &&
        snapshot.blankChip === "Blank 3" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::2",
      "Repeated Next kept stale blank content instead of advancing to Blank 3."
    );

    assert.equal(afterSecondNext.promptContext, expectedPromptContext);
    console.log("PASS 3: Repeated Next advanced to Blank 3 without stale prompt state.");

    await clickElement(client, "prev-blank");
    const afterPrevious = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.title === expectedPromptTitle &&
        snapshot.blankChip === "Blank 2" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1",
      "Previous did not return to Blank 2 with focus restored."
    );

    assert.equal(afterPrevious.promptContext, expectedPromptContext);
    console.log("PASS 4: Previous returned to Blank 2 and restored focus to the textarea.");

    await setActiveTextareaValue(client, "draft");
    await sleep(250);
    await client.send("Page.reload");

    const afterReload = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.title === expectedPromptTitle &&
        snapshot.blankChip === "Blank 2" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1" &&
        snapshot.inputValue === "draft",
      "Refresh did not restore the active blank and draft answer."
    );

    assert.equal(afterReload.promptContext, expectedPromptContext);
    console.log("PASS 5: Refresh restored the active blank and draft answer.");

    await clickElement(client, "check-blank");
    const afterWrongCheck = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.feedbackTitle === "Needs revision" &&
        snapshot.actionBarState === "wrong" &&
        snapshot.actionLabels.includes("Try again"),
      "Incorrect answer did not switch the bottom action bar into the try-again state."
    );

    assert.equal(afterWrongCheck.hasHorizontalScroll, false);
    assert.ok(afterWrongCheck.actionLabels.includes("Continue later"));
    assert.equal(afterWrongCheck.diffTokenCount, 0, "Feedback comparison should stay inline, not token-chip based.");
    assert.ok(afterWrongCheck.diffInlineMarkCount > 0, "Feedback comparison should add inline sentence markings.");
    assert.ok(
      afterWrongCheck.diffSentenceText.includes("density") && afterWrongCheck.diffSentenceText.includes("draft"),
      "Feedback comparison should remain readable sentence text."
    );
    console.log("PASS 5b: Incorrect answer showed inline feedback and state-based action controls.");

    if (runMobileVisibilityCheck) {
      const mobileWrongLayout = await getMobileLayoutSnapshot(client);

      assert.deepEqual(
        mobileWrongLayout.visibleActionLabels,
        ["Try again", "Continue later"],
        "Wrong-state mobile action bar should expose Try again plus Continue later."
      );
      assert.ok(
        mobileWrongLayout.primaryActionWidth > mobileWrongLayout.viewportWidth * 0.82,
        "Try again should remain the dominant wrong-state action."
      );
      console.log("PASS 5c: Wrong-state mobile action bar keeps Continue later visible.");
    }

    await clickElement(client, "reveal-blank");
    const afterReveal = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.feedbackTitle === "Answer revealed" &&
        snapshot.revealNote.includes("Current target: Blank 2.") &&
        snapshot.reviewToggleText === "" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1" &&
        !snapshot.pageText.toLowerCase().includes("minimum pass"),
      "Reveal did not apply to the active blank or expose the review queue correctly."
    );

    assert.ok(afterReveal.revealAnswerText.includes("Down the group"));
    assert.ok(afterReveal.revealAnswerText.includes("less likely to decompose."));
    assert.equal(afterReveal.revealTokenCount, 0, "Reveal should not render canonical answers as token chips.");
    assert.equal(afterReveal.revealMatchMarkCount, 0, "Reveal should not mark every correct word.");
    assert.ok(afterReveal.revealProblemMarkCount > 0, "Reveal should mark only missed or wrong answer parts.");
    console.log("PASS 6: Reveal applied to Blank 2 and kept focus on the active textarea.");

    if (runMobileVisibilityCheck) {
      await waitForSnapshot(
        client,
        snapshot => snapshot.revealNote.includes("Current target: Blank 2."),
        "Reveal note did not stay attached to the active blank during the mobile visibility check."
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
            feedbackBottom: document.querySelector(".memorisation-feedback-card")?.getBoundingClientRect().bottom || 0,
          };
        })()`,
        metrics =>
          Boolean(metrics) &&
          metrics.fieldBottom <= metrics.actionBarTop &&
          metrics.revealTop < metrics.actionBarTop &&
          metrics.feedbackBottom <= metrics.actionBarTop,
        "Sticky mobile action bar still obscures the focused or revealed content."
      );

      console.log("PASS 6b: Mobile sticky action bar left the focused field and reveal content visible.");
    }

    await clickSelector(client, ".memorisation-practice-refine");
    await waitForSnapshot(
      client,
      snapshot => snapshot.practiceHidden && snapshot.modeFullActive && snapshot.currentUrl.includes("topic=group-2"),
      "Setup did not reopen after reveal."
    );
    await clickElement(client, "mode-review");
    await waitForSnapshot(
      client,
      snapshot => snapshot.modeReviewActive && snapshot.startButtonText === "Start review",
      "Review mode was not selectable from setup after reveal."
    );
    await clickElement(client, "session-start");
    const reviewSnapshot = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.pageCounter === "Review 1 / 3" &&
        snapshot.blankChip === "Blank 2" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1",
      "Review queue did not open on the expected active blank."
    );

    assert.equal(reviewSnapshot.title, expectedPromptTitle);
    console.log("PASS 7: Review queue opened from setup on the highest-priority revealed blank.");

    await clickSelector(client, ".memorisation-practice-refine");
    await waitForSnapshot(
      client,
      snapshot => snapshot.practiceHidden && snapshot.startButtonText === "Start review",
      "Setup did not reopen from review."
    );
    await clickElement(client, "mode-full");
    await waitForSnapshot(
      client,
      snapshot => snapshot.modeFullActive && snapshot.startButtonText === "Start Full Dictation",
      "Full Dictation was not selectable from setup after review."
    );
    await clickElement(client, "session-start");
    const backToMainSnapshot = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.pageCounter.startsWith("Prompt ") &&
        snapshot.blankChip === "Blank 2" &&
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1",
      "Back to main session did not restore the pre-review active blank."
    );

    assert.equal(backToMainSnapshot.title, expectedPromptTitle);
    console.log("PASS 8: Leaving review restored the main-session active blank.");
    console.log("Browser active-blank regression checks passed.");
  } catch (error) {
    const chromeExitDetails = chromeProcess.exitCode != null ? ` Chrome exit code: ${chromeProcess.exitCode}.` : "";
    const stderrDetails = chromeStderr ? ` Chrome stderr: ${chromeStderr.trim()}` : "";
    throw new Error(`${error.message}${chromeExitDetails}${stderrDetails}`);
  } finally {
    await client.close().catch(() => {});
    chromeProcess.kill("SIGTERM");
    await closeServer(server).catch(() => {});
    await rm(userDataDirectory, { recursive: true, force: true }).catch(() => {});
  }
}

run().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
