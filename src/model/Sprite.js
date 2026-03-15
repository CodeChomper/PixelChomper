import { Layer } from './Layer.js';

/**
 * Sprite model — manages dimensions and an ordered array of layers.
 * Provides backward-compatible getPixel/setPixel/setPixels that delegate
 * to a specified layer (defaults to index 0 for legacy callers).
 */
export class Sprite {
  constructor(width, height, bgColor = null) {
    this.width = width;
    this.height = height;

    /** @type {Layer[]} bottom-to-top order */
    this.layers = [];

    // Create the initial background layer
    const bg = new Layer(width, height, 'Background', bgColor);
    this.layers.push(bg);
  }

  /** Get pixel from a specific layer (or composited result if layerIndex omitted). */
  getPixel(x, y, layerIndex = 0) {
    const layer = this.layers[layerIndex];
    return layer ? layer.getPixel(x, y) : null;
  }

  /** Set pixel on a specific layer. */
  setPixel(x, y, color, layerIndex = 0) {
    const layer = this.layers[layerIndex];
    if (layer) layer.setPixel(x, y, color);
  }

  /** Set pixels on a specific layer. */
  setPixels(pixels, layerIndex = 0) {
    const layer = this.layers[layerIndex];
    if (layer) layer.setPixels(pixels);
  }

  /** Add a new transparent layer above the given index. Returns the new layer's index. */
  addLayer(name, aboveIndex = null) {
    const layer = new Layer(this.width, this.height, name || `Layer ${this.layers.length}`);
    const insertAt = aboveIndex !== null ? aboveIndex + 1 : this.layers.length;
    this.layers.splice(insertAt, 0, layer);
    return insertAt;
  }

  /** Remove a layer by index. Returns the removed layer, or null. */
  removeLayer(index) {
    if (this.layers.length <= 1) return null; // must keep at least 1 layer
    const [removed] = this.layers.splice(index, 1);
    return removed;
  }

  /** Duplicate a layer. Returns the new layer's index. */
  duplicateLayer(index) {
    const layer = this.layers[index];
    if (!layer) return -1;
    const copy = layer.duplicate();
    this.layers.splice(index + 1, 0, copy);
    return index + 1;
  }

  /** Move a layer from one index to another. */
  moveLayer(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const [layer] = this.layers.splice(fromIndex, 1);
    this.layers.splice(toIndex, 0, layer);
  }

  /** Merge a layer down into the one below it. Returns the merged layer index. */
  mergeDown(index) {
    if (index <= 0 || index >= this.layers.length) return -1;
    const upper = this.layers[index];
    const lower = this.layers[index - 1];
    // Composite upper onto lower
    lower.ctx.globalAlpha = upper.opacity / 100;
    lower.ctx.globalCompositeOperation = upper.blendMode;
    lower.ctx.drawImage(upper.canvas, 0, 0);
    lower.ctx.globalAlpha = 1;
    lower.ctx.globalCompositeOperation = 'source-over';
    this.layers.splice(index, 1);
    return index - 1;
  }

  /** Flatten all visible layers into a single layer. */
  flatten() {
    const result = new Layer(this.width, this.height, 'Background');
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      result.ctx.globalAlpha = layer.opacity / 100;
      result.ctx.globalCompositeOperation = layer.blendMode;
      result.ctx.drawImage(layer.canvas, 0, 0);
    }
    result.ctx.globalAlpha = 1;
    result.ctx.globalCompositeOperation = 'source-over';
    this.layers = [result];
  }

  /**
   * Composite all visible layers and return the result as a canvas.
   * Useful for eyedropper sampling the final image.
   */
  getComposited() {
    const c = document.createElement('canvas');
    c.width = this.width;
    c.height = this.height;
    const ctx = c.getContext('2d');
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(layer.canvas, 0, 0);
    }
    return c;
  }
}
