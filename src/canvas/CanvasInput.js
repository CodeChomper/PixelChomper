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
  }

  _bindEvents() {
    this.container.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.container.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.container.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this.container.addEventListener('pointerleave', (e) => this._onPointerUp(e));
    this.container.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('keyup', (e) => this._onKeyUp(e));
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
      this.container.style.cursor = this._spaceHeld ? 'grab' : 'crosshair';
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

    // Swap colors
    if (e.key === 'x' || e.key === 'X') {
      this.state.swapColors();
      return;
    }

    // Tool shortcuts
    const toolId = KEY_BINDINGS[e.key.toLowerCase()];
    if (toolId) {
      this.state.setTool(toolId);
      return;
    }
  }

  _onKeyUp(e) {
    if (e.key === ' ') {
      this._spaceHeld = false;
      if (!this.state.isPanning) {
        this.container.style.cursor = 'crosshair';
      }
    }
  }
}
