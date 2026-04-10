import { TOOLS } from '../core/Constants.js';

const TOOL_LABELS = {
  [TOOLS.PENCIL]: 'Pencil',
  [TOOLS.ERASER]: 'Eraser',
  [TOOLS.LINE]: 'Line',
  [TOOLS.RECT]: 'Rectangle',
  [TOOLS.ELLIPSE]: 'Ellipse',
  [TOOLS.FILL]: 'Fill',
  [TOOLS.EYEDROPPER]: 'Eyedropper',
  [TOOLS.SPRAY]: 'Spray',
  [TOOLS.CURVE]: 'Curve',
  [TOOLS.POLYGON]: 'Polygon',
  [TOOLS.SELECT_RECT]: 'Select Rect',
  [TOOLS.SELECT_LASSO]: 'Lasso Select',
  [TOOLS.MAGIC_WAND]: 'Magic Wand',
  [TOOLS.MOVE]: 'Move',
  [TOOLS.REPLACE_COLOR]: 'Replace Color',
  [TOOLS.CONTOUR]: 'Contour',
};

/**
 * Editable keyboard shortcut editor dialog.
 */
export class ShortcutEditor {
  static show(state) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'dialog shortcut-editor-dialog';

      const titleEl = document.createElement('div');
      titleEl.className = 'dialog-title';
      titleEl.textContent = 'Keyboard Shortcuts';
      dialog.appendChild(titleEl);

      const body = document.createElement('div');
      body.className = 'shortcut-editor-body';

      // Build two columns: tool shortcuts and fixed shortcuts
      const cols = document.createElement('div');
      cols.className = 'shortcut-editor-cols';

      // Left: editable tool shortcuts
      const leftCol = document.createElement('div');
      leftCol.className = 'shortcut-editor-col';
      const leftTitle = document.createElement('div');
      leftTitle.className = 'shortcut-section-title';
      leftTitle.textContent = 'Tool Shortcuts (click to change)';
      leftCol.appendChild(leftTitle);

      const table = document.createElement('table');
      table.className = 'shortcut-table';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Tool</th><th>Key</th></tr>';
      table.appendChild(thead);
      const tbody = document.createElement('tbody');

      // Build reverse map: toolId → keyStr
      const getKeyForTool = (toolId) => {
        for (const [k, t] of Object.entries(state.keyBindings)) {
          if (t === toolId) return k;
        }
        return '';
      };

      const formatKey = (k) => {
        if (!k) return '—';
        return k.replace('shift+', 'Shift+').toUpperCase().replace('SHIFT+', 'Shift+').replace(/^(.+)$/, (m, g) => g.length === 1 ? g.toUpperCase() : g);
      };

      const rows = {};
      for (const [toolId, label] of Object.entries(TOOL_LABELS)) {
        const tr = document.createElement('tr');
        const tdLabel = document.createElement('td');
        tdLabel.textContent = label;
        const tdKey = document.createElement('td');
        tdKey.className = 'shortcut-key-cell';
        const keySpan = document.createElement('span');
        keySpan.className = 'shortcut-key-badge';
        keySpan.textContent = formatKey(getKeyForTool(toolId));
        keySpan.title = 'Click to change';

        let capturing = false;
        keySpan.addEventListener('click', () => {
          if (capturing) return;
          capturing = true;
          keySpan.classList.add('capturing');
          keySpan.textContent = 'Press key…';

          const onKey = (e) => {
            if (e.key === 'Escape') {
              capturing = false;
              keySpan.classList.remove('capturing');
              keySpan.textContent = formatKey(getKeyForTool(toolId));
              document.removeEventListener('keydown', onKey);
              return;
            }
            // Ignore modifier-only keys
            if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
            e.preventDefault();
            e.stopPropagation();

            const keyStr = e.shiftKey ? `shift+${e.key.toLowerCase()}` : e.key.toLowerCase();

            // Check for conflicts
            const existing = state.keyBindings[keyStr];
            if (existing && existing !== toolId) {
              const existingLabel = TOOL_LABELS[existing] || existing;
              if (!confirm(`"${formatKey(keyStr)}" is already assigned to ${existingLabel}. Reassign?`)) {
                capturing = false;
                keySpan.classList.remove('capturing');
                keySpan.textContent = formatKey(getKeyForTool(toolId));
                document.removeEventListener('keydown', onKey);
                return;
              }
              // Remove old binding
              state.setKeyBinding(keyStr, null);
              // Update the old tool's row
              for (const [tid, rspan] of Object.entries(rows)) {
                if (tid === existing) rspan.textContent = formatKey(getKeyForTool(tid));
              }
            }

            // Remove existing binding for this tool
            for (const [k, t] of Object.entries(state.keyBindings)) {
              if (t === toolId) state.setKeyBinding(k, null);
            }

            state.setKeyBinding(keyStr, toolId);

            capturing = false;
            keySpan.classList.remove('capturing');
            keySpan.textContent = formatKey(keyStr);
            document.removeEventListener('keydown', onKey);
          };

          document.addEventListener('keydown', onKey);
        });

        rows[toolId] = keySpan;
        tdKey.appendChild(keySpan);
        tr.appendChild(tdLabel);
        tr.appendChild(tdKey);
        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      leftCol.appendChild(table);

      // Right: fixed shortcuts reference
      const rightCol = document.createElement('div');
      rightCol.className = 'shortcut-editor-col';
      const rightTitle = document.createElement('div');
      rightTitle.className = 'shortcut-section-title';
      rightTitle.textContent = 'Fixed Shortcuts';
      rightCol.appendChild(rightTitle);

      rightCol.innerHTML += `
        <table class="shortcut-table">
          <thead><tr><th>Action</th><th>Key</th></tr></thead>
          <tbody>
            <tr><td>Pan</td><td>Space+Drag</td></tr>
            <tr><td>Zoom In</td><td>+ / Scroll Up</td></tr>
            <tr><td>Zoom Out</td><td>- / Scroll Down</td></tr>
            <tr><td>Fit to Screen</td><td>Ctrl+0</td></tr>
            <tr><td>Toggle Grid</td><td>Ctrl+G</td></tr>
            <tr><td>Swap Colors</td><td>X</td></tr>
            <tr><td>Undo</td><td>Ctrl+Z</td></tr>
            <tr><td>Redo</td><td>Ctrl+Shift+Z</td></tr>
            <tr><td>Select All</td><td>Ctrl+A</td></tr>
            <tr><td>Deselect</td><td>Ctrl+D</td></tr>
            <tr><td>Cut</td><td>Ctrl+X</td></tr>
            <tr><td>Copy</td><td>Ctrl+C</td></tr>
            <tr><td>Paste</td><td>Ctrl+V</td></tr>
            <tr><td>Add Frame</td><td>Alt+N</td></tr>
            <tr><td>Prev Frame</td><td>← Arrow</td></tr>
            <tr><td>Next Frame</td><td>→ Arrow</td></tr>
            <tr><td>Play/Pause</td><td>Enter</td></tr>
            <tr><td>Shortcuts Help</td><td>F1</td></tr>
          </tbody>
        </table>
      `;

      cols.appendChild(leftCol);
      cols.appendChild(rightCol);
      body.appendChild(cols);
      dialog.appendChild(body);

      const buttons = document.createElement('div');
      buttons.className = 'dialog-buttons';

      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn-secondary';
      resetBtn.textContent = 'Reset Defaults';
      resetBtn.addEventListener('click', () => {
        if (!confirm('Reset all shortcuts to defaults?')) return;
        state.resetKeyBindings();
        // Update all key span displays
        for (const [toolId, keySpan] of Object.entries(rows)) {
          keySpan.textContent = formatKey(getKeyForTool(toolId));
        }
      });

      const okBtn = document.createElement('button');
      okBtn.className = 'btn btn-primary';
      okBtn.textContent = 'Close';

      buttons.appendChild(resetBtn);
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const close = () => {
        overlay.remove();
        resolve();
      };

      okBtn.addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      dialog.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      okBtn.focus();
    });
  }
}
