import { Layer } from './Layer.js';
import { Frame } from './Frame.js';
import { Cel } from './Cel.js';

/**
 * Sprite — holds layers, frames, and a 2D array of cels (cels[layerIndex][frameIndex]).
 * Layers store visual metadata; Cels store pixel data.
 */
export class Sprite {
  constructor(width, height, bgColor = null) {
    this.width = width;
    this.height = height;
    /** @type {import('./Layer.js').Layer[]} */
    this.layers = [];
    /** @type {import('./Frame.js').Frame[]} */
    this.frames = [];
    /** @type {import('./Cel.js').Cel[][]} cels[layerIndex][frameIndex] */
    this.cels = [];
    /** @type {{name:string,color:string,from:number,to:number}[]} */
    this.tags = [];

    // Initial state: one background layer, one frame, one cel
    this.layers.push(new Layer('Background'));
    this.frames.push(new Frame(0));
    const cel = new Cel(width, height);
    if (bgColor) {
      cel.ctx.fillStyle = `rgba(${bgColor.r},${bgColor.g},${bgColor.b},${(bgColor.a ?? 255) / 255})`;
      cel.ctx.fillRect(0, 0, width, height);
    }
    this.cels = [[cel]];
  }

  getCel(layerIndex, frameIndex) {
    return this.cels[layerIndex]?.[frameIndex] || null;
  }

  // ── Frame operations ──────────────────────────────────────────────────────

  /** Add a new blank frame at the given index (or end). Returns the new frame's index. */
  addFrame(atIndex = null) {
    const fi = atIndex !== null ? atIndex : this.frames.length;
    const frame = new Frame(fi);
    this.frames.splice(fi, 0, frame);
    _reindexFrames(this.frames);
    for (let li = 0; li < this.layers.length; li++) {
      this.cels[li].splice(fi, 0, new Cel(this.width, this.height));
    }
    return fi;
  }

  /** Duplicate the frame at fi. Returns the new frame index. */
  duplicateFrame(fi) {
    const newFi = fi + 1;
    const frame = new Frame(newFi);
    frame.duration = this.frames[fi].duration;
    this.frames.splice(newFi, 0, frame);
    _reindexFrames(this.frames);
    for (let li = 0; li < this.layers.length; li++) {
      this.cels[li].splice(newFi, 0, this.cels[li][fi].duplicate());
    }
    return newFi;
  }

  /** Remove frame at fi. Returns the index to navigate to next. */
  removeFrame(fi) {
    if (this.frames.length <= 1) return 0;
    this.frames.splice(fi, 1);
    _reindexFrames(this.frames);
    for (let li = 0; li < this.layers.length; li++) {
      this.cels[li].splice(fi, 1);
    }
    return Math.min(fi, this.frames.length - 1);
  }

  /** Move a frame from one index to another. */
  moveFrame(fromFi, toFi) {
    if (fromFi === toFi) return;
    const [frame] = this.frames.splice(fromFi, 1);
    this.frames.splice(toFi, 0, frame);
    _reindexFrames(this.frames);
    for (let li = 0; li < this.layers.length; li++) {
      const [cel] = this.cels[li].splice(fromFi, 1);
      this.cels[li].splice(toFi, 0, cel);
    }
  }

  // ── Layer operations ──────────────────────────────────────────────────────

  /** Add a new transparent layer above aboveIndex. Returns the new layer index. */
  addLayer(name, aboveIndex = null) {
    const layer = new Layer(name || `Layer ${this.layers.length}`);
    const insertAt = aboveIndex !== null ? aboveIndex + 1 : this.layers.length;
    this.layers.splice(insertAt, 0, layer);
    const celsRow = this.frames.map(() => new Cel(this.width, this.height));
    this.cels.splice(insertAt, 0, celsRow);
    return insertAt;
  }

  /** Remove a layer by index. Returns the removed layer or null. */
  removeLayer(index) {
    if (this.layers.length <= 1) return null;
    const [removed] = this.layers.splice(index, 1);
    this.cels.splice(index, 1);
    return removed;
  }

  /** Duplicate a layer (all its cels). Returns the new layer index. */
  duplicateLayer(index) {
    const layer = this.layers[index];
    if (!layer) return -1;
    const copy = layer.duplicate();
    this.layers.splice(index + 1, 0, copy);
    const celsCopy = this.cels[index].map(cel => cel.duplicate());
    this.cels.splice(index + 1, 0, celsCopy);
    return index + 1;
  }

  /** Move a layer from one index to another. */
  moveLayer(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const [layer] = this.layers.splice(fromIndex, 1);
    this.layers.splice(toIndex, 0, layer);
    const [celsRow] = this.cels.splice(fromIndex, 1);
    this.cels.splice(toIndex, 0, celsRow);
  }

  /** Merge the layer at index down into the one below (across all frames). */
  mergeDown(index) {
    if (index <= 0 || index >= this.layers.length) return -1;
    const upper = this.layers[index];
    for (let fi = 0; fi < this.frames.length; fi++) {
      const upperCel = this.cels[index][fi];
      const lowerCel = this.cels[index - 1][fi];
      lowerCel.ctx.globalAlpha = upper.opacity / 100;
      lowerCel.ctx.globalCompositeOperation = upper.blendMode;
      lowerCel.ctx.drawImage(upperCel.canvas, 0, 0);
      lowerCel.ctx.globalAlpha = 1;
      lowerCel.ctx.globalCompositeOperation = 'source-over';
    }
    this.layers.splice(index, 1);
    this.cels.splice(index, 1);
    return index - 1;
  }

  /** Flatten all visible layers into a single layer (across all frames). */
  flatten() {
    const newCelsRow = [];
    for (let fi = 0; fi < this.frames.length; fi++) {
      const result = new Cel(this.width, this.height);
      for (let li = 0; li < this.layers.length; li++) {
        const layer = this.layers[li];
        if (!layer.visible) continue;
        result.ctx.globalAlpha = layer.opacity / 100;
        result.ctx.globalCompositeOperation = layer.blendMode;
        result.ctx.drawImage(this.cels[li][fi].canvas, 0, 0);
      }
      result.ctx.globalAlpha = 1;
      result.ctx.globalCompositeOperation = 'source-over';
      newCelsRow.push(result);
    }
    this.layers = [new Layer('Background')];
    this.cels = [newCelsRow];
  }

  /**
   * Composite all visible layers for a given frame and return a canvas element.
   * @param {number} [frameIndex=0]
   */
  getComposited(frameIndex = 0) {
    const c = document.createElement('canvas');
    c.width = this.width;
    c.height = this.height;
    const ctx = c.getContext('2d');
    for (let li = 0; li < this.layers.length; li++) {
      const layer = this.layers[li];
      if (!layer.visible) continue;
      const cel = this.cels[li]?.[frameIndex];
      if (!cel) continue;
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blendMode;
      ctx.drawImage(cel.canvas, 0, 0);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return c;
  }
}

function _reindexFrames(frames) {
  for (let i = 0; i < frames.length; i++) frames[i].index = i;
}
