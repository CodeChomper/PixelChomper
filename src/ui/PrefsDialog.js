import { Prefs } from '../core/Prefs.js';

/**
 * Preferences dialog — grid color, checker size.
 */
export class PrefsDialog {
  static show(state) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'dialog prefs-dialog';

      const titleEl = document.createElement('div');
      titleEl.className = 'dialog-title';
      titleEl.textContent = 'Preferences';
      dialog.appendChild(titleEl);

      const body = document.createElement('div');
      body.className = 'prefs-dialog-body';

      const prefs = Prefs.getAll();

      // Grid Color
      const gridRow = document.createElement('div');
      gridRow.className = 'pref-row';
      const gridLabel = document.createElement('label');
      gridLabel.textContent = 'Grid Color:';
      const gridInput = document.createElement('input');
      gridInput.type = 'color';
      gridInput.value = _rgbaToHex(prefs.gridColor);
      gridInput.className = 'pref-color-input';
      const gridAlphaLabel = document.createElement('label');
      gridAlphaLabel.textContent = 'Opacity:';
      const gridAlpha = document.createElement('input');
      gridAlpha.type = 'range';
      gridAlpha.min = 0;
      gridAlpha.max = 100;
      gridAlpha.value = Math.round(_rgbaAlpha(prefs.gridColor) * 100);
      gridAlpha.className = 'pref-range';
      gridLabel.appendChild(gridInput);
      gridRow.appendChild(gridLabel);
      gridRow.appendChild(gridAlphaLabel);
      gridRow.appendChild(gridAlpha);
      body.appendChild(gridRow);

      // Checker Size
      const checkerRow = document.createElement('div');
      checkerRow.className = 'pref-row';
      const checkerLabel = document.createElement('label');
      checkerLabel.textContent = 'Checker Size:';
      const checkerSelect = document.createElement('select');
      for (const sz of [4, 8, 16]) {
        const opt = document.createElement('option');
        opt.value = sz;
        opt.textContent = `${sz}px`;
        if (sz === prefs.checkerSize) opt.selected = true;
        checkerSelect.appendChild(opt);
      }
      checkerLabel.appendChild(checkerSelect);
      checkerRow.appendChild(checkerLabel);
      body.appendChild(checkerRow);

      dialog.appendChild(body);

      const buttons = document.createElement('div');
      buttons.className = 'dialog-buttons';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'Cancel';

      const okBtn = document.createElement('button');
      okBtn.className = 'btn btn-primary';
      okBtn.textContent = 'Apply';

      buttons.appendChild(cancelBtn);
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const close = (apply) => {
        if (apply) {
          // Build grid color from picker + alpha slider
          const hex = gridInput.value;
          const alpha = parseInt(gridAlpha.value) / 100;
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          const gridColor = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          const checkerSize = parseInt(checkerSelect.value);

          state.setPreference('gridColor', gridColor);
          state.setPreference('checkerSize', checkerSize);
        }
        overlay.remove();
        resolve(apply);
      };

      okBtn.addEventListener('click', () => close(true));
      cancelBtn.addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter') close(true);
      });
    });
  }
}

function _rgbaToHex(rgba) {
  const m = rgba.match(/rgba?\s*\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return '#ffffff';
  return '#' + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, '0')).join('');
}

function _rgbaAlpha(rgba) {
  const m = rgba.match(/rgba?\s*\(\d+,\s*\d+,\s*\d+,?\s*([\d.]+)?\)/);
  return m && m[1] !== undefined ? parseFloat(m[1]) : 1;
}
