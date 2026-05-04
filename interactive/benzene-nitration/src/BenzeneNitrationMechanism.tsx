import React, { useMemo, useState } from "react";
import {
  BenzeneRing,
  BrokenDelocalisationRing,
  CurlyArrow,
  HydrogensulfateBase,
  NitroniumIon,
  NitroGroup,
  SvgDefs,
  Bond,
  getRingPoints,
} from "./svgPrimitives";
import { benzeneNitrationSteps } from "./benzeneNitrationData";
import { benzeneNitrationCorrectnessChecks } from "./chemicalCorrectness";
import type { MechanismStepId } from "./chemicalCorrectness";

function ElectrophileGenerationPanel() {
  return (
    <g aria-label="generation of the electrophile">
      <text className="mechanism-svg__equation" x="240" y="94" textAnchor="middle">
        HNO₃ + 2H₂SO₄ ⇌ NO₂⁺ + 2HSO₄⁻ + H₃O⁺
      </text>
      <NitroniumIon x={240} y={176} />
      <text className="mechanism-svg__annotation" x="240" y="262" textAnchor="middle">
        Electrophile: nitronium ion, NO₂⁺
      </text>
    </g>
  );
}

function ElectrophilicAttackPanel() {
  return (
    <g aria-label="electrophilic attack step">
      <BenzeneRing cx={178} cy={206} r={58} />
      <NitroniumIon x={352} y={104} />

      <CurlyArrow
        label="curly arrow from benzene aromatic π system to nitrogen of nitronium ion"
        d="M 204 180 C 226 130, 286 104, 342 104"
      />
    </g>
  );
}

function WhelandSubstituents({ cx = 240, cy = 202, r = 58 }: { cx?: number; cy?: number; r?: number }) {
  const { c1 } = getRingPoints(cx, cy, r);
  const hPoint: [number, number] = [cx - 34, cy - 120];
  const no2Point: [number, number] = [cx + 42, cy - 116];

  return (
    <g aria-label="substituents on attacked carbon">
      <Bond from={c1} to={[hPoint[0] + 10, hPoint[1] + 14]} order={1} label="C-H bond retained on attacked carbon" />
      <Bond from={c1} to={[no2Point[0] - 13, no2Point[1] + 14]} order={1} label="new C-N bond to nitro group" />

      <text className="mechanism-svg__atom" x={hPoint[0]} y={hPoint[1]}>
        H
      </text>
      <NitroGroup x={no2Point[0]} y={no2Point[1]} />
    </g>
  );
}

function WhelandIntermediatePanel() {
  return (
    <g aria-label="Wheland intermediate, sigma complex">
      <BrokenDelocalisationRing cx={240} cy={204} r={58} />
      <WhelandSubstituents cx={240} cy={204} />

      <text className="mechanism-svg__annotation" x="240" y="304" textAnchor="middle">
        sigma complex; aromaticity temporarily lost
      </text>
    </g>
  );
}

function DeprotonationPanel() {
  return (
    <g aria-label="deprotonation step">
      <BrokenDelocalisationRing cx={306} cy={208} r={58} />
      <WhelandSubstituents cx={306} cy={208} />
      <HydrogensulfateBase x={76} y={102} />

      <CurlyArrow
        label="curly arrow from oxygen lone pair on hydrogensulfate to hydrogen"
        d="M 102 94 C 144 56, 210 58, 257 88"
      />
      <CurlyArrow
        label="curly arrow from C-H bond midpoint to broken delocalisation region of ring"
        d="M 295 126 C 318 141, 323 166, 309 190"
      />

      <text className="mechanism-svg__annotation" x="306" y="306" textAnchor="middle">
        C–H bond electrons restore aromaticity
      </text>
    </g>
  );
}

function ProductPanel() {
  const productRing = getRingPoints(240, 210, 58);

  return (
    <g aria-label="nitrobenzene product">
      <BenzeneRing cx={240} cy={210} r={58} />
      <Bond from={productRing.c1} to={[240, 92]} order={1} label="C-N bond to nitro group in nitrobenzene" />
      <NitroGroup x={240} y={76} />
      <text className="mechanism-svg__annotation" x="240" y="300" textAnchor="middle">
        nitrobenzene; aromaticity restored
      </text>
      <text className="mechanism-svg__small-label" x="240" y="324" textAnchor="middle">
        H₂SO₄ is regenerated
      </text>
    </g>
  );
}

export function MechanismSvg({ step }: { step: MechanismStepId }) {
  return (
    <svg
      viewBox="0 0 480 340"
      className="mechanism-svg mechanism-reference__svg"
      role="img"
      aria-labelledby={`benzene-nitration-${step}-title`}
    >
      <title id={`benzene-nitration-${step}-title`}>Nitration of benzene mechanism diagram</title>
      <SvgDefs />
      <g>
        {step === "electrophile-generation" && <ElectrophileGenerationPanel />}
        {step === "electrophilic-attack" && <ElectrophilicAttackPanel />}
        {step === "wheland-intermediate" && <WhelandIntermediatePanel />}
        {step === "deprotonation" && <DeprotonationPanel />}
        {step === "product" && <ProductPanel />}
      </g>
    </svg>
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
  const current = benzeneNitrationSteps[index];

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
        <MechanismSvg step={current.id} />
      </div>

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
