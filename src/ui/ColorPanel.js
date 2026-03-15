import { colorToCSS } from '../core/Constants.js';
import { ColorPicker } from './ColorPicker.js';
import { Palette } from '../model/Palette.js';

const PALETTE_PRESETS = [
  { label: 'PICO-8',     file: 'assets/palettes/pico-8.json' },
  { label: 'ENDESGA-32', file: 'assets/palettes/endesga-32.json' },
  { label: 'Game Boy',   file: 'assets/palettes/game-boy.json' },
  { label: 'Custom',     file: null },
];

export class ColorPanel {
  constructor(state, containerEl) {
    this.state = state;
    this.container = containerEl;
    this._pickerTarget = 'fg'; // 'fg' or 'bg'
    this._pickerVisible = false;
    this._selectedPaletteIndex = -1;
    this._build();

    state.events.on('color:fg-changed', () => {
      this._updateSwatches();
      if (this._pickerVisible && this._pickerTarget === 'fg') {
        this._picker.setColor(state.fgColor);
      }
    });
    state.events.on('color:bg-changed', () => {
      this._updateSwatches();
      if (this._pickerVisible && this._pickerTarget === 'bg') {
        this._picker.setColor(state.bgColor);
      }
    });
    state.events.on('color:recent-changed', () => this._updateRecent());
    state.events.on('palette:changed', () => {
      this._rebuildPaletteGrid();
      if (this._isCustomPreset()) this._saveCustomPalette();
    });
    state.events.on('shading:changed', (v) => { this._shadingCb.checked = v; });
  }

  _build() {
    this.container.innerHTML = '';
    this._buildColorSection();
    this._buildPaletteSection();
  }

  // ── Color section ──────────────────────────────────────────────────────────

  _buildColorSection() {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const title = document.createElement('div');
    title.className = 'panel-section-title';
    title.textContent = 'Color';
    section.appendChild(title);

    // Swatch row: [FG/BG stack] [swap] [shading]
    const swatchRow = document.createElement('div');
    swatchRow.className = 'color-swatches';

    const stack = document.createElement('div');
    stack.className = 'color-swatch-stack';

    this._fgSwatch = document.createElement('div');
    this._fgSwatch.className = 'color-swatch fg';
    this._fgSwatch.title = 'Foreground (click to edit)';
    this._fgSwatch.addEventListener('click', () => this._openPicker('fg'));
    stack.appendChild(this._fgSwatch);

    this._bgSwatch = document.createElement('div');
    this._bgSwatch.className = 'color-swatch bg';
    this._bgSwatch.title = 'Background (click to edit)';
    this._bgSwatch.addEventListener('click', () => this._openPicker('bg'));
    stack.appendChild(this._bgSwatch);

    swatchRow.appendChild(stack);

    const swapBtn = document.createElement('button');
    swapBtn.className = 'color-swap-btn';
    swapBtn.innerHTML = '&#x21C4;';
    swapBtn.title = 'Swap Colors (X)';
    swapBtn.addEventListener('click', () => this.state.swapColors());
    swatchRow.appendChild(swapBtn);

    // Shading ink toggle
    const shadingLabel = document.createElement('label');
    shadingLabel.className = 'color-shading-label';
    shadingLabel.title = 'Shading Ink: pencil lightens/darkens existing pixels instead of replacing';
    this._shadingCb = document.createElement('input');
    this._shadingCb.type = 'checkbox';
    this._shadingCb.checked = this.state.shadingInk;
    this._shadingCb.addEventListener('change', () => this.state.setShadingInk(this._shadingCb.checked));
    shadingLabel.appendChild(this._shadingCb);
    shadingLabel.append(' Shade');
    swatchRow.appendChild(shadingLabel);

    section.appendChild(swatchRow);

    // Picker container (collapsed by default)
    this._pickerContainer = document.createElement('div');
    this._pickerContainer.className = 'color-picker-container';
    this._pickerContainer.style.display = 'none';
    section.appendChild(this._pickerContainer);

    this._picker = new ColorPicker(
      this._pickerContainer,
      this.state.fgColor,
      (color) => {
        if (this._pickerTarget === 'fg') {
          this.state.setFGColor(color);
        } else {
          this.state.setBGColor(color);
        }
      }
    );

    // Recent colors
    const recentTitle = document.createElement('div');
    recentTitle.className = 'panel-section-title';
    recentTitle.style.marginTop = '8px';
    recentTitle.textContent = 'Recent';
    section.appendChild(recentTitle);

    this._recentRow = document.createElement('div');
    this._recentRow.className = 'recent-colors';
    section.appendChild(this._recentRow);

    this.container.appendChild(section);
    this._updateSwatches();
    this._updateRecent();
  }

  _openPicker(target) {
    if (this._pickerTarget === target && this._pickerVisible) {
      this._pickerContainer.style.display = 'none';
      this._pickerVisible = false;
      this._fgSwatch.classList.remove('picker-active');
      this._bgSwatch.classList.remove('picker-active');
      return;
    }
    this._pickerTarget = target;
    this._pickerVisible = true;
    this._pickerContainer.style.display = '';
    this._picker.setColor(target === 'fg' ? this.state.fgColor : this.state.bgColor);
    this._fgSwatch.classList.toggle('picker-active', target === 'fg');
    this._bgSwatch.classList.toggle('picker-active', target === 'bg');
  }

  _updateSwatches() {
    this._fgSwatch.style.backgroundColor = colorToCSS(this.state.fgColor);
    this._bgSwatch.style.backgroundColor = colorToCSS(this.state.bgColor);
  }

  _updateRecent() {
    this._recentRow.innerHTML = '';
    for (const color of (this.state.recentColors ?? [])) {
      const swatch = document.createElement('div');
      swatch.className = 'recent-color';
      swatch.style.backgroundColor = colorToCSS(color);
      swatch.title = `rgb(${color.r},${color.g},${color.b})`;
      swatch.addEventListener('click', () => this.state.setFGColor(color));
      swatch.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.state.setBGColor(color);
      });
      this._recentRow.appendChild(swatch);
    }
  }

  // ── Palette section ────────────────────────────────────────────────────────

  _buildPaletteSection() {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const titleRow = document.createElement('div');
    titleRow.className = 'palette-title-row';

    const title = document.createElement('div');
    title.className = 'panel-section-title';
    title.textContent = 'Palette';
    titleRow.appendChild(title);

    this._presetSelect = document.createElement('select');
    this._presetSelect.className = 'palette-preset-select';
    for (const preset of PALETTE_PRESETS) {
      const opt = document.createElement('option');
      opt.value = preset.file ?? '';
      opt.textContent = preset.label;
      this._presetSelect.appendChild(opt);
    }
    this._presetSelect.addEventListener('change', () => this._loadPreset());
    titleRow.appendChild(this._presetSelect);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn palette-btn';
    addBtn.title = 'Add foreground color to palette';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => {
      if (!this.state.activePalette) return;
      this.state.activePalette.addColor(this.state.fgColor);
      this.state.events.emit('palette:changed');
    });
    titleRow.appendChild(addBtn);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn palette-btn';
    removeBtn.title = 'Remove selected color';
    removeBtn.textContent = '−';
    removeBtn.addEventListener('click', () => {
      if (!this.state.activePalette || this._selectedPaletteIndex < 0) return;
      this.state.activePalette.removeColor(this._selectedPaletteIndex);
      this._selectedPaletteIndex = -1;
      this.state.events.emit('palette:changed');
    });
    titleRow.appendChild(removeBtn);

    section.appendChild(titleRow);

    this._paletteGrid = document.createElement('div');
    this._paletteGrid.className = 'palette-grid';
    section.appendChild(this._paletteGrid);

    this.container.appendChild(section);

    // Load default preset
    this._loadPreset();
  }

  async _loadPreset() {
    const file = this._presetSelect.value;
    if (!file) {
      this.state.setPalette(this._loadCustomPalette());
      return;
    }
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this.state.setPalette(Palette.fromJSON(json));
    } catch (e) {
      console.warn('Failed to load palette:', file, e);
    }
  }

  _isCustomPreset() {
    return this._presetSelect.value === '';
  }

  _saveCustomPalette() {
    if (!this.state.activePalette) return;
    try {
      localStorage.setItem('pixelchomper:custom-palette', JSON.stringify(this.state.activePalette.toJSON()));
    } catch { /* ignore */ }
  }

  _loadCustomPalette() {
    try {
      const saved = localStorage.getItem('pixelchomper:custom-palette');
      if (saved) return Palette.fromJSON(JSON.parse(saved));
    } catch { /* ignore */ }
    return new Palette('Custom', []);
  }

  _rebuildPaletteGrid() {
    const palette = this.state.activePalette;
    this._paletteGrid.innerHTML = '';
    this._selectedPaletteIndex = -1;
    if (!palette) return;

    palette.colors.forEach((color, i) => {
      const swatch = document.createElement('div');
      swatch.className = 'palette-color';
      swatch.style.backgroundColor = colorToCSS(color);
      swatch.title = `rgb(${color.r},${color.g},${color.b})`;
      swatch.addEventListener('click', () => {
        this._selectedPaletteIndex = i;
        this._updatePaletteSelection();
        this.state.setFGColor(color);
      });
      swatch.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._selectedPaletteIndex = i;
        this._updatePaletteSelection();
        this.state.setBGColor(color);
      });
      this._paletteGrid.appendChild(swatch);
    });
  }

  _updatePaletteSelection() {
    this._paletteGrid.querySelectorAll('.palette-color').forEach((s, i) => {
      s.classList.toggle('selected', i === this._selectedPaletteIndex);
    });
  }
}
