/**
 * Canvas resize dialog with 3×3 anchor point picker.
 */
export class ResizeCanvasDialog {
  static show(currentWidth, currentHeight) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'dialog resize-dialog';

      const titleEl = document.createElement('div');
      titleEl.className = 'dialog-title';
      titleEl.textContent = 'Resize Canvas';
      dialog.appendChild(titleEl);

      const body = document.createElement('div');
      body.className = 'resize-dialog-body';

      // Dimensions row
      const dimRow = document.createElement('div');
      dimRow.className = 'resize-dim-row';

      const wLabel = document.createElement('label');
      wLabel.textContent = 'Width:';
      const wInput = document.createElement('input');
      wInput.type = 'number';
      wInput.min = 1;
      wInput.max = 1024;
      wInput.value = currentWidth;
      wLabel.appendChild(wInput);

      const hLabel = document.createElement('label');
      hLabel.textContent = 'Height:';
      const hInput = document.createElement('input');
      hInput.type = 'number';
      hInput.min = 1;
      hInput.max = 1024;
      hInput.value = currentHeight;
      hLabel.appendChild(hInput);

      dimRow.appendChild(wLabel);
      dimRow.appendChild(hLabel);
      body.appendChild(dimRow);

      // Anchor picker
      const anchorSection = document.createElement('div');
      anchorSection.className = 'resize-anchor-section';
      const anchorLabel = document.createElement('div');
      anchorLabel.className = 'resize-anchor-label';
      anchorLabel.textContent = 'Anchor Point:';
      anchorSection.appendChild(anchorLabel);

      const anchorGrid = document.createElement('div');
      anchorGrid.className = 'resize-anchor-grid';

      // anchorX, anchorY: 0=left/top, 0.5=center, 1=right/bottom
      let selectedAnchor = { x: 0, y: 0 };
      const anchorValues = [0, 0.5, 1];
      const anchorCells = [];

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const cell = document.createElement('div');
          cell.className = 'resize-anchor-cell' + (row === 0 && col === 0 ? ' selected' : '');
          cell.dataset.ax = anchorValues[col];
          cell.dataset.ay = anchorValues[row];
          cell.addEventListener('click', () => {
            anchorCells.forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            selectedAnchor = { x: anchorValues[col], y: anchorValues[row] };
          });
          anchorGrid.appendChild(cell);
          anchorCells.push(cell);
        }
      }

      anchorSection.appendChild(anchorGrid);
      body.appendChild(anchorSection);

      // Preview info
      const previewEl = document.createElement('div');
      previewEl.className = 'resize-preview-info';
      const updatePreview = () => {
        const nw = parseInt(wInput.value) || currentWidth;
        const nh = parseInt(hInput.value) || currentHeight;
        const dx = nw - currentWidth;
        const dy = nh - currentHeight;
        previewEl.textContent = `${currentWidth}×${currentHeight} → ${nw}×${nh}  (Δ ${dx >= 0 ? '+' : ''}${dx}, ${dy >= 0 ? '+' : ''}${dy})`;
      };
      wInput.addEventListener('input', updatePreview);
      hInput.addEventListener('input', updatePreview);
      updatePreview();
      body.appendChild(previewEl);

      dialog.appendChild(body);

      const buttons = document.createElement('div');
      buttons.className = 'dialog-buttons';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'Cancel';

      const okBtn = document.createElement('button');
      okBtn.className = 'btn btn-primary';
      okBtn.textContent = 'Resize';

      buttons.appendChild(cancelBtn);
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const close = (result) => {
        overlay.remove();
        resolve(result);
      };

      okBtn.addEventListener('click', () => {
        const nw = Math.max(1, Math.min(1024, parseInt(wInput.value) || currentWidth));
        const nh = Math.max(1, Math.min(1024, parseInt(hInput.value) || currentHeight));
        close({ width: nw, height: nh, anchorX: selectedAnchor.x, anchorY: selectedAnchor.y });
      });
      cancelBtn.addEventListener('click', () => close(null));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close(null);
        if (e.key === 'Enter') okBtn.click();
      });
      wInput.focus();
    });
  }
}
