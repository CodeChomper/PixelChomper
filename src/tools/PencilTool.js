import { Tool } from './Tool.js';
import { bresenhamLine, stampBrush, pixelPerfectFilter } from '../canvas/PixelUtils.js';
import { rgbToHsl, hslToRgb } from '../core/ColorUtils.js';

export class PencilTool extends Tool {
  constructor() {
    super('pencil', 'Pencil', 'P');
    this._lastPos = null;
    this._strokeColor = null;
  }

  onPointerDown(pos, event, state) {
    this._lastPos = pos;
    const color = event.button === 2 ? state.bgColor : state.fgColor;
    this._strokeColor = color;
    this._draw(pos, pos, color, state, event.button === 2);
  }

  onPointerMove(pos, event, state) {
    if (!this._lastPos) return;
    const rightBtn = !!(event.buttons & 2);
    const color = rightBtn ? state.bgColor : state.fgColor;
    this._draw(this._lastPos, pos, color, state, rightBtn);
    this._lastPos = pos;
  }

  onPointerUp(pos, event, state) {
    if (this._strokeColor && !state.shadingInk) {
      state.pushRecentColor(this._strokeColor);
    }
    this._lastPos = null;
    this._strokeColor = null;
  }

  _draw(from, to, color, state, isRightButton) {
    const cel = state.activeCel;
    if (!cel) return;

    const rawLine = bresenhamLine(from.x, from.y, to.x, to.y);
    const line = state.pixelPerfect ? pixelPerfectFilter(rawLine) : rawLine;
    const pixels = [];
    const seen = new Set();

    for (const p of line) {
      const stamps = stampBrush(p.x, p.y, color, state.brushSize, state.brushShape);
      for (const s of stamps) {
        const key = `${s.x},${s.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const finalColor = state.shadingInk
          ? this._shadePixel(cel, s.x, s.y, isRightButton)
          : s.color;
        pixels.push({ x: s.x, y: s.y, color: finalColor });
      }
    }

    state.commitPixels(pixels);
  }

  /**
   * Shift the existing pixel at (x,y) lighter or darker by 10% lightness.
   * Right-button = lighten, left-button = darken.
   */
  _shadePixel(cel, x, y, lighten) {
    const existing = cel.getPixel(x, y);
    if (!existing || existing.a === 0) return existing ?? { r: 0, g: 0, b: 0, a: 0 };
    const { h, s, l } = rgbToHsl(existing.r, existing.g, existing.b);
    const newL = Math.max(0, Math.min(1, l + (lighten ? 0.10 : -0.10)));
    const { r, g, b } = hslToRgb(h, s, newL);
    return { r, g, b, a: existing.a };
  }
}
