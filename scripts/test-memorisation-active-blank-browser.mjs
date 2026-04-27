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
const emptyCoreDefinitionPath =
  "/interactive/9701-memorisation-bank/?stage=AS&level=level-1-core&topic=atomic-structure&file=core-definitions&definition_scope=paper_only";
const multiRoundGroup2Path =
  "/interactive/9701-memorisation-bank/?stage=AS&level=level-3-multi-round-cloze&topic=group-2&file=multi-round-cloze";
const expectedPromptTitle = "Explain the trend in thermal stability of Group 2 carbonates.";
const expectedPromptContext =
  "Down the group the M2+ ion has lower _____ _____. So it polarises the carbonate ion _____. The carbonate ion is less distorted and is less likely to decompose.";
const expectedFullAnswer =
  "Down the group the M2+ ion has lower charge density. So it polarises the carbonate ion less. The carbonate ion is less distorted and is less likely to decompose.";
const coreDefinitionContentId =
  "mb:canonical:v1:as:level-1-core:atomic-structure:core-definitions:as-def-001:single:blank-0";
const guidedBlank0ContentId = "mb:canonical:v1:as:level-2-guided-cloze:group-2:guided-cloze:as-exp-003:cloze:blank-0";
const guidedBlank1ContentId = "mb:canonical:v1:as:level-2-guided-cloze:group-2:guided-cloze:as-exp-003:cloze:blank-1";
const guidedBlank2ContentId = "mb:canonical:v1:as:level-2-guided-cloze:group-2:guided-cloze:as-exp-003:cloze:blank-2";
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
      persistedEasyState: (() => {
        try {
          const persisted = Object.values(localStorage)
            .map(value => {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            })
            .find(value => Array.isArray(value?.easyQuestionStates));
          return {
            step: persisted?.easyQuestionStates?.[0]?.easyStep || "",
            selectedCount: persisted?.easyQuestionStates?.[0]?.selectedKeywordIds?.length || 0,
          };
        } catch {
          return {
            step: "",
            selectedCount: 0,
          };
        }
      })(),
      modeControlsVisible: Array.from(document.querySelectorAll(".memorisation-mode-button")).some(button => {
        const styles = window.getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        return styles.display !== "none" && styles.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      }),
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
      setupInert:
        Boolean(document.getElementById("session-setup")?.inert),
      setupAriaHidden:
        document.getElementById("session-setup")?.getAttribute("aria-hidden") || "",
      practiceHidden:
        document.getElementById("practice-shell")?.hidden ?? false,
      practiceInert:
        Boolean(document.getElementById("practice-shell")?.inert),
      modeControlsFocusable:
        Array.from(document.querySelectorAll(".memorisation-mode-button")).some(button => {
          const hiddenAncestor = button.closest("[hidden], [aria-hidden='true']");
          return !hiddenAncestor && !button.disabled && button.tabIndex >= 0;
        }),
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
      bannerText:
        document.querySelector("#session-banner") && !document.querySelector("#session-banner").hidden
          ? document.querySelector("#session-banner").textContent.replace(/\\s+/g, " ").trim()
          : "",
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
        actionBarPosition: window.getComputedStyle(document.querySelector(".memorisation-action-bar") || document.body)
          .position,
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

async function getDarkModeReadabilitySnapshot(client) {
  return evaluate(
    client,
    `(() => {
      const parseRgb = value => {
        const match = String(value || "").match(/rgba?\\(([^)]+)\\)/);

        if (!match) {
          return null;
        }

        const parts = match[1].split(",").map(part => Number.parseFloat(part.trim()));
        return {
          r: parts[0],
          g: parts[1],
          b: parts[2],
          a: parts.length > 3 ? parts[3] : 1,
        };
      };

      const channel = value => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };

      const luminance = color => 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
      const contrast = (left, right) => {
        const leftLum = luminance(left);
        const rightLum = luminance(right);
        return (Math.max(leftLum, rightLum) + 0.05) / (Math.min(leftLum, rightLum) + 0.05);
      };

      const isVisible = element => {
        if (!element) {
          return false;
        }

        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);
        return styles.display !== "none" && styles.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };

      const getOpaqueBackground = element => {
        let current = element;

        while (current) {
          const color = parseRgb(window.getComputedStyle(current).backgroundColor);

          if (color && color.a > 0.05) {
            return color;
          }

          current = current.parentElement;
        }

        return parseRgb(window.getComputedStyle(document.body).backgroundColor) || { r: 18, g: 15, b: 14, a: 1 };
      };

      const targets = [
        { label: "question prompt", selector: "#active-prompt-title" },
        { label: "prompt context", selector: "#active-prompt-context" },
        { label: "answer input", selector: ".memorisation-input__mirror" },
        { label: "answer placeholder", selector: "textarea.memorisation-input", pseudo: "::placeholder" },
        { label: "feedback", selector: ".memorisation-feedback" },
        { label: "diff text", selector: ".memorisation-diff__sentence" },
        { label: "revealed answer", selector: ".memorisation-reveal .memorisation-answer__text" },
        { label: "review queue card", selector: ".memorisation-outline__item" },
        { label: "disabled button", selector: "#prev-blank", minimumContrast: 3 },
        { label: "Easy Mode panel", selector: ".memorisation-easy-panel" },
        { label: "Easy Mode keyword", selector: ".memorisation-easy-keyword" },
      ];

      const entries = targets.map(target => {
        const element = document.querySelector(target.selector);

        if (!isVisible(element)) {
          return {
            label: target.label,
            missing: true,
            contrast: 0,
            minimumContrast: target.minimumContrast || 4.5,
          };
        }

        const textColor = parseRgb(window.getComputedStyle(element, target.pseudo || null).color);
        const backgroundColor = getOpaqueBackground(element);
        const contrastRatio = textColor && backgroundColor ? contrast(textColor, backgroundColor) : 0;

        return {
          label: target.label,
          missing: false,
          contrast: Math.round(contrastRatio * 100) / 100,
          minimumContrast: target.minimumContrast || 4.5,
          color: window.getComputedStyle(element, target.pseudo || null).color,
          backgroundColor: window.getComputedStyle(element).backgroundColor,
        };
      });

      const focusTarget = [document.getElementById("check-blank"), document.querySelector(".memorisation-easy-action")].find(
        candidate => isVisible(candidate)
      );
      focusTarget?.focus();
      const focusStyles = focusTarget ? window.getComputedStyle(focusTarget) : null;

      return {
        theme: document.documentElement.dataset.theme || "",
        entries,
        failures: entries.filter(entry => !entry.missing && entry.contrast < entry.minimumContrast),
        focusOutlineVisible: Boolean(
          focusTarget &&
            focusStyles &&
            focusStyles.outlineStyle !== "none" &&
            Number.parseFloat(focusStyles.outlineWidth) > 0
        ),
      };
    })()`
  );
}

function assertDarkModeReadability(snapshot, requiredLabels, label) {
  assert.equal(snapshot.theme, "dark", `${label}: route should use the real dark theme attribute.`);

  requiredLabels.forEach(requiredLabel => {
    const entry = snapshot.entries.find(candidate => candidate.label === requiredLabel);
    assert.ok(entry, `${label}: ${requiredLabel} was not sampled.`);
    assert.equal(entry.missing, false, `${label}: ${requiredLabel} should be visible.`);
    assert.ok(
      entry.contrast >= entry.minimumContrast,
      `${label}: ${requiredLabel} contrast ${entry.contrast} is below ${entry.minimumContrast}.`
    );
  });

  assert.equal(snapshot.focusOutlineVisible, true, `${label}: focus outline should be visible.`);
  assert.deepEqual(
    snapshot.failures,
    [],
    `${label}: dark-mode contrast failures: ${JSON.stringify(snapshot.failures)}`
  );
}

async function runDarkModeReadabilityChecks(client, targetUrl, easyModeUrl) {
  const darkModeTargetUrl = `${targetUrl}&theme=dark`;
  const darkModeEasyModeUrl = `${easyModeUrl}&theme=dark`;

  await clearLocalStateAndNavigate(client, darkModeTargetUrl);
  await waitForSnapshot(
    client,
    snapshot => snapshot.currentUrl.includes("theme=dark") && snapshot.startButtonText === "Start Full Dictation",
    "Dark-mode route did not open the setup launcher."
  );

  await clickElement(client, "mode-full");
  await waitForSnapshot(
    client,
    snapshot => snapshot.modeFullActive && snapshot.startButtonText === "Start Full Dictation",
    "Dark-mode Full Dictation was not selectable."
  );
  await clickElement(client, "session-start");
  await waitForSnapshot(
    client,
    snapshot => snapshot.title === expectedPromptTitle && snapshot.textareaCount === 1,
    "Dark-mode Full Dictation did not render the answer input."
  );
  await setActiveTextareaValue(client, "draft");
  await clickElement(client, "check-blank");
  await waitForSnapshot(
    client,
    snapshot => snapshot.feedbackTitle === "Needs revision" && snapshot.diffInlineMarkCount > 0,
    "Dark-mode wrong answer did not render feedback and diff text."
  );

  assertDarkModeReadability(
    await getDarkModeReadabilitySnapshot(client),
    [
      "question prompt",
      "prompt context",
      "answer input",
      "answer placeholder",
      "feedback",
      "diff text",
      ...(runMobileVisibilityCheck ? [] : ["review queue card"]),
      "disabled button",
    ],
    "Full Dictation wrong feedback"
  );

  await clickElement(client, "reveal-blank");
  await waitForSnapshot(
    client,
    snapshot => snapshot.feedbackTitle === "Answer revealed" && snapshot.revealAnswerText.includes("Down the group"),
    "Dark-mode reveal did not render the canonical answer."
  );

  assertDarkModeReadability(
    await getDarkModeReadabilitySnapshot(client),
    [
      "question prompt",
      "prompt context",
      "answer input",
      "answer placeholder",
      "feedback",
      "revealed answer",
      ...(runMobileVisibilityCheck ? [] : ["review queue card"]),
      "disabled button",
    ],
    "Full Dictation reveal"
  );

  await clearLocalStateAndNavigate(client, darkModeEasyModeUrl);
  await waitForSnapshot(
    client,
    snapshot =>
      snapshot.currentUrl.includes("theme=dark") &&
      snapshot.startButtonText === "Start Full Dictation" &&
      snapshot.modeEasyDisabled === false,
    "Dark-mode Easy Mode setup did not render."
  );
  await clickElement(client, "mode-scaffold");
  await waitForSnapshot(
    client,
    snapshot => snapshot.modeEasyActive && snapshot.startButtonText === "Start Easy Mode",
    "Dark-mode Easy Mode was not selectable for Level 1."
  );
  await clickElement(client, "session-start");
  await waitForSnapshot(
    client,
    snapshot => snapshot.currentUrl.includes("file=core-definitions") && snapshot.easyStep === "keywords",
    "Dark-mode Easy Mode did not render the keyword panel."
  );

  assertDarkModeReadability(
    await getDarkModeReadabilitySnapshot(client),
    [
      "question prompt",
      ...(runMobileVisibilityCheck ? [] : ["review queue card"]),
      "Easy Mode panel",
      "Easy Mode keyword",
    ],
    "Easy Mode"
  );

  console.log("PASS 10: Dark mode keeps Memorisation Bank practice surfaces readable on the real route.");
}

async function seedLegacySessionKey(client, key, payload) {
  await evaluate(
    client,
    `(() => {
      const originalSetItem = Storage.prototype.setItem;

      localStorage.clear();
      originalSetItem.call(localStorage, ${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(payload))});
      Storage.prototype.setItem = function noopSetItem() {};
      return true;
    })()`
  );
}

async function getLegacyProtectionSnapshot(client, key) {
  return evaluate(
    client,
    `(() => {
      const rawValue = localStorage.getItem(${JSON.stringify(key)});
      const rawBackup = localStorage.getItem("mb:legacy-session-backup:v1");
      let backup = null;

      try {
        backup = JSON.parse(rawBackup || "null");
      } catch {}

      const report = window.MemorisationBankDebug?.reportProgressKeys?.() || null;
      const serializedReport = JSON.stringify(report);
      return {
        rawValue,
        backupEntryCount: Array.isArray(backup?.entries) ? backup.entries.length : 0,
        matchingBackupRaw:
          backup?.entries?.find(entry => entry.key === ${JSON.stringify(key)})?.rawValue || "",
        reportAvailable: Boolean(report),
        reportIncludesTypedValue: serializedReport.includes("legacy typed answer") || serializedReport.includes("legacy copy answer"),
        rawExportWarning:
          window.MemorisationBankDebug?.exportRawLegacyBackup?.().warning || "",
      };
    })()`
  );
}

async function getLearningStorageSnapshot(client) {
  return evaluate(
    client,
    `(() => {
      const parse = key => {
        try {
          return JSON.parse(localStorage.getItem(key) || "null");
        } catch {
          return null;
        }
      };
      const progress = parse("mb:progress:v1");
      const reviewList = parse("mb:review-list:v1");
      const migrationFlag = parse("mb:progress:migrated:v1");
      const debugSnapshot = window.MemorisationBankDebug?.getLearningStateSnapshot?.() || null;
      const serializedProgress = JSON.stringify(progress || {});

      return {
        progress,
        reviewList,
        migrationFlag,
        debugSnapshot,
        recordCount: Object.keys(progress?.records || {}).length,
        reviewCount: Object.keys(reviewList?.items || {}).length,
        containsTypedAnswer:
          serializedProgress.includes("legacy typed answer") ||
          serializedProgress.includes("legacy copy answer") ||
          serializedProgress.includes("wrong level 1 copy") ||
          serializedProgress.includes("draft"),
      };
    })()`
  );
}

async function waitForLearningRecord(client, contentId, predicate, message) {
  return waitForEvaluation(
    client,
    `(() => {
      try {
        const progress = JSON.parse(localStorage.getItem("mb:progress:v1") || "null");
        const reviewList = JSON.parse(localStorage.getItem("mb:review-list:v1") || "null");
        return {
          record: progress?.records?.[${JSON.stringify(contentId)}] || null,
          reviewItem: reviewList?.items?.[${JSON.stringify(contentId)}] || null,
          progress,
          reviewList,
        };
      } catch {
        return {
          record: null,
          reviewItem: null,
          progress: null,
          reviewList: null,
        };
      }
    })()`,
    value => Boolean(value?.record) && predicate(value),
    message
  );
}

async function runLegacyProgressProtectionChecks(client, targetUrl, emptyUrl) {
  const activeSessionKey = "memorisation-bank-session::AS::level-2-guided-cloze::group-2::guided-cloze::all::all";
  const emptySessionKey =
    "memorisation-bank-session::AS::level-1-core::atomic-structure::core-definitions::paper_only::all";
  const legacyPayload = {
    version: 1,
    selectionKey: "AS::level-2-guided-cloze::group-2::guided-cloze::all::all",
    blankStates: [
      {
        id: "guided-cloze::group-2::as-exp-003::0",
        value: "legacy typed answer",
        status: "wrong",
        wrongCount: 1,
      },
    ],
    easyQuestionStates: [
      {
        questionId: "guided-cloze::group-2::as-exp-003",
        copyValue: "legacy copy answer",
      },
    ],
  };

  await seedLegacySessionKey(client, activeSessionKey, legacyPayload);
  await client.send("Page.navigate", { url: targetUrl });
  await waitForSnapshot(
    client,
    snapshot =>
      snapshot.currentUrl.includes("file=guided-cloze") &&
      snapshot.startButtonText === "Start Full Dictation" &&
      snapshot.modeEasyDisabled,
    "Legacy session key test did not open the guided cloze setup."
  );

  const activeProtection = await getLegacyProtectionSnapshot(client, activeSessionKey);
  assert.equal(activeProtection.rawValue, JSON.stringify(legacyPayload));
  assert.equal(activeProtection.matchingBackupRaw, JSON.stringify(legacyPayload));
  assert.equal(activeProtection.reportAvailable, true);
  assert.equal(activeProtection.reportIncludesTypedValue, false);
  assert.ok(activeProtection.rawExportWarning.includes("private learning data"));

  const migratedLegacyProgress = await waitForLearningRecord(
    client,
    guidedBlank0ContentId,
    value =>
      value.record.wrongCount === 1 &&
      value.record.legacySources?.length === 1 &&
      value.reviewItem?.reasons?.includes("wrong-answer"),
    "Legacy blank progress was not migrated through the canonical content index."
  );
  const migratedLegacySnapshot = await getLearningStorageSnapshot(client);
  assert.equal(migratedLegacySnapshot.containsTypedAnswer, false);
  assert.equal(migratedLegacySnapshot.debugSnapshot.activeContentId, guidedBlank0ContentId);
  assert.equal(migratedLegacyProgress.record.legacySources[0].legacyKind, "blank");

  await client.send("Page.reload");
  await waitForSnapshot(
    client,
    snapshot =>
      snapshot.currentUrl.includes("file=guided-cloze") && snapshot.startButtonText === "Start Full Dictation",
    "Legacy migration idempotency reload did not return to guided cloze setup."
  );
  const remigratedLegacyProgress = await waitForLearningRecord(
    client,
    guidedBlank0ContentId,
    value => value.record.wrongCount === 1 && value.record.legacySources?.length === 1,
    "Refreshing after legacy migration should not double-count migrated attempts."
  );
  assert.equal(remigratedLegacyProgress.record.wrongCount, 1);

  const unRestoredCurrentPayload = {
    version: 2,
    selectionKey: "AS::level-2-guided-cloze::group-2::guided-cloze::all::all",
    currentBlankId: "guided-cloze::group-2::as-exp-003::0",
    learningMode: "full",
    selectedMode: "full",
    sessionView: "practice",
  };

  await seedLegacySessionKey(client, activeSessionKey, unRestoredCurrentPayload);
  await client.send("Page.navigate", { url: targetUrl });
  await waitForSnapshot(
    client,
    snapshot => snapshot.currentUrl.includes("file=guided-cloze") && snapshot.title === expectedPromptTitle,
    "Un-restored current-version session key test did not open the guided cloze session."
  );
  await setActiveTextareaValue(client, "new default v2 value must not overwrite");
  await sleep(250);

  const unRestoredProtection = await getLegacyProtectionSnapshot(client, activeSessionKey);
  assert.equal(unRestoredProtection.rawValue, JSON.stringify(unRestoredCurrentPayload));
  assert.equal(unRestoredProtection.matchingBackupRaw, JSON.stringify(unRestoredCurrentPayload));

  await seedLegacySessionKey(client, emptySessionKey, {
    ...legacyPayload,
    selectionKey: "AS::level-1-core::atomic-structure::core-definitions::paper_only::all",
  });
  await client.send("Page.navigate", { url: emptyUrl });
  await waitForSnapshot(
    client,
    snapshot =>
      snapshot.currentUrl.includes("definition_scope=paper_only") && snapshot.pageText.includes("No session questions"),
    "Empty definition-scope route did not render the empty memorisation state."
  );

  const emptyProtection = await getLegacyProtectionSnapshot(client, emptySessionKey);
  assert.equal(
    emptyProtection.rawValue,
    JSON.stringify({
      ...legacyPayload,
      selectionKey: "AS::level-1-core::atomic-structure::core-definitions::paper_only::all",
    })
  );
  assert.ok(emptyProtection.backupEntryCount >= 1);
  assert.equal(emptyProtection.matchingBackupRaw, emptyProtection.rawValue);
  assert.equal(emptyProtection.reportIncludesTypedValue, false);
  console.log("PASS 9: Legacy session keys are backed up, redacted in reports, and not overwritten by render paths.");
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

async function clearSelectedEasyKeywordChips(client) {
  for (;;) {
    const beforeClick = await getSnapshot(client);

    if (!beforeClick.easySelectedKeywordCount) {
      return;
    }

    await evaluate(
      client,
      `(() => {
        const chip = document.querySelector('.memorisation-easy-keyword[data-selected="true"]');

        if (!chip) {
          return false;
        }

        chip.click();
        return true;
      })()`
    );
    await waitForSnapshot(
      client,
      snapshot => snapshot.easySelectedKeywordCount < beforeClick.easySelectedKeywordCount,
      "Selected Easy Mode keyword chip did not clear."
    );
  }
}

async function clickEasyKeywordChipsInSkeletonOrder(client) {
  for (;;) {
    const beforeClick = await getSnapshot(client);

    if (beforeClick.easyStep === "copy") {
      return;
    }

    await evaluate(
      client,
      `(() => {
        const nextBlank = Array.from(document.querySelectorAll(".memorisation-easy-skeleton__blank")).find(
          blank => blank.dataset.filled !== "true"
        );
        const expectedKeywordId = nextBlank?.dataset.expectedKeywordId;
        const chip = Array.from(document.querySelectorAll(".memorisation-easy-keyword")).find(
          candidate => candidate.dataset.keywordId === expectedKeywordId && candidate.dataset.selected !== "true"
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
      snapshot =>
        snapshot.easyStep === "copy" || snapshot.skeletonFilledBlankCount > beforeClick.skeletonFilledBlankCount,
      "Easy Mode keyword chip did not fill the next skeleton slot."
    );
  }
}

async function clickEasyKeywordChipsInReverseSkeletonOrder(client) {
  const expectedKeywordIds = await evaluate(
    client,
    `Array.from(document.querySelectorAll(".memorisation-easy-skeleton__blank"))
      .map(blank => blank.dataset.expectedKeywordId)
      .filter(Boolean)
      .reverse()`
  );

  if (expectedKeywordIds.length < 2) {
    throw new Error("Need at least two Easy Mode keyword slots for the wrong-order check.");
  }

  for (const expectedKeywordId of expectedKeywordIds) {
    const beforeClick = await getSnapshot(client);
    await evaluate(
      client,
      `(() => {
        const chip = Array.from(document.querySelectorAll(".memorisation-easy-keyword")).find(
          candidate => candidate.dataset.keywordId === ${JSON.stringify(expectedKeywordId)} && candidate.dataset.selected !== "true"
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
      snapshot =>
        snapshot.pageText.includes("Select the key words in the answer order before moving to copy practice.") ||
        snapshot.skeletonFilledBlankCount > beforeClick.skeletonFilledBlankCount,
      "Easy Mode reverse-order keyword chip did not fill the next skeleton slot."
    );
  }
}

async function getDuplicateSwappedSkeletonKeywordIds(client) {
  return evaluate(
    client,
    `(() => {
      const expectedIds = Array.from(document.querySelectorAll(".memorisation-easy-skeleton__blank"))
        .map(blank => blank.dataset.expectedKeywordId)
        .filter(Boolean);
      const chipTextById = new Map(
        Array.from(document.querySelectorAll(".memorisation-easy-keyword")).map(chip => [
          chip.dataset.keywordId,
          chip.textContent.trim().toLowerCase(),
        ])
      );

      for (let leftIndex = 0; leftIndex < expectedIds.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < expectedIds.length; rightIndex += 1) {
          const leftId = expectedIds[leftIndex];
          const rightId = expectedIds[rightIndex];

          if (leftId !== rightId && chipTextById.get(leftId) && chipTextById.get(leftId) === chipTextById.get(rightId)) {
            const swappedIds = [...expectedIds];
            swappedIds[leftIndex] = rightId;
            swappedIds[rightIndex] = leftId;
            return {
              ids: swappedIds,
              duplicateText: chipTextById.get(leftId),
              slotCount: expectedIds.length,
            };
          }
        }
      }

      return {
        ids: [],
        duplicateText: "",
        slotCount: expectedIds.length,
      };
    })()`
  );
}

async function clickEasyKeywordChipsByIdSequence(client, keywordIds) {
  for (const keywordId of keywordIds) {
    const beforeClick = await getSnapshot(client);
    await evaluate(
      client,
      `(() => {
        const chip = Array.from(document.querySelectorAll(".memorisation-easy-keyword")).find(
          candidate => candidate.dataset.keywordId === ${JSON.stringify(keywordId)} && candidate.dataset.selected !== "true"
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
      snapshot =>
        snapshot.easyStep === "copy" || snapshot.skeletonFilledBlankCount > beforeClick.skeletonFilledBlankCount,
      "Easy Mode keyword chip sequence did not fill the next skeleton slot."
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

async function clearLocalStateAndNavigate(client, url) {
  await evaluate(
    client,
    `(() => {
      localStorage.clear();
      Storage.prototype.setItem = function noopSetItem() {};
      location.href = ${JSON.stringify(url)};
      return true;
    })()`
  );
}

async function run() {
  const server = createStaticServer(studentSiteRoot);
  const serverPort = await listen(server);
  const targetUrl = `http://127.0.0.1:${serverPort}${targetPath}`;
  const coreDefinitionUrl = `http://127.0.0.1:${serverPort}${coreDefinitionPath}`;
  const emptyCoreDefinitionUrl = `http://127.0.0.1:${serverPort}${emptyCoreDefinitionPath}`;
  const multiRoundGroup2Url = `http://127.0.0.1:${serverPort}${multiRoundGroup2Path}`;
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
        snapshot.modeFullActive &&
        snapshot.modeEasyDisabled &&
        snapshot.practiceHidden &&
        !snapshot.setupHidden &&
        snapshot.startButtonText === "Start Full Dictation",
      "Guided cloze setup should default to Full Dictation with Easy Mode disabled."
    );

    assert.equal(launcherSnapshot.modeEasyLabel.includes("Easy Mode"), true);
    assert.equal(launcherSnapshot.activeStatusText, "");
    await clickElement(client, "mode-scaffold");
    await waitForSnapshot(
      client,
      snapshot =>
        snapshot.currentUrl.includes("file=guided-cloze") &&
        snapshot.modeFullActive &&
        snapshot.modeEasyDisabled &&
        snapshot.startButtonText === "Start Full Dictation",
      "Guided cloze should not allow Easy Mode selection."
    );
    console.log("PASS 0: Guided cloze opens in Full Dictation with Easy Mode disabled.");

    await clearLocalStateAndNavigate(client, coreDefinitionUrl);
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
      "Easy Mode should be selectable for Level 1 core definitions."
    );
    await clickElement(client, "session-start");
    const coreEasySnapshot = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.currentUrl.includes("file=core-definitions") &&
        snapshot.modeEasyActive &&
        snapshot.easyStep === "keywords" &&
        snapshot.easyKeywordCount > 0 &&
        snapshot.textareaCount === 0,
      "Easy Mode should activate on Level 1 core definitions without typing UI."
    );

    assert.equal(coreEasySnapshot.currentUrl.includes("file=core-definitions"), true);
    assert.equal(coreEasySnapshot.actionBarVisible, false, "Level 1 Easy Mode should hide Full Dictation actions.");
    assert.equal(coreEasySnapshot.modeControlsVisible, false, "Active Level 1 Easy Mode should hide setup controls.");
    assert.equal(coreEasySnapshot.activeElementId, "", "Level 1 Easy Mode Step 1 should not focus a typing field.");
    assert.equal(coreEasySnapshot.skeletonExists, true, "Level 1 Easy Mode should render an answer skeleton.");
    assert.ok(coreEasySnapshot.skeletonBlankCount > 0, "Level 1 Easy Mode skeleton should expose slots.");
    assert.equal(coreEasySnapshot.skeletonFilledBlankCount, 0, "Level 1 Easy Mode skeleton should start empty.");
    assert.equal(coreEasySnapshot.visibleActionLabels.includes("Check key words"), true);
    console.log("PASS 1: Level 1 core definitions start Easy Mode keyword recognition.");

    if (runMobileVisibilityCheck) {
      const mobileEasyLayout = await getMobileLayoutSnapshot(client);

      assert.equal(mobileEasyLayout.viewportWidth, 390);
      assert.equal(mobileEasyLayout.hasHorizontalScroll, false, JSON.stringify(mobileEasyLayout));
      assert.ok(mobileEasyLayout.easyPanel, "Mobile Level 1 Easy Mode should render the keyword panel.");
      assert.ok(
        mobileEasyLayout.easyPanel.height <= 520,
        `Mobile Level 1 Easy Mode panel should stay usable: ${JSON.stringify(mobileEasyLayout)}`
      );
      assert.equal(mobileEasyLayout.textareaCount, 0, "Mobile Level 1 Easy Step 1 should not render a textarea.");
      assert.ok(
        mobileEasyLayout.answer.top < 760,
        `Mobile Level 1 Easy answer surface should appear without deep scrolling: ${JSON.stringify(mobileEasyLayout)}`
      );
      console.log("PASS 1b: Mobile Level 1 Easy Mode keeps a usable keyword layout.");
    }

    await pressEnter(client);
    await waitForSnapshot(
      client,
      snapshot =>
        snapshot.easyStep === "keywords" &&
        snapshot.pageText.includes("Select the key words in the answer order before moving to copy practice."),
      "Enter did not check Level 1 Easy Mode keyword selections."
    );

    const focusedKeywordText = await evaluate(
      client,
      `(() => {
        const chip = document.querySelector(".memorisation-easy-keyword");
        chip?.focus();
        return chip?.textContent?.trim() || "";
      })()`
    );
    await pressEnter(client);
    await waitForSnapshot(
      client,
      snapshot =>
        snapshot.easyStep === "keywords" &&
        snapshot.easySelectedKeywordCount === 1 &&
        snapshot.skeletonFilledBlankCount === 1 &&
        snapshot.skeletonFilledText === focusedKeywordText,
      "Focused Level 1 Easy keyword Enter should toggle the chip."
    );

    await clearSelectedEasyKeywordChips(client);
    await clickEasyKeywordChipsInReverseSkeletonOrder(client);
    await waitForSnapshot(
      client,
      snapshot =>
        snapshot.easyStep === "keywords" &&
        snapshot.easySelectedKeywordCount === snapshot.easyKeywordCount &&
        snapshot.pageText.includes("Select the key words in the answer order before moving to copy practice."),
      "Wrong Level 1 Easy keyword order should stay in Step 1."
    );
    const afterKeywordOnlyLearning = await getLearningStorageSnapshot(client);
    assert.equal(afterKeywordOnlyLearning.recordCount, 0, "Keyword-only Easy activity must not record mastery.");

    await clearSelectedEasyKeywordChips(client);
    await waitForSnapshot(
      client,
      snapshot => snapshot.easyStep === "keywords" && snapshot.easySelectedKeywordCount === 0,
      "Level 1 Easy keyword selections did not clear before ordered selection."
    );
    await clickEasyKeywordChipsInSkeletonOrder(client);
    const afterCoreKeywordSelection = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.easyStep === "copy" &&
        snapshot.easyCopyAnswer &&
        snapshot.inputValue === "" &&
        snapshot.activeElementId.startsWith("easy-copy-"),
      "Correct Level 1 Easy keyword order did not enter copy practice."
    );
    const coreEasyFullAnswer = afterCoreKeywordSelection.easyCopyAnswer;

    assert.equal(afterCoreKeywordSelection.visibleActionLabels.includes("Check copy"), true);
    console.log("PASS 1c: Level 1 Easy keywords advance to copy with the canonical answer visible.");

    await client.send("Page.reload");
    const afterCoreKeywordReload = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.easyStep === "copy" &&
        snapshot.persistedEasyState.step === "copy" &&
        snapshot.persistedEasyState.selectedCount > 0 &&
        snapshot.easyCopyAnswer === coreEasyFullAnswer,
      "Level 1 Easy keyword selections did not persist across refresh."
    );
    assert.equal(afterCoreKeywordReload.textareaCount, 1);
    assert.equal(afterCoreKeywordReload.inputValue, "");
    assert.equal(afterCoreKeywordReload.visibleActionLabels.includes("Check copy"), true);

    await pressShiftEnterInTextarea(client);
    const afterCoreCopyShiftEnter = await waitForSnapshot(
      client,
      snapshot => snapshot.easyStep === "copy" && snapshot.inputValue === "\n",
      "Shift+Enter should insert a newline in the Level 1 Easy copy textarea."
    );
    assert.equal(afterCoreCopyShiftEnter.inputValue, "\n");

    await setActiveTextareaValue(client, "wrong level 1 copy");
    await pressEnter(client);
    const afterCoreWrongCopy = await waitForSnapshot(
      client,
      snapshot =>
        snapshot.easyStep === "copy" &&
        snapshot.inputValue === "wrong level 1 copy" &&
        snapshot.reviewToggleText === "",
      "Wrong Level 1 Easy copy should stay in copy practice."
    );
    assert.equal(afterCoreWrongCopy.inputValue, "wrong level 1 copy");
    await waitForLearningRecord(
      client,
      coreDefinitionContentId,
      value =>
        value.record.wrongCount === 1 &&
        value.record.hintCount === 1 &&
        value.reviewItem?.reasons?.includes("incorrect"),
      "Wrong Level 1 Easy copy should record an incorrect scaffolded attempt."
    );

    await setActiveTextareaValue(client, coreEasyFullAnswer);
    await pressEnter(client);
    const afterCoreCorrectCopy = await waitForSnapshot(
      client,
      snapshot => snapshot.currentUrl.includes("file=core-definitions") && snapshot.pageCounter === "Prompt 2 / 5",
      "Correct Level 1 Easy copy did not complete the item and advance."
    );
    assert.equal(afterCoreCorrectCopy.reviewToggleText, "");
    const afterCoreCorrectProgress = await waitForLearningRecord(
      client,
      coreDefinitionContentId,
      value => value.record.correctCount === 1 && value.record.wrongCount === 1 && value.record.hintCount === 2,
      "Correct Level 1 Easy copy should record a scaffolded correct attempt."
    );
    assert.equal(afterCoreCorrectProgress.record.correctCount, 1);

    await client.send("Page.reload");
    await waitForSnapshot(
      client,
      snapshot => snapshot.currentUrl.includes("file=core-definitions") && snapshot.pageCounter === "Prompt 2 / 5",
      "Refresh after Level 1 Easy copy should preserve the session."
    );
    const afterCoreProgressReload = await waitForLearningRecord(
      client,
      coreDefinitionContentId,
      value => value.record.correctCount === 1 && value.record.wrongCount === 1 && value.record.hintCount === 2,
      "Refresh should preserve Level 1 Easy learning-state progress."
    );
    assert.equal(afterCoreProgressReload.record.hintCount, 2);
    console.log("PASS 1d: Level 1 Easy copy checks, persists, and advances after a correct copy.");

    await clickSelector(client, ".memorisation-practice-refine");
    await waitForSnapshot(
      client,
      snapshot =>
        snapshot.practiceHidden &&
        snapshot.modeEasyActive &&
        snapshot.startButtonText === "Start Easy Mode" &&
        snapshot.currentUrl.includes("level=level-1-core") &&
        snapshot.currentUrl.includes("file=core-definitions"),
      "Returning to setup should preserve valid Level 1 Easy Mode filters and mode."
    );
    console.log("PASS 1e: Returning to setup preserves valid Level 1 Easy Mode selection.");

    await evaluate(
      client,
      `(() => {
        const levelButton = document.querySelector('[data-level-id="level-2-guided-cloze"]');

        if (!levelButton) {
          throw new Error("Missing Level 2 switcher button.");
        }

        levelButton.click();
        return true;
      })()`
    );
    await waitForSnapshot(
      client,
      snapshot =>
        snapshot.currentUrl.includes("level=level-2-guided-cloze") &&
        snapshot.modeFullActive &&
        snapshot.modeEasyDisabled &&
        snapshot.startButtonText === "Start Full Dictation",
      "Switching from Level 1 Easy Mode to Level 2 should force Full Dictation."
    );
    console.log("PASS 1f: Switching from Level 1 Easy Mode to non-Level 1 forces Full Dictation.");

    await clearLocalStateAndNavigate(client, multiRoundGroup2Url);
    await waitForSnapshot(
      client,
      snapshot =>
        snapshot.currentUrl.includes("file=multi-round-cloze") &&
        snapshot.modeFullActive &&
        snapshot.modeEasyDisabled &&
        snapshot.startButtonText === "Start Full Dictation",
      "Multi-round cloze should open in Full Dictation with Easy Mode disabled."
    );
    console.log("PASS 1a: Later cloze levels keep Easy Mode disabled.");

    await clearLocalStateAndNavigate(client, targetUrl);
    await waitForSnapshot(
      client,
      snapshot =>
        snapshot.currentUrl.includes("file=guided-cloze") &&
        snapshot.modeFullActive &&
        snapshot.modeEasyDisabled &&
        snapshot.startButtonText === "Start Full Dictation" &&
        snapshot.practiceHidden,
      "Guided cloze did not reset before Full Dictation regression checks."
    );

    await clearLocalStateAndReload(client);
    await waitForSnapshot(
      client,
      snapshot =>
        snapshot.startButtonText === "Start Full Dictation" &&
        snapshot.modeFullActive &&
        snapshot.modeEasyDisabled &&
        snapshot.practiceHidden,
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
    await waitForLearningRecord(
      client,
      guidedBlank1ContentId,
      value =>
        value.record.wrongCount === 1 &&
        value.record.hintCount === 0 &&
        value.reviewItem?.reasons?.includes("incorrect"),
      "Full Dictation wrong answer should record wrongCount and saved review."
    );
    console.log("PASS 5b: Incorrect answer showed inline feedback and state-based action controls.");

    if (runMobileVisibilityCheck) {
      const mobileWrongLayout = await getMobileLayoutSnapshot(client);

      assert.equal(mobileWrongLayout.actionBarPosition, "static");
      assert.equal(mobileWrongLayout.visibleActionLabels.includes("Try again"), true);
      assert.equal(mobileWrongLayout.visibleActionLabels.includes("Continue later"), true);
      console.log("PASS 5c: Wrong-state mobile action bar stays lightweight and keeps Continue later available.");
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
    await waitForLearningRecord(
      client,
      guidedBlank1ContentId,
      value =>
        value.record.wrongCount === 1 &&
        value.record.revealedCount === 1 &&
        value.reviewItem?.reasons?.includes("revealed"),
      "Reveal should record revealedCount and keep the item in saved review."
    );
    const revealLearningSnapshot = await getLearningStorageSnapshot(client);
    assert.equal(
      revealLearningSnapshot.progress.records[guidedBlank2ContentId],
      undefined,
      "Reveal should not record revealedCount for other non-correct blanks in the same question."
    );
    assert.equal(
      revealLearningSnapshot.reviewList.items[guidedBlank2ContentId],
      undefined,
      "Reveal should not add other non-correct blanks in the same question to saved review."
    );
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
        "Mobile action footer still obscures the focused or revealed content."
      );

      console.log("PASS 6b: Mobile action footer left the focused field and reveal content visible.");
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
        snapshot.activeElementId === "guided-cloze::group-2::as-exp-003::1" &&
        snapshot.modeReviewActive &&
        snapshot.setupInert &&
        !snapshot.modeControlsFocusable &&
        !snapshot.visibleActionLabels.includes("Check copy"),
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

    const progressBeforeFilterChange = await getLearningStorageSnapshot(client);
    assert.equal(progressBeforeFilterChange.progress.records[guidedBlank1ContentId].revealedCount, 1);
    await client.send("Page.navigate", { url: multiRoundGroup2Url });
    await waitForSnapshot(
      client,
      snapshot =>
        snapshot.currentUrl.includes("file=multi-round-cloze") && snapshot.modeFullActive && snapshot.modeEasyDisabled,
      "Topic/file switch did not navigate to multi-round setup."
    );
    const progressAfterFilterChange = await getLearningStorageSnapshot(client);
    assert.equal(progressAfterFilterChange.progress.records[guidedBlank1ContentId].revealedCount, 1);
    assert.equal(progressAfterFilterChange.containsTypedAnswer, false);
    await runLegacyProgressProtectionChecks(client, targetUrl, emptyCoreDefinitionUrl);
    await runDarkModeReadabilityChecks(client, targetUrl, coreDefinitionUrl);
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
