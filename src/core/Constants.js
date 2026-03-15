export const TOOLS = {
  PENCIL: 'pencil',
  ERASER: 'eraser',
  LINE: 'line',
  RECT: 'rect',
  ELLIPSE: 'ellipse',
  FILL: 'fill',
  EYEDROPPER: 'eyedropper',
  SPRAY: 'spray',
  CURVE: 'curve',
  POLYGON: 'polygon',
  SELECT_RECT: 'select_rect',
  SELECT_LASSO: 'select_lasso',
  MAGIC_WAND: 'magic_wand',
  MOVE: 'move',
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

// Key bindings: map key string (with optional "shift+" prefix) to tool id
export const KEY_BINDINGS = {
  'b': TOOLS.PENCIL,
  'e': TOOLS.ERASER,
  'l': TOOLS.LINE,
  'u': TOOLS.RECT,
  'shift+u': TOOLS.ELLIPSE,
  'g': TOOLS.FILL,
  'i': TOOLS.EYEDROPPER,
  'shift+b': TOOLS.SPRAY,
  'shift+l': TOOLS.CURVE,
  'shift+d': TOOLS.POLYGON,
  'm': TOOLS.SELECT_RECT,
  'q': TOOLS.SELECT_LASSO,
  'w': TOOLS.MAGIC_WAND,
  'v': TOOLS.MOVE,
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
