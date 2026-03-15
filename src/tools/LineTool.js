import { Tool } from './Tool.js';
import { bresenhamLine, stampBrush, pixelPerfectFilter } from '../canvas/PixelUtils.js';

export class LineTool extends Tool {
  constructor() {
    super('line', 'Line', '╱');
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
    let line = bresenhamLine(this._start.x, this._start.y, pos.x, pos.y);
    if (state.pixelPerfect) line = pixelPerfectFilter(line);
    const pixels = line.flatMap(p => stampBrush(p.x, p.y, color, state.brushSize, state.brushShape));
    state.setPreviewPixels(null);
    state.commitPixels(pixels);
    this._start = null;
  }

  _updatePreview(start, end, state) {
    const color = { ...state.fgColor, a: 180 };
    let line = bresenhamLine(start.x, start.y, end.x, end.y);
    if (state.pixelPerfect) line = pixelPerfectFilter(line);
    const pixels = line.flatMap(p => stampBrush(p.x, p.y, color, state.brushSize, state.brushShape));
    state.setPreviewPixels(pixels);
  }

  cancel(state) {
    this._start = null;
    state.setPreviewPixels(null);
  }
}
