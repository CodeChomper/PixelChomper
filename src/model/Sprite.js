/**
 * Sprite model — for Stage 1 this is a single-layer, single-frame sprite.
 * Owns an offscreen canvas that holds the pixel data.
 */
export class Sprite {
  constructor(width, height, bgColor = null) {
    this.width = width;
    this.height = height;

    // Offscreen canvas holds the actual pixel data
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // Fill with background color if provided
    if (bgColor) {
      this.ctx.fillStyle = `rgb(${bgColor.r},${bgColor.g},${bgColor.b})`;
      this.ctx.fillRect(0, 0, width, height);
    }
    // Otherwise leave transparent
  }

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
    // Find bounding box
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
}
