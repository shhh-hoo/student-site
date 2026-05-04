import type { MechanismFixture, MechanismPanelData } from "./types";
import { formatChemistryText } from "./renderers/chemistryText";
import { SvgMechanismRenderer } from "./renderers/SvgMechanismRenderer";

interface MechanismPanelProps {
  fixture: MechanismFixture;
  panel: MechanismPanelData;
  activePanelIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onSelectPanel: (panelIndex: number) => void;
}

export function MechanismPanel({
  fixture,
  panel,
  activePanelIndex,
  onPrevious,
  onNext,
  onSelectPanel,
}: MechanismPanelProps) {
  const isFirstPanel = activePanelIndex === 0;
  const isLastPanel = activePanelIndex === fixture.panels.length - 1;

  return (
    <section className="interactive-panel mechanism-workspace" aria-labelledby="mechanism-panel-title">
      <div className="mechanism-workspace__header">
        <div>
          <p id="mechanism-step-indicator" className="mechanism-step-indicator">
            Panel {activePanelIndex + 1} / {fixture.panels.length}
          </p>
          <h2 id="mechanism-panel-title">{panel.title}</h2>
          <p id="mechanism-panel-caption">{formatChemistryText(panel.caption)}</p>
        </div>
        <div className="mechanism-stepper" aria-label="Mechanism stepper">
          <button
            className="mechanism-stepper__button"
            type="button"
            aria-label="Previous mechanism step"
            disabled={isFirstPanel}
            onClick={onPrevious}
          >
            Previous
          </button>
          <div className="mechanism-step-dots" aria-label="Step indicator">
            {fixture.panels.map((stepPanel, index) => (
              <button
                key={stepPanel.id}
                className="mechanism-step-dot"
                type="button"
                aria-label={`Open ${stepPanel.title}`}
                aria-current={index === activePanelIndex ? "step" : undefined}
                onClick={() => onSelectPanel(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <button
            className="mechanism-stepper__button"
            type="button"
            aria-label="Next mechanism step"
            disabled={isLastPanel}
            onClick={onNext}
          >
            Next
          </button>
        </div>
      </div>

      <div className="mechanism-diagram" aria-live="polite">
        <SvgMechanismRenderer panel={panel} />
      </div>

      <div className="interactive-subtle-panel mechanism-step-summary">
        <p className="mechanism-block-label">Current 9701 points</p>
        <ul className="mechanism-mini-list">
          {panel.notes9701.map(note => (
            <li key={note}>{formatChemistryText(note)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
