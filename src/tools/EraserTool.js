import { Tool } from './Tool.js';
import { bresenhamLine, stampBrush } from '../canvas/PixelUtils.js';

const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

export class EraserTool extends Tool {
  constructor() {
    super('eraser', 'Eraser', 'E');
    this._lastPos = null;
    this._lastCommittedPos = null; // persists between strokes for shift+click line erase
    this._lineMode = false;
    this._lineStart = null;
  }

  onPointerDown(pos, event, state) {
    if (event.shiftKey && this._lastCommittedPos) {
      this._lineMode = true;
      this._lineStart = { ...this._lastCommittedPos };
      this._updateLinePreview(this._lineStart, pos, state);
    } else {
      this._lineMode = false;
      this._lastPos = pos;
      this._erase(pos, pos, state);
    }
  }

  onPointerMove(pos, event, state) {
    if (this._lineMode) {
      this._updateLinePreview(this._lineStart, pos, state);
      return;
    }
    if (!this._lastPos) return;
    this._erase(this._lastPos, pos, state);
    this._lastPos = pos;
  }

  onPointerUp(pos, event, state) {
    if (this._lineMode) {
      state.setPreviewPixels(null);
      this._erase(this._lineStart, pos, state);
      this._lineMode = false;
      this._lineStart = null;
    }
    this._lastCommittedPos = { ...pos };
    this._lastPos = null;
  }

  _updateLinePreview(from, to, state) {
    const color = { r: 255, g: 80, b: 80, a: 120 };
    const points = bresenhamLine(from.x, from.y, to.x, to.y);
    const pixels = points.flatMap(p => stampBrush(p.x, p.y, color, state.brushSize, state.brushShape));
    state.setPreviewPixels(pixels);
  }

  _erase(from, to, state) {
    const sprite = state.sprite;
    if (!sprite) return;

    const points = bresenhamLine(from.x, from.y, to.x, to.y);
    const pixels = [];
    const seen = new Set();

    for (const p of points) {
      const stamps = stampBrush(p.x, p.y, TRANSPARENT, state.brushSize, state.brushShape);
      for (const s of stamps) {
        const key = `${s.x},${s.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pixels.push(s);
      }
    }

    state.commitPixels(pixels);
  }
}
