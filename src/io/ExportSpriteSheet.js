/**
 * Export a sprite sheet — all frames laid out in a grid PNG + JSON metadata.
 * @param {import('../model/Sprite.js').Sprite} sprite
 * @param {number} frameW  - display width of each frame tile
 * @param {number} frameH  - display height of each frame tile
 * @param {number} cols    - number of columns in the grid
 * @param {string} baseName - base filename (without extension)
 */
export class ExportSpriteSheet {
  static download(sprite, frameW, frameH, cols, baseName = 'spritesheet') {
    if (!sprite) return;

    const frameCount = sprite.frames.length;
    const rows = Math.ceil(frameCount / cols);
    const sheetW = cols * frameW;
    const sheetH = rows * frameH;

    const sheet = document.createElement('canvas');
    sheet.width = sheetW;
    sheet.height = sheetH;
    const ctx = sheet.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const meta = {
      meta: { app: 'PixelChomper', size: { w: sheetW, h: sheetH } },
      frames: [],
    };

    for (let fi = 0; fi < frameCount; fi++) {
      const col = fi % cols;
      const row = Math.floor(fi / cols);
      const x = col * frameW;
      const y = row * frameH;
      const frameCanvas = sprite.getComposited(fi);
      ctx.drawImage(frameCanvas, 0, 0, sprite.width, sprite.height, x, y, frameW, frameH);
      meta.frames.push({
        filename: `frame_${fi}.png`,
        frame: { x, y, w: frameW, h: frameH },
        duration: sprite.frames[fi].duration,
      });
    }

    sheet.toBlob((blob) => {
      if (blob) _triggerDownload(blob, `${baseName}.png`);
    }, 'image/png');

    const jsonBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' });
    _triggerDownload(jsonBlob, `${baseName}.json`);
  }
}

function _triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
