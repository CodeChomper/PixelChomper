/**
 * Layer panel UI — displays layer list with visibility, opacity, blend mode,
 * lock, reorder, add/remove/duplicate/merge/flatten controls.
 */

const BLEND_MODES = [
  { label: 'Normal',   value: 'source-over' },
  { label: 'Multiply', value: 'multiply' },
  { label: 'Screen',   value: 'screen' },
  { label: 'Overlay',  value: 'overlay' },
  { label: 'Darken',   value: 'darken' },
  { label: 'Lighten',  value: 'lighten' },
];

export class LayerPanel {
  constructor(state, containerEl) {
    this.state = state;
    this.container = containerEl;
    this._dragFrom = null;
    this._build();

    const rebuild = () => this._rebuildList();
    state.events.on('sprite:loaded', rebuild);
    state.events.on('layer:added', rebuild);
    state.events.on('layer:removed', rebuild);
    state.events.on('layer:reordered', rebuild);
    state.events.on('layer:merged', rebuild);
    state.events.on('layer:flattened', rebuild);
    state.events.on('layer:selected', rebuild);
    state.events.on('layer:visibility-changed', rebuild);
    state.events.on('layer:opacity-changed', rebuild);
    state.events.on('layer:blend-changed', rebuild);
    state.events.on('layer:renamed', rebuild);
    state.events.on('layer:lock-changed', rebuild);
    state.events.on('sprite:modified', () => this._updateThumbnails());
  }

  _build() {
    const root = document.createElement('div');
    root.className = 'layer-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'layer-panel-header';
    header.textContent = 'Layers';
    root.appendChild(header);

    // Blend mode + opacity row
    this._controlsRow = document.createElement('div');
    this._controlsRow.className = 'layer-controls-row';

    this._blendSelect = document.createElement('select');
    this._blendSelect.className = 'layer-blend-select';
    for (const mode of BLEND_MODES) {
      const opt = document.createElement('option');
      opt.value = mode.value;
      opt.textContent = mode.label;
      this._blendSelect.appendChild(opt);
    }
    this._blendSelect.addEventListener('change', () => {
      this.state.setLayerBlendMode(this.state.activeLayerIndex, this._blendSelect.value);
    });

    const opacityWrap = document.createElement('div');
    opacityWrap.className = 'layer-opacity-wrap';
    const opacityLabel = document.createElement('span');
    opacityLabel.textContent = 'Op:';
    opacityLabel.className = 'layer-opacity-label';
    this._opacitySlider = document.createElement('input');
    this._opacitySlider.type = 'range';
    this._opacitySlider.min = 0;
    this._opacitySlider.max = 100;
    this._opacitySlider.className = 'layer-opacity-slider';
    this._opacitySlider.addEventListener('input', () => {
      this.state.setLayerOpacity(this.state.activeLayerIndex, parseInt(this._opacitySlider.value));
    });
    this._opacityValue = document.createElement('span');
    this._opacityValue.className = 'layer-opacity-value';
    opacityWrap.appendChild(opacityLabel);
    opacityWrap.appendChild(this._opacitySlider);
    opacityWrap.appendChild(this._opacityValue);

    this._controlsRow.appendChild(this._blendSelect);
    this._controlsRow.appendChild(opacityWrap);
    root.appendChild(this._controlsRow);

    // Layer list (top-to-bottom = topmost layer first)
    this._listEl = document.createElement('div');
    this._listEl.className = 'layer-list';
    root.appendChild(this._listEl);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'layer-actions';

    const addBtn = this._makeBtn('+', 'Add layer', () => this.state.addLayer());
    const removeBtn = this._makeBtn('−', 'Remove layer', () => this.state.removeLayer());
    const dupBtn = this._makeBtn('⧉', 'Duplicate layer', () => this.state.duplicateLayer());
    const mergeBtn = this._makeBtn('⤓', 'Merge down', () => this.state.mergeDown());
    const flattenBtn = this._makeBtn('⊟', 'Flatten', () => this.state.flattenLayers());

    actions.appendChild(addBtn);
    actions.appendChild(removeBtn);
    actions.appendChild(dupBtn);
    actions.appendChild(mergeBtn);
    actions.appendChild(flattenBtn);
    root.appendChild(actions);

    this.container.appendChild(root);
    this._rebuildList();
  }

  _makeBtn(text, title, onClick) {
    const btn = document.createElement('button');
    btn.className = 'layer-action-btn';
    btn.textContent = text;
    btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
  }

  _rebuildList() {
    const sprite = this.state.sprite;
    if (!sprite) { this._listEl.innerHTML = ''; return; }

    // Update controls for active layer
    const activeLayer = this.state.activeLayer;
    if (activeLayer) {
      this._blendSelect.value = activeLayer.blendMode;
      this._opacitySlider.value = activeLayer.opacity;
      this._opacityValue.textContent = `${activeLayer.opacity}%`;
    }

    this._listEl.innerHTML = '';

    // Render layers top-to-bottom (highest index = top)
    for (let i = sprite.layers.length - 1; i >= 0; i--) {
      const layer = sprite.layers[i];
      const isActive = i === this.state.activeLayerIndex;

      const row = document.createElement('div');
      row.className = 'layer-row' + (isActive ? ' active' : '');
      row.draggable = true;
      row.dataset.index = i;

      // Drag events for reordering
      row.addEventListener('dragstart', (e) => {
        this._dragFrom = i;
        e.dataTransfer.effectAllowed = 'move';
        row.classList.add('dragging');
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        this._dragFrom = null;
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        row.classList.add('drag-over');
      });
      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over');
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drag-over');
        if (this._dragFrom !== null && this._dragFrom !== i) {
          this.state.moveLayer(this._dragFrom, i);
        }
        this._dragFrom = null;
      });

      // Click to select
      row.addEventListener('click', () => this.state.setActiveLayer(i));

      // Visibility eye
      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'layer-eye-btn' + (layer.visible ? '' : ' hidden');
      eyeBtn.textContent = layer.visible ? '👁' : '−';
      eyeBtn.title = 'Toggle visibility';
      eyeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.state.setLayerVisibility(i, !layer.visible);
      });

      // Thumbnail
      const thumb = document.createElement('canvas');
      thumb.className = 'layer-thumbnail';
      thumb.width = 24;
      thumb.height = 24;
      this._drawThumbnail(thumb, i);

      // Name (double-click to rename)
      const nameEl = document.createElement('span');
      nameEl.className = 'layer-name';
      nameEl.textContent = layer.name;
      nameEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'text';
        input.value = layer.name;
        input.className = 'layer-name-input';
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        const commit = () => {
          this.state.setLayerName(i, input.value || layer.name);
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (ke) => {
          if (ke.key === 'Enter') input.blur();
          if (ke.key === 'Escape') { input.value = layer.name; input.blur(); }
        });
      });

      // Lock button
      const lockBtn = document.createElement('button');
      lockBtn.className = 'layer-lock-btn' + (layer.locked ? ' locked' : '');
      lockBtn.textContent = layer.locked ? '🔒' : '🔓';
      lockBtn.title = 'Toggle lock';
      lockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.state.setLayerLocked(i, !layer.locked);
      });

      row.appendChild(eyeBtn);
      row.appendChild(thumb);
      row.appendChild(nameEl);
      row.appendChild(lockBtn);
      this._listEl.appendChild(row);
    }
  }

  _drawThumbnail(canvas, layerIndex) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = '#444460';
    ctx.fillRect(0, 0, 24, 24);
    ctx.fillStyle = '#38384e';
    for (let y = 0; y < 24; y += 4) {
      for (let x = 0; x < 24; x += 4) {
        if ((Math.floor(x/4) + Math.floor(y/4)) % 2 === 1) ctx.fillRect(x, y, 4, 4);
      }
    }
    ctx.imageSmoothingEnabled = false;
    const cel = this.state.sprite && this.state.sprite.getCel(layerIndex, this.state.activeFrameIndex);
    if (cel) ctx.drawImage(cel.canvas, 0, 0, 24, 24);
  }

  _updateThumbnails() {
    if (!this.state.sprite) return;
    const thumbs = this._listEl.querySelectorAll('.layer-thumbnail');
    const layers = this.state.sprite.layers;
    // Thumbnails are rendered top-to-bottom (reverse order)
    let idx = layers.length - 1;
    for (const thumb of thumbs) {
      if (idx >= 0) this._drawThumbnail(thumb, idx);
      idx--;
    }
  }
}
