import type { Point, Ring } from "../types";

export function getHexagonPoints(ring: Ring): Point[] {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);

    return {
      x: Number((ring.cx + ring.radius * Math.cos(angle)).toFixed(1)),
      y: Number((ring.cy + ring.radius * Math.sin(angle)).toFixed(1)),
    };
  });
}

export function getPointAtAngle(cx: number, cy: number, radius: number, angleDegrees: number): Point {
  const angle = angleDegrees * (Math.PI / 180);

  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}
