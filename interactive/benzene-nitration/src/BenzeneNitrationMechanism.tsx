import React, { useMemo, useState } from "react";
import {
  BenzeneRing,
  CurlyArrow,
  ExplicitSigmaComplexRing,
  HydrogensulfateBase,
  NitroniumIon,
  NitroGroup,
  ReactionConditionLabel,
  SvgDefs,
  Bond,
  ringPoints,
} from "./svgPrimitives";
import { benzeneNitrationSteps } from "./benzeneNitrationData";
import { benzeneNitrationCorrectnessChecks } from "./chemicalCorrectness";
import type { MechanismStepId } from "./chemicalCorrectness";

function ElectrophileGenerationPanel() {
  return (
    <g aria-label="generation of the electrophile">
      <text className="mechanism-svg__equation" x="200" y="84" textAnchor="middle">
        HNO₃ + 2H₂SO₄ ⇌ NO₂⁺ + 2HSO₄⁻ + H₃O⁺
      </text>
      <NitroniumIon x={200} y={168} />
      <text className="mechanism-svg__annotation" x="200" y="232" textAnchor="middle">
        Electrophile: nitronium ion, NO₂⁺
      </text>
    </g>
  );
}

function ElectrophilicAttackPanel() {
  return (
    <g aria-label="electrophilic attack step">
      <BenzeneRing />
      <NitroniumIon x={306} y={62} />

      <CurlyArrow
        label="curly arrow from benzene pi system to nitrogen of nitronium ion"
        d="M 200 126 C 204 78, 242 60, 292 66"
      />

      <text className="mechanism-svg__small-label" x="84" y="245">
        arrow source: aromatic π system
      </text>
      <text className="mechanism-svg__small-label" x="255" y="104">
        target: N in NO₂⁺
      </text>
    </g>
  );
}

function WhelandIntermediatePanel() {
  const hPoint: [number, number] = [162, 54];
  const no2Nitrogen: [number, number] = [260, 62];

  return (
    <g aria-label="Wheland intermediate, sigma complex">
      <ExplicitSigmaComplexRing />

      <Bond from={ringPoints.c1} to={hPoint} order={1} label="C-H bond retained on attacked carbon" />
      <Bond from={ringPoints.c1} to={no2Nitrogen} order={1} label="new C-N bond to nitro group" />

      <text className="mechanism-svg__atom" x={hPoint[0] - 10} y={hPoint[1] - 10}>
        H
      </text>
      <NitroGroup x={no2Nitrogen[0]} y={no2Nitrogen[1]} />
      <text className="mechanism-svg__small-label" x="200" y="270" textAnchor="middle">
        attacked carbon is locally sp³; aromaticity is temporarily lost
      </text>
    </g>
  );
}

function DeprotonationPanel() {
  const hPoint: [number, number] = [162, 54];
  const no2Nitrogen: [number, number] = [260, 62];

  return (
    <g aria-label="deprotonation step">
      <ExplicitSigmaComplexRing />
      <Bond from={ringPoints.c1} to={hPoint} order={1} label="C-H bond whose electrons restore the pi system" />
      <Bond from={ringPoints.c1} to={no2Nitrogen} order={1} label="C-N bond to nitro group" />

      <text className="mechanism-svg__atom" x={hPoint[0] - 10} y={hPoint[1] - 10}>
        H
      </text>
      <NitroGroup x={no2Nitrogen[0]} y={no2Nitrogen[1]} />
      <HydrogensulfateBase x={78} y={54} />

      <CurlyArrow
        label="curly arrow from oxygen lone pair on hydrogensulfate to hydrogen"
        d="M 106 36 C 122 14, 145 18, 155 39"
      />
      <CurlyArrow
        label="curly arrow from C-H bond midpoint to C1-C2 bond of ring"
        d="M 184 74 C 200 76, 212 91, 224 111"
      />

      <text className="mechanism-svg__small-label" x="204" y="86">
        C–H bond electrons return to ring
      </text>
    </g>
  );
}

function ProductPanel() {
  const productNitroNitrogen: [number, number] = [200, 62];

  return (
    <g aria-label="nitrobenzene product">
      <BenzeneRing />
      <Bond from={ringPoints.c1} to={productNitroNitrogen} order={1} label="C-N bond to nitro group in nitrobenzene" />
      <NitroGroup x={productNitroNitrogen[0]} y={productNitroNitrogen[1]} />
      <text className="mechanism-svg__annotation" x="200" y="250" textAnchor="middle">
        nitrobenzene + regenerated H₂SO₄
      </text>
    </g>
  );
}

export function MechanismSvg({ step }: { step: MechanismStepId }) {
  return (
    <svg
      viewBox="0 0 400 280"
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
        <ReactionConditionLabel />
      </g>
    </svg>
  );
}

function CorrectnessPanel({ step }: { step: MechanismStepId }) {
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
        <CorrectnessPanel step={current.id} />

        <div className="mechanism-reference__controls">
          <button
            type="button"
            onClick={() => setIndex(value => Math.max(0, value - 1))}
            disabled={index === 0}
            className="mechanism-stepper__button"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setIndex(value => Math.min(benzeneNitrationSteps.length - 1, value + 1))}
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
