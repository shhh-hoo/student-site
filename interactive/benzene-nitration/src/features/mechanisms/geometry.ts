import type { AnchorDefinition, MechanismPoint } from "./types";

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function addPoint(point: MechanismPoint, offset?: MechanismPoint): MechanismPoint {
  return {
    x: point.x + (offset?.x ?? 0),
    y: point.y + (offset?.y ?? 0),
  };
}

export function anchorPoint(anchor: AnchorDefinition, offset?: MechanismPoint): MechanismPoint {
  return addPoint(anchor, offset);
}

export function offsetArrowhead(end: MechanismPoint, previous: MechanismPoint, arrowheadOffset = 0): MechanismPoint {
  if (!arrowheadOffset) {
    return end;
  }

  const dx = end.x - previous.x;
  const dy = end.y - previous.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;

  return {
    x: end.x - (dx / length) * arrowheadOffset,
    y: end.y - (dy / length) * arrowheadOffset,
  };
}

export function quadraticControlPoint(start: MechanismPoint, end: MechanismPoint, bend = 0): MechanismPoint {
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;

  return {
    x: midpoint.x + (-dy / length) * bend,
    y: midpoint.y + (dx / length) * bend,
  };
}

export function boundsFromPoints(points: MechanismPoint[], padding = 0): Bounds {
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

export function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function hexagonPoints(cx: number, cy: number, r: number) {
  const horizontal = r * 0.866;

  return {
    c1: { x: cx, y: cy - r },
    c2: { x: cx + horizontal, y: cy - r / 2 },
    c3: { x: cx + horizontal, y: cy + r / 2 },
    c4: { x: cx, y: cy + r },
    c5: { x: cx - horizontal, y: cy + r / 2 },
    c6: { x: cx - horizontal, y: cy - r / 2 },
  };
}

export function polygonPointString(points: MechanismPoint[]) {
  return points.map(point => `${point.x},${point.y}`).join(" ");
}
