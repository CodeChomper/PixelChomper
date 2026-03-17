import { KEY_BINDINGS, clamp, MIN_ZOOM, MAX_ZOOM } from '../core/Constants.js';

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

  _onPointerDown(e) {
    this.container.setPointerCapture(e.pointerId);

    // Space + click = pan
    if (this._spaceHeld || e.button === 1) {
      this.state.isPanning = true;
      this._panStart = { x: e.clientX - this.state.panX, y: e.clientY - this.state.panY };
      this.container.style.cursor = 'grabbing';
      return;
    }

    if (!this.state.sprite) return;

    const pos = this._spriteCoords(e);
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

    if (this.state.isDrawing) {
      const tool = this.toolManager.getActiveTool();
      if (tool) tool.onPointerMove(pos, e, this.state);
    }
  }

  _onPointerUp(e) {
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

    if (this.state.isDrawing) {
      const pos = this._spriteCoords(e);
      const tool = this.toolManager.getActiveTool();
      if (tool) tool.onPointerUp(pos, e, this.state);
      this.state.isDrawing = false;
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

    // Tool shortcuts
    const keyStr = e.shiftKey ? `shift+${e.key.toLowerCase()}` : e.key.toLowerCase();
    const toolId = KEY_BINDINGS[keyStr];
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
