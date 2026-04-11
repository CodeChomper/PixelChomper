const VERSION = '0.5.0';

/**
 * Bottom status bar — shows cursor position, canvas size, zoom level, tool name, frame number.
 */
export class StatusBar {
  constructor(state, containerEl) {
    this.state = state;
    this.container = containerEl;

    this._posEl = null;
    this._sizeEl = null;
    this._zoomEl = null;
    this._toolEl = null;
    this._frameEl = null;

    this._build();

    this.state.events.on('cursor:moved', (pos) => this._updatePos(pos));
    this.state.events.on('view:zoom-changed', () => this._updateZoom());
    this.state.events.on('tool:changed', () => this._updateTool());
    this.state.events.on('sprite:loaded', () => { this._updateSize(); this._updateFrame(); });
    this.state.events.on('frame:changed', () => this._updateFrame());
    this.state.events.on('frame:added', () => this._updateFrame());
    this.state.events.on('frame:removed', () => this._updateFrame());
  }

  _build() {
    this.container.innerHTML = '';
    this._addItem(`v${VERSION}`);
    this._posEl = this._addItem('Pos: --,--');
    this._sizeEl = this._addItem('Size: --x--');
    this._zoomEl = this._addItem(`Zoom: ${this.state.zoom}x`);
    this._toolEl = this._addItem(`Tool: ${this.state.activeTool}`);
    this._frameEl = this._addItem('Frame: 1/1');
  }

  _addItem(text) {
    const el = document.createElement('span');
    el.className = 'status-item';
    el.textContent = text;
    this.container.appendChild(el);
    return el;
  }

  _updatePos(pos) {
    const sprite = this.state.sprite;
    if (!sprite) return;
    const inBounds = pos.x >= 0 && pos.y >= 0 && pos.x < sprite.width && pos.y < sprite.height;
    this._posEl.textContent = inBounds ? `Pos: ${pos.x},${pos.y}` : 'Pos: --,--';
  }

  _updateSize() {
    const sprite = this.state.sprite;
    this._sizeEl.textContent = sprite ? `Size: ${sprite.width}x${sprite.height}` : 'Size: --x--';
  }

  _updateZoom() {
    this._zoomEl.textContent = `Zoom: ${this.state.zoom}x`;
  }

  _updateTool() {
    this._toolEl.textContent = `Tool: ${this.state.activeTool}`;
  }

  _updateFrame() {
    const sprite = this.state.sprite;
    if (!sprite) { this._frameEl.textContent = 'Frame: 1/1'; return; }
    const cur = this.state.activeFrameIndex + 1;
    const total = sprite.frames.length;
    this._frameEl.textContent = `Frame: ${cur}/${total}`;
  }
}
