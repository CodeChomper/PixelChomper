/**
 * Top menu bar with dropdown menus.
 */
export class MenuBar {
  constructor(state, containerEl) {
    this.state = state;
    this.container = containerEl;
    this._openMenu = null;

    this._menus = {
      'File': [
        { label: 'New Sprite...', action: 'file:new', shortcut: 'Ctrl+N' },
      ],
      'Edit': [
        { label: 'Select All', action: 'edit:select-all', shortcut: 'Ctrl+A' },
        { label: 'Deselect', action: 'edit:deselect', shortcut: 'Ctrl+D' },
        { label: 'Invert Selection', action: 'edit:invert-selection', shortcut: 'Ctrl+Shift+I' },
        { type: 'separator' },
        { label: 'Cut', action: 'edit:cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', action: 'edit:copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', action: 'edit:paste', shortcut: 'Ctrl+V' },
      ],
      'View': [
        { label: 'Toggle Grid', action: 'view:toggle-grid', shortcut: 'Ctrl+G' },
        { type: 'separator' },
        { label: 'Zoom In', action: 'view:zoom-in', shortcut: '+' },
        { label: 'Zoom Out', action: 'view:zoom-out', shortcut: '-' },
        { label: 'Fit to Screen', action: 'view:fit', shortcut: 'Ctrl+0' },
      ],
      'Help': [
        { label: 'Keyboard Shortcuts...', action: 'help:shortcuts', shortcut: 'F1' },
      ],
    };

    this._build();
    this._bindGlobalKeys();
  }

  _build() {
    this.container.innerHTML = '';

    // App title
    const title = document.createElement('span');
    title.className = 'menu-item';
    title.textContent = 'PixelChomper';
    title.style.fontWeight = '700';
    title.style.color = 'var(--accent)';
    title.style.cursor = 'default';
    this.container.appendChild(title);

    for (const [menuName, items] of Object.entries(this._menus)) {
      const wrapper = document.createElement('div');
      wrapper.className = 'menu-wrapper';
      this.container.appendChild(wrapper);

      const menuItem = document.createElement('span');
      menuItem.className = 'menu-item';
      menuItem.textContent = menuName;
      menuItem.dataset.menu = menuName;
      wrapper.appendChild(menuItem);

      const dropdown = document.createElement('div');
      dropdown.className = 'menu-dropdown';
      dropdown.dataset.menu = menuName;

      for (const item of items) {
        if (item.type === 'separator') {
          const sep = document.createElement('div');
          sep.className = 'menu-separator';
          dropdown.appendChild(sep);
          continue;
        }
        const el = document.createElement('div');
        el.className = 'menu-dropdown-item';
        el.innerHTML = `<span>${item.label}</span>${item.shortcut ? `<span class="shortcut">${item.shortcut}</span>` : ''}`;
        el.addEventListener('click', () => {
          this._closeAll();
          this.state.events.emit(item.action);
        });
        dropdown.appendChild(el);
      }

      wrapper.appendChild(dropdown);

      menuItem.addEventListener('click', () => {
        if (this._openMenu === menuName) {
          this._closeAll();
        } else {
          this._closeAll();
          dropdown.classList.add('open');
          this._openMenu = menuName;
        }
      });

      menuItem.addEventListener('mouseenter', () => {
        if (this._openMenu && this._openMenu !== menuName) {
          this._closeAll();
          dropdown.classList.add('open');
          this._openMenu = menuName;
        }
      });
    }

    // Close menus on click outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this._closeAll();
      }
    });
  }

  _closeAll() {
    this.container.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('open'));
    this._openMenu = null;
  }

  _bindGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        this.state.events.emit('view:toggle-grid');
      }
      if (e.key === 'F1') {
        e.preventDefault();
        this.state.events.emit('help:shortcuts');
      }
    });
  }
}
