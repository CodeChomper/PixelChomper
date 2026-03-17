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
    this.previewPixels = null;
    this.selection = null;
    this.clipboard = null;
    this.pixelPerfect = false;
    this.shapeMode = 'outline';
    this.fillTolerance = 0;
    this.fillContiguous = true;
    this.sprayRadius = 10;
    this.sprayDensity = 50;

    // Stage 3 state
    this.shadingInk = false;
    this.activePalette = null;
    this.recentColors = [];
    this._maxRecentColors = 8;

    // Stage 4 state
    this.activeLayerIndex = 0;

    // Stage 5 state
    this.history = new History(50);

    // Stage 6 state
    this.activeFrameIndex = 0;
    this.onionSkin = {
      enabled: false,
      prevCount: 1,
      nextCount: 1,
      opacity: 0.5,
    };
    this._playInterval = null;
    this.isPlaying = false;
    this.playbackFps = 10;
    this.playbackLoop = 'forward'; // 'forward' | 'reverse' | 'pingpong'
    this._pingpongDir = 1;
  }

  // ── Color / brush / zoom setters ──────────────────────────────────────────

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
    this.stopPlayback();
    this.sprite = sprite;
    this.activeLayerIndex = 0;
    this.activeFrameIndex = 0;
    this.history.clear();
    this.events.emit('sprite:loaded', sprite);
  }

  // ── Undo / redo ───────────────────────────────────────────────────────────

  pushHistorySnapshot() {
    const cel = this.activeCel;
    if (!cel || !this.sprite) return;
    const imageData = cel.ctx.getImageData(0, 0, this.sprite.width, this.sprite.height);
    this.history.push(this.activeLayerIndex, this.activeFrameIndex, imageData, this.selection);
  }

  undo() {
    if (!this.sprite || !this.history.canUndo()) return;
    const cel = this.activeCel;
    if (!cel) return;
    const currentData = cel.ctx.getImageData(0, 0, this.sprite.width, this.sprite.height);
    const snapshot = this.history.undo(
      this.activeLayerIndex, this.activeFrameIndex, currentData, this.selection,
    );
    if (!snapshot) return;
    const targetCel = this.sprite.getCel(snapshot.layerIndex, snapshot.frameIndex);
    if (targetCel) {
      targetCel.ctx.putImageData(snapshot.imageData, 0, 0);
      this.activeLayerIndex = snapshot.layerIndex;
      this.activeFrameIndex = snapshot.frameIndex;
      this.events.emit('layer:selected', this.activeLayerIndex);
      this.events.emit('frame:changed', this.activeFrameIndex);
    }
    this.selection = snapshot.selectionMask;
    this.events.emit('selection:changed', this.selection);
    this.events.emit('sprite:modified');
  }

  redo() {
    if (!this.sprite || !this.history.canRedo()) return;
    const cel = this.activeCel;
    if (!cel) return;
    const currentData = cel.ctx.getImageData(0, 0, this.sprite.width, this.sprite.height);
    const snapshot = this.history.redo(
      this.activeLayerIndex, this.activeFrameIndex, currentData, this.selection,
    );
    if (!snapshot) return;
    const targetCel = this.sprite.getCel(snapshot.layerIndex, snapshot.frameIndex);
    if (targetCel) {
      targetCel.ctx.putImageData(snapshot.imageData, 0, 0);
      this.activeLayerIndex = snapshot.layerIndex;
      this.activeFrameIndex = snapshot.frameIndex;
      this.events.emit('layer:selected', this.activeLayerIndex);
      this.events.emit('frame:changed', this.activeFrameIndex);
    }
    this.selection = snapshot.selectionMask;
    this.events.emit('selection:changed', this.selection);
    this.events.emit('sprite:modified');
  }

  // ── Active cel / layer accessors ─────────────────────────────────────────

  /** The current cel (pixel data for the active layer × active frame). */
  get activeCel() {
    if (!this.sprite) return null;
    return this.sprite.getCel(this.activeLayerIndex, this.activeFrameIndex) || null;
  }

  /** The current layer (metadata only). */
  get activeLayer() {
    if (!this.sprite) return null;
    return this.sprite.layers[this.activeLayerIndex] || null;
  }

  setActiveLayer(index) {
    if (!this.sprite || index < 0 || index >= this.sprite.layers.length) return;
    this.activeLayerIndex = index;
    this.events.emit('layer:selected', index);
  }

  // ── Frame operations ──────────────────────────────────────────────────────

  setActiveFrame(index) {
    if (!this.sprite) return;
    const clamped = Math.max(0, Math.min(index, this.sprite.frames.length - 1));
    if (clamped === this.activeFrameIndex) return;
    this.activeFrameIndex = clamped;
    this.events.emit('frame:changed', clamped);
    this.events.emit('sprite:modified');
  }

  addFrame() {
    if (!this.sprite) return;
    const newFi = this.sprite.addFrame(this.activeFrameIndex + 1);
    this.activeFrameIndex = newFi;
    this.events.emit('frame:added', newFi);
    this.events.emit('frame:changed', newFi);
    this.events.emit('sprite:modified');
  }

  duplicateFrame() {
    if (!this.sprite) return;
    const newFi = this.sprite.duplicateFrame(this.activeFrameIndex);
    this.activeFrameIndex = newFi;
    this.events.emit('frame:added', newFi);
    this.events.emit('frame:changed', newFi);
    this.events.emit('sprite:modified');
  }

  removeFrame() {
    if (!this.sprite || this.sprite.frames.length <= 1) return;
    const next = this.sprite.removeFrame(this.activeFrameIndex);
    this.activeFrameIndex = next;
    this.events.emit('frame:removed');
    this.events.emit('frame:changed', next);
    this.events.emit('sprite:modified');
  }

  setFrameDuration(frameIndex, duration) {
    if (!this.sprite) return;
    const frame = this.sprite.frames[frameIndex];
    if (!frame) return;
    frame.duration = Math.max(1, duration);
    this.events.emit('frame:duration-changed', frameIndex);
  }

  // ── Playback ──────────────────────────────────────────────────────────────

  togglePlayback() {
    if (this.isPlaying) this.stopPlayback();
    else this.startPlayback();
  }

  startPlayback() {
    if (this.isPlaying || !this.sprite || this.sprite.frames.length < 2) return;
    this.isPlaying = true;
    this._pingpongDir = 1;
    this.events.emit('playback:changed', true);
    this._scheduleNextFrame();
  }

  stopPlayback() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this._playTimeout) {
      clearTimeout(this._playTimeout);
      this._playTimeout = null;
    }
    this.events.emit('playback:changed', false);
  }

  _scheduleNextFrame() {
    if (!this.isPlaying || !this.sprite) return;
    const delay = Math.round(1000 / this.playbackFps);
    this._playTimeout = setTimeout(() => {
      if (!this.isPlaying) return;
      this._advancePlayback();
      this._scheduleNextFrame();
    }, delay);
  }

  _advancePlayback() {
    if (!this.sprite) return;
    const total = this.sprite.frames.length;
    let next = this.activeFrameIndex;
    if (this.playbackLoop === 'forward') {
      next = (this.activeFrameIndex + 1) % total;
    } else if (this.playbackLoop === 'reverse') {
      next = (this.activeFrameIndex - 1 + total) % total;
    } else if (this.playbackLoop === 'pingpong') {
      next = this.activeFrameIndex + this._pingpongDir;
      if (next >= total) { next = total - 2; this._pingpongDir = -1; }
      else if (next < 0) { next = 1; this._pingpongDir = 1; }
    }
    this.activeFrameIndex = next;
    this.events.emit('frame:changed', next);
    this.events.emit('sprite:modified');
  }

  setPlaybackFps(fps) {
    this.playbackFps = Math.max(1, Math.min(60, fps));
    // Sync all frame durations so export (GIF/spritesheet) matches preview speed
    if (this.sprite) {
      const duration = Math.round(1000 / this.playbackFps);
      for (const frame of this.sprite.frames) frame.duration = duration;
      this.events.emit('frame:duration-changed', -1);
    }
  }

  setPlaybackLoop(mode) {
    this.playbackLoop = mode;
  }

  // ── Onion skin ────────────────────────────────────────────────────────────

  setOnionSkin(settings) {
    Object.assign(this.onionSkin, settings);
    this.events.emit('onionskin:changed', this.onionSkin);
    this.events.emit('sprite:modified');
  }

  // ── Layer operations ──────────────────────────────────────────────────────

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

  // ── Pixel operations ──────────────────────────────────────────────────────

  /**
   * Write pixels to the active cel, respecting the current selection mask.
   * This is the single write choke-point for all drawing tools.
   */
  commitPixels(pixels) {
    if (!this.sprite || !pixels || !pixels.length) return;
    const layer = this.activeLayer;
    const cel = this.activeCel;
    if (!layer || layer.locked || !cel) return;
    const filtered = this.selection
      ? pixels.filter(p => {
          const idx = p.y * this.sprite.width + p.x;
          return this.selection[idx] === 1;
        })
      : pixels;
    cel.setPixels(filtered);
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

  // ── View ──────────────────────────────────────────────────────────────────

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.events.emit('view:grid-changed', this.showGrid);
  }

  // ── Misc state setters ────────────────────────────────────────────────────

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
      c => !(c.r === color.r && c.g === color.g && c.b === color.b && c.a === color.a),
    );
    this.recentColors.unshift({ ...color });
    if (this.recentColors.length > this._maxRecentColors) {
      this.recentColors = this.recentColors.slice(0, this._maxRecentColors);
    }
    this.events.emit('color:recent-changed', this.recentColors);
  }
}
