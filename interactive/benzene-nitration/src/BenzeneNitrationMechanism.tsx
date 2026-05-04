import React, { useMemo, useState } from "react";
import { benzeneNitrationSteps } from "./benzeneNitrationData";
import { benzeneNitrationCorrectnessChecks } from "./chemicalCorrectness";
import {
  benzeneNitrationSceneById,
  MechanismAuthorControls,
  MechanismCanvas,
  useMechanismAuthoring,
  type MechanismAnnotation,
  type MechanismCanvasAuthoring,
  type MechanismDebugOptions,
} from "./features/mechanisms";
import type { MechanismStepId } from "./chemicalCorrectness";

const defaultDebugOptions: MechanismDebugOptions = {
  showAnchors: false,
  showHitboxes: false,
  showAnnotationBounds: false,
  showControlPoints: false,
  showJson: false,
};

function readInitialDebugOptions(): MechanismDebugOptions {
  if (typeof window === "undefined") {
    return defaultDebugOptions;
  }

  const params = new URLSearchParams(window.location.search);
  const authorMode = params.get("mode") === "author";
  const debugAnchors = params.get("debugAnchors") === "1";

  return {
    showAnchors: authorMode || debugAnchors,
    showHitboxes: params.get("debugHitboxes") === "1",
    showAnnotationBounds: params.get("debugBounds") === "1",
    showControlPoints: authorMode || params.get("debugControls") === "1",
    showJson: params.get("debugJson") === "1",
  };
}

function readInitialAuthorMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);

  return params.get("mode") === "author" || params.get("debugAnchors") === "1";
}

export function MechanismSvg({
  step,
  debugOptions,
  annotations,
  authoring,
}: {
  step: MechanismStepId;
  debugOptions?: MechanismDebugOptions;
  annotations?: MechanismAnnotation[];
  authoring?: MechanismCanvasAuthoring;
}) {
  const scene = benzeneNitrationSceneById[step];

  if (!scene) {
    throw new Error(`Missing mechanism scene for ${step}`);
  }

  return (
    <MechanismCanvas
      scene={scene}
      debug={debugOptions}
      titleId={`benzene-nitration-${step}-title`}
      annotations={annotations}
      authoring={authoring}
    />
  );
}

export function ChemicalChecklist({ step }: { step: MechanismStepId }) {
  const checks = useMemo(() => benzeneNitrationCorrectnessChecks.filter(check => check.step === step), [step]);

  return (
    <details className="mechanism-correctness">
      <summary className="mechanism-correctness__summary">Chemical correctness checks</summary>
      <ul className="mechanism-correctness__list">
        {checks.map(check => (
          <li key={check.id}>
            <span aria-hidden="true" className="mechanism-correctness__mark">
              ✓
            </span>
            <span>
              <strong>{check.label}:</strong> {check.requirement}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function getPreviousStepIndex(index: number) {
  return Math.max(0, index - 1);
}

export function getNextStepIndex(index: number) {
  return Math.min(benzeneNitrationSteps.length - 1, index + 1);
}

export default function BenzeneNitrationMechanism() {
  const [index, setIndex] = useState(0);
  const [authorMode] = useState(readInitialAuthorMode);
  const [debugOptions, setDebugOptions] = useState(readInitialDebugOptions);
  const current = benzeneNitrationSteps[index];
  const currentScene = benzeneNitrationSceneById[current.id];
  const authoring = useMechanismAuthoring(currentScene, authorMode);

  return (
    <section className="mechanism-reference" aria-labelledby="benzene-nitration-step-title">
      <header className="mechanism-reference__header">
        <div>
          <p className="mechanism-step-indicator">
            Step {index + 1} / {benzeneNitrationSteps.length}
          </p>
          <h2 id="benzene-nitration-step-title">{current.title}</h2>
          <p>{current.caption}</p>
        </div>
        <div className="mechanism-step-dots" aria-label="Mechanism progress">
          {benzeneNitrationSteps.map((item, i) => (
            <button
              type="button"
              key={item.id}
              aria-label={`Go to ${item.title}`}
              aria-current={i === index ? "step" : undefined}
              onClick={() => setIndex(i)}
              className="mechanism-step-dot"
            >
              {i + 1}
            </button>
          ))}
        </div>
      </header>

      <div className="mechanism-reference__diagram-frame" aria-live="polite">
        <MechanismSvg
          step={current.id}
          debugOptions={authorMode ? debugOptions : undefined}
          annotations={authorMode ? authoring.annotations : undefined}
          authoring={authorMode ? authoring : undefined}
        />
      </div>

      {authorMode && currentScene ? (
        <MechanismAuthorControls
          scene={currentScene}
          annotations={authoring.annotations}
          selectedAnnotation={authoring.selectedAnnotation}
          selectedHandle={authoring.selectedHandle}
          debugOptions={debugOptions}
          onDebugOptionsChange={setDebugOptions}
          onResetSceneDraft={authoring.resetSceneDraft}
          onResetSelectedAnnotation={authoring.resetSelectedAnnotation}
          onClearSavedDraft={authoring.clearSavedDraft}
          copyStatus={authoring.copyStatus}
          onCopyStatusChange={authoring.setCopyStatus}
        />
      ) : null}

      <div className="mechanism-reference__body">
        <p className="mechanism-reference__note">{current.longNote}</p>
        <ChemicalChecklist step={current.id} />

        <div className="mechanism-reference__controls">
          <button
            type="button"
            onClick={() => setIndex(getPreviousStepIndex)}
            disabled={index === 0}
            className="mechanism-stepper__button"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setIndex(getNextStepIndex)}
            disabled={index === benzeneNitrationSteps.length - 1}
            className="mechanism-stepper__button mechanism-stepper__button--primary"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
