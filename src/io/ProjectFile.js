/**
 * Save and load .pixelchomper project files.
 * Format: JSON with layer pixel data embedded as base64-encoded PNG data URLs.
 * Version 2 adds multi-frame support.
 */
import { Sprite } from '../model/Sprite.js';
import { Layer } from '../model/Layer.js';
import { Frame } from '../model/Frame.js';
import { Cel } from '../model/Cel.js';

const PROJECT_VERSION = 2;
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

    const layers = sprite.layers.map((layer, li) => ({
      name: layer.name,
      visible: layer.visible,
      locked: layer.locked,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      cels: sprite.cels[li].map(cel => cel.canvas.toDataURL('image/png')),
    }));

    const frames = sprite.frames.map(f => ({ duration: f.duration }));

    const project = {
      version: PROJECT_VERSION,
      width: sprite.width,
      height: sprite.height,
      activeLayerIndex: state.activeLayerIndex,
      activeFrameIndex: state.activeFrameIndex,
      layers,
      frames,
      tags: sprite.tags || [],
    };

    const blob = new Blob([JSON.stringify(project)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Open a file picker, parse the chosen file, and return the restored state.
   * @returns {Promise<{sprite:Sprite, activeLayerIndex:number, activeFrameIndex:number}|null>}
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
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
  }
}

async function _deserialize(project) {
  if (!project.width || !project.height || !Array.isArray(project.layers)) {
    throw new Error('Invalid project file format.');
  }

  const w = project.width, h = project.height;
  const sprite = new Sprite(w, h, null);
  sprite.layers = [];
  sprite.frames = [];
  sprite.cels = [];
  sprite.tags = project.tags || [];

  // Version 1 compatibility: single-frame projects without explicit frames array
  const frameData = Array.isArray(project.frames) ? project.frames : [{ duration: 100 }];

  // Build frames
  for (let fi = 0; fi < frameData.length; fi++) {
    const f = new Frame(fi);
    f.duration = frameData[fi]?.duration ?? 100;
    sprite.frames.push(f);
  }

  // Build layers and cels
  for (const ld of project.layers) {
    const layer = new Layer(ld.name);
    layer.visible  = ld.visible  ?? true;
    layer.locked   = ld.locked   ?? false;
    layer.opacity  = ld.opacity  ?? 100;
    layer.blendMode = ld.blendMode ?? 'source-over';
    sprite.layers.push(layer);

    const celsRow = [];
    if (Array.isArray(ld.cels)) {
      // Version 2: per-frame cels
      for (let fi = 0; fi < sprite.frames.length; fi++) {
        const cel = new Cel(w, h);
        const dataUrl = ld.cels[fi];
        if (dataUrl) await _drawDataURL(cel.ctx, dataUrl, w, h);
        celsRow.push(cel);
      }
    } else if (ld.data) {
      // Version 1 compatibility: single cel per layer
      const cel = new Cel(w, h);
      await _drawDataURL(cel.ctx, ld.data, w, h);
      celsRow.push(cel);
      // Pad to match frame count
      while (celsRow.length < sprite.frames.length) {
        celsRow.push(new Cel(w, h));
      }
    } else {
      // Empty cels
      while (celsRow.length < sprite.frames.length) {
        celsRow.push(new Cel(w, h));
      }
    }
    sprite.cels.push(celsRow);
  }

  // Ensure at least one layer and frame
  if (sprite.layers.length === 0) {
    sprite.layers.push(new Layer('Background'));
    sprite.cels.push([new Cel(w, h)]);
  }
  if (sprite.frames.length === 0) {
    sprite.frames.push(new Frame(0));
    for (const row of sprite.cels) row.push(new Cel(w, h));
  }

  const activeLayerIndex = Math.min(project.activeLayerIndex ?? 0, sprite.layers.length - 1);
  const activeFrameIndex = Math.min(project.activeFrameIndex ?? 0, sprite.frames.length - 1);

  return { sprite, activeLayerIndex, activeFrameIndex };
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
