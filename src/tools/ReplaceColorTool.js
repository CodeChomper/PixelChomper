import { Tool } from './Tool.js';
import { bresenhamLine, stampBrush } from '../canvas/PixelUtils.js';

/**
 * Replace Color Tool — paints over pixels that match the foreground color,
 * replacing them with the background color.
 */
export class ReplaceColorTool extends Tool {
  constructor() {
    super('replace_color', 'Replace Color', 'R');
    this._lastPos = null;
  }

  onPointerDown(pos, event, state) {
    this._lastPos = pos;
    this._replace(pos, pos, state);
  }

  onPointerMove(pos, event, state) {
    if (!this._lastPos) return;
    this._replace(this._lastPos, pos, state);
    this._lastPos = pos;
  }

  onPointerUp(pos, event, state) {
    this._lastPos = null;
  }

  _replace(from, to, state) {
    const cel = state.activeCel;
    if (!cel) return;

    const fg = state.fgColor;
    const bg = state.bgColor;
    const points = bresenhamLine(from.x, from.y, to.x, to.y);
    const pixels = [];
    const seen = new Set();

    for (const p of points) {
      const stamps = stampBrush(p.x, p.y, bg, state.brushSize, state.brushShape);
      for (const s of stamps) {
        const key = `${s.x},${s.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const existing = cel.getPixel(s.x, s.y);
        if (existing
          && existing.r === fg.r
          && existing.g === fg.g
          && existing.b === fg.b
          && existing.a === fg.a) {
          pixels.push(s);
        }
      }
    }

    state.commitPixels(pixels);
  }
}
