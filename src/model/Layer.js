/**
 * Layer model — owns an offscreen canvas for pixel data.
 * Each layer has name, visibility, opacity, blend mode, and lock state.
 */
export class Layer {
  constructor(width, height, name = 'Layer', bgColor = null) {
    this.name = name;
    this.visible = true;
    this.locked = false;
    this.opacity = 100; // 0-100
    this.blendMode = 'source-over'; // Canvas globalCompositeOperation value

    // Offscreen canvas holds the pixel data for this layer
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    if (bgColor) {
      this.ctx.fillStyle = `rgba(${bgColor.r},${bgColor.g},${bgColor.b},${(bgColor.a ?? 255) / 255})`;
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }

  getPixel(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    const data = this.ctx.getImageData(x, y, 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] };
  }

  setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const img = this.ctx.createImageData(1, 1);
    img.data[0] = color.r;
    img.data[1] = color.g;
    img.data[2] = color.b;
    img.data[3] = color.a;
    this.ctx.putImageData(img, x, y);
  }

  /** Set a block of pixels efficiently using ImageData. */
  setPixels(pixels) {
    if (pixels.length === 0) return;
    let minX = this.width, minY = this.height, maxX = 0, maxY = 0;
    for (const p of pixels) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    minX = Math.max(0, minX);
    minY = Math.max(0, minY);
    maxX = Math.min(this.width - 1, maxX);
    maxY = Math.min(this.height - 1, maxY);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w <= 0 || h <= 0) return;

    const imgData = this.ctx.getImageData(minX, minY, w, h);
    const data = imgData.data;
    for (const p of pixels) {
      if (p.x < 0 || p.y < 0 || p.x >= this.width || p.y >= this.height) continue;
      const i = ((p.y - minY) * w + (p.x - minX)) * 4;
      data[i] = p.color.r;
      data[i + 1] = p.color.g;
      data[i + 2] = p.color.b;
      data[i + 3] = p.color.a;
    }
    this.ctx.putImageData(imgData, minX, minY);
  }

  /** Create a duplicate of this layer. */
  duplicate() {
    const copy = new Layer(this.width, this.height, this.name + ' copy');
    copy.visible = this.visible;
    copy.locked = this.locked;
    copy.opacity = this.opacity;
    copy.blendMode = this.blendMode;
    copy.ctx.drawImage(this.canvas, 0, 0);
    return copy;
  }

  /** Clear all pixels to transparent. */
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
