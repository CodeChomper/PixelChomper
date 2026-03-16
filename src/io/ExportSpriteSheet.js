/**
 * Export a sprite sheet — all frames laid out in a grid.
 * For Stage 5 (single frame), this exports the composited image with JSON metadata.
 *
 * @param {Sprite} sprite
 * @param {number} frameW  - width of each frame tile
 * @param {number} frameH  - height of each frame tile
 * @param {number} cols    - number of columns in the grid
 * @param {string} baseName - base filename (without extension)
 */
export class ExportSpriteSheet {
  static download(sprite, frameW, frameH, cols, baseName = 'spritesheet') {
    if (!sprite) return;

    // Collect frame canvases (single frame for Stage 5)
    const frames = [sprite.getComposited()];
    const rows = Math.ceil(frames.length / cols);
    const sheetW = cols * frameW;
    const sheetH = rows * frameH;

    // Compose the sheet
    const sheet = document.createElement('canvas');
    sheet.width = sheetW;
    sheet.height = sheetH;
    const ctx = sheet.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const meta = { meta: { app: 'PixelChomper', size: { w: sheetW, h: sheetH } }, frames: [] };

    frames.forEach((frameCanvas, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * frameW;
      const y = row * frameH;
      ctx.drawImage(frameCanvas, 0, 0, sprite.width, sprite.height, x, y, frameW, frameH);
      meta.frames.push({ filename: `frame_${idx}.png`, frame: { x, y, w: frameW, h: frameH }, duration: 100 });
    });

    // Download PNG
    sheet.toBlob((blob) => {
      if (!blob) return;
      _triggerDownload(blob, `${baseName}.png`, 'image/png');
    }, 'image/png');

    // Download JSON metadata
    const jsonBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
    _triggerDownload(jsonBlob, `${baseName}.json`, 'application/json');
  }
}

function _triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
