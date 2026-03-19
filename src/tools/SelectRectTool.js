import { Tool } from './Tool.js';
import { constrainToSquare } from '../canvas/PixelUtils.js';

export class SelectRectTool extends Tool {
  constructor() {
    super('select_rect', 'Select Rect', '▣');
    this._start = null;
  }

  onPointerDown(pos, event, state) {
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
    const x1 = Math.min(state.sprite.width - 1, Math.max(this._start.x, constrained.x));
    const y1 = Math.min(state.sprite.height - 1, Math.max(this._start.y, constrained.y));

    const w = state.sprite.width, h = state.sprite.height;
    const mask = new Uint8Array(w * h);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        mask[y * w + x] = 1;
      }
    }
    state.setPreviewPixels(null);
    state.setSelection(mask);
    this._start = null;
  }

  _updatePreview(start, end, state) {
    const color = { r: 100, g: 200, b: 255, a: 60 };
    if (!state.sprite) return;
    const x0 = Math.max(0, Math.min(start.x, end.x));
    const y0 = Math.max(0, Math.min(start.y, end.y));
    const x1 = Math.min(state.sprite.width - 1, Math.max(start.x, end.x));
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
