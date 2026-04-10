import { ContextMenu } from './ContextMenu.js';

/**
 * Timeline — bottom panel showing layers × frames grid with playback controls.
 *
 * Layout:
 *   [Controls row: play/pause, loop, fps, onion skin]
 *   [Layer labels | frame cells...]
 *   [Add/remove frame buttons]
 */
export class Timeline {
  constructor(state, containerEl) {
    this.state = state;
    this.container = containerEl;
    this._build();

    const rebuild = () => this._rebuildGrid();
    state.events.on('sprite:loaded', rebuild);
    state.events.on('layer:added', rebuild);
    state.events.on('layer:removed', rebuild);
    state.events.on('layer:reordered', rebuild);
    state.events.on('layer:merged', rebuild);
    state.events.on('layer:flattened', rebuild);
    state.events.on('layer:renamed', rebuild);
    state.events.on('layer:selected', rebuild);
    state.events.on('frame:added', rebuild);
    state.events.on('frame:removed', rebuild);
    state.events.on('frame:changed', () => this._updateActiveCell());
    state.events.on('sprite:modified', () => this._updateThumbnails());
    state.events.on('playback:changed', (playing) => this._updatePlayBtn(playing));
  }

  _build() {
    this.container.innerHTML = '';
    this.container.className = 'timeline';

    // Controls row
    const controls = document.createElement('div');
    controls.className = 'timeline-controls';

    // Play/Pause button
    this._playBtn = document.createElement('button');
    this._playBtn.className = 'timeline-btn';
    this._playBtn.title = 'Play / Pause (Enter)';
    this._playBtn.textContent = '▶';
    this._playBtn.addEventListener('click', () => this.state.togglePlayback());
    controls.appendChild(this._playBtn);

    // Loop mode select
    const loopLabel = document.createElement('span');
    loopLabel.className = 'timeline-label';
    loopLabel.textContent = 'Loop:';
    controls.appendChild(loopLabel);

    this._loopSelect = document.createElement('select');
    this._loopSelect.className = 'timeline-select';
    [['forward', '→'], ['reverse', '←'], ['pingpong', '↔']].forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val; opt.textContent = label;
      this._loopSelect.appendChild(opt);
    });
    this._loopSelect.value = this.state.playbackLoop;
    this._loopSelect.addEventListener('change', () => {
      this.state.setPlaybackLoop(this._loopSelect.value);
    });
    controls.appendChild(this._loopSelect);

    // FPS input
    const fpsLabel = document.createElement('span');
    fpsLabel.className = 'timeline-label';
    fpsLabel.textContent = 'FPS:';
    controls.appendChild(fpsLabel);

    this._fpsInput = document.createElement('input');
    this._fpsInput.type = 'number';
    this._fpsInput.className = 'timeline-input-num';
    this._fpsInput.min = 1; this._fpsInput.max = 60; this._fpsInput.value = this.state.playbackFps;
    this._fpsInput.addEventListener('change', () => {
      this.state.setPlaybackFps(parseInt(this._fpsInput.value) || 10);
    });
    controls.appendChild(this._fpsInput);

    // Onion skin toggle
    const onionLabel = document.createElement('label');
    onionLabel.className = 'timeline-label timeline-onion-label';
    onionLabel.title = 'Onion skinning';
    this._onionCheck = document.createElement('input');
    this._onionCheck.type = 'checkbox';
    this._onionCheck.checked = this.state.onionSkin.enabled;
    this._onionCheck.addEventListener('change', () => {
      this.state.setOnionSkin({ enabled: this._onionCheck.checked });
    });
    onionLabel.appendChild(this._onionCheck);
    onionLabel.appendChild(document.createTextNode(' Onion'));
    controls.appendChild(onionLabel);

    // Add / remove frame buttons
    const addFrameBtn = document.createElement('button');
    addFrameBtn.className = 'timeline-btn';
    addFrameBtn.title = 'Add frame (Alt+N)';
    addFrameBtn.textContent = '+';
    addFrameBtn.addEventListener('click', () => this.state.addFrame());
    controls.appendChild(addFrameBtn);

    const dupFrameBtn = document.createElement('button');
    dupFrameBtn.className = 'timeline-btn';
    dupFrameBtn.title = 'Duplicate frame';
    dupFrameBtn.textContent = '⧉';
    dupFrameBtn.addEventListener('click', () => this.state.duplicateFrame());
    controls.appendChild(dupFrameBtn);

    const removeFrameBtn = document.createElement('button');
    removeFrameBtn.className = 'timeline-btn timeline-btn-danger';
    removeFrameBtn.title = 'Remove frame';
    removeFrameBtn.textContent = '−';
    removeFrameBtn.addEventListener('click', () => this.state.removeFrame());
    controls.appendChild(removeFrameBtn);

    this.container.appendChild(controls);

    // Grid area (scrollable)
    this._gridEl = document.createElement('div');
    this._gridEl.className = 'timeline-grid-wrap';
    this.container.appendChild(this._gridEl);

    this._rebuildGrid();
  }

  _rebuildGrid() {
    this._gridEl.innerHTML = '';
    const sprite = this.state.sprite;
    if (!sprite) return;

    const numLayers = sprite.layers.length;
    const numFrames = sprite.frames.length;

    // Grid: rows = layers (top=topmost), cols = frames
    const grid = document.createElement('div');
    grid.className = 'timeline-grid';
    grid.style.gridTemplateColumns = `60px repeat(${numFrames}, 36px)`;

    // Header row: blank corner + frame numbers
    const corner = document.createElement('div');
    corner.className = 'timeline-corner';
    grid.appendChild(corner);

    for (let fi = 0; fi < numFrames; fi++) {
      const header = document.createElement('div');
      header.className = 'timeline-frame-header' + (fi === this.state.activeFrameIndex ? ' active' : '');
      header.title = `Frame ${fi + 1} — right-click to set duration`;
      header.textContent = fi + 1;
      header.dataset.fi = fi;
      header.addEventListener('click', () => this.state.setActiveFrame(fi));
      header.addEventListener('dblclick', () => this._editFrameDuration(fi, header));
      header.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        this.state.setActiveFrame(fi);
        const items = [
          { label: `Set Duration... (${this.state.sprite.frames[fi]?.duration ?? 100}ms)`, action: 'duration' },
          { separator: true },
          { label: 'Duplicate Frame', action: 'duplicate' },
          { label: 'Delete Frame', action: 'delete' },
        ];
        const action = await ContextMenu.show(items, e.clientX, e.clientY);
        if (action === 'duration') this._editFrameDuration(fi, header);
        else if (action === 'duplicate') this.state.duplicateFrame();
        else if (action === 'delete') this.state.removeFrame();
      });
      grid.appendChild(header);
    }

    // Layer rows (topmost layer at top)
    for (let li = numLayers - 1; li >= 0; li--) {
      const layer = sprite.layers[li];

      // Layer name label
      const label = document.createElement('div');
      label.className = 'timeline-layer-label' + (li === this.state.activeLayerIndex ? ' active' : '');
      label.textContent = layer.name;
      label.title = layer.name;
      label.dataset.li = li;
      label.addEventListener('click', () => this.state.setActiveLayer(li));
      grid.appendChild(label);

      // Frame cells for this layer
      for (let fi = 0; fi < numFrames; fi++) {
        const cell = document.createElement('div');
        const isActive = li === this.state.activeLayerIndex && fi === this.state.activeFrameIndex;
        cell.className = 'timeline-cell' + (isActive ? ' active' : '');
        cell.dataset.li = li;
        cell.dataset.fi = fi;
        cell.addEventListener('click', () => {
          this.state.setActiveLayer(li);
          this.state.setActiveFrame(fi);
        });
        cell.addEventListener('contextmenu', async (e) => {
          e.preventDefault();
          this.state.setActiveLayer(li);
          this.state.setActiveFrame(fi);
          const cel = this.state.sprite.cels[li]?.[fi];
          const isLinked = cel && cel.linked;
          const items = [
            { label: isLinked ? 'Unlink Cel' : 'Link Cel to This Frame', action: isLinked ? 'unlink' : 'link' },
            { separator: true },
            { label: 'Duplicate Frame', action: 'dup-frame' },
            { label: 'Delete Frame', action: 'del-frame' },
            { separator: true },
            { label: `Set Duration...`, action: 'duration' },
          ];
          const action = await ContextMenu.show(items, e.clientX, e.clientY);
          if (action === 'unlink') this.state.unlinkCel(li, fi);
          else if (action === 'link') {
            const toFrame = parseInt(prompt(`Link frame ${fi + 1} to frame number:`)) - 1;
            if (!isNaN(toFrame) && toFrame !== fi) this.state.linkCel(li, fi, toFrame);
          }
          else if (action === 'dup-frame') this.state.duplicateFrame();
          else if (action === 'del-frame') this.state.removeFrame();
          else if (action === 'duration') {
            const header = this._grid.querySelector(`.timeline-frame-header[data-fi="${fi}"]`);
            if (header) this._editFrameDuration(fi, header);
          }
        });

        // Thumbnail canvas
        const thumb = document.createElement('canvas');
        thumb.className = 'timeline-thumb';
        thumb.width = 28; thumb.height = 28;
        this._drawThumb(thumb, li, fi);
        cell.appendChild(thumb);

        // Linked cel indicator
        const cel = sprite.cels[li]?.[fi];
        if (cel && cel.linked) {
          const linkBadge = document.createElement('span');
          linkBadge.className = 'timeline-cell-linked';
          linkBadge.title = 'Linked cel';
          linkBadge.textContent = '🔗';
          cell.appendChild(linkBadge);
        }

        grid.appendChild(cell);
      }
    }

    this._gridEl.appendChild(grid);
    this._grid = grid;
  }

  _drawThumb(canvas, layerIndex, frameIndex) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#38384e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    const cel = this.state.sprite && this.state.sprite.getCel(layerIndex, frameIndex);
    if (cel) ctx.drawImage(cel.canvas, 0, 0, canvas.width, canvas.height);
  }

  _updateActiveCell() {
    if (!this._grid) return;
    // Update frame header highlights
    this._grid.querySelectorAll('.timeline-frame-header').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.fi) === this.state.activeFrameIndex);
    });
    // Update layer label highlights
    this._grid.querySelectorAll('.timeline-layer-label').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.li) === this.state.activeLayerIndex);
    });
    // Update cell highlights
    this._grid.querySelectorAll('.timeline-cell').forEach(el => {
      const isActive = parseInt(el.dataset.li) === this.state.activeLayerIndex
                    && parseInt(el.dataset.fi) === this.state.activeFrameIndex;
      el.classList.toggle('active', isActive);
    });
  }

  _updateThumbnails() {
    if (!this._grid || !this.state.sprite) return;
    this._grid.querySelectorAll('.timeline-cell').forEach(cell => {
      const li = parseInt(cell.dataset.li);
      const fi = parseInt(cell.dataset.fi);
      const thumb = cell.querySelector('.timeline-thumb');
      if (thumb) this._drawThumb(thumb, li, fi);
    });
  }

  _updatePlayBtn(playing) {
    if (this._playBtn) this._playBtn.textContent = playing ? '⏹' : '▶';
  }

  _editFrameDuration(fi, headerEl) {
    if (!this.state.sprite) return;
    const frame = this.state.sprite.frames[fi];
    if (!frame) return;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 1;
    input.value = frame.duration;
    input.className = 'timeline-frame-dur-input';
    input.style.width = '36px';
    input.style.fontSize = '9px';
    headerEl.textContent = '';
    headerEl.appendChild(input);
    input.focus();
    input.select();
    const commit = () => {
      const val = parseInt(input.value);
      if (!isNaN(val)) this.state.setFrameDuration(fi, val);
      headerEl.textContent = fi + 1;
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { headerEl.textContent = fi + 1; }
    });
  }
}
