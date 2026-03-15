import { EventBus } from './EventBus.js';
import { TOOLS, BRUSH_SHAPES, DEFAULT_FG, DEFAULT_BG, DEFAULT_ZOOM, DEFAULT_BRUSH_SIZE } from './Constants.js';

/**
 * Central application state. Single source of truth.
 * Emits change events via the EventBus so UI/tools can react.
 */
export class State {
  constructor() {
    this.events = new EventBus();
    this.sprite = null;
    this.activeTool = TOOLS.PENCIL;
    this.fgColor = { ...DEFAULT_FG };
    this.bgColor = { ...DEFAULT_BG };
    this.brushSize = DEFAULT_BRUSH_SIZE;
    this.brushShape = BRUSH_SHAPES.SQUARE;
    this.zoom = DEFAULT_ZOOM;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.isDrawing = false;
    this.showGrid = false;

    // Stage 2 state
    this.previewPixels = null;      // [{x,y,color}] overlay during shape dragging
    this.selection = null;          // Uint8Array bitmask (width*height), null = no selection
    this.clipboard = null;          // {pixels:[{x,y,color}], width, height} or null
    this.pixelPerfect = false;      // pixel-perfect drawing mode
    this.shapeMode = 'outline';     // 'outline' or 'filled'
    this.fillTolerance = 0;         // 0-255
    this.fillContiguous = true;     // flood fill contiguous toggle
    this.sprayRadius = 10;          // spray tool radius
    this.sprayDensity = 50;         // spray tool density (0-100)
  }

  setTool(tool) {
    if (this.activeTool === tool) return;
    this.activeTool = tool;
    this.events.emit('tool:changed', tool);
  }

  setFGColor(color) {
    this.fgColor = { ...color };
    this.events.emit('color:fg-changed', this.fgColor);
  }

  setBGColor(color) {
    this.bgColor = { ...color };
    this.events.emit('color:bg-changed', this.bgColor);
  }

  swapColors() {
    const tmp = this.fgColor;
    this.fgColor = this.bgColor;
    this.bgColor = tmp;
    this.events.emit('color:fg-changed', this.fgColor);
    this.events.emit('color:bg-changed', this.bgColor);
  }

  setBrushSize(size) {
    this.brushSize = size;
    this.events.emit('brush:size-changed', size);
  }

  setBrushShape(shape) {
    this.brushShape = shape;
    this.events.emit('brush:shape-changed', shape);
  }

  setZoom(zoom) {
    this.zoom = zoom;
    this.events.emit('view:zoom-changed', zoom);
  }

  setPan(x, y) {
    this.panX = x;
    this.panY = y;
    this.events.emit('view:pan-changed', x, y);
  }

  setSprite(sprite) {
    this.sprite = sprite;
    this.events.emit('sprite:loaded', sprite);
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.events.emit('view:grid-changed', this.showGrid);
  }

  /**
   * Write pixels to the active sprite, respecting the current selection mask.
   * Pixels outside the selection are silently dropped. Emits 'sprite:modified'.
   */
  commitPixels(pixels) {
    if (!this.sprite || !pixels || !pixels.length) return;
    const filtered = this.selection
      ? pixels.filter(p => {
          const idx = p.y * this.sprite.width + p.x;
          return this.selection[idx] === 1;
        })
      : pixels;
    this.sprite.setPixels(filtered);
    this.events.emit('sprite:modified');
  }

  setPreviewPixels(pixels) {
    this.previewPixels = pixels;
    this.events.emit('preview:changed', pixels);
  }

  setSelection(mask) {
    this.selection = mask;
    this.events.emit('selection:changed', mask);
  }

  clearSelection() {
    this.selection = null;
    this.events.emit('selection:changed', null);
  }

  togglePixelPerfect() {
    this.pixelPerfect = !this.pixelPerfect;
    this.events.emit('pixelperfect:changed', this.pixelPerfect);
  }

  setShapeMode(mode) {
    this.shapeMode = mode;
    this.events.emit('shapemode:changed', mode);
  }

  setFillTolerance(t) {
    this.fillTolerance = t;
    this.events.emit('fill:tolerance-changed', t);
  }

  setFillContiguous(v) {
    this.fillContiguous = v;
    this.events.emit('fill:contiguous-changed', v);
  }

  setSprayRadius(r) {
    this.sprayRadius = r;
    this.events.emit('spray:radius-changed', r);
  }

  setSprayDensity(d) {
    this.sprayDensity = d;
    this.events.emit('spray:density-changed', d);
  }
}
