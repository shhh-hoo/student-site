import { useEffect, useMemo, useState } from "react";

import fixtureJson from "../fixtures/benzene-nitration.v1.json";
import { validateMechanismFixture } from "./fixtureValidation";
import { MechanismPanel } from "./MechanismPanel";
import { formatChemistryText } from "./renderers/chemistryText";
import { createMechanismDemoState, getActivePanel, movePanel, setPanelIndex } from "./state";

export function MechanismDemoPage() {
  const fixture = useMemo(() => validateMechanismFixture(fixtureJson), []);
  const [demoState, setDemoState] = useState(() => createMechanismDemoState(fixture));
  const activePanel = getActivePanel(demoState);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === "ArrowLeft") {
        setDemoState(current => movePanel(current, -1));
      }

      if (event.key === "ArrowRight") {
        setDemoState(current => movePanel(current, 1));
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="interactive-hero mechanism-demo-hero">
        <a className="interactive-return" href="../index.html" data-preserve-theme>
          Back to Interactive
        </a>
        <p className="interactive-kicker">Student Site · Interactive Chemistry</p>
        <div className="interactive-hero-grid mechanism-demo-hero__grid">
          <div className="interactive-title-block">
            <div className="interactive-meta-row">
              <span className="interactive-meta-chip">CAIE 9701</span>
              <span className="interactive-meta-chip">Exam mode</span>
              <span className="interactive-meta-chip">2D mechanism</span>
            </div>
            <h1>{fixture.title}</h1>
            <p className="interactive-summary">{fixture.subtitle}</p>
          </div>
          <div className="interactive-meta-group">
            <article className="interactive-meta-card">
              <span>Focus</span>
              <strong>NO2+ attack, sigma complex, and restored aromaticity.</strong>
            </article>
            <article className="interactive-meta-card">
              <span>Scope</span>
              <strong>Three panels only. No resonance toggle or 3D view.</strong>
            </article>
          </div>
        </div>
      </header>

      <main className="interactive-app-shell mechanism-demo-layout">
        <MechanismPanel
          fixture={fixture}
          panel={activePanel}
          activePanelIndex={demoState.activePanelIndex}
          onPrevious={() => setDemoState(current => movePanel(current, -1))}
          onNext={() => setDemoState(current => movePanel(current, 1))}
          onSelectPanel={panelIndex => setDemoState(current => setPanelIndex(current, panelIndex))}
        />

        <aside className="mechanism-side" aria-label="Reaction summary">
          <section className="interactive-subtle-panel mechanism-info-card">
            <p className="mechanism-block-label">Overall reaction</p>
            <p className="mechanism-equation">{formatChemistryText(fixture.reaction.overallEquation)}</p>
            <p className="mechanism-key-idea">{fixture.reaction.keyIdea}</p>
          </section>

          <section className="interactive-subtle-panel mechanism-info-card">
            <p className="mechanism-block-label">Conditions</p>
            <div className="mechanism-chip-list">
              {fixture.reaction.conditions.map(condition => (
                <span key={condition} className="mechanism-info-chip">
                  {formatChemistryText(condition)}
                </span>
              ))}
            </div>
          </section>

          <section className="interactive-accent-panel mechanism-info-card">
            <p className="mechanism-block-label">Exam checklist</p>
            <ul className="mechanism-checklist">
              {fixture.examChecklist.map(checklistItem => (
                <li key={checklistItem}>{formatChemistryText(checklistItem)}</li>
              ))}
            </ul>
          </section>
        </aside>
      </main>
    </>
  );
}
