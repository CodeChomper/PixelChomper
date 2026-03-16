/**
 * Export the current sprite (all visible layers composited) as a PNG download.
 */
export class ExportPNG {
  static download(sprite, filename = 'sprite.png') {
    if (!sprite) return;
    const composited = sprite.getComposited();
    composited.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
}
