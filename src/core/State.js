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
}
