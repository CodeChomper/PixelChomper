/**
 * Export the current sprite (all visible layers composited) as a PNG download.
 * @param {import('../model/Sprite.js').Sprite} sprite
 * @param {number} [frameIndex=0] - which frame to export
 * @param {string} [filename]
 */
export class ExportPNG {
  static download(sprite, frameIndex = 0, filename = 'sprite.png') {
    if (!sprite) return;
    const composited = sprite.getComposited(frameIndex);
    const url = composited.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
