/**
 * Export the current sprite (all visible layers composited) as a PNG download.
 */
export class ExportPNG {
  static download(sprite, filename = 'sprite.png') {
    if (!sprite) return;
    const composited = sprite.getComposited();
    const url = composited.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
