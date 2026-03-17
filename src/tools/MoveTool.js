import { Tool } from './Tool.js';

/**
 * Move tool: moves selection contents (or entire active cel if no selection).
 * Drag to offset, release to commit.
 */
export class MoveTool extends Tool {
  constructor() {
    super('move', 'Move', '✥');
    this._start = null;
    this._originalPixels = null;
    this._selectionPixels = null;
    this._originalMask = null;
  }

  onPointerDown(pos, event, state) {
    const cel = state.activeCel;
    if (!cel) return;
    this._start = { ...pos };
    const w = state.sprite.width, h = state.sprite.height;
    const mask = state.selection;
    this._selectionPixels = [];
    this._originalPixels = [];

    if (mask) {
      for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue;
        const x = i % w, y = Math.floor(i / w);
        const color = cel.getPixel(x, y);
        if (color) {
          this._selectionPixels.push({ x, y, color });
          this._originalPixels.push({ x, y, color: { r: 0, g: 0, b: 0, a: 0 } });
        }
      }
    } else {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const color = cel.getPixel(x, y);
          if (color && color.a > 0) {
            this._selectionPixels.push({ x, y, color });
            this._originalPixels.push({ x, y, color: { r: 0, g: 0, b: 0, a: 0 } });
          }
        }
      }
    }
    this._originalMask = mask;
  }

  onPointerMove(pos, event, state) {
    if (!this._start || !this._selectionPixels) return;
    const dx = pos.x - this._start.x;
    const dy = pos.y - this._start.y;
    const preview = [
      ...this._originalPixels,
      ...this._selectionPixels.map(p => ({ x: p.x + dx, y: p.y + dy, color: p.color })),
    ];
    state.setPreviewPixels(preview);
  }

  onPointerUp(pos, event, state) {
    const cel = state.activeCel;
    if (!this._start || !this._selectionPixels || !cel) return;
    const dx = pos.x - this._start.x;
    const dy = pos.y - this._start.y;
    cel.setPixels(this._originalPixels);
    const moved = this._selectionPixels
      .map(p => ({ x: p.x + dx, y: p.y + dy, color: p.color }))
      .filter(p => p.x >= 0 && p.x < state.sprite.width && p.y >= 0 && p.y < state.sprite.height);
    cel.setPixels(moved);
    state.setPreviewPixels(null);
    state.events.emit('sprite:modified');

    if (this._originalMask) {
      const w = state.sprite.width, h = state.sprite.height;
      const newMask = new Uint8Array(w * h);
      for (let i = 0; i < this._originalMask.length; i++) {
        if (!this._originalMask[i]) continue;
        const ox = i % w, oy = Math.floor(i / w);
        const nx = ox + dx, ny = oy + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) newMask[ny * w + nx] = 1;
      }
      state.setSelection(newMask);
    }

    this._start = null;
    this._selectionPixels = null;
    this._originalPixels = null;
    this._originalMask = null;
  }
}
