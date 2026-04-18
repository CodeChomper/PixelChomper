import { clamp, MIN_ZOOM, MAX_ZOOM } from '../core/Constants.js';
import { hitSelectionHandle, HANDLE_CURSORS } from '../tools/SelectRectTool.js';

const SELECTION_TOOLS = new Set(['select_rect', 'select_lasso', 'magic_wand']);

/** Nearest-neighbour scale of srcPixels from srcBBox to dstBBox. */
function scalePixels(srcPixels, srcBBox, dstBBox) {
  const srcW = srcBBox.x1 - srcBBox.x0 + 1;
  const srcH = srcBBox.y1 - srcBBox.y0 + 1;
  const dstW = dstBBox.x1 - dstBBox.x0 + 1;
  const dstH = dstBBox.y1 - dstBBox.y0 + 1;
  const srcMap = new Map();
  for (const p of srcPixels) {
    srcMap.set((p.x - srcBBox.x0) + (p.y - srcBBox.y0) * srcW, p.color);
  }
  const result = [];
  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const sx = Math.floor(dx * srcW / dstW);
      const sy = Math.floor(dy * srcH / dstH);
      const color = srcMap.get(sx + sy * srcW);
      if (color && color.a > 0) {
        result.push({ x: dstBBox.x0 + dx, y: dstBBox.y0 + dy, color });
      }
    }
  }
  return result;
}

/** Compute new bounding box given which handle is being dragged and the current sprite position. */
function computeResizeBBox(handle, origBBox, pos, spriteW, spriteH) {
  const { x0, y0, x1, y1 } = origBBox;
  const cx = v => Math.max(0, Math.min(spriteW - 1, v));
  const cy = v => Math.max(0, Math.min(spriteH - 1, v));
  let nx0 = x0, ny0 = y0, nx1 = x1, ny1 = y1;
  if      (handle === 'tl') { nx0 = cx(pos.x); ny0 = cy(pos.y); }
  else if (handle === 'tc') { ny0 = cy(pos.y); }
  else if (handle === 'tr') { nx1 = cx(pos.x); ny0 = cy(pos.y); }
  else if (handle === 'ml') { nx0 = cx(pos.x); }
  else if (handle === 'mr') { nx1 = cx(pos.x); }
  else if (handle === 'bl') { nx0 = cx(pos.x); ny1 = cy(pos.y); }
  else if (handle === 'bc') { ny1 = cy(pos.y); }
  else if (handle === 'br') { nx1 = cx(pos.x); ny1 = cy(pos.y); }
  const bx0 = Math.min(nx0, nx1), by0 = Math.min(ny0, ny1);
  const bx1 = Math.max(nx0, nx1), by1 = Math.max(ny0, ny1);
  return (bx0 <= bx1 && by0 <= by1) ? { x0: bx0, y0: by0, x1: bx1, y1: by1 } : null;
}

/**
 * Handles mouse/keyboard input on the canvas area.
 * Converts screen coordinates to sprite-space and dispatches to the active tool.
 */
export class CanvasInput {
  constructor(state, renderer, toolManager) {
    this.state = state;
    this.renderer = renderer;
    this.toolManager = toolManager;
    this.container = renderer.container;

    this._spaceHeld = false;
    this._panStart = null;
    this._pointers = new Map(); // for pinch-to-zoom

    // Selection resize/move state (shared across all selection tools)
    this._resizing = null; // { handle, origBBox, srcPixels } | null
    this._moving   = null; // { start, selPixels, clearPixels, origMask } | null

    // Expose renderer on state so tools can access zoom/pan geometry
    this.state._renderer = renderer;

    this._bindEvents();
    this.state.events.on('tool:changed', () => this._updateCursor());
  }

  _bindEvents() {
    this.container.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.container.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.container.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this.container.addEventListener('pointerleave', (e) => {
      this._onPointerUp(e);
      this.state.events.emit('cursor:left');
    });
    this.container.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    this._updateCursor();

    document.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('keyup', (e) => this._onKeyUp(e));
  }

  _updateCursor() {
    if (this.state.isPanning) return;
    const brushTools = ['pencil', 'eraser', 'spray'];
    if (brushTools.includes(this.state.activeTool)) {
      this.container.style.cursor = 'none';
    } else if (this.state.activeTool === 'move') {
      this.container.style.cursor = 'move';
    } else {
      this.container.style.cursor = 'crosshair';
    }
  }

  _spriteCoords(e) {
    return this.renderer.screenToSprite(e.clientX, e.clientY);
  }

  /** Try to find a resize handle hit at the given raw pointer event. Returns handle name or null. */
  _hitHandle(e) {
    if (!SELECTION_TOOLS.has(this.state.activeTool) || !this.state.selectionBBox) return null;
    const rect = this.container.getBoundingClientRect();
    return hitSelectionHandle(
      e.clientX - rect.left, e.clientY - rect.top,
      this.state.selectionBBox, this.state,
    );
  }

  /** Returns true if the sprite-space position is inside the active selection mask. */
  _insideSelection(pos) {
    const mask = this.state.selection;
    if (!mask || !this.state.sprite) return false;
    const { width: w, height: h } = this.state.sprite;
    if (pos.x < 0 || pos.x >= w || pos.y < 0 || pos.y >= h) return false;
    return mask[pos.y * w + pos.x] === 1;
  }

  _onPointerDown(e) {
    e.preventDefault(); // Prevent native touch scroll
    this.container.setPointerCapture(e.pointerId);
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Space + click = pan
    if (this._spaceHeld || e.button === 1) {
      this.state.isPanning = true;
      this._panStart = { x: e.clientX - this.state.panX, y: e.clientY - this.state.panY };
      this.container.style.cursor = 'grabbing';
      return;
    }

    if (!this.state.sprite) return;

    // Check if a resize handle was hit — if so, intercept and don't dispatch to the tool
    const hit = this._hitHandle(e);
    if (hit) {
      this.state.isDrawing = true;
      this.container.style.cursor = HANDLE_CURSORS[hit];
      const cel = this.state.activeCel;
      const mask = this.state.selection;
      const w = this.state.sprite.width;
      const srcPixels = [];
      if (cel && mask) {
        for (let i = 0; i < mask.length; i++) {
          if (!mask[i]) continue;
          const x = i % w, y = Math.floor(i / w);
          const color = cel.getPixel(x, y);
          if (color) srcPixels.push({ x, y, color });
        }
      }
      this._resizing = { handle: hit, origBBox: { ...this.state.selectionBBox }, srcPixels };
      return;
    }

    const pos = this._spriteCoords(e);

    // Click inside selection with a selection tool → move the selection contents
    if (SELECTION_TOOLS.has(this.state.activeTool) && this._insideSelection(pos)) {
      this.state.isDrawing = true;
      this.container.style.cursor = 'move';
      const cel = this.state.activeCel;
      const mask = this.state.selection;
      const w = this.state.sprite.width;
      const selPixels = [], clearPixels = [];
      if (cel && mask) {
        for (let i = 0; i < mask.length; i++) {
          if (!mask[i]) continue;
          const x = i % w, y = Math.floor(i / w);
          const color = cel.getPixel(x, y);
          if (color) {
            selPixels.push({ x, y, color });
            clearPixels.push({ x, y, color: { r: 0, g: 0, b: 0, a: 0 } });
          }
        }
      }
      this._moving = { start: { ...pos }, selPixels, clearPixels, origMask: mask };
      return;
    }

    this.state.isDrawing = true;

    // Push undo snapshot before pixel-modifying tools
    const NON_MODIFYING = new Set(['eyedropper', 'select_rect', 'select_lasso', 'magic_wand']);
    if (!NON_MODIFYING.has(this.state.activeTool)) {
      this.state.pushHistorySnapshot();
    }

    const tool = this.toolManager.getActiveTool();
    if (tool) tool.onPointerDown(pos, e, this.state);
  }

  _onPointerMove(e) {
    // Pinch-to-zoom: handle two-finger gestures
    if (this._pointers.size === 2) {
      const prev = this._pointers.get(e.pointerId);
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...this._pointers.values()];
      const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (prev && this._lastPinchDist !== undefined) {
        const ratio = curDist / this._lastPinchDist;
        if (Math.abs(ratio - 1) > 0.02) {
          const currentZoom = this.state.zoom;
          const newZoom = clamp(Math.round(currentZoom * ratio), MIN_ZOOM, MAX_ZOOM);
          if (newZoom !== currentZoom) this.state.setZoom(newZoom);
        }
      }
      this._lastPinchDist = curDist;
      return;
    }

    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.state.isPanning && this._panStart) {
      this.state.setPan(
        e.clientX - this._panStart.x,
        e.clientY - this._panStart.y
      );
      return;
    }

    if (!this.state.sprite) return;

    const pos = this._spriteCoords(e);
    this.state.events.emit('cursor:moved', pos);

    // Handle resize drag
    if (this._resizing) {
      this.container.style.cursor = HANDLE_CURSORS[this._resizing.handle];
      const newBBox = computeResizeBBox(
        this._resizing.handle, this._resizing.origBBox, pos,
        this.state.sprite.width, this.state.sprite.height,
      );
      if (newBBox) {
        const clearPixels = this._resizing.srcPixels.map(
          p => ({ x: p.x, y: p.y, color: { r: 0, g: 0, b: 0, a: 0 } }),
        );
        const scaled = scalePixels(this._resizing.srcPixels, this._resizing.origBBox, newBBox);
        this.state.setPreviewPixels([...clearPixels, ...scaled]);
      }
      return;
    }

    // Handle move drag
    if (this._moving) {
      this.container.style.cursor = 'move';
      const dx = pos.x - this._moving.start.x;
      const dy = pos.y - this._moving.start.y;
      const movedPixels = this._moving.selPixels.map(p => ({ x: p.x + dx, y: p.y + dy, color: p.color }));
      this.state.setPreviewPixels([...this._moving.clearPixels, ...movedPixels]);
      return;
    }

    // Update hover cursor for selection handles / inside-selection (any selection tool, not drawing)
    if (SELECTION_TOOLS.has(this.state.activeTool) && !this.state.isDrawing && this.state.selectionBBox) {
      const hit = this._hitHandle(e);
      if (hit) {
        this.container.style.cursor = HANDLE_CURSORS[hit];
      } else if (this._insideSelection(pos)) {
        this.container.style.cursor = 'move';
      } else {
        this.container.style.cursor = 'crosshair';
      }
    }

    if (this.state.isDrawing) {
      const tool = this.toolManager.getActiveTool();
      if (tool) tool.onPointerMove(pos, e, this.state);
    }
  }

  _onPointerUp(e) {
    this._pointers.delete(e.pointerId);
    this._lastPinchDist = undefined;

    if (this.state.isPanning) {
      this.state.isPanning = false;
      this._panStart = null;
      if (this._spaceHeld) {
        this.container.style.cursor = 'grab';
      } else {
        this._updateCursor();
      }
      return;
    }

    // Commit move
    if (this._moving) {
      const pos = this._spriteCoords(e);
      const dx = pos.x - this._moving.start.x;
      const dy = pos.y - this._moving.start.y;
      if (dx !== 0 || dy !== 0) {
        this.state.pushHistorySnapshot();
        const w = this.state.sprite.width, h = this.state.sprite.height;
        const cel = this.state.activeCel;
        if (cel) {
          cel.setPixels(this._moving.clearPixels);
          cel.setPixels(
            this._moving.selPixels
              .map(p => ({ x: p.x + dx, y: p.y + dy, color: p.color }))
              .filter(p => p.x >= 0 && p.x < w && p.y >= 0 && p.y < h),
          );
        }
        this.state.setPreviewPixels(null);
        this.state.events.emit('sprite:modified');
        // Move the selection mask by the same offset
        const mask = this._moving.origMask;
        const newMask = new Uint8Array(w * h);
        for (let i = 0; i < mask.length; i++) {
          if (!mask[i]) continue;
          const nx = (i % w) + dx, ny = Math.floor(i / w) + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) newMask[ny * w + nx] = 1;
        }
        this.state.setSelection(newMask);
      } else {
        this.state.setPreviewPixels(null);
      }
      this._moving = null;
      this.state.isDrawing = false;
      this._updateCursor();
      return;
    }

    // Commit resize
    if (this._resizing) {
      const pos = this._spriteCoords(e);
      const newBBox = computeResizeBBox(
        this._resizing.handle, this._resizing.origBBox, pos,
        this.state.sprite.width, this.state.sprite.height,
      );
      if (newBBox) {
        this.state.pushHistorySnapshot();
        const cel = this.state.activeCel;
        if (cel) {
          cel.setPixels(
            this._resizing.srcPixels.map(p => ({ x: p.x, y: p.y, color: { r: 0, g: 0, b: 0, a: 0 } })),
          );
          cel.setPixels(scalePixels(this._resizing.srcPixels, this._resizing.origBBox, newBBox));
        }
        this.state.setPreviewPixels(null);
        this.state.events.emit('sprite:modified');
        // Move selection to new bbox
        const w = this.state.sprite.width, h = this.state.sprite.height;
        const newMask = new Uint8Array(w * h);
        for (let y = newBBox.y0; y <= newBBox.y1; y++)
          for (let x = newBBox.x0; x <= newBBox.x1; x++)
            if (x >= 0 && x < w && y >= 0 && y < h) newMask[y * w + x] = 1;
        this.state.setSelection(newMask);
      } else {
        this.state.setPreviewPixels(null);
      }
      this._resizing = null;
      this.state.isDrawing = false;
      this._updateCursor();
      return;
    }

    if (this.state.isDrawing) {
      const pos = this._spriteCoords(e);
      const tool = this.toolManager.getActiveTool();
      if (tool) tool.onPointerUp(pos, e, this.state);
      this.state.isDrawing = false;
      this._updateCursor();
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const currentZoom = this.state.zoom;
    let newZoom;
    if (delta > 0) {
      newZoom = currentZoom < 4 ? currentZoom + 1 : currentZoom * 2;
    } else {
      newZoom = currentZoom <= 4 ? currentZoom - 1 : Math.floor(currentZoom / 2);
    }
    newZoom = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
    if (newZoom !== currentZoom) {
      this.state.setZoom(newZoom);
    }
  }

  _onKeyDown(e) {
    // Don't intercept when typing in inputs/dialogs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === ' ' && !e.repeat) {
      e.preventDefault();
      this._spaceHeld = true;
      this.container.style.cursor = 'grab';
      return;
    }

    // Zoom shortcuts
    if (e.key === '=' || e.key === '+') {
      const z = clamp(this.state.zoom < 4 ? this.state.zoom + 1 : this.state.zoom * 2, MIN_ZOOM, MAX_ZOOM);
      this.state.setZoom(z);
      return;
    }
    if (e.key === '-') {
      const z = clamp(this.state.zoom <= 4 ? this.state.zoom - 1 : Math.floor(this.state.zoom / 2), MIN_ZOOM, MAX_ZOOM);
      this.state.setZoom(z);
      return;
    }

    // Escape: cancel selection and active multi-click tools
    if (e.key === 'Escape') {
      this.state.clearSelection();
      this.state.setPreviewPixels(null);
      // Cancel multi-click tools
      const tool = this.toolManager.getActiveTool();
      if (tool && tool.cancel) tool.cancel(this.state);
      return;
    }

    // Enter: play/pause OR commit polygon/curve
    if (e.key === 'Enter') {
      const tool = this.toolManager.getActiveTool();
      if (tool && tool.commit) {
        tool.commit(this.state);
      } else {
        this.state.togglePlayback();
      }
      return;
    }

    // Frame navigation: left/right arrows
    if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      this.state.setActiveFrame(this.state.activeFrameIndex - 1);
      return;
    }
    if (e.key === 'ArrowRight' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      this.state.setActiveFrame(this.state.activeFrameIndex + 1);
      return;
    }

    // Alt+N: add frame
    if (e.altKey && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      this.state.addFrame();
      return;
    }

    // Undo / Redo
    if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) {
        this.state.redo();
      } else {
        this.state.undo();
      }
      return;
    }

    // Selection shortcuts (require sprite)
    if (this.state.sprite && e.ctrlKey) {
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        const w = this.state.sprite.width, h = this.state.sprite.height;
        const mask = new Uint8Array(w * h).fill(1);
        this.state.setSelection(mask);
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        this.state.clearSelection();
        return;
      }
      if ((e.key === 'i' || e.key === 'I') && e.shiftKey) {
        e.preventDefault();
        if (this.state.selection) {
          const inv = this.state.selection.map(v => v ? 0 : 1);
          this.state.setSelection(inv);
        }
        return;
      }
      if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        this._cutSelection();
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        this._copySelection();
        return;
      }
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        this._pasteClipboard();
        return;
      }
    }

    // Swap colors (only when not using ctrl)
    if (!e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
      this.state.swapColors();
      return;
    }

    // Tool shortcuts (use dynamic keybindings)
    const keyStr = e.shiftKey ? `shift+${e.key.toLowerCase()}` : e.key.toLowerCase();
    const toolId = this.state.keyBindings[keyStr];
    if (toolId) {
      this.state.setTool(toolId);
      return;
    }
  }

  _onKeyUp(e) {
    if (e.key === ' ') {
      this._spaceHeld = false;
      if (!this.state.isPanning) {
        this.container.style.cursor = 'none';
      }
    }
  }

  _cutSelection() {
    this._copySelection();
    const cel = this.state.activeCel;
    if (!this.state.selection || !cel) return;
    this.state.pushHistorySnapshot();
    const mask = this.state.selection;
    const w = this.state.sprite.width;
    const transparent = { r: 0, g: 0, b: 0, a: 0 };
    const pixels = [];
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) {
        const x = i % w, y = Math.floor(i / w);
        pixels.push({ x, y, color: transparent });
      }
    }
    cel.setPixels(pixels);
    this.state.events.emit('sprite:modified');
  }

  _copySelection() {
    const cel = this.state.activeCel;
    if (!this.state.selection || !cel) return;
    const mask = this.state.selection;
    const w = this.state.sprite.width;
    const pixels = [];
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) {
        const x = i % w, y = Math.floor(i / w);
        const color = cel.getPixel(x, y);
        if (color) pixels.push({ x, y, color });
      }
    }
    this.state.clipboard = { pixels, width: w, height: this.state.sprite.height };
  }

  _pasteClipboard() {
    const cel = this.state.activeCel;
    if (!this.state.clipboard || !cel) return;
    this.state.pushHistorySnapshot();
    const { pixels } = this.state.clipboard;
    cel.setPixels(pixels);
    this.state.events.emit('sprite:modified');
  }
}
