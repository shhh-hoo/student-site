import type React from "react";

export type MechanismPoint = {
  x: number;
  y: number;
};

export type MechanismVector = MechanismPoint;

export type ScaffoldDefinition = {
  id: string;
  kind: "manualSvg" | "librarySvg" | "customPrimitive";
  viewBox: string;
  elements: ScaffoldElement[];
};

export type TextRun = {
  text: string;
  baselineShift?: "sub" | "super";
  fontSize?: number;
};

export type ScaffoldElement =
  | {
      id: string;
      kind: "atomLabel" | "text";
      x: number;
      y: number;
      text: string | TextRun[];
      className?: string;
      textAnchor?: "start" | "middle" | "end";
      dominantBaseline?: React.SVGAttributes<SVGTextElement>["dominantBaseline"];
      ariaLabel?: string;
    }
  | {
      id: string;
      kind: "bond";
      from: MechanismPoint;
      to: MechanismPoint;
      order?: 1 | 2;
      className?: string;
      ariaLabel?: string;
    }
  | {
      id: string;
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      className?: string;
      ariaLabel?: string;
    }
  | {
      id: string;
      kind: "polygon";
      points: MechanismPoint[];
      className?: string;
      ariaLabel?: string;
    }
  | {
      id: string;
      kind: "circle";
      cx: number;
      cy: number;
      r: number;
      className?: string;
      fill?: string;
      ariaLabel?: string;
    }
  | {
      id: string;
      kind: "path";
      d: string;
      className?: string;
      fill?: string;
      ariaLabel?: string;
    }
  | {
      id: string;
      kind: "aromaticRing";
      cx: number;
      cy: number;
      r: number;
      ariaLabel?: string;
    };

export type AnchorDefinition = {
  id: string;
  kind:
    | "atom"
    | "bondMidpoint"
    | "lonePair"
    | "piSystem"
    | "aromaticCircle"
    | "ringRegion"
    | "delocalisationRegion"
    | "manualPoint";
  x: number;
  y: number;
  normal?: MechanismVector;
  atomId?: string;
  bondId?: string;
  structureId?: string;
  role?: string;
};

export type AnnotationLayout = {
  zIndex?: number;
  locked?: boolean;
};

export type CurlyArrowAnnotation = {
  id: string;
  kind: "curlyArrow";
  fromAnchorId: string;
  toAnchorId: string;
  electronFlow: "pair" | "single";
  layout: AnnotationLayout & {
    startOffset?: MechanismPoint;
    endOffset?: MechanismPoint;
    control1?: MechanismPoint;
    control2?: MechanismPoint;
    bend?: number;
    arrowheadOffset?: number;
    strokeWidth?: number;
  };
};

export type LonePairAnnotation = {
  id: string;
  kind: "lonePair";
  anchorId: string;
  electronCount: 2;
  layout: AnnotationLayout & {
    offset?: MechanismPoint;
    rotation?: number;
    dotSpacing?: number;
  };
};

export type FormalChargeAnnotation = {
  id: string;
  kind: "formalCharge";
  value: "+" | "-" | "2+" | "2-";
  anchorId: string;
  layout: AnnotationLayout & {
    offset?: MechanismPoint;
    fontSize?: number;
  };
};

export type PartialChargeAnnotation = {
  id: string;
  kind: "partialCharge";
  value: "δ+" | "δ-";
  anchorId: string;
  layout: AnnotationLayout & {
    offset?: MechanismPoint;
    fontSize?: number;
  };
};

export type DipoleAnnotation = {
  id: string;
  kind: "dipole";
  fromAnchorId: string;
  toAnchorId: string;
  layout: AnnotationLayout & {
    startOffset?: MechanismPoint;
    endOffset?: MechanismPoint;
    labelOffset?: MechanismPoint;
    strokeWidth?: number;
  };
};

export type LabelAnnotation = {
  id: string;
  kind: "label";
  text: string | TextRun[];
  anchorId?: string;
  chemicallyLinked?: boolean;
  layout: AnnotationLayout & {
    position?: MechanismPoint;
    offset?: MechanismPoint;
    align?: "start" | "middle" | "end";
    fontSize?: number;
    className?: string;
  };
};

export type BondChangeAnnotation = {
  id: string;
  kind: "bondChange";
  fromAnchorId: string;
  toAnchorId: string;
  change: "forming" | "breaking" | "orderChange";
  layout: AnnotationLayout & {
    startOffset?: MechanismPoint;
    endOffset?: MechanismPoint;
    strokeWidth?: number;
  };
};

export type CubicPathSegment = {
  control1: MechanismPoint;
  control2: MechanismPoint;
  end: MechanismPoint;
};

export type AreniumHorseshoeAnnotation = {
  id: string;
  kind: "areniumHorseshoe";
  anchorId: string;
  excludedAnchorIds: string[];
  layout: AnnotationLayout & {
    start: MechanismPoint;
    segments: CubicPathSegment[];
    strokeWidth?: number;
  };
};

export type MechanismAnnotation =
  | CurlyArrowAnnotation
  | LonePairAnnotation
  | FormalChargeAnnotation
  | PartialChargeAnnotation
  | DipoleAnnotation
  | LabelAnnotation
  | BondChangeAnnotation
  | AreniumHorseshoeAnnotation;

export type ExpectedMechanismAction =
  | {
      id: string;
      kind: "curlyArrow";
      fromAnchorId: string;
      toAnchorId: string;
      electronFlow?: "pair" | "single";
    }
  | {
      id: string;
      kind: "lonePair" | "formalCharge" | "partialCharge" | "areniumHorseshoe";
      anchorId: string;
    }
  | {
      id: string;
      kind: "bondChange";
      fromAnchorId: string;
      toAnchorId: string;
      change?: "forming" | "breaking" | "orderChange";
    };

export type MechanismScene = {
  id: string;
  title: string;
  description: string;
  scaffold: ScaffoldDefinition;
  anchors: Record<string, AnchorDefinition>;
  annotations: MechanismAnnotation[];
  expectedActions?: ExpectedMechanismAction[];
};

export type MechanismDebugOptions = {
  showAnchors: boolean;
  showHitboxes: boolean;
  showAnnotationBounds: boolean;
  showControlPoints: boolean;
  showJson: boolean;
};
