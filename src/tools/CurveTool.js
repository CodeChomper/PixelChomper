import { Tool } from './Tool.js';
import { cubicBezierPixels, bresenhamLine } from '../canvas/PixelUtils.js';

/**
 * Cubic Bezier curve tool.
 * Click sequence: start → end → control1 → control2 (auto-commits after 4th click)
 * While moving before each click, shows preview.
 */
export class CurveTool extends Tool {
  constructor() {
    super('curve', 'Curve', '∿');
    this._points = []; // accumulated clicks: [start, end, cp1, cp2]
    this._mousePos = null;
  }

  onPointerDown(pos, event, state) {
    this._btn = event.button;
    this._points.push({ ...pos });
    this._updatePreview(state);

    if (this._points.length === 4) {
      this.commit(state);
    }
  }

  onPointerMove(pos, event, state) {
    this._mousePos = pos;
    this._updatePreview(state);
  }

  onPointerUp() {}

  commit(state) {
    if (this._points.length < 2) { this.cancel(state); return; }
    const color = state.fgColor;
    const [p0, p1, p2, p3] = this._getFullPoints();
    const pts = cubicBezierPixels(p0, p1, p2, p3);
    const pixels = pts.map(p => ({ x: p.x, y: p.y, color }));
    state.setPreviewPixels(null);
    state.commitPixels(pixels);
    this._points = [];
    this._mousePos = null;
  }

  cancel(state) {
    this._points = [];
    this._mousePos = null;
    state.setPreviewPixels(null);
  }

  _getFullPoints() {
    const pts = [...this._points];
    const mouse = this._mousePos;
    // Fill in missing control points with mouse position or defaults
    while (pts.length < 4) {
      pts.push(mouse || pts[pts.length - 1] || { x: 0, y: 0 });
    }
    return pts;
  }

  _updatePreview(state) {
    if (this._points.length < 1) return;
    const color = { ...state.fgColor, a: 180 };
    const [p0, p1, p2, p3] = this._getFullPoints();
    let pts;
    if (this._points.length >= 2) {
      pts = cubicBezierPixels(p0, p1, p2, p3);
    } else {
      // Just a line from start to mouse
      pts = bresenhamLine(p0.x, p0.y, p1.x, p1.y);
    }
    state.setPreviewPixels(pts.map(p => ({ x: p.x, y: p.y, color })));
  }
}
