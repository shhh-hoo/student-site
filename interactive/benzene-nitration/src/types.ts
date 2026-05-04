export interface Point {
  x: number;
  y: number;
}

export type TextRole = "equation" | "arrow" | "operator" | "label" | "species-label";

export interface MechanismText {
  id: string;
  x: number;
  y: number;
  text: string;
  role: TextRole;
}

export interface Atom {
  id: string;
  element: string;
  x: number;
  y: number;
  formalCharge?: string;
}

export interface Bond {
  id: string;
  from: string;
  to: string;
  order: 1 | 2;
}

export interface Ring {
  id: string;
  type: "aromatic";
  cx: number;
  cy: number;
  radius: number;
}

export interface CurlyArrow {
  id: string;
  from: Point;
  to: Point;
  control1: Point;
  control2: Point;
}

export interface HighlightHalo {
  id: string;
  type: "halo";
  x: number;
  y: number;
  radius: number;
}

export interface NitroSubstituentFragment {
  id: string;
  type: "nitro-substituent";
  attachToRingAtAngleDegrees: number;
  ringCenterX: number;
  ringCenterY: number;
  ringRadius: number;
  nX: number;
  nY: number;
  o1X: number;
  o1Y: number;
  o2X: number;
  o2Y: number;
}

export interface MechanismDiagram {
  texts?: MechanismText[];
  annotations?: MechanismText[];
  atoms?: Atom[];
  bonds?: Bond[];
  rings?: Ring[];
  curlyArrows?: CurlyArrow[];
  highlights?: HighlightHalo[];
  productFragments?: NitroSubstituentFragment[];
}

export interface MechanismPanelData {
  id: string;
  title: string;
  caption: string;
  canvas: {
    width: number;
    height: number;
  };
  diagram: MechanismDiagram;
  notes9701: string[];
  notesExtension?: string[];
}

export interface MechanismFixture {
  id: "benzene-eas-nitration-v1";
  version: string;
  title: string;
  subtitle: string;
  levelTags: string[];
  defaultMode: string;
  display: {
    preferredRenderer: string;
    show3D: false;
    showResonanceByDefault: false;
    theme: string;
  };
  reaction: {
    overallEquation: string;
    conditions: string[];
    keyIdea: string;
  };
  examChecklist: string[];
  teacherNotes?: {
    examFriendly?: string[];
    extension?: string[];
  };
  panels: MechanismPanelData[];
  futureExtensions?: {
    resonanceForms?: {
      enabled: false;
      description: string;
    };
  };
}

export interface MechanismDemoState {
  fixture: MechanismFixture;
  activePanelIndex: number;
}
