/**
 * Layer — metadata only (name, visibility, opacity, blend mode, lock).
 * Pixel data now lives in Cel objects stored in Sprite.cels[layerIndex][frameIndex].
 */
export class Layer {
  constructor(name = 'Layer') {
    this.name = name;
    this.visible = true;
    this.locked = false;
    this.opacity = 100; // 0-100
    this.blendMode = 'source-over';
  }

  duplicate() {
    const copy = new Layer(this.name + ' copy');
    copy.visible = this.visible;
    copy.locked = this.locked;
    copy.opacity = this.opacity;
    copy.blendMode = this.blendMode;
    return copy;
  }
}
