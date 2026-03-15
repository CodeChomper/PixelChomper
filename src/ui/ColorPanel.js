import { colorToCSS } from '../core/Constants.js';

/**
 * Right-side color panel — FG/BG swatches + simple palette.
 * Full color picker and palette system comes in Stage 3.
 */
export class ColorPanel {
  constructor(state, containerEl) {
    this.state = state;
    this.container = containerEl;
    this._build();

    this.state.events.on('color:fg-changed', () => this._updateSwatches());
    this.state.events.on('color:bg-changed', () => this._updateSwatches());
  }

  _build() {
    this.container.innerHTML = '';

    // Color swatches section
    const section = document.createElement('div');
    section.className = 'panel-section';

    const title = document.createElement('div');
    title.className = 'panel-section-title';
    title.textContent = 'Color';
    section.appendChild(title);

    const swatches = document.createElement('div');
    swatches.className = 'color-swatches';

    const stack = document.createElement('div');
    stack.className = 'color-swatch-stack';

    this._fgSwatch = document.createElement('div');
    this._fgSwatch.className = 'color-swatch fg';
    this._fgSwatch.title = 'Foreground Color';
    stack.appendChild(this._fgSwatch);

    this._bgSwatch = document.createElement('div');
    this._bgSwatch.className = 'color-swatch bg';
    this._bgSwatch.title = 'Background Color';
    stack.appendChild(this._bgSwatch);

    swatches.appendChild(stack);

    const swapBtn = document.createElement('button');
    swapBtn.className = 'color-swap-btn';
    swapBtn.innerHTML = '&#x21C4;';
    swapBtn.title = 'Swap Colors (X)';
    swapBtn.addEventListener('click', () => this.state.swapColors());
    swatches.appendChild(swapBtn);

    section.appendChild(swatches);

    // Simple color inputs (native) for Stage 1
    const fgRow = this._createColorInput('FG:', this.state.fgColor, (c) => this.state.setFGColor(c));
    const bgRow = this._createColorInput('BG:', this.state.bgColor, (c) => this.state.setBGColor(c));
    section.appendChild(fgRow);
    section.appendChild(bgRow);

    this.container.appendChild(section);

    // Basic palette
    this._buildPalette();

    this._updateSwatches();
  }

  _createColorInput(labelText, initialColor, onChange) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '6px';
    row.style.marginTop = '4px';

    const label = document.createElement('span');
    label.textContent = labelText;
    label.style.color = 'var(--text-secondary)';
    label.style.fontSize = '11px';
    label.style.width = '24px';
    row.appendChild(label);

    const input = document.createElement('input');
    input.type = 'color';
    input.value = this._rgbToHex(initialColor);
    input.style.width = '32px';
    input.style.height = '24px';
    input.style.border = '1px solid var(--border-color)';
    input.style.borderRadius = '3px';
    input.style.cursor = 'pointer';
    input.addEventListener('input', () => {
      const c = this._hexToRgb(input.value);
      onChange(c);
    });
    row.appendChild(input);

    return row;
  }

  _buildPalette() {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const title = document.createElement('div');
    title.className = 'panel-section-title';
    title.textContent = 'Palette';
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'palette-grid';

    // Basic 64-color palette
    const colors = this._generateBasicPalette();
    for (const color of colors) {
      const swatch = document.createElement('div');
      swatch.className = 'palette-color';
      swatch.style.backgroundColor = colorToCSS(color);
      swatch.addEventListener('click', () => this.state.setFGColor(color));
      swatch.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.state.setBGColor(color);
      });
      grid.appendChild(swatch);
    }

    section.appendChild(grid);
    this.container.appendChild(section);
  }

  _generateBasicPalette() {
    const colors = [];
    // Grayscale row
    for (let i = 0; i < 16; i++) {
      const v = Math.round(i * 255 / 15);
      colors.push({ r: v, g: v, b: v, a: 255 });
    }
    // Color rows
    const hues = [0, 15, 30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 345, 360];
    for (const sat of [1, 0.7, 0.4]) {
      for (const hue of hues) {
        const c = this._hslToRgb(hue / 360, sat, 0.5);
        colors.push({ ...c, a: 255 });
      }
    }
    return colors;
  }

  _updateSwatches() {
    this._fgSwatch.style.backgroundColor = colorToCSS(this.state.fgColor);
    this._bgSwatch.style.backgroundColor = colorToCSS(this.state.bgColor);
  }

  _rgbToHex(c) {
    return '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  _hexToRgb(hex) {
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    return { r, g, b, a: 255 };
  }

  _hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }
}
