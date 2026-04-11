import { State } from './core/State.js';
import { Sprite } from './model/Sprite.js';
import { CanvasRenderer } from './canvas/CanvasRenderer.js';
import { CanvasInput } from './canvas/CanvasInput.js';
import { PencilTool } from './tools/PencilTool.js';
import { EraserTool } from './tools/EraserTool.js';
import { LineTool } from './tools/LineTool.js';
import { RectTool } from './tools/RectTool.js';
import { EllipseTool } from './tools/EllipseTool.js';
import { FillTool } from './tools/FillTool.js';
import { EyedropperTool } from './tools/EyedropperTool.js';
import { SprayTool } from './tools/SprayTool.js';
import { CurveTool } from './tools/CurveTool.js';
import { PolygonTool } from './tools/PolygonTool.js';
import { SelectRectTool } from './tools/SelectRectTool.js';
import { SelectLassoTool } from './tools/SelectLassoTool.js';
import { MagicWandTool } from './tools/MagicWandTool.js';
import { MoveTool } from './tools/MoveTool.js';
import { ReplaceColorTool } from './tools/ReplaceColorTool.js';
import { ContourTool } from './tools/ContourTool.js';
import { MenuBar } from './ui/MenuBar.js';
import { Toolbar } from './ui/Toolbar.js';
import { ToolOptions } from './ui/ToolOptions.js';
import { StatusBar } from './ui/StatusBar.js';
import { ColorPanel } from './ui/ColorPanel.js';
import { LayerPanel } from './ui/LayerPanel.js';
import { Timeline } from './ui/Timeline.js';
import { Dialog } from './ui/Dialog.js';
import { HelpDialog } from './ui/HelpDialog.js';
import { ShortcutEditor } from './ui/ShortcutEditor.js';
import { ResizeCanvasDialog } from './ui/ResizeCanvasDialog.js';
import { PrefsDialog } from './ui/PrefsDialog.js';
import { clamp, MIN_ZOOM, MAX_ZOOM } from './core/Constants.js';
import { ExportPNG } from './io/ExportPNG.js';
import { ExportGIF } from './io/ExportGIF.js';
import { ExportSpriteSheet } from './io/ExportSpriteSheet.js';
import { ImportSpriteSheet } from './io/ImportSpriteSheet.js';
import { ProjectFile } from './io/ProjectFile.js';
import { ShareGallery } from './io/ShareGallery.js';

/**
 * Tool manager — registers tools, returns the active one.
 */
class ToolManager {
  constructor(state) {
    this.state = state;
    this._tools = {};
  }

  register(tool) {
    this._tools[tool.id] = tool;
  }

  getActiveTool() {
    return this._tools[this.state.activeTool] || null;
  }

  getAllTools() {
    return Object.values(this._tools);
  }
}

/**
 * App bootstrap — wires everything together.
 */
class App {
  constructor() {
    this.state = new State();
    this.toolManager = new ToolManager(this.state);

    // Register tools
    this.toolManager.register(new PencilTool());
    this.toolManager.register(new EraserTool());
    this.toolManager.register(new LineTool());
    this.toolManager.register(new RectTool());
    this.toolManager.register(new EllipseTool());
    this.toolManager.register(new FillTool());
    this.toolManager.register(new EyedropperTool());
    this.toolManager.register(new SprayTool());
    this.toolManager.register(new CurveTool());
    this.toolManager.register(new PolygonTool());
    this.toolManager.register(new SelectRectTool());
    this.toolManager.register(new SelectLassoTool());
    this.toolManager.register(new MagicWandTool());
    this.toolManager.register(new MoveTool());
    this.toolManager.register(new ReplaceColorTool());
    this.toolManager.register(new ContourTool());

    // UI
    this.menuBar = new MenuBar(this.state, document.getElementById('menubar'));
    this.renderer = new CanvasRenderer(this.state, document.getElementById('canvas-area'));
    this.toolbar = new Toolbar(this.state, document.getElementById('toolbar'), this.toolManager);
    this.toolOptions = new ToolOptions(this.state, document.getElementById('tooloptions'));
    this.statusBar = new StatusBar(this.state, document.getElementById('statusbar'));
    this.colorPanel = new ColorPanel(this.state, document.getElementById('colors-panel'));
    this.layerPanel = new LayerPanel(this.state, document.getElementById('layers-panel'));
    this.timeline = new Timeline(this.state, document.getElementById('timeline'));

    // Input handling
    this.canvasInput = new CanvasInput(this.state, this.renderer, this.toolManager);

    // Menu event handlers
    this.state.events.on('file:new', () => this._showNewSpriteDialog());
    this.state.events.on('file:open', () => this._loadProject());
    this.state.events.on('file:save', () => ProjectFile.save(this.state));
    this.state.events.on('file:export-png', () => ExportPNG.download(this.state.sprite, this.state.activeFrameIndex));
    this.state.events.on('file:export-gif', () => ExportGIF.download(this.state.sprite));
    this.state.events.on('file:export-spritesheet', () => this._showExportSpritesheetDialog());
    this.state.events.on('file:import-image', () => this._importImage());
    this.state.events.on('file:share-gallery', () => this._shareToGallery());
    this.state.events.on('file:view-gallery', () => { location.href = 'gallery.html'; });

    // Edit: undo/redo
    this.state.events.on('edit:undo', () => this.state.undo());
    this.state.events.on('edit:redo', () => this.state.redo());
    this.state.events.on('view:toggle-grid', () => this.state.toggleGrid());
    this.state.events.on('view:zoom-in', () => {
      const z = this.state.zoom < 4 ? this.state.zoom + 1 : this.state.zoom * 2;
      this.state.setZoom(clamp(z, MIN_ZOOM, MAX_ZOOM));
    });
    this.state.events.on('view:zoom-out', () => {
      const z = this.state.zoom <= 4 ? this.state.zoom - 1 : Math.floor(this.state.zoom / 2);
      this.state.setZoom(clamp(z, MIN_ZOOM, MAX_ZOOM));
    });
    this.state.events.on('view:fit', () => this._fitToScreen());

    // Edit menu event handlers
    this.state.events.on('edit:select-all', () => {
      if (!this.state.sprite) return;
      const w = this.state.sprite.width, h = this.state.sprite.height;
      const mask = new Uint8Array(w * h).fill(1);
      this.state.setSelection(mask);
    });
    this.state.events.on('edit:deselect', () => {
      this.state.clearSelection();
    });
    this.state.events.on('edit:invert-selection', () => {
      if (!this.state.selection) return;
      const inv = this.state.selection.map(v => v ? 0 : 1);
      this.state.setSelection(inv);
    });
    this.state.events.on('edit:cut', () => {
      this.canvasInput._cutSelection();
    });
    this.state.events.on('edit:copy', () => {
      this.canvasInput._copySelection();
    });
    this.state.events.on('edit:paste', () => {
      this.canvasInput._pasteClipboard();
    });

    // Layer menu
    this.state.events.on('layer:add', () => this.state.addLayer());
    this.state.events.on('layer:duplicate', () => this.state.duplicateLayer());
    this.state.events.on('layer:remove', () => this.state.removeLayer());
    this.state.events.on('layer:merge-down', () => this.state.mergeDown());
    this.state.events.on('layer:flatten', () => this.state.flattenLayers());

    // Frame menu
    this.state.events.on('frame:add', () => this.state.addFrame());
    this.state.events.on('frame:duplicate', () => this.state.duplicateFrame());
    this.state.events.on('frame:remove', () => this.state.removeFrame());
    this.state.events.on('frame:prev', () => this.state.setActiveFrame(this.state.activeFrameIndex - 1));
    this.state.events.on('frame:next', () => this.state.setActiveFrame(this.state.activeFrameIndex + 1));
    this.state.events.on('frame:play', () => this.state.togglePlayback());

    // Help
    this.state.events.on('help:shortcuts', () => HelpDialog.show());
    this.state.events.on('help:edit-shortcuts', () => ShortcutEditor.show(this.state));

    // Stage 7: View menu
    this.state.events.on('view:symmetry-h', () => {
      this.state.setSymmetry(!this.state.symmetry.horizontal, this.state.symmetry.vertical);
    });
    this.state.events.on('view:symmetry-v', () => {
      this.state.setSymmetry(this.state.symmetry.horizontal, !this.state.symmetry.vertical);
    });
    this.state.events.on('view:tiled-mode', () => {
      this.state.setTiledMode(!this.state.tiledMode);
    });
    // Stage 7: Edit menu — brush and canvas
    this.state.events.on('edit:define-brush', () => {
      this.state.defineCustomBrush();
    });
    this.state.events.on('edit:clear-brush', () => {
      this.state.clearCustomBrush();
    });
    this.state.events.on('canvas:resize', () => this._showResizeCanvasDialog());
    this.state.events.on('canvas:crop-to-selection', () => {
      if (!this.state.selection) {
        alert('No selection to crop to.');
        return;
      }
      this.state.cropToSelection();
    });

    // Stage 7: Preferences
    this.state.events.on('file:preferences', () => PrefsDialog.show(this.state));

    // Clear autosave when the user explicitly requests a new sprite
    this.state.events.on('file:new', () => {
      try { localStorage.removeItem('pixelchomper:autosave'); } catch { /* ignore */ }
    });

    // Autosave on tab/window close
    window.addEventListener('beforeunload', () => this._autoSave());

    // Show new sprite dialog on launch (or silently restore last session)
    this._startupLoad();
  }

  /** Called once on startup — restores autosave or shows new-sprite dialog. */
  async _startupLoad() {
    const raw = localStorage.getItem('pixelchomper:autosave');
    if (raw) {
      try {
        const project = JSON.parse(raw);
        const result  = await ProjectFile.fromJSON(project);
        this.state.setSprite(result.sprite);
        this.state.setActiveLayer(result.activeLayerIndex);
        this.state.setActiveFrame(result.activeFrameIndex ?? 0);
        this._fitToScreen();
        return; // session restored — skip new-sprite dialog
      } catch {
        // Corrupt autosave; fall through to new-sprite dialog
        localStorage.removeItem('pixelchomper:autosave');
      }
    }
    this._showNewSpriteDialog();
  }

  /** Serialize the current sprite to localStorage. Silently skips if too large. */
  _autoSave() {
    if (!this.state.sprite) return;
    try {
      const project = ProjectFile.toJSON(this.state);
      localStorage.setItem('pixelchomper:autosave', JSON.stringify(project));
    } catch {
      // QuotaExceededError or other — autosave is best-effort
    }
  }

  _loadLastSpriteSettings() {
    try {
      const saved = localStorage.getItem('pixelchomper:new-sprite');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { width: 32, height: 32, bg: 'white' };
  }

  _saveLastSpriteSettings(settings) {
    try {
      localStorage.setItem('pixelchomper:new-sprite', JSON.stringify(settings));
    } catch { /* ignore */ }
  }

  async _showNewSpriteDialog() {
    const last = this._loadLastSpriteSettings();
    const result = await Dialog.show({
      title: 'New Sprite',
      fields: [
        { label: 'Width', name: 'width', type: 'number', value: last.width, min: 1, max: 1024 },
        { label: 'Height', name: 'height', type: 'number', value: last.height, min: 1, max: 1024 },
        { label: 'Background', name: 'bg', type: 'select', value: last.bg, options: [
          { label: 'White', value: 'white' },
          { label: 'Black', value: 'black' },
          { label: 'Transparent', value: 'transparent' },
        ]},
      ],
      confirmText: 'Create',
    });

    if (!result) {
      // If cancelled and no sprite exists, create a default
      if (!this.state.sprite) {
        this._createSprite(32, 32, 'white');
      }
      return;
    }

    this._saveLastSpriteSettings({ width: result.width, height: result.height, bg: result.bg });
    this._createSprite(result.width, result.height, result.bg);
  }

  _createSprite(width, height, bg) {
    const bgColors = {
      white: { r: 255, g: 255, b: 255, a: 255 },
      black: { r: 0, g: 0, b: 0, a: 255 },
      transparent: null,
    };
    const sprite = new Sprite(width, height, bgColors[bg]);
    this.state.setSprite(sprite);
    this._fitToScreen();
  }

  _fitToScreen() {
    if (!this.state.sprite) return;
    const container = document.getElementById('canvas-area');
    const rect = container.getBoundingClientRect();
    const margin = 40;
    const zoomX = (rect.width - margin) / this.state.sprite.width;
    const zoomY = (rect.height - margin) / this.state.sprite.height;
    let zoom = Math.floor(Math.min(zoomX, zoomY));
    zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.state.setPan(0, 0);
    this.state.setZoom(zoom);
  }

  async _loadProject() {
    const result = await ProjectFile.load();
    if (!result) return;
    this.state.setSprite(result.sprite);
    this.state.setActiveLayer(result.activeLayerIndex);
    this.state.setActiveFrame(result.activeFrameIndex ?? 0);
    this._fitToScreen();
  }

  async _showExportSpritesheetDialog() {
    if (!this.state.sprite) return;
    const { width, height } = this.state.sprite;
    const result = await Dialog.show({
      title: 'Export Sprite Sheet',
      fields: [
        { label: 'Frame Width',  name: 'frameW', type: 'number', value: width,  min: 1, max: 4096 },
        { label: 'Frame Height', name: 'frameH', type: 'number', value: height, min: 1, max: 4096 },
        { label: 'Columns',      name: 'cols',   type: 'number', value: 1,       min: 1, max: 64  },
      ],
      confirmText: 'Export',
    });
    if (!result) return;
    ExportSpriteSheet.download(this.state.sprite, result.frameW, result.frameH, result.cols);
  }

  async _importImage() {
    const sprite = await ImportSpriteSheet.load();
    if (!sprite) return;
    this.state.setSprite(sprite);
    this._fitToScreen();
  }

  async _shareToGallery() {
    if (!this.state.sprite) return;
    await ShareGallery.upload(this.state.sprite);
  }

  async _showResizeCanvasDialog() {
    if (!this.state.sprite) return;
    const result = await ResizeCanvasDialog.show(this.state.sprite.width, this.state.sprite.height);
    if (!result) return;
    this.state.resizeCanvas(result.width, result.height, result.anchorX, result.anchorY);
    this._fitToScreen();
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  _initTimelineResizer();
  _initPanelResizer();
});

function _initTimelineResizer() {
  const resizer = document.getElementById('timeline-resizer');
  const MIN_HEIGHT = 60;
  const MAX_HEIGHT = 500;
  const LS_KEY = 'pixelchomper:timeline-height';

  const saved = parseInt(localStorage.getItem(LS_KEY), 10);
  if (saved && saved >= MIN_HEIGHT && saved <= MAX_HEIGHT) {
    document.documentElement.style.setProperty('--timeline-height', saved + 'px');
  }

  let startY = 0;
  let startHeight = 0;

  resizer.addEventListener('mousedown', e => {
    e.preventDefault();
    startY = e.clientY;
    startHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--timeline-height'), 10);
    resizer.classList.add('dragging');

    const onMove = e => {
      const delta = startY - e.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + delta));
      document.documentElement.style.setProperty('--timeline-height', newHeight + 'px');
    };

    const onUp = () => {
      resizer.classList.remove('dragging');
      const finalHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--timeline-height'), 10);
      localStorage.setItem(LS_KEY, finalHeight);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function _initPanelResizer() {
  const resizer = document.getElementById('panel-resizer');
  if (!resizer) return;
  const MIN_WIDTH = 160;
  const MAX_WIDTH = 400;
  const LS_KEY = 'pixelchomper:panel-width';

  const saved = parseInt(localStorage.getItem(LS_KEY), 10);
  if (saved && saved >= MIN_WIDTH && saved <= MAX_WIDTH) {
    document.documentElement.style.setProperty('--panel-width', saved + 'px');
  }

  let startX = 0;
  let startWidth = 0;

  resizer.addEventListener('mousedown', e => {
    e.preventDefault();
    startX = e.clientX;
    startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-width'), 10);
    resizer.classList.add('dragging');

    const onMove = e => {
      const delta = startX - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      document.documentElement.style.setProperty('--panel-width', newWidth + 'px');
    };

    const onUp = () => {
      resizer.classList.remove('dragging');
      const finalWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-width'), 10);
      localStorage.setItem(LS_KEY, finalWidth);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
