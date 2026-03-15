/**
 * Reusable modal dialog.
 */
export class Dialog {
  /**
   * Show a modal dialog.
   * @param {object} options
   * @param {string} options.title
   * @param {Array<{label: string, type: string, name: string, value: any, min?: number, max?: number, options?: Array}>} options.fields
   * @param {string} [options.confirmText='OK']
   * @param {string} [options.cancelText='Cancel']
   * @returns {Promise<object|null>} resolved with field values or null if cancelled
   */
  static show({ title, fields, confirmText = 'OK', cancelText = 'Cancel' }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'dialog';

      const titleEl = document.createElement('div');
      titleEl.className = 'dialog-title';
      titleEl.textContent = title;
      dialog.appendChild(titleEl);

      const body = document.createElement('div');
      body.className = 'dialog-body';

      const inputs = {};
      for (const field of fields) {
        const row = document.createElement('div');
        row.className = 'dialog-row';

        const label = document.createElement('label');
        label.textContent = field.label;
        row.appendChild(label);

        let input;
        if (field.type === 'select') {
          input = document.createElement('select');
          for (const opt of field.options) {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = opt.label;
            if (opt.value === field.value) o.selected = true;
            input.appendChild(o);
          }
        } else {
          input = document.createElement('input');
          input.type = field.type || 'number';
          input.value = field.value;
          if (field.min !== undefined) input.min = field.min;
          if (field.max !== undefined) input.max = field.max;
        }
        input.name = field.name;
        inputs[field.name] = input;
        row.appendChild(input);
        body.appendChild(row);
      }
      dialog.appendChild(body);

      const buttons = document.createElement('div');
      buttons.className = 'dialog-buttons';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn';
      cancelBtn.textContent = cancelText;
      cancelBtn.onclick = () => {
        overlay.remove();
        resolve(null);
      };
      buttons.appendChild(cancelBtn);

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-primary';
      confirmBtn.textContent = confirmText;
      confirmBtn.onclick = () => {
        const result = {};
        for (const [name, input] of Object.entries(inputs)) {
          const field = fields.find(f => f.name === name);
          if (field.type === 'color') {
            result[name] = input.value;
          } else if (field.type === 'number' || input.type === 'number') {
            result[name] = parseInt(input.value, 10);
          } else {
            result[name] = input.value;
          }
        }
        overlay.remove();
        resolve(result);
      };
      buttons.appendChild(confirmBtn);

      dialog.appendChild(buttons);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Focus first input
      const firstInput = body.querySelector('input, select');
      if (firstInput) firstInput.focus();

      // Enter key submits
      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
      });
    });
  }
}
