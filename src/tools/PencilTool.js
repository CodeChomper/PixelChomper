import { Tool } from './Tool.js';
import { bresenhamLine, stampBrush } from '../canvas/PixelUtils.js';

export class PencilTool extends Tool {
  constructor() {
    super('pencil', 'Pencil', 'P');
    this._lastPos = null;
  }

  onPointerDown(pos, event, state) {
    this._lastPos = pos;
    const color = event.button === 2 ? state.bgColor : state.fgColor;
    this._draw(pos, pos, color, state);
  }

  onPointerMove(pos, event, state) {
    if (!this._lastPos) return;
    const color = event.buttons & 2 ? state.bgColor : state.fgColor;
    this._draw(this._lastPos, pos, color, state);
    this._lastPos = pos;
  }

  onPointerUp(pos, event, state) {
    this._lastPos = null;
  }

  _draw(from, to, color, state) {
    const sprite = state.sprite;
    if (!sprite) return;

    const points = bresenhamLine(from.x, from.y, to.x, to.y);
    const pixels = [];
    const seen = new Set();

    for (const p of points) {
      const stamps = stampBrush(p.x, p.y, color, state.brushSize, state.brushShape);
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
