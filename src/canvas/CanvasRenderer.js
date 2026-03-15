import { CHECKER_SIZE } from '../core/Constants.js';

/**
 * Renders the sprite onto the visible display canvas.
 * Handles zoom, pan, checkerboard transparency, and grid overlay.
 */
export class CanvasRenderer {
  constructor(state, containerEl) {
    this.state = state;
    this.container = containerEl;

    this.displayCanvas = document.createElement('canvas');
    this.displayCtx = this.displayCanvas.getContext('2d');
    this.container.appendChild(this.displayCanvas);

    // Checkerboard pattern canvas (cached)
    this._checkerPattern = null;

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.container);
    this._resize();

    // Listen to state changes
    this.state.events.on('sprite:loaded', () => this.render());
    this.state.events.on('view:zoom-changed', () => this.render());
    this.state.events.on('view:pan-changed', () => this.render());
    this.state.events.on('view:grid-changed', () => this.render());
    this.state.events.on('sprite:modified', () => this.render());
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    this.displayCanvas.width = rect.width;
    this.displayCanvas.height = rect.height;
    this._checkerPattern = null; // invalidate
    this.render();
  }

  _getCheckerPattern() {
    if (this._checkerPattern) return this._checkerPattern;
    const size = CHECKER_SIZE;
    const c = document.createElement('canvas');
    c.width = size * 2;
    c.height = size * 2;
    const ctx = c.getContext('2d');
    const style = getComputedStyle(document.documentElement);
    const light = style.getPropertyValue('--checker-light').trim() || '#444460';
    const dark = style.getPropertyValue('--checker-dark').trim() || '#38384e';
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, size * 2, size * 2);
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, size, size);
    ctx.fillRect(size, size, size, size);
    this._checkerPattern = this.displayCtx.createPattern(c, 'repeat');
    return this._checkerPattern;
  }

  /** Convert screen coords to sprite pixel coords. */
  screenToSprite(screenX, screenY) {
    const rect = this.container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const zoom = this.state.zoom;
    const sx = (screenX - rect.left - cx - this.state.panX) / zoom;
    const sy = (screenY - rect.top - cy - this.state.panY) / zoom;
    return { x: Math.floor(sx), y: Math.floor(sy) };
  }

  /** Center the sprite in the viewport. */
  centerSprite() {
    if (!this.state.sprite) return;
    this.state.panX = 0;
    this.state.panY = 0;
  }

  render() {
    const ctx = this.displayCtx;
    const w = this.displayCanvas.width;
    const h = this.displayCanvas.height;

    if (!w || !h) return;

    // Clear
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-primary').trim() || '#1e1e2e';
    ctx.fillRect(0, 0, w, h);

    const sprite = this.state.sprite;
    if (!sprite) return;

    const zoom = this.state.zoom;
    const sw = sprite.width * zoom;
    const sh = sprite.height * zoom;
    const cx = w / 2;
    const cy = h / 2;
    const ox = cx + this.state.panX - sw / 2;
    const oy = cy + this.state.panY - sh / 2;

    // Draw checkerboard within sprite bounds
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, sw, sh);
    ctx.clip();
    ctx.fillStyle = this._getCheckerPattern();
    ctx.fillRect(ox, oy, sw, sh);
    ctx.restore();

    // Draw sprite (nearest-neighbor scaling)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite.canvas, ox, oy, sw, sh);

    // Draw pixel grid
    if (this.state.showGrid && zoom >= 4) {
      this._drawGrid(ctx, ox, oy, sw, sh, zoom, sprite.width, sprite.height);
    }

    // Draw sprite border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox - 0.5, oy - 0.5, sw + 1, sh + 1);
  }

  _drawGrid(ctx, ox, oy, sw, sh, zoom, cols, rows) {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= cols; x++) {
      const px = ox + x * zoom;
      ctx.moveTo(px + 0.5, oy);
      ctx.lineTo(px + 0.5, oy + sh);
    }
    for (let y = 0; y <= rows; y++) {
      const py = oy + y * zoom;
      ctx.moveTo(ox, py + 0.5);
      ctx.lineTo(ox + sw, py + 0.5);
    }
    ctx.stroke();
  }
}
