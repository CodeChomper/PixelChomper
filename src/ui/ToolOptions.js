import { BRUSH_SHAPES, MAX_BRUSH_SIZE, clamp } from '../core/Constants.js';

/**
 * Context toolbar below the menu bar. Shows options for the active tool.
 */
export class ToolOptions {
  constructor(state, containerEl) {
    this.state = state;
    this.container = containerEl;

    this._build();
    this.state.events.on('tool:changed', () => this._build());
    this.state.events.on('brush:size-changed', () => this._updateValues());
    this.state.events.on('brush:shape-changed', () => this._updateValues());
    this.state.events.on('pixelperfect:changed', () => this._updateValues());
    this.state.events.on('shapemode:changed', () => this._updateValues());
    this.state.events.on('fill:tolerance-changed', () => this._updateValues());
    this.state.events.on('fill:contiguous-changed', () => this._updateValues());
    this.state.events.on('spray:radius-changed', () => this._updateValues());
    this.state.events.on('spray:density-changed', () => this._updateValues());
  }

  _build() {
    this.container.innerHTML = '';
    const toolId = this.state.activeTool;

    if (toolId === 'pencil' || toolId === 'eraser') {
      this._addBrushSizeOptions();
    }

    if (toolId === 'pencil') {
      this._addPixelPerfectToggle();
    }

    if (toolId === 'spray') {
      this._addSprayOptions();
    }

    if (toolId === 'line') {
      this._addPixelPerfectToggle();
    }

    if (toolId === 'rect' || toolId === 'ellipse' || toolId === 'polygon') {
      this._addShapeModeToggle();
    }

    if (toolId === 'fill' || toolId === 'magic_wand') {
      this._addFillOptions();
    }
  }

  _addBrushSizeOptions() {
    const sizeLabel = document.createElement('label');
    sizeLabel.textContent = 'Size:';
    const sizeSlider = document.createElement('input');
    sizeSlider.type = 'range'; sizeSlider.min = 1; sizeSlider.max = 64;
    sizeSlider.value = this.state.brushSize; sizeSlider.dataset.field = 'brushSize';
    const sizeNum = document.createElement('input');
    sizeNum.type = 'number'; sizeNum.min = 1; sizeNum.max = 64;
    sizeNum.value = this.state.brushSize; sizeNum.dataset.field = 'brushSizeNum';
    sizeSlider.addEventListener('input', () => {
      const v = Math.max(1, Math.min(64, parseInt(sizeSlider.value)));
      sizeNum.value = v; this.state.setBrushSize(v);
    });
    sizeNum.addEventListener('change', () => {
      const v = Math.max(1, Math.min(64, parseInt(sizeNum.value)));
      sizeSlider.value = v; sizeNum.value = v; this.state.setBrushSize(v);
    });
    sizeLabel.appendChild(sizeSlider); sizeLabel.appendChild(sizeNum);
    this.container.appendChild(sizeLabel);

    const shapeLabel = document.createElement('label');
    shapeLabel.textContent = 'Shape:';
    const shapeSelect = document.createElement('select');
    shapeSelect.dataset.field = 'brushShape';
    for (const shape of ['square', 'circle']) {
      const opt = document.createElement('option');
      opt.value = shape; opt.textContent = shape[0].toUpperCase() + shape.slice(1);
      if (shape === this.state.brushShape) opt.selected = true;
      shapeSelect.appendChild(opt);
    }
    shapeSelect.addEventListener('change', () => this.state.setBrushShape(shapeSelect.value));
    shapeLabel.appendChild(shapeSelect);
    this.container.appendChild(shapeLabel);
  }

  _addPixelPerfectToggle() {
    const label = document.createElement('label');
    label.className = 'tool-option-checkbox';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = this.state.pixelPerfect; cb.dataset.field = 'pixelPerfect';
    cb.addEventListener('change', () => this.state.togglePixelPerfect());
    label.appendChild(cb); label.append(' Pixel Perfect');
    this.container.appendChild(label);
  }

  _addShapeModeToggle() {
    const label = document.createElement('label');
    label.textContent = 'Mode:';
    const sel = document.createElement('select'); sel.dataset.field = 'shapeMode';
    for (const mode of ['outline', 'filled']) {
      const opt = document.createElement('option');
      opt.value = mode; opt.textContent = mode[0].toUpperCase() + mode.slice(1);
      if (mode === this.state.shapeMode) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => this.state.setShapeMode(sel.value));
    label.appendChild(sel);
    this.container.appendChild(label);
  }

  _addFillOptions() {
    const tolLabel = document.createElement('label');
    tolLabel.textContent = 'Tolerance:';
    const tolSlider = document.createElement('input');
    tolSlider.type = 'range'; tolSlider.min = 0; tolSlider.max = 255;
    tolSlider.value = this.state.fillTolerance; tolSlider.dataset.field = 'fillTolerance';
    const tolNum = document.createElement('input');
    tolNum.type = 'number'; tolNum.min = 0; tolNum.max = 255;
    tolNum.value = this.state.fillTolerance; tolNum.dataset.field = 'fillToleranceNum';
    tolSlider.addEventListener('input', () => {
      const v = parseInt(tolSlider.value);
      tolNum.value = v; this.state.setFillTolerance(v);
    });
    tolNum.addEventListener('change', () => {
      const v = Math.max(0, Math.min(255, parseInt(tolNum.value)));
      tolSlider.value = v; tolNum.value = v; this.state.setFillTolerance(v);
    });
    tolLabel.appendChild(tolSlider); tolLabel.appendChild(tolNum);
    this.container.appendChild(tolLabel);

    const contLabel = document.createElement('label');
    contLabel.className = 'tool-option-checkbox';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = this.state.fillContiguous; cb.dataset.field = 'fillContiguous';
    cb.addEventListener('change', () => this.state.setFillContiguous(cb.checked));
    contLabel.appendChild(cb); contLabel.append(' Contiguous');
    this.container.appendChild(contLabel);
  }

  _addSprayOptions() {
    const radLabel = document.createElement('label');
    radLabel.textContent = 'Radius:';
    const radSlider = document.createElement('input');
    radSlider.type = 'range'; radSlider.min = 1; radSlider.max = 64;
    radSlider.value = this.state.sprayRadius; radSlider.dataset.field = 'sprayRadius';
    const radNum = document.createElement('input');
    radNum.type = 'number'; radNum.min = 1; radNum.max = 64;
    radNum.value = this.state.sprayRadius; radNum.dataset.field = 'sprayRadiusNum';
    radSlider.addEventListener('input', () => {
      const v = parseInt(radSlider.value); radNum.value = v; this.state.setSprayRadius(v);
    });
    radNum.addEventListener('change', () => {
      const v = Math.max(1, Math.min(64, parseInt(radNum.value)));
      radSlider.value = v; radNum.value = v; this.state.setSprayRadius(v);
    });
    radLabel.appendChild(radSlider); radLabel.appendChild(radNum);
    this.container.appendChild(radLabel);

    const denLabel = document.createElement('label');
    denLabel.textContent = 'Density:';
    const denSlider = document.createElement('input');
    denSlider.type = 'range'; denSlider.min = 1; denSlider.max = 100;
    denSlider.value = this.state.sprayDensity; denSlider.dataset.field = 'sprayDensity';
    const denNum = document.createElement('input');
    denNum.type = 'number'; denNum.min = 1; denNum.max = 100;
    denNum.value = this.state.sprayDensity; denNum.dataset.field = 'sprayDensityNum';
    denSlider.addEventListener('input', () => {
      const v = parseInt(denSlider.value); denNum.value = v; this.state.setSprayDensity(v);
    });
    denNum.addEventListener('change', () => {
      const v = Math.max(1, Math.min(100, parseInt(denNum.value)));
      denSlider.value = v; denNum.value = v; this.state.setSprayDensity(v);
    });
    denLabel.appendChild(denSlider); denLabel.appendChild(denNum);
    this.container.appendChild(denLabel);
  }

  _updateValues() {
    const sizeSlider = this.container.querySelector('[data-field="brushSize"]');
    const sizeNum = this.container.querySelector('[data-field="brushSizeNum"]');
    const shapeSelect = this.container.querySelector('[data-field="brushShape"]');
    const pixelPerfectCb = this.container.querySelector('[data-field="pixelPerfect"]');
    const shapeModeSelect = this.container.querySelector('[data-field="shapeMode"]');
    const fillToleranceSlider = this.container.querySelector('[data-field="fillTolerance"]');
    const fillToleranceNum = this.container.querySelector('[data-field="fillToleranceNum"]');
    const fillContiguousCb = this.container.querySelector('[data-field="fillContiguous"]');
    const sprayRadiusSlider = this.container.querySelector('[data-field="sprayRadius"]');
    const sprayRadiusNum = this.container.querySelector('[data-field="sprayRadiusNum"]');
    const sprayDensitySlider = this.container.querySelector('[data-field="sprayDensity"]');
    const sprayDensityNum = this.container.querySelector('[data-field="sprayDensityNum"]');

    if (sizeSlider) sizeSlider.value = this.state.brushSize;
    if (sizeNum) sizeNum.value = this.state.brushSize;
    if (shapeSelect) shapeSelect.value = this.state.brushShape;
    if (pixelPerfectCb) pixelPerfectCb.checked = this.state.pixelPerfect;
    if (shapeModeSelect) shapeModeSelect.value = this.state.shapeMode;
    if (fillToleranceSlider) fillToleranceSlider.value = this.state.fillTolerance;
    if (fillToleranceNum) fillToleranceNum.value = this.state.fillTolerance;
    if (fillContiguousCb) fillContiguousCb.checked = this.state.fillContiguous;
    if (sprayRadiusSlider) sprayRadiusSlider.value = this.state.sprayRadius;
    if (sprayRadiusNum) sprayRadiusNum.value = this.state.sprayRadius;
    if (sprayDensitySlider) sprayDensitySlider.value = this.state.sprayDensity;
    if (sprayDensityNum) sprayDensityNum.value = this.state.sprayDensity;
  }
}
