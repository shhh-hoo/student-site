(() => {
  const themeQueryKey = "theme";
  const themeStorageKey = "theme-preference";
  const systemThemeValue = "system";
  const validThemes = new Set(["light", "dark"]);
  const validThemePreferences = new Set([...validThemes, systemThemeValue]);
  const themeMediaQuery =
    typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function createSearchParams(source = window.location.search) {
    if (source instanceof URLSearchParams) {
      return new URLSearchParams(source);
    }

    const normalizedSource = typeof source === "string" ? source.replace(/^[^?]*\?/, "") : String(source || "");

    return new URLSearchParams(normalizedSource);
  }

  function isThemeValue(value) {
    return validThemes.has(String(value || "").trim());
  }

  function isThemePreferenceValue(value) {
    return validThemePreferences.has(String(value || "").trim());
  }

  function getSavedPreference() {
    try {
      const savedPreference = window.localStorage?.getItem(themeStorageKey) || systemThemeValue;
      return isThemePreferenceValue(savedPreference) ? savedPreference : systemThemeValue;
    } catch {
      return systemThemeValue;
    }
  }

  function getExplicitThemePreference(source = window.location.search) {
    const themeValue = createSearchParams(source).get(themeQueryKey);
    return isThemePreferenceValue(themeValue) ? themeValue : "";
  }

  function getExplicitTheme(source = window.location.search) {
    const explicitPreference = getExplicitThemePreference(source);
    return isThemeValue(explicitPreference) ? explicitPreference : "";
  }

  function resolveTheme(source = window.location.search) {
    const explicitPreference = getExplicitThemePreference(source);

    if (isThemeValue(explicitPreference)) {
      return explicitPreference;
    }

    const savedPreference = explicitPreference || getSavedPreference();

    if (isThemeValue(savedPreference)) {
      return savedPreference;
    }

    return themeMediaQuery?.matches ? "dark" : "light";
  }

  function shouldFollowSystemTheme(source = window.location.search) {
    const explicitPreference = getExplicitThemePreference(source);

    if (explicitPreference) {
      return explicitPreference === systemThemeValue;
    }

    return getSavedPreference() === systemThemeValue;
  }

  function applyTheme(source = window.location.search) {
    const resolvedTheme = resolveTheme(source);

    document.documentElement.dataset.theme = resolvedTheme;
    return resolvedTheme;
  }

  function preserveThemeInSearchParams(
    searchParams,
    explicitThemePreference = getExplicitThemePreference(window.location.search)
  ) {
    if (searchParams instanceof URLSearchParams && isThemePreferenceValue(explicitThemePreference)) {
      searchParams.set(themeQueryKey, explicitThemePreference);
    }

    return searchParams;
  }

  function preserveThemeOnUrl(
    destination,
    base = window.location.href,
    explicitThemePreference = getExplicitThemePreference(window.location.search)
  ) {
    const resolvedDestination = destination instanceof URL ? destination : new URL(String(destination || ""), base);

    preserveThemeInSearchParams(resolvedDestination.searchParams, explicitThemePreference);
    return resolvedDestination;
  }

  function preserveThemeOnAnchors(
    root = document,
    explicitThemePreference = getExplicitThemePreference(window.location.search)
  ) {
    const anchorRoot = root && typeof root.querySelectorAll === "function" ? root : document;
    const anchors = anchorRoot.querySelectorAll("[data-preserve-theme]");

    anchors.forEach(anchor => {
      if (!(anchor instanceof Element) || anchor.tagName !== "A") {
        return;
      }

      const href = anchor.getAttribute("href");

      if (!href) {
        return;
      }

      const destination = preserveThemeOnUrl(href, window.location.href, explicitThemePreference);
      anchor.setAttribute("href", destination.toString());
    });

    return anchors.length;
  }

  function setThemePreference(value) {
    const resolvedPreference = isThemePreferenceValue(value) ? value : systemThemeValue;

    try {
      window.localStorage?.setItem(themeStorageKey, resolvedPreference);
    } catch {}

    applyTheme();
    return resolvedPreference;
  }

  function clearThemePreference() {
    try {
      window.localStorage?.removeItem(themeStorageKey);
    } catch {}

    applyTheme();
    return systemThemeValue;
  }

  function handleSystemThemeChange() {
    if (shouldFollowSystemTheme()) {
      applyTheme();
    }
  }

  window.StudentSiteTheme = {
    themeQueryKey,
    themeStorageKey,
    isThemeValue,
    isThemePreferenceValue,
    getSavedPreference,
    getExplicitThemePreference,
    getExplicitTheme,
    resolveTheme,
    applyTheme,
    setThemePreference,
    clearThemePreference,
    preserveThemeInSearchParams,
    preserveThemeOnUrl,
    preserveThemeOnAnchors,
  };

  window.setThemePreference = setThemePreference;

  applyTheme();

  if (themeMediaQuery) {
    if (typeof themeMediaQuery.addEventListener === "function") {
      themeMediaQuery.addEventListener("change", handleSystemThemeChange);
    } else if (typeof themeMediaQuery.addListener === "function") {
      themeMediaQuery.addListener(handleSystemThemeChange);
    }
  }
})();
