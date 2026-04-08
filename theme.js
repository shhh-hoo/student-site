(() => {
  const themeQueryKey = "theme";
  const validThemes = new Set(["light", "dark"]);

  function createSearchParams(source = window.location.search) {
    if (source instanceof URLSearchParams) {
      return new URLSearchParams(source);
    }

    const normalizedSource =
      typeof source === "string" ? source.replace(/^[^?]*\?/, "") : String(source || "");

    return new URLSearchParams(normalizedSource);
  }

  function isThemeValue(value) {
    return validThemes.has(String(value || "").trim());
  }

  function getExplicitTheme(source = window.location.search) {
    const themeValue = createSearchParams(source).get(themeQueryKey);
    return isThemeValue(themeValue) ? themeValue : "";
  }

  function resolveTheme(source = window.location.search) {
    const explicitTheme = getExplicitTheme(source);

    if (explicitTheme) {
      return explicitTheme;
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(source = window.location.search) {
    const resolvedTheme = resolveTheme(source);

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    return resolvedTheme;
  }

  function preserveThemeInSearchParams(
    searchParams,
    explicitTheme = getExplicitTheme(window.location.search),
  ) {
    if (searchParams instanceof URLSearchParams && isThemeValue(explicitTheme)) {
      searchParams.set(themeQueryKey, explicitTheme);
    }

    return searchParams;
  }

  function preserveThemeOnUrl(
    destination,
    base = window.location.href,
    explicitTheme = getExplicitTheme(window.location.search),
  ) {
    const resolvedDestination =
      destination instanceof URL ? destination : new URL(String(destination || ""), base);

    preserveThemeInSearchParams(resolvedDestination.searchParams, explicitTheme);
    return resolvedDestination;
  }

  function preserveThemeOnAnchors(
    root = document,
    explicitTheme = getExplicitTheme(window.location.search),
  ) {
    const anchorRoot = root && typeof root.querySelectorAll === "function" ? root : document;
    const anchors = anchorRoot.querySelectorAll("[data-preserve-theme]");

    anchors.forEach((anchor) => {
      if (!(anchor instanceof Element) || anchor.tagName !== "A") {
        return;
      }

      const href = anchor.getAttribute("href");

      if (!href) {
        return;
      }

      const destination = preserveThemeOnUrl(href, window.location.href, explicitTheme);
      anchor.setAttribute("href", destination.toString());
    });

    return anchors.length;
  }

  window.StudentSiteTheme = {
    themeQueryKey,
    isThemeValue,
    getExplicitTheme,
    resolveTheme,
    applyTheme,
    preserveThemeInSearchParams,
    preserveThemeOnUrl,
    preserveThemeOnAnchors,
  };

  applyTheme();
})();
