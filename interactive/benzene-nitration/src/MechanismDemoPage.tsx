import { useMemo } from "react";

import BenzeneNitrationMechanism from "./BenzeneNitrationMechanism";
import { benzeneNitrationOverview, benzeneNitrationSpecies, benzeneNitrationSteps } from "./benzeneNitrationData";
import { benzeneNitrationCorrectnessChecks } from "./chemicalCorrectness";

export function MechanismDemoPage() {
  const requiredCheckCount = useMemo(
    () => benzeneNitrationCorrectnessChecks.filter(check => check.severity === "required").length,
    []
  );

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
              <span className="interactive-meta-chip">Golden reference</span>
              <span className="interactive-meta-chip">{benzeneNitrationOverview.topic}</span>
            </div>
            <h1>{benzeneNitrationOverview.title}</h1>
            <p className="interactive-summary">
              A chemically constrained five-step mechanism for electrophilic aromatic substitution.
            </p>
          </div>
          <div className="interactive-meta-group">
            <article className="interactive-meta-card">
              <span>Conditions</span>
              <strong>{benzeneNitrationOverview.conditions}</strong>
            </article>
            <article className="interactive-meta-card">
              <span>Electrophile</span>
              <strong>{benzeneNitrationSpecies.nitronium.displayFormula}</strong>
            </article>
            <article className="interactive-meta-card">
              <span>Reference checks</span>
              <strong>
                {benzeneNitrationSteps.length} steps · {requiredCheckCount} required constraints
              </strong>
            </article>
          </div>
        </div>
      </header>

      <main className="interactive-app-shell mechanism-demo-layout">
        <BenzeneNitrationMechanism />
      </main>
    </>
  );
}
