import { CHECKER_SIZE } from '../core/Constants.js';
import { getBrushStamp } from '../canvas/PixelUtils.js';

/**
 * Renders the sprite onto the visible display canvas.
 * Handles zoom, pan, checkerboard transparency, layer compositing,
 * onion skinning, selection marching ants, and grid overlay.
 */
export class CanvasRenderer {
  constructor(state, containerEl) {
    this.state = state;
    this.container = containerEl;

    this.displayCanvas = document.createElement('canvas');
    this.displayCtx = this.displayCanvas.getContext('2d');
    this.container.appendChild(this.displayCanvas);

    this._checkerPattern = null;
    this._cursorPos = null;
    this._marchingOffset = 0;
    this._rafId = null;

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.container);
    this._resize();

    const rerender = () => this.render();
    this.state.events.on('sprite:loaded', rerender);
    this.state.events.on('view:zoom-changed', rerender);
    this.state.events.on('view:pan-changed', rerender);
    this.state.events.on('view:grid-changed', rerender);
    this.state.events.on('sprite:modified', rerender);
    this.state.events.on('cursor:moved', (pos) => { this._cursorPos = pos; this.render(); });
    this.state.events.on('cursor:left', () => { this._cursorPos = null; this.render(); });
    this.state.events.on('brush:size-changed', rerender);
    this.state.events.on('brush:shape-changed', rerender);
    this.state.events.on('preview:changed', rerender);
    this.state.events.on('selection:changed', rerender);
    this.state.events.on('layer:selected', rerender);
    this.state.events.on('layer:visibility-changed', rerender);
    this.state.events.on('layer:opacity-changed', rerender);
    this.state.events.on('layer:blend-changed', rerender);
    this.state.events.on('layer:reordered', rerender);
    this.state.events.on('frame:changed', rerender);
    this.state.events.on('onionskin:changed', rerender);

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
    this._checkerPattern = null;
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

    // Checkerboard
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, sw, sh);
    ctx.clip();
    ctx.fillStyle = this._getCheckerPattern();
    ctx.fillRect(ox, oy, sw, sh);
    ctx.restore();

    ctx.imageSmoothingEnabled = false;

    const fi = this.state.activeFrameIndex;

    // Onion skinning — previous frames (red tint)
    if (this.state.onionSkin.enabled) {
      const { prevCount, nextCount, opacity } = this.state.onionSkin;
      for (let d = prevCount; d >= 1; d--) {
        const pfi = fi - d;
        if (pfi < 0) continue;
        const alpha = (opacity / prevCount) * (prevCount - d + 1) / prevCount;
        this._drawFrameOnionSkin(ctx, sprite, pfi, ox, oy, sw, sh, alpha, 'red');
      }
      // Next frames (blue tint)
      for (let d = 1; d <= nextCount; d++) {
        const nfi = fi + d;
        if (nfi >= sprite.frames.length) continue;
        const alpha = (opacity / nextCount) * (nextCount - d + 1) / nextCount;
        this._drawFrameOnionSkin(ctx, sprite, nfi, ox, oy, sw, sh, alpha, 'blue');
      }
    }

    // Draw current frame's cels (bottom-to-top)
    for (let li = 0; li < sprite.layers.length; li++) {
      const layer = sprite.layers[li];
      if (!layer.visible) continue;
      const cel = sprite.cels[li]?.[fi];
      if (!cel) continue;
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(cel.canvas, ox, oy, sw, sh);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Grid
    if (this.state.showGrid && zoom >= 4) {
      this._drawGrid(ctx, ox, oy, sw, sh, zoom, sprite.width, sprite.height);
    }

    // Sprite border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox - 0.5, oy - 0.5, sw + 1, sh + 1);

    // Preview overlay
    if (this.state.previewPixels && this.state.previewPixels.length > 0) {
      this._drawPreviewPixels(ctx, ox, oy, zoom);
    }

    // Selection marching ants
    if (this.state.selection) {
      this._drawSelection(ctx, ox, oy, zoom);
    }

    // Brush cursor / pixel highlight
    const brushTools = ['pencil', 'eraser', 'spray'];
    if (this._cursorPos && !this.state.isPanning) {
      if (brushTools.includes(this.state.activeTool)) {
        this._drawBrushCursor(ctx, ox, oy, zoom);
      } else {
        this._drawPixelHighlight(ctx, ox, oy, zoom);
      }
    }
  }

  _drawFrameOnionSkin(ctx, sprite, frameIndex, ox, oy, sw, sh, alpha, tintColor) {
    // Composite the frame into a temp canvas, then draw with tint
    const tmp = document.createElement('canvas');
    tmp.width = sprite.width;
    tmp.height = sprite.height;
    const tctx = tmp.getContext('2d');
    for (let li = 0; li < sprite.layers.length; li++) {
      const layer = sprite.layers[li];
      if (!layer.visible) continue;
      const cel = sprite.cels[li]?.[frameIndex];
      if (!cel) continue;
      tctx.globalAlpha = layer.opacity / 100;
      tctx.globalCompositeOperation = layer.blendMode;
      tctx.drawImage(cel.canvas, 0, 0);
    }
    tctx.globalAlpha = 1;
    tctx.globalCompositeOperation = 'source-over';
    // Tint
    tctx.globalCompositeOperation = 'source-atop';
    tctx.globalAlpha = 0.5;
    tctx.fillStyle = tintColor;
    tctx.fillRect(0, 0, sprite.width, sprite.height);

    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(tmp, ox, oy, sw, sh);
    ctx.globalAlpha = 1;
  }

  _drawPreviewPixels(ctx, ox, oy, zoom) {
    const pixels = this.state.previewPixels;
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
        if (y === 0 || !mask[(y-1)*w+x]) { ctx.moveTo(sx, sy+0.5); ctx.lineTo(sx+zoom, sy+0.5); }
        if (y === h-1 || !mask[(y+1)*w+x]) { ctx.moveTo(sx, sy+zoom-0.5); ctx.lineTo(sx+zoom, sy+zoom-0.5); }
        if (x === 0 || !mask[y*w+(x-1)]) { ctx.moveTo(sx+0.5, sy); ctx.lineTo(sx+0.5, sy+zoom); }
        if (x === w-1 || !mask[y*w+(x+1)]) { ctx.moveTo(sx+zoom-0.5, sy); ctx.lineTo(sx+zoom-0.5, sy+zoom); }
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  // Sample the already-composited canvas pixels in the given screen rect and return
  // contrasting cursor colors (white on dark, black on light).
  _getCursorContrastColor(ctx, screenX, screenY, screenW, screenH) {
    const el = ctx.canvas;
    const x = Math.max(0, Math.floor(screenX));
    const y = Math.max(0, Math.floor(screenY));
    const w = Math.min(Math.max(1, Math.floor(screenW)), el.width - x);
    const h = Math.min(Math.max(1, Math.floor(screenH)), el.height - y);
    if (w <= 0 || h <= 0) return { stroke: 'rgba(255,255,255,0.9)', fill: 'rgba(255,255,255,0.3)' };
    const data = ctx.getImageData(x, y, w, h).data;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    const luma = total / (data.length / 4);
    return luma > 128
      ? { stroke: 'rgba(0,0,0,0.85)',   fill: 'rgba(0,0,0,0.2)' }
      : { stroke: 'rgba(255,255,255,0.9)', fill: 'rgba(255,255,255,0.3)' };
  }

  _drawPixelHighlight(ctx, ox, oy, zoom) {
    const pos = this._cursorPos;
    const sx = ox + pos.x * zoom;
    const sy = oy + pos.y * zoom;
    const { stroke } = this._getCursorContrastColor(ctx, sx, sy, zoom, zoom);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, zoom - 1, zoom - 1);
  }

  _drawBrushCursor(ctx, ox, oy, zoom) {
    const pos = this._cursorPos;
    const offsets = getBrushStamp(this.state.brushSize, this.state.brushShape);
    // Compute brush bounding box in screen coords for the contrast sample
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const { dx, dy } of offsets) {
      const bx = ox + (pos.x + dx) * zoom;
      const by = oy + (pos.y + dy) * zoom;
      if (bx < minX) minX = bx;
      if (by < minY) minY = by;
      if (bx + zoom > maxX) maxX = bx + zoom;
      if (by + zoom > maxY) maxY = by + zoom;
    }
    const { stroke, fill } = this._getCursorContrastColor(ctx, minX, minY, maxX - minX, maxY - minY);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    for (const { dx, dy } of offsets) {
      ctx.fillRect(ox + (pos.x + dx) * zoom, oy + (pos.y + dy) * zoom, zoom, zoom);
    }
    const filled = new Set(offsets.map(({ dx, dy }) => `${pos.x + dx},${pos.y + dy}`));
    ctx.beginPath();
    for (const { dx, dy } of offsets) {
      const px = pos.x + dx, py = pos.y + dy;
      const sx = ox + px * zoom, sy = oy + py * zoom;
      if (!filled.has(`${px},${py-1}`)) { ctx.moveTo(sx, sy+0.5); ctx.lineTo(sx+zoom, sy+0.5); }
      if (!filled.has(`${px},${py+1}`)) { ctx.moveTo(sx, sy+zoom-0.5); ctx.lineTo(sx+zoom, sy+zoom-0.5); }
      if (!filled.has(`${px-1},${py}`)) { ctx.moveTo(sx+0.5, sy); ctx.lineTo(sx+0.5, sy+zoom); }
      if (!filled.has(`${px+1},${py}`)) { ctx.moveTo(sx+zoom-0.5, sy); ctx.lineTo(sx+zoom-0.5, sy+zoom); }
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
