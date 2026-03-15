import { State } from './core/State.js';
import { Sprite } from './model/Sprite.js';
import { CanvasRenderer } from './canvas/CanvasRenderer.js';
import { CanvasInput } from './canvas/CanvasInput.js';
import { PencilTool } from './tools/PencilTool.js';
import { EraserTool } from './tools/EraserTool.js';
import { MenuBar } from './ui/MenuBar.js';
import { Toolbar } from './ui/Toolbar.js';
import { ToolOptions } from './ui/ToolOptions.js';
import { StatusBar } from './ui/StatusBar.js';
import { ColorPanel } from './ui/ColorPanel.js';
import { Dialog } from './ui/Dialog.js';
import { clamp, MIN_ZOOM, MAX_ZOOM } from './core/Constants.js';

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

    // UI
    this.menuBar = new MenuBar(this.state, document.getElementById('menubar'));
    this.renderer = new CanvasRenderer(this.state, document.getElementById('canvas-area'));
    this.toolbar = new Toolbar(this.state, document.getElementById('toolbar'), this.toolManager);
    this.toolOptions = new ToolOptions(this.state, document.getElementById('tooloptions'));
    this.statusBar = new StatusBar(this.state, document.getElementById('statusbar'));
    this.colorPanel = new ColorPanel(this.state, document.getElementById('panel'));

    // Input handling
    this.canvasInput = new CanvasInput(this.state, this.renderer, this.toolManager);

    // Menu event handlers
    this.state.events.on('file:new', () => this._showNewSpriteDialog());
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

    // Show new sprite dialog on launch
    this._showNewSpriteDialog();
  }

  async _showNewSpriteDialog() {
    const result = await Dialog.show({
      title: 'New Sprite',
      fields: [
        { label: 'Width', name: 'width', type: 'number', value: 32, min: 1, max: 1024 },
        { label: 'Height', name: 'height', type: 'number', value: 32, min: 1, max: 1024 },
        { label: 'Background', name: 'bg', type: 'select', value: 'white', options: [
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
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
