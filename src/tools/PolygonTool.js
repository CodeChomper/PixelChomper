import { Tool } from './Tool.js';
import { polygonPixels, bresenhamLine } from '../canvas/PixelUtils.js';

/**
 * Polygon tool. Click to add vertices. Double-click or Enter to close/commit.
 */
export class PolygonTool extends Tool {
  constructor() {
    super('polygon', 'Polygon', '△');
    this._vertices = [];
    this._mousePos = null;
    this._lastClickTime = 0;
  }

  onPointerDown(pos, event, state) {
    const now = Date.now();
    const isDouble = now - this._lastClickTime < 300;
    this._lastClickTime = now;
    this._btn = event.button;

    if (isDouble && this._vertices.length >= 2) {
      this.commit(state);
      return;
    }

    this._vertices.push({ ...pos });
    this._updatePreview(state);
  }

  onPointerMove(pos, event, state) {
    this._mousePos = pos;
    this._updatePreview(state);
  }

  onPointerUp() {}

  commit(state) {
    if (this._vertices.length < 2) { this.cancel(state); return; }
    const color = state.fgColor;
    const pts = polygonPixels(this._vertices, state.shapeMode === 'filled');
    const pixels = pts.map(p => ({ x: p.x, y: p.y, color }));
    state.setPreviewPixels(null);
    state.commitPixels(pixels);
    this._vertices = [];
    this._mousePos = null;
  }

  cancel(state) {
    this._vertices = [];
    this._mousePos = null;
    state.setPreviewPixels(null);
  }

  _updatePreview(state) {
    if (!this._vertices.length) return;
    const color = { ...state.fgColor, a: 180 };
    const verts = [...this._vertices];
    if (this._mousePos) verts.push(this._mousePos);

    const pts = verts.length >= 3
      ? polygonPixels(verts, state.shapeMode === 'filled')
      : bresenhamLine(verts[0].x, verts[0].y, (verts[1] || verts[0]).x, (verts[1] || verts[0]).y);

    state.setPreviewPixels(pts.map(p => ({ x: p.x, y: p.y, color })));
  }
}
