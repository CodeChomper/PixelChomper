import { Tool } from './Tool.js';
import { polygonPixels } from '../canvas/PixelUtils.js';

export class SelectLassoTool extends Tool {
  constructor() {
    super('select_lasso', 'Lasso Select', '⌇');
    this._path = [];
  }

  onPointerDown(pos, event, state) {
    this._path = [{ ...pos }];
    this._updatePreview(state);
  }

  onPointerMove(pos, event, state) {
    if (!this._path.length) return;
    this._path.push({ ...pos });
    this._updatePreview(state);
  }

  onPointerUp(pos, event, state) {
    if (this._path.length < 3 || !state.sprite) {
      this._path = [];
      state.setPreviewPixels(null);
      return;
    }
    // Close path and create selection mask
    const w = state.sprite.width, h = state.sprite.height;
    const mask = new Uint8Array(w * h);
    const pts = polygonPixels(this._path, true);
    for (const { x, y } of pts) {
      if (x >= 0 && x < w && y >= 0 && y < h) {
        mask[y * w + x] = 1;
      }
    }
    state.setPreviewPixels(null);
    state.setSelection(mask);
    this._path = [];
  }

  _updatePreview(state) {
    const color = { r: 100, g: 200, b: 255, a: 60 };
    if (this._path.length < 2) return;
    const pts = polygonPixels(this._path, true);
    state.setPreviewPixels(pts.map(p => ({ x: p.x, y: p.y, color })));
  }

  cancel(state) {
    this._path = [];
    state.setPreviewPixels(null);
  }
}
