import { EventBus } from './EventBus.js';
import { TOOLS, BRUSH_SHAPES, DEFAULT_FG, DEFAULT_BG, DEFAULT_ZOOM, DEFAULT_BRUSH_SIZE } from './Constants.js';
import { History } from './History.js';

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

    // Stage 4 state
    this.activeLayerIndex = 0;      // index into sprite.layers[]

    // Stage 3 state
    this.shadingInk = false;        // pencil lightens/darkens instead of replacing
    this.activePalette = null;      // Palette instance or null
    this.recentColors = [];         // [{r,g,b,a}] most recent first
    this._maxRecentColors = 8;

    // Stage 5 state
    this.history = new History(50);
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
    this.activeLayerIndex = 0;
    this.history.clear();
    this.events.emit('sprite:loaded', sprite);
  }

  /**
   * Snapshot the active layer's current pixels onto the undo stack.
   * Call this BEFORE a destructive operation (tool stroke, cut, paste).
   */
  pushHistorySnapshot() {
    const layer = this.activeLayer;
    if (!layer || !this.sprite) return;
    const imageData = layer.ctx.getImageData(0, 0, this.sprite.width, this.sprite.height);
    this.history.push(this.activeLayerIndex, imageData, this.selection);
  }

  /** Undo the last pixel modification. */
  undo() {
    if (!this.sprite || !this.history.canUndo()) return;
    const layer = this.activeLayer;
    if (!layer) return;
    const currentData = layer.ctx.getImageData(0, 0, this.sprite.width, this.sprite.height);
    const snapshot = this.history.undo(this.activeLayerIndex, currentData, this.selection);
    if (!snapshot) return;
    const targetLayer = this.sprite.layers[snapshot.layerIndex];
    if (targetLayer) {
      targetLayer.ctx.putImageData(snapshot.imageData, 0, 0);
      this.activeLayerIndex = snapshot.layerIndex;
      this.events.emit('layer:selected', this.activeLayerIndex);
    }
    this.selection = snapshot.selectionMask;
    this.events.emit('selection:changed', this.selection);
    this.events.emit('sprite:modified');
  }

  /** Redo the last undone modification. */
  redo() {
    if (!this.sprite || !this.history.canRedo()) return;
    const layer = this.activeLayer;
    if (!layer) return;
    const currentData = layer.ctx.getImageData(0, 0, this.sprite.width, this.sprite.height);
    const snapshot = this.history.redo(this.activeLayerIndex, currentData, this.selection);
    if (!snapshot) return;
    const targetLayer = this.sprite.layers[snapshot.layerIndex];
    if (targetLayer) {
      targetLayer.ctx.putImageData(snapshot.imageData, 0, 0);
      this.activeLayerIndex = snapshot.layerIndex;
      this.events.emit('layer:selected', this.activeLayerIndex);
    }
    this.selection = snapshot.selectionMask;
    this.events.emit('selection:changed', this.selection);
    this.events.emit('sprite:modified');
  }

  /** Get the currently active layer, or null. */
  get activeLayer() {
    if (!this.sprite) return null;
    return this.sprite.layers[this.activeLayerIndex] || null;
  }

  setActiveLayer(index) {
    if (!this.sprite || index < 0 || index >= this.sprite.layers.length) return;
    this.activeLayerIndex = index;
    this.events.emit('layer:selected', index);
  }

  addLayer(name) {
    if (!this.sprite) return;
    const newIndex = this.sprite.addLayer(name, this.activeLayerIndex);
    this.activeLayerIndex = newIndex;
    this.events.emit('layer:added', newIndex);
    this.events.emit('layer:selected', newIndex);
    this.events.emit('sprite:modified');
  }

  removeLayer() {
    if (!this.sprite || this.sprite.layers.length <= 1) return;
    const removed = this.sprite.removeLayer(this.activeLayerIndex);
    if (!removed) return;
    if (this.activeLayerIndex >= this.sprite.layers.length) {
      this.activeLayerIndex = this.sprite.layers.length - 1;
    }
    this.events.emit('layer:removed');
    this.events.emit('layer:selected', this.activeLayerIndex);
    this.events.emit('sprite:modified');
  }

  duplicateLayer() {
    if (!this.sprite) return;
    const newIndex = this.sprite.duplicateLayer(this.activeLayerIndex);
    if (newIndex < 0) return;
    this.activeLayerIndex = newIndex;
    this.events.emit('layer:added', newIndex);
    this.events.emit('layer:selected', newIndex);
    this.events.emit('sprite:modified');
  }

  moveLayer(fromIndex, toIndex) {
    if (!this.sprite) return;
    this.sprite.moveLayer(fromIndex, toIndex);
    this.activeLayerIndex = toIndex;
    this.events.emit('layer:reordered');
    this.events.emit('layer:selected', toIndex);
    this.events.emit('sprite:modified');
  }

  mergeDown() {
    if (!this.sprite) return;
    const newIndex = this.sprite.mergeDown(this.activeLayerIndex);
    if (newIndex < 0) return;
    this.activeLayerIndex = newIndex;
    this.events.emit('layer:merged');
    this.events.emit('layer:selected', newIndex);
    this.events.emit('sprite:modified');
  }

  flattenLayers() {
    if (!this.sprite) return;
    this.sprite.flatten();
    this.activeLayerIndex = 0;
    this.events.emit('layer:flattened');
    this.events.emit('layer:selected', 0);
    this.events.emit('sprite:modified');
  }

  setLayerVisibility(index, visible) {
    if (!this.sprite) return;
    const layer = this.sprite.layers[index];
    if (!layer) return;
    layer.visible = visible;
    this.events.emit('layer:visibility-changed', index);
    this.events.emit('sprite:modified');
  }

  setLayerOpacity(index, opacity) {
    if (!this.sprite) return;
    const layer = this.sprite.layers[index];
    if (!layer) return;
    layer.opacity = Math.max(0, Math.min(100, opacity));
    this.events.emit('layer:opacity-changed', index);
    this.events.emit('sprite:modified');
  }

  setLayerBlendMode(index, mode) {
    if (!this.sprite) return;
    const layer = this.sprite.layers[index];
    if (!layer) return;
    layer.blendMode = mode;
    this.events.emit('layer:blend-changed', index);
    this.events.emit('sprite:modified');
  }

  setLayerName(index, name) {
    if (!this.sprite) return;
    const layer = this.sprite.layers[index];
    if (!layer) return;
    layer.name = name;
    this.events.emit('layer:renamed', index);
  }

  setLayerLocked(index, locked) {
    if (!this.sprite) return;
    const layer = this.sprite.layers[index];
    if (!layer) return;
    layer.locked = locked;
    this.events.emit('layer:lock-changed', index);
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
    const layer = this.activeLayer;
    if (!layer || layer.locked) return;
    const filtered = this.selection
      ? pixels.filter(p => {
          const idx = p.y * this.sprite.width + p.x;
          return this.selection[idx] === 1;
        })
      : pixels;
    layer.setPixels(filtered);
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

  setShadingInk(enabled) {
    this.shadingInk = enabled;
    this.events.emit('shading:changed', enabled);
  }

  setPalette(palette) {
    this.activePalette = palette;
    this.events.emit('palette:changed', palette);
  }

  pushRecentColor(color) {
    this.recentColors = this.recentColors.filter(
      c => !(c.r === color.r && c.g === color.g && c.b === color.b && c.a === color.a)
    );
    this.recentColors.unshift({ ...color });
    if (this.recentColors.length > this._maxRecentColors) {
      this.recentColors = this.recentColors.slice(0, this._maxRecentColors);
    }
    this.events.emit('color:recent-changed', this.recentColors);
  }
}
