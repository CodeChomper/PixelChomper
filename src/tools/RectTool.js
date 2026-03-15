import { Tool } from './Tool.js';
import { rectPixels } from '../canvas/PixelUtils.js';

export class RectTool extends Tool {
  constructor() {
    super('rect', 'Rectangle', '□');
    this._start = null;
  }

  onPointerDown(pos, event, state) {
    this._start = { ...pos };
    this._btn = event.button;
    this._updatePreview(pos, pos, state);
  }

  onPointerMove(pos, event, state) {
    if (!this._start) return;
    this._updatePreview(this._start, pos, state);
  }

  onPointerUp(pos, event, state) {
    if (!this._start) return;
    const color = this._btn === 2 ? state.bgColor : state.fgColor;
    state.pushRecentColor(color);
    const pts = rectPixels(this._start.x, this._start.y, pos.x, pos.y, state.shapeMode === 'filled');
    const pixels = pts.map(p => ({ x: p.x, y: p.y, color }));
    state.setPreviewPixels(null);
    state.commitPixels(pixels);
    this._start = null;
  }

  _updatePreview(start, end, state) {
    const color = { ...state.fgColor, a: 180 };
    const pts = rectPixels(start.x, start.y, end.x, end.y, state.shapeMode === 'filled');
    state.setPreviewPixels(pts.map(p => ({ x: p.x, y: p.y, color })));
  }

  cancel(state) {
    this._start = null;
    state.setPreviewPixels(null);
  }
}
