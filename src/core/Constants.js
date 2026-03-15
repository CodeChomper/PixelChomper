export const TOOLS = {
  PENCIL: 'pencil',
  ERASER: 'eraser',
};

export const BRUSH_SHAPES = {
  SQUARE: 'square',
  CIRCLE: 'circle',
};

export const DEFAULT_FG = { r: 0, g: 0, b: 0, a: 255 };
export const DEFAULT_BG = { r: 255, g: 255, b: 255, a: 255 };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 64;
export const DEFAULT_ZOOM = 8;

export const DEFAULT_BRUSH_SIZE = 1;
export const MAX_BRUSH_SIZE = 64;

export const CHECKER_SIZE = 8;

export const KEY_BINDINGS = {
  'b': TOOLS.PENCIL,
  'e': TOOLS.ERASER,
};

export function colorToCSS(c) {
  if (c.a === 255) return `rgb(${c.r},${c.g},${c.b})`;
  return `rgba(${c.r},${c.g},${c.b},${c.a / 255})`;
}

export function colorEqual(a, b) {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
