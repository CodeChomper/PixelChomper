import { Tool } from './Tool.js';

/**
 * Contour Tool — draws the outline of all filled (non-transparent) regions
 * on the active cel with the foreground color. One-click operation.
 */
export class ContourTool extends Tool {
  constructor() {
    super('contour', 'Contour', 'D');
  }

  onPointerDown(pos, event, state) {
    const cel = state.activeCel;
    if (!cel) return;

    const color = event.button === 2 ? state.bgColor : state.fgColor;
    const w = state.sprite.width;
    const h = state.sprite.height;
    const imgData = cel.ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const pixels = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] === 0) continue; // skip transparent pixels
        if (this._hasTransparentNeighbor(data, x, y, w, h)) {
          pixels.push({ x, y, color });
        }
      }
    }

    state.commitPixels(pixels);
  }

  onPointerMove() {}
  onPointerUp() {}

  _hasTransparentNeighbor(data, x, y, w, h) {
    return (
      this._isTransparent(data, x - 1, y, w, h) ||
      this._isTransparent(data, x + 1, y, w, h) ||
      this._isTransparent(data, x, y - 1, w, h) ||
      this._isTransparent(data, x, y + 1, w, h)
    );
  }

  _isTransparent(data, x, y, w, h) {
    if (x < 0 || y < 0 || x >= w || y >= h) return true; // out-of-bounds = transparent
    return data[(y * w + x) * 4 + 3] === 0;
  }
}
