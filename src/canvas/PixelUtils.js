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

/**
 * Midpoint ellipse algorithm. Returns array of {x, y} border pixels.
 * cx, cy = center; rx, ry = radii
 */
export function midpointEllipse(cx, cy, rx, ry) {
  if (rx < 0) rx = -rx;
  if (ry < 0) ry = -ry;
  if (rx === 0 && ry === 0) return [{ x: cx, y: cy }];
  const points = [];
  const plot4 = (x, y) => {
    points.push({ x: cx + x, y: cy + y });
    points.push({ x: cx - x, y: cy + y });
    points.push({ x: cx + x, y: cy - y });
    points.push({ x: cx - x, y: cy - y });
  };
  let x = 0, y = ry;
  let rx2 = rx * rx, ry2 = ry * ry;
  let p = ry2 - rx2 * ry + 0.25 * rx2;
  let dx = 2 * ry2 * x, dy = 2 * rx2 * y;
  while (dx < dy) {
    plot4(x, y);
    x++;
    dx += 2 * ry2;
    if (p < 0) {
      p += dx + ry2;
    } else {
      y--;
      dy -= 2 * rx2;
      p += dx - dy + ry2;
    }
  }
  p = ry2 * (x + 0.5) ** 2 + rx2 * (y - 1) ** 2 - rx2 * ry2;
  while (y >= 0) {
    plot4(x, y);
    y--;
    dy -= 2 * rx2;
    if (p > 0) {
      p += rx2 - dy;
    } else {
      x++;
      dx += 2 * ry2;
      p += dx - dy + rx2;
    }
  }
  return points;
}

/**
 * Returns all pixels inside the ellipse (filled), including border.
 */
export function filledEllipse(cx, cy, rx, ry) {
  if (rx < 0) rx = -rx;
  if (ry < 0) ry = -ry;
  if (rx === 0 && ry === 0) return [{ x: cx, y: cy }];
  const pixels = [];
  for (let dy = -ry; dy <= ry; dy++) {
    const halfWidth = rx * Math.sqrt(1 - (dy / (ry + 0.5)) ** 2);
    for (let dx = -Math.round(halfWidth); dx <= Math.round(halfWidth); dx++) {
      pixels.push({ x: cx + dx, y: cy + dy });
    }
  }
  return pixels;
}

/**
 * Fill a rectangle, either outline or filled. Returns array of {x,y}.
 */
export function rectPixels(x0, y0, x1, y1, filled) {
  const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
  const pts = [];
  if (filled) {
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++)
        pts.push({ x, y });
  } else {
    for (let x = minX; x <= maxX; x++) {
      pts.push({ x, y: minY });
      pts.push({ x, y: maxY });
    }
    for (let y = minY + 1; y < maxY; y++) {
      pts.push({ x: minX, y });
      pts.push({ x: maxX, y });
    }
  }
  return pts;
}

/**
 * Flood fill. Returns array of {x, y} pixels to fill.
 * sprite has getPixel(x,y) -> {r,g,b,a}
 * targetColor is the color at start pos.
 * tolerance: 0-255 (per-channel), contiguous: boolean
 */
export function floodFill(sprite, startX, startY, tolerance, contiguous) {
  const w = sprite.width, h = sprite.height;
  const target = sprite.getPixel(startX, startY);
  if (!target) return [];

  const colorDiff = (a, b) => {
    return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) +
           Math.abs(a.b - b.b) + Math.abs(a.a - b.a);
  };

  const matches = (c) => colorDiff(c, target) <= tolerance * 4;

  const result = [];

  if (contiguous) {
    const visited = new Uint8Array(w * h);
    const stack = [{ x: startX, y: startY }];
    while (stack.length) {
      const { x, y } = stack.pop();
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const idx = y * w + x;
      if (visited[idx]) continue;
      visited[idx] = 1;
      const c = sprite.getPixel(x, y);
      if (!matches(c)) continue;
      result.push({ x, y });
      stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
    }
  } else {
    // Non-contiguous: all pixels in sprite matching target color
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = sprite.getPixel(x, y);
        if (matches(c)) result.push({ x, y });
      }
    }
  }
  return result;
}

/**
 * Magic wand flood select. Returns Uint8Array selection mask.
 */
export function magicWandSelect(sprite, startX, startY, tolerance, contiguous) {
  const pixels = floodFill(sprite, startX, startY, tolerance, contiguous);
  const mask = new Uint8Array(sprite.width * sprite.height);
  for (const { x, y } of pixels) {
    mask[y * sprite.width + x] = 1;
  }
  return mask;
}

/**
 * Pixel-perfect filter: removes "L-shaped" corners from a line.
 * Input: array of {x, y}. Returns filtered array.
 */
export function pixelPerfectFilter(points) {
  if (points.length < 3) return points;
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    // Standard pixel perfect: remove if dx(prev,curr) and dy(curr,next) are both nonzero
    // AND dx(curr,next) and dy(prev,curr) are both nonzero
    const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
    if (dx1 !== 0 && dy1 !== 0 && dx2 !== 0 && dy2 !== 0) {
      // Both steps are diagonal — skip this pixel
      continue;
    }
    result.push(curr);
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * Get cubic bezier points. Returns array of {x, y}.
 */
export function cubicBezierPixels(p0, p1, p2, p3) {
  const dist = Math.sqrt((p3.x - p0.x) ** 2 + (p3.y - p0.y) ** 2);
  const steps = Math.max(Math.ceil(dist * 4), 4);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = Math.round(mt**3 * p0.x + 3*mt**2*t*p1.x + 3*mt*t**2*p2.x + t**3*p3.x);
    const y = Math.round(mt**3 * p0.y + 3*mt**2*t*p1.y + 3*mt*t**2*p2.y + t**3*p3.y);
    pts.push({ x, y });
  }
  // Remove duplicates and connect with Bresenham
  return deduplicatePoints(pts);
}

/** Deduplicate consecutive identical points */
function deduplicatePoints(pts) {
  if (!pts.length) return pts;
  const result = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].x !== result[result.length - 1].x || pts[i].y !== result[result.length - 1].y) {
      result.push(pts[i]);
    }
  }
  return result;
}

/**
 * Rasterize a polygon (array of {x,y} vertices) to an array of {x,y} pixels.
 * Uses scanline fill. If outline only, draws lines between vertices.
 */
export function polygonPixels(vertices, filled) {
  if (vertices.length < 2) return [];
  const pts = [];

  if (!filled) {
    // Just outline: draw lines between consecutive vertices, closing back to start
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i];
      const b = vertices[(i + 1) % vertices.length];
      pts.push(...bresenhamLine(a.x, a.y, b.x, b.y));
    }
    return pts;
  }

  // Filled: scanline
  let minY = Infinity, maxY = -Infinity;
  for (const v of vertices) {
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }

  for (let y = minY; y <= maxY; y++) {
    const intersections = [];
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      if ((v1.y <= y && v2.y > y) || (v2.y <= y && v1.y > y)) {
        const x = v1.x + (y - v1.y) / (v2.y - v1.y) * (v2.x - v1.x);
        intersections.push(x);
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length - 1; i += 2) {
      const x0 = Math.ceil(intersections[i]);
      const x1 = Math.floor(intersections[i + 1]);
      for (let x = x0; x <= x1; x++) pts.push({ x, y });
    }
  }
  return pts;
}
