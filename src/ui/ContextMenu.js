/**
 * Reusable right-click context menu.
 * Usage: ContextMenu.show(items, x, y) → Promise<string|null>
 * items: [{label, action, shortcut?, separator?}]
 */

let _activeMenu = null;

export const ContextMenu = {
  /** @param {{label:string,action:string,shortcut?:string}[]|'separator'} items */
  show(items, x, y) {
    this._dismiss();

    return new Promise((resolve) => {
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.style.visibility = 'hidden';

      for (const item of items) {
        if (item === 'separator' || item.separator) {
          const sep = document.createElement('div');
          sep.className = 'context-menu-separator';
          menu.appendChild(sep);
          continue;
        }
        const el = document.createElement('div');
        el.className = 'context-menu-item' + (item.disabled ? ' disabled' : '');
        const labelSpan = document.createElement('span');
        labelSpan.textContent = item.label;
        el.appendChild(labelSpan);
        if (item.shortcut) {
          const sc = document.createElement('span');
          sc.className = 'context-menu-shortcut';
          sc.textContent = item.shortcut;
          el.appendChild(sc);
        }
        if (!item.disabled) {
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            this._dismiss();
            resolve(item.action);
          });
        }
        menu.appendChild(el);
      }

      document.body.appendChild(menu);
      _activeMenu = { menu, resolve };

      // Position after layout
      requestAnimationFrame(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const mw = menu.offsetWidth;
        const mh = menu.offsetHeight;
        let fx = x;
        let fy = y;
        if (fx + mw > vw) fx = Math.max(0, vw - mw);
        if (fy + mh > vh) fy = Math.max(0, vh - mh);
        menu.style.left = fx + 'px';
        menu.style.top = fy + 'px';
        menu.style.visibility = '';
      });

      const onDismiss = (e) => {
        if (!menu.contains(e.target)) {
          this._dismiss();
          resolve(null);
        }
      };
      const onKey = (e) => {
        if (e.key === 'Escape') {
          this._dismiss();
          resolve(null);
        }
      };

      // Store cleanup listeners on the menu element
      menu._onDismiss = onDismiss;
      menu._onKey = onKey;

      // Use a timeout so the mousedown that opened the menu doesn't immediately close it
      setTimeout(() => {
        document.addEventListener('mousedown', onDismiss);
        document.addEventListener('keydown', onKey);
      }, 0);
    });
  },

  _dismiss() {
    if (!_activeMenu) return;
    const { menu } = _activeMenu;
    document.removeEventListener('mousedown', menu._onDismiss);
    document.removeEventListener('keydown', menu._onKey);
    menu.remove();
    _activeMenu = null;
  },
};
