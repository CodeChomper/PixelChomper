import { Tool } from './Tool.js';
import { bresenhamLine, stampBrush } from '../canvas/PixelUtils.js';

const TRANSPARENT = { r: 0, g: 0, b: 0, a: 0 };

export class EraserTool extends Tool {
  constructor() {
    super('eraser', 'Eraser', 'E');
    this._lastPos = null;
  }

  onPointerDown(pos, event, state) {
    this._lastPos = pos;
    this._erase(pos, pos, state);
  }

  onPointerMove(pos, event, state) {
    if (!this._lastPos) return;
    this._erase(this._lastPos, pos, state);
    this._lastPos = pos;
  }

  onPointerUp(pos, event, state) {
    this._lastPos = null;
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

    sprite.setPixels(pixels);
    state.events.emit('sprite:modified');
  }
}
