/**
 * Import an image file as a new sprite.
 * For Stage 5, the full image is loaded as a single-layer sprite.
 * Frame-splitting into animation frames is deferred to Stage 6.
 *
 * Returns a Promise<Sprite|null>.
 */
import { Sprite } from '../model/Sprite.js';

export class ImportSpriteSheet {
  /**
   * Open a file picker, load the chosen image, and return a new Sprite.
   * @returns {Promise<Sprite|null>}
   */
  static load() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/gif,image/jpeg,image/webp';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) { resolve(null); return; }
        try {
          const sprite = await _loadImageAsSprite(file);
          resolve(sprite);
        } catch (err) {
          console.error('Failed to import image:', err);
          alert(`Failed to import image: ${err.message}`);
          resolve(null);
        }
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}

async function _loadImageAsSprite(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await _loadImage(url);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w === 0 || h === 0) throw new Error('Image has zero dimensions.');
    if (w > 2048 || h > 2048) throw new Error('Image is too large (max 2048×2048).');

    const sprite = new Sprite(w, h, null);
    // Draw the image into the first cel (layer 0, frame 0)
    const cel = sprite.cels[0][0];
    cel.ctx.clearRect(0, 0, w, h);
    cel.ctx.drawImage(img, 0, 0);
    return sprite;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function _loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image.'));
    img.src = src;
  });
}
