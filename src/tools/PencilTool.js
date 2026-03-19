import { Tool } from './Tool.js';
import { bresenhamLine, stampBrush, pixelPerfectFilter } from '../canvas/PixelUtils.js';
import { rgbToHsl, hslToRgb } from '../core/ColorUtils.js';

export class PencilTool extends Tool {
  constructor() {
    super('pencil', 'Pencil', 'P');
    this._lastPos = null;
    this._strokeColor = null;
    this._lastCommittedPos = null; // persists between strokes for shift+click line
    this._lineMode = false;
    this._lineStart = null;
  }

  onPointerDown(pos, event, state) {
    const color = event.button === 2 ? state.bgColor : state.fgColor;
    this._strokeColor = color;

    if (event.shiftKey && this._lastCommittedPos) {
      // Shift+click: preview a line from the last committed position
      this._lineMode = true;
      this._lineStart = { ...this._lastCommittedPos };
      this._updateLinePreview(this._lineStart, pos, color, state);
    } else {
      this._lineMode = false;
      this._lastPos = pos;
      this._draw(pos, pos, color, state, event.button === 2);
    }
  }

  onPointerMove(pos, event, state) {
    if (this._lineMode) {
      const color = !!(event.buttons & 2) ? state.bgColor : state.fgColor;
      this._updateLinePreview(this._lineStart, pos, color, state);
      return;
    }
    if (!this._lastPos) return;
    const rightBtn = !!(event.buttons & 2);
    const color = rightBtn ? state.bgColor : state.fgColor;
    this._draw(this._lastPos, pos, color, state, rightBtn);
    this._lastPos = pos;
  }

  onPointerUp(pos, event, state) {
    if (this._lineMode) {
      const isRight = event.button === 2;
      const color = isRight ? state.bgColor : state.fgColor;
      state.setPreviewPixels(null);
      this._draw(this._lineStart, pos, color, state, isRight);
      if (!state.shadingInk) state.pushRecentColor(color);
      this._lineMode = false;
      this._lineStart = null;
    } else if (this._strokeColor && !state.shadingInk) {
      state.pushRecentColor(this._strokeColor);
    }
    this._lastCommittedPos = { ...pos };
    this._lastPos = null;
    this._strokeColor = null;
  }

  _updateLinePreview(from, to, color, state) {
    const previewColor = { ...color, a: 180 };
    const rawLine = bresenhamLine(from.x, from.y, to.x, to.y);
    const line = state.pixelPerfect ? pixelPerfectFilter(rawLine) : rawLine;
    const pixels = line.flatMap(p => stampBrush(p.x, p.y, previewColor, state.brushSize, state.brushShape));
    state.setPreviewPixels(pixels);
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
