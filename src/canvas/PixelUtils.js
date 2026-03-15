/**
 * Low-level pixel algorithms: Bresenham line, brush stamp, etc.
 */

/** Bresenham's line algorithm — returns array of {x, y} points. */
export function bresenhamLine(x0, y0, x1, y1) {
  const points = [];
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return points;
}

/**
 * Returns the set of pixel offsets for a brush stamp of given size and shape.
 * Center is (0,0). Returns array of {dx, dy}.
 */
export function getBrushStamp(size, shape) {
  const offsets = [];
  const r = Math.floor(size / 2);
  for (let dy = -r; dy < size - r; dy++) {
    for (let dx = -r; dx < size - r; dx++) {
      if (shape === 'circle' && size > 2) {
        // Check if within circular radius
        const dist = Math.sqrt((dx + 0.5) ** 2 + (dy + 0.5) ** 2);
        if (dist > size / 2) continue;
      }
      offsets.push({ dx, dy });
    }
  }
  return offsets;
}

/**
 * Stamp a brush at a point on the sprite, returning pixel objects for batch set.
 */
export function stampBrush(cx, cy, color, brushSize, brushShape) {
  const offsets = getBrushStamp(brushSize, brushShape);
  return offsets.map(({ dx, dy }) => ({
    x: cx + dx,
    y: cy + dy,
    color,
  }));
}
