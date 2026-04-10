import { TOOLS } from '../core/Constants.js';

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
      btn.innerHTML = `<span>${tool.icon}</span><span class="tool-shortcut">${this._getShortcut(tool.id)}</span>`;
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
