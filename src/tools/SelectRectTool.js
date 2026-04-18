import { Tool } from './Tool.js';
import { constrainToSquare } from '../canvas/PixelUtils.js';

const HANDLE_RADIUS = 6; // hit radius in screen pixels

export const HANDLE_NAMES = ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'];

export const HANDLE_CURSORS = {
  tl: 'nwse-resize', tc: 'ns-resize',  tr: 'nesw-resize',
  ml: 'ew-resize',                      mr: 'ew-resize',
  bl: 'nesw-resize', bc: 'ns-resize',  br: 'nwse-resize',
};

/** Return handle positions in screen space (relative to renderer container). */
export function getSelectionHandles(bbox, zoom, ox, oy) {
  const left   = ox + bbox.x0 * zoom;
  const top    = oy + bbox.y0 * zoom;
  const right  = ox + (bbox.x1 + 1) * zoom;
  const bottom = oy + (bbox.y1 + 1) * zoom;
  const midX = (left + right) / 2;
  const midY = (top + bottom) / 2;
  return {
    tl: { x: left,  y: top    },
    tc: { x: midX,  y: top    },
    tr: { x: right, y: top    },
    ml: { x: left,  y: midY   },
    mr: { x: right, y: midY   },
    bl: { x: left,  y: bottom },
    bc: { x: midX,  y: bottom },
    br: { x: right, y: bottom },
  };
}

/** Compute sprite canvas origin (px) relative to the renderer container. */
export function getSpriteOrigin(state) {
  const renderer = state._renderer;
  if (!renderer || !state.sprite) return null;
  const rect = renderer.container.getBoundingClientRect();
  const zoom = state.zoom;
  const sw = state.sprite.width  * zoom;
  const sh = state.sprite.height * zoom;
  return {
    ox: rect.width  / 2 + state.panX - sw / 2,
    oy: rect.height / 2 + state.panY - sh / 2,
  };
}

/**
 * Returns the handle name hit by the given screen coords (relative to container),
 * or null if no handle was hit.
 */
export function hitSelectionHandle(screenX, screenY, bbox, state) {
  const origin = getSpriteOrigin(state);
  if (!origin || !bbox) return null;
  const { ox, oy } = origin;
  const handles = getSelectionHandles(bbox, state.zoom, ox, oy);
  for (const name of HANDLE_NAMES) {
    const h = handles[name];
    const dx = screenX - h.x;
    const dy = screenY - h.y;
    if (dx * dx + dy * dy <= HANDLE_RADIUS * HANDLE_RADIUS) return name;
  }
  return null;
}

export class SelectRectTool extends Tool {
  constructor() {
    super('select_rect', 'Select Rect', '▣');
    this._start = null;
  }

  onPointerDown(pos, event, state) {
    state.clearSelection();
    this._start = { ...pos };
    this._updatePreview(pos, pos, state);
  }

  onPointerMove(pos, event, state) {
    if (!this._start) return;
    const end = event.shiftKey ? constrainToSquare(this._start, pos) : pos;
    this._updatePreview(this._start, end, state);
  }

  onPointerUp(pos, event, state) {
    if (!this._start) return;
    if (!state.sprite) { this._start = null; return; }
    const constrained = event.shiftKey ? constrainToSquare(this._start, pos) : pos;
    const x0 = Math.max(0, Math.min(this._start.x, constrained.x));
    const y0 = Math.max(0, Math.min(this._start.y, constrained.y));
    const x1 = Math.min(state.sprite.width  - 1, Math.max(this._start.x, constrained.x));
    const y1 = Math.min(state.sprite.height - 1, Math.max(this._start.y, constrained.y));
    const w = state.sprite.width, h = state.sprite.height;
    const mask = new Uint8Array(w * h);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        mask[y * w + x] = 1;
    state.setPreviewPixels(null);
    state.setSelection(mask);
    this._start = null;
  }

  _updatePreview(start, end, state) {
    const color = { r: 100, g: 200, b: 255, a: 60 };
    if (!state.sprite) return;
    const x0 = Math.max(0, Math.min(start.x, end.x));
    const y0 = Math.max(0, Math.min(start.y, end.y));
    const x1 = Math.min(state.sprite.width  - 1, Math.max(start.x, end.x));
    const y1 = Math.min(state.sprite.height - 1, Math.max(start.y, end.y));
    const pixels = [];
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        pixels.push({ x, y, color });
    state.setPreviewPixels(pixels);
  }

  cancel(state) {
    this._start = null;
    state.setPreviewPixels(null);
  }
}
