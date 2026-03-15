import { Tool } from './Tool.js';
import { midpointEllipse, filledEllipse } from '../canvas/PixelUtils.js';

export class EllipseTool extends Tool {
  constructor() {
    super('ellipse', 'Ellipse', '○');
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
    const { cx, cy, rx, ry } = this._getBounds(this._start, pos);
    const pts = state.shapeMode === 'filled' ? filledEllipse(cx, cy, rx, ry) : midpointEllipse(cx, cy, rx, ry);
    const pixels = pts.map(p => ({ x: p.x, y: p.y, color }));
    state.setPreviewPixels(null);
    state.commitPixels(pixels);
    this._start = null;
  }

  _getBounds(start, end) {
    const cx = Math.round((start.x + end.x) / 2);
    const cy = Math.round((start.y + end.y) / 2);
    const rx = Math.abs(end.x - start.x) >> 1;
    const ry = Math.abs(end.y - start.y) >> 1;
    return { cx, cy, rx, ry };
  }

  _updatePreview(start, end, state) {
    const color = { ...state.fgColor, a: 180 };
    const { cx, cy, rx, ry } = this._getBounds(start, end);
    const pts = state.shapeMode === 'filled' ? filledEllipse(cx, cy, rx, ry) : midpointEllipse(cx, cy, rx, ry);
    state.setPreviewPixels(pts.map(p => ({ x: p.x, y: p.y, color })));
  }

  cancel(state) {
    this._start = null;
    state.setPreviewPixels(null);
  }
}
