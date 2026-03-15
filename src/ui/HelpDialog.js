/**
 * Read-only keyboard shortcuts reference dialog.
 */
export class HelpDialog {
  static show() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'dialog help-dialog';

      const titleEl = document.createElement('div');
      titleEl.className = 'dialog-title';
      titleEl.textContent = 'Keyboard Shortcuts';
      dialog.appendChild(titleEl);

      const body = document.createElement('div');
      body.className = 'help-dialog-body';
      body.innerHTML = `
        <div class="help-col">
          <table class="help-table">
            <caption>Tools</caption>
            <thead><tr><th>Tool</th><th>Key</th></tr></thead>
            <tbody>
              <tr><td>Pencil</td><td>B</td></tr>
              <tr><td>Eraser</td><td>E</td></tr>
              <tr><td>Line</td><td>L</td></tr>
              <tr><td>Rectangle</td><td>U</td></tr>
              <tr><td>Ellipse</td><td>Shift+U</td></tr>
              <tr><td>Fill</td><td>G</td></tr>
              <tr><td>Eyedropper</td><td>I</td></tr>
              <tr><td>Spray</td><td>Shift+B</td></tr>
              <tr><td>Curve</td><td>Shift+L</td></tr>
              <tr><td>Polygon</td><td>Shift+D</td></tr>
              <tr><td>Select Rect</td><td>M</td></tr>
              <tr><td>Lasso Select</td><td>Q</td></tr>
              <tr><td>Magic Wand</td><td>W</td></tr>
              <tr><td>Move</td><td>V</td></tr>
            </tbody>
          </table>
        </div>
        <div class="help-col">
          <table class="help-table">
            <caption>Canvas</caption>
            <thead><tr><th>Action</th><th>Shortcut</th></tr></thead>
            <tbody>
              <tr><td>Pan</td><td>Space+Drag / Middle Mouse</td></tr>
              <tr><td>Zoom In</td><td>+ or Scroll Up</td></tr>
              <tr><td>Zoom Out</td><td>- or Scroll Down</td></tr>
              <tr><td>Fit to Screen</td><td>Ctrl+0</td></tr>
              <tr><td>Toggle Grid</td><td>Ctrl+G</td></tr>
              <tr><td>Swap Colors</td><td>X</td></tr>
              <tr><td>New Sprite</td><td>Ctrl+N</td></tr>
            </tbody>
          </table>
          <table class="help-table">
            <caption>Selection</caption>
            <thead><tr><th>Action</th><th>Shortcut</th></tr></thead>
            <tbody>
              <tr><td>Select All</td><td>Ctrl+A</td></tr>
              <tr><td>Deselect</td><td>Ctrl+D</td></tr>
              <tr><td>Invert Selection</td><td>Ctrl+Shift+I</td></tr>
              <tr><td>Cut</td><td>Ctrl+X</td></tr>
              <tr><td>Copy</td><td>Ctrl+C</td></tr>
              <tr><td>Paste</td><td>Ctrl+V</td></tr>
            </tbody>
          </table>
          <table class="help-table">
            <caption>Multi-click Tools (Curve, Polygon)</caption>
            <thead><tr><th>Action</th><th>Shortcut</th></tr></thead>
            <tbody>
              <tr><td>Commit shape</td><td>Enter or double-click</td></tr>
              <tr><td>Cancel</td><td>Escape</td></tr>
            </tbody>
          </table>
          <table class="help-table">
            <caption>Color</caption>
            <thead><tr><th>Action</th><th>Shortcut</th></tr></thead>
            <tbody>
              <tr><td>Swap FG/BG</td><td>X</td></tr>
              <tr><td>Edit FG color</td><td>Click FG swatch</td></tr>
              <tr><td>Edit BG color</td><td>Click BG swatch</td></tr>
              <tr><td>Set FG from palette</td><td>Left-click color</td></tr>
              <tr><td>Set BG from palette</td><td>Right-click color</td></tr>
              <tr><td>Shading Ink (darken)</td><td>Shade + left drag</td></tr>
              <tr><td>Shading Ink (lighten)</td><td>Shade + right drag</td></tr>
            </tbody>
          </table>
        </div>
      `;
      dialog.appendChild(body);

      const buttons = document.createElement('div');
      buttons.className = 'dialog-buttons';
      const okBtn = document.createElement('button');
      okBtn.className = 'btn btn-primary';
      okBtn.textContent = 'OK';
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const close = () => {
        overlay.remove();
        resolve();
      };

      okBtn.onclick = close;
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      dialog.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      okBtn.focus();
    });
  }
}
