/**
 * Save and load .pixelchomper project files.
 * Format: JSON with layer pixel data embedded as base64-encoded PNG data URLs.
 */
import { Sprite } from '../model/Sprite.js';
import { Layer } from '../model/Layer.js';

const PROJECT_VERSION = 1;
const FILE_EXTENSION = '.pixelchomper';

export class ProjectFile {
  /**
   * Serialize the current state and trigger a download.
   * @param {import('../core/State.js').State} state
   * @param {string} [filename]
   */
  static async save(state, filename = 'sprite.pixelchomper') {
    if (!state.sprite) return;
    const { sprite } = state;

    const layers = sprite.layers.map((layer) => ({
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      data: layer.canvas.toDataURL('image/png'),
    }));

    const project = {
      version: PROJECT_VERSION,
      width: sprite.width,
      height: sprite.height,
      activeLayerIndex: state.activeLayerIndex,
      layers,
    };

    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Open a file picker, parse the chosen file, and return the restored sprite + metadata.
   * @returns {Promise<{ sprite: Sprite, activeLayerIndex: number }|null>}
   */
  static load() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = `${FILE_EXTENSION},application/json`;
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) { resolve(null); return; }
        try {
          const text = await file.text();
          const project = JSON.parse(text);
          const result = await _deserialize(project);
          resolve(result);
        } catch (err) {
          console.error('Failed to load project:', err);
          alert(`Failed to load project: ${err.message}`);
          resolve(null);
        }
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
}

async function _deserialize(project) {
  if (!project.width || !project.height || !Array.isArray(project.layers)) {
    throw new Error('Invalid project file format.');
  }

  const sprite = new Sprite(project.width, project.height, null);
  sprite.layers = [];

  for (const ld of project.layers) {
    const layer = new Layer(project.width, project.height, ld.name);
    layer.visible  = ld.visible  ?? true;
    layer.locked   = ld.locked   ?? false;
    layer.opacity  = ld.opacity  ?? 100;
    layer.blendMode = ld.blendMode ?? 'source-over';
    if (ld.data) {
      await _drawDataURL(layer.ctx, ld.data, project.width, project.height);
    }
    sprite.layers.push(layer);
  }

  // Ensure at least one layer
  if (sprite.layers.length === 0) {
    sprite.layers.push(new Layer(project.width, project.height, 'Background'));
  }

  const activeLayerIndex = Math.min(
    project.activeLayerIndex ?? 0,
    sprite.layers.length - 1,
  );

  return { sprite, activeLayerIndex };
}

function _drawDataURL(ctx, dataURL, w, h) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      resolve();
    };
    img.onerror = () => reject(new Error('Failed to decode layer image data.'));
    img.src = dataURL;
  });
}
