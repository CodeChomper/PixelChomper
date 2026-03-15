import { CHECKER_SIZE } from '../core/Constants.js';
import { getBrushStamp } from '../canvas/PixelUtils.js';

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

    // Cursor position in sprite coords (null when cursor is outside canvas)
    this._cursorPos = null;

    // Marching ants animation
    this._marchingOffset = 0;
    this._rafId = null;

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.container);
    this._resize();

    // Listen to state changes
    this.state.events.on('sprite:loaded', () => this.render());
    this.state.events.on('view:zoom-changed', () => this.render());
    this.state.events.on('view:pan-changed', () => this.render());
    this.state.events.on('view:grid-changed', () => this.render());
    this.state.events.on('sprite:modified', () => this.render());
    this.state.events.on('cursor:moved', (pos) => { this._cursorPos = pos; this.render(); });
    this.state.events.on('cursor:left', () => { this._cursorPos = null; this.render(); });
    this.state.events.on('brush:size-changed', () => this.render());
    this.state.events.on('brush:shape-changed', () => this.render());
    this.state.events.on('preview:changed', () => this.render());
    this.state.events.on('selection:changed', () => this.render());

    // Start marching ants animation loop
    this._animateSelection();
  }

  _animateSelection() {
    this._rafId = requestAnimationFrame(() => {
      if (this.state.selection) {
        this._marchingOffset = (this._marchingOffset + 0.3) % 8;
        this.render();
      }
      this._animateSelection();
    });
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
    const sprite = this.state.sprite;
    const sw = sprite ? sprite.width : 0;
    const sh = sprite ? sprite.height : 0;
    const sx = (screenX - rect.left - cx - this.state.panX) / zoom + sw / 2;
    const sy = (screenY - rect.top - cy - this.state.panY) / zoom + sh / 2;
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

    // Draw preview overlay (shape tools)
    if (this.state.previewPixels && this.state.previewPixels.length > 0) {
      this._drawPreviewPixels(ctx, ox, oy, zoom);
    }

    // Draw selection marching ants
    if (this.state.selection) {
      this._drawSelection(ctx, ox, oy, zoom);
    }

    // Draw brush cursor or pixel highlight depending on tool
    const brushTools = ['pencil', 'eraser', 'spray'];
    if (this._cursorPos && !this.state.isPanning) {
      if (brushTools.includes(this.state.activeTool)) {
        this._drawBrushCursor(ctx, ox, oy, zoom);
      } else {
        this._drawPixelHighlight(ctx, ox, oy, zoom);
      }
    }
  }

  _drawPreviewPixels(ctx, ox, oy, zoom) {
    const pixels = this.state.previewPixels;

    // Group by color for efficiency
    const byColor = new Map();
    for (const p of pixels) {
      const key = `${p.color.r},${p.color.g},${p.color.b},${p.color.a}`;
      if (!byColor.has(key)) byColor.set(key, []);
      byColor.get(key).push(p);
    }
    for (const [key, group] of byColor) {
      const [r, g, b, a] = key.split(',').map(Number);
      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      for (const p of group) {
        ctx.fillRect(ox + p.x * zoom, oy + p.y * zoom, zoom, zoom);
      }
    }
  }

  _drawSelection(ctx, ox, oy, zoom) {
    const mask = this.state.selection;
    const sprite = this.state.sprite;
    if (!mask || !sprite) return;
    const w = sprite.width, h = sprite.height;

    // Draw marching ants: find edges between selected and unselected
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -this._marchingOffset;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        const sx = ox + x * zoom;
        const sy = oy + y * zoom;
        // top edge
        if (y === 0 || !mask[(y-1)*w+x]) { ctx.moveTo(sx, sy+0.5); ctx.lineTo(sx+zoom, sy+0.5); }
        // bottom edge
        if (y === h-1 || !mask[(y+1)*w+x]) { ctx.moveTo(sx, sy+zoom-0.5); ctx.lineTo(sx+zoom, sy+zoom-0.5); }
        // left edge
        if (x === 0 || !mask[y*w+(x-1)]) { ctx.moveTo(sx+0.5, sy); ctx.lineTo(sx+0.5, sy+zoom); }
        // right edge
        if (x === w-1 || !mask[y*w+(x+1)]) { ctx.moveTo(sx+zoom-0.5, sy); ctx.lineTo(sx+zoom-0.5, sy+zoom); }
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  _drawPixelHighlight(ctx, ox, oy, zoom) {
    const pos = this._cursorPos;
    const sx = ox + pos.x * zoom;
    const sy = oy + pos.y * zoom;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, zoom - 1, zoom - 1);
  }

  _drawBrushCursor(ctx, ox, oy, zoom) {
    const pos = this._cursorPos;
    const offsets = getBrushStamp(this.state.brushSize, this.state.brushShape);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;

    // Fill each pixel of the brush stamp
    for (const { dx, dy } of offsets) {
      const px = pos.x + dx;
      const py = pos.y + dy;
      const sx = ox + px * zoom;
      const sy = oy + py * zoom;
      ctx.fillRect(sx, sy, zoom, zoom);
    }

    // Draw an outline around the entire brush shape
    // Use a set for fast lookup of which cells are filled
    const filled = new Set(offsets.map(({ dx, dy }) => `${pos.x + dx},${pos.y + dy}`));
    ctx.beginPath();
    for (const { dx, dy } of offsets) {
      const px = pos.x + dx;
      const py = pos.y + dy;
      const sx = ox + px * zoom;
      const sy = oy + py * zoom;
      // Draw edge segments where there is no adjacent filled cell
      if (!filled.has(`${px},${py - 1}`)) { ctx.moveTo(sx, sy + 0.5); ctx.lineTo(sx + zoom, sy + 0.5); }
      if (!filled.has(`${px},${py + 1}`)) { ctx.moveTo(sx, sy + zoom - 0.5); ctx.lineTo(sx + zoom, sy + zoom - 0.5); }
      if (!filled.has(`${px - 1},${py}`)) { ctx.moveTo(sx + 0.5, sy); ctx.lineTo(sx + 0.5, sy + zoom); }
      if (!filled.has(`${px + 1},${py}`)) { ctx.moveTo(sx + zoom - 0.5, sy); ctx.lineTo(sx + zoom - 0.5, sy + zoom); }
    }
    ctx.stroke();
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
