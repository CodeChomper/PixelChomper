import { TOOLS } from '../core/Constants.js';

const TOOL_ICONS = {
  pencil:        'assets/icons/PencilTool.png',
  eraser:        'assets/icons/EraserTool.png',
  line:          'assets/icons/LineTool.png',
  rect:          'assets/icons/RectTool.png',
  ellipse:       'assets/icons/EllipseTool.png',
  fill:          'assets/icons/FillTool.png',
  eyedropper:    'assets/icons/EyedropperTool.png',
  spray:         'assets/icons/SprayTool.png',
  curve:         'assets/icons/CurveTool.png',
  polygon:       'assets/icons/PolygonTool.png',
  select_rect:   'assets/icons/SelectRectTool.png',
  select_lasso:  'assets/icons/SelectLassoTool.png',
  magic_wand:    'assets/icons/MagicWandTool.png',
  move:          'assets/icons/MoveTool.png',
  replace_color: 'assets/icons/ReplaceColorTool.png',
  contour:       'assets/icons/ContourTool.png',
};

/**
 * Left-side vertical tool palette.
 */
export class Toolbar {
  constructor(state, containerEl, toolManager) {
    this.state = state;
    this.container = containerEl;
    this.toolManager = toolManager;

    this._build();
    this.state.events.on('tool:changed', () => this._updateActive());
  }

  _build() {
    this.container.innerHTML = '';

    const tools = this.toolManager.getAllTools();
    for (const tool of tools) {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.dataset.toolId = tool.id;
      btn.title = `${tool.label} (${this._getShortcut(tool.id)})`;
      const iconSrc = TOOL_ICONS[tool.id];
      const iconHtml = iconSrc
        ? `<img src="${iconSrc}" alt="${tool.label}" class="tool-icon">`
        : `<span>${tool.icon}</span>`;
      btn.innerHTML = `${iconHtml}<span class="tool-shortcut">${this._getShortcut(tool.id)}</span>`;
      btn.addEventListener('click', () => this.state.setTool(tool.id));
      this.container.appendChild(btn);
    }

    this._updateActive();
  }

  _getShortcut(toolId) {
    // Use dynamic keybindings from state if available
    if (this.state.keyBindings) {
      for (const [k, t] of Object.entries(this.state.keyBindings)) {
        if (t === toolId) return k.replace('shift+', 'S+').toUpperCase();
      }
    }
    const defaults = {
      pencil: 'B', eraser: 'E', line: 'L', rect: 'U', ellipse: 'S+U',
      fill: 'G', eyedropper: 'I', spray: 'S+B', curve: 'S+L', polygon: 'S+D',
      select_rect: 'M', select_lasso: 'Q', magic_wand: 'W', move: 'V',
      replace_color: 'R', contour: 'D',
    };
    return defaults[toolId] || '';
  }

  _updateActive() {
    const buttons = this.container.querySelectorAll('.tool-btn');
    for (const btn of buttons) {
      btn.classList.toggle('active', btn.dataset.toolId === this.state.activeTool);
    }
  }
}
