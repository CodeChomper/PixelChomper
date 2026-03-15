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
  }

  _build() {
    this.container.innerHTML = '';

    const toolId = this.state.activeTool;

    // Brush size (for pencil and eraser)
    if (toolId === 'pencil' || toolId === 'eraser') {
      // Size label + slider + number input
      const sizeLabel = document.createElement('label');
      sizeLabel.textContent = 'Size:';

      const sizeSlider = document.createElement('input');
      sizeSlider.type = 'range';
      sizeSlider.min = 1;
      sizeSlider.max = MAX_BRUSH_SIZE;
      sizeSlider.value = this.state.brushSize;
      sizeSlider.dataset.field = 'brushSize';

      const sizeNum = document.createElement('input');
      sizeNum.type = 'number';
      sizeNum.min = 1;
      sizeNum.max = MAX_BRUSH_SIZE;
      sizeNum.value = this.state.brushSize;
      sizeNum.dataset.field = 'brushSizeNum';

      sizeSlider.addEventListener('input', () => {
        const v = clamp(parseInt(sizeSlider.value), 1, MAX_BRUSH_SIZE);
        sizeNum.value = v;
        this.state.setBrushSize(v);
      });

      sizeNum.addEventListener('change', () => {
        const v = clamp(parseInt(sizeNum.value), 1, MAX_BRUSH_SIZE);
        sizeSlider.value = v;
        sizeNum.value = v;
        this.state.setBrushSize(v);
      });

      sizeLabel.appendChild(sizeSlider);
      sizeLabel.appendChild(sizeNum);
      this.container.appendChild(sizeLabel);

      // Brush shape select
      const shapeLabel = document.createElement('label');
      shapeLabel.textContent = 'Shape:';

      const shapeSelect = document.createElement('select');
      shapeSelect.dataset.field = 'brushShape';
      for (const shape of Object.values(BRUSH_SHAPES)) {
        const opt = document.createElement('option');
        opt.value = shape;
        opt.textContent = shape.charAt(0).toUpperCase() + shape.slice(1);
        if (shape === this.state.brushShape) opt.selected = true;
        shapeSelect.appendChild(opt);
      }
      shapeSelect.addEventListener('change', () => {
        this.state.setBrushShape(shapeSelect.value);
      });

      shapeLabel.appendChild(shapeSelect);
      this.container.appendChild(shapeLabel);
    }
  }

  _updateValues() {
    const sizeSlider = this.container.querySelector('[data-field="brushSize"]');
    const sizeNum = this.container.querySelector('[data-field="brushSizeNum"]');
    const shapeSelect = this.container.querySelector('[data-field="brushShape"]');

    if (sizeSlider) sizeSlider.value = this.state.brushSize;
    if (sizeNum) sizeNum.value = this.state.brushSize;
    if (shapeSelect) shapeSelect.value = this.state.brushShape;
  }
}
