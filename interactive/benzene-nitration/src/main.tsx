import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { MechanismDemoPage } from "./MechanismDemoPage";

const root = document.getElementById("benzene-nitration-root");

if (!root) {
  throw new Error("Benzene nitration route root was not found.");
}

createRoot(root).render(
  <StrictMode>
    <MechanismDemoPage />
  </StrictMode>
);

window.StudentSiteTheme?.preserveThemeOnAnchors?.();
