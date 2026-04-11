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
        { label: 'Open Project...', action: 'file:open', shortcut: 'Ctrl+O' },
        { label: 'Save Project', action: 'file:save', shortcut: 'Ctrl+S' },
        { type: 'separator' },
        { label: 'Export PNG', action: 'file:export-png' },
        { label: 'Export GIF', action: 'file:export-gif' },
        { label: 'Export Sprite Sheet...', action: 'file:export-spritesheet' },
        { type: 'separator' },
        { label: 'Import Image...', action: 'file:import-image' },
        { type: 'separator' },
        { label: 'Share to Gallery...', action: 'file:share-gallery' },
        { label: 'View Gallery', action: 'file:view-gallery' },
        { type: 'separator' },
        { label: 'Preferences...', action: 'file:preferences' },
      ],
      'Edit': [
        { label: 'Undo', action: 'edit:undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', action: 'edit:redo', shortcut: 'Ctrl+Shift+Z' },
        { type: 'separator' },
        { label: 'Select All', action: 'edit:select-all', shortcut: 'Ctrl+A' },
        { label: 'Deselect', action: 'edit:deselect', shortcut: 'Ctrl+D' },
        { label: 'Invert Selection', action: 'edit:invert-selection', shortcut: 'Ctrl+Shift+I' },
        { type: 'separator' },
        { label: 'Cut', action: 'edit:cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', action: 'edit:copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', action: 'edit:paste', shortcut: 'Ctrl+V' },
        { type: 'separator' },
        { label: 'Define Brush from Selection', action: 'edit:define-brush' },
        { label: 'Clear Custom Brush', action: 'edit:clear-brush' },
        { type: 'separator' },
        { label: 'Canvas Size...', action: 'canvas:resize' },
        { label: 'Crop to Selection', action: 'canvas:crop-to-selection' },
      ],
      'View': [
        { label: 'Toggle Grid', action: 'view:toggle-grid', shortcut: 'Ctrl+G' },
        { type: 'separator' },
        { label: 'Zoom In', action: 'view:zoom-in', shortcut: '+' },
        { label: 'Zoom Out', action: 'view:zoom-out', shortcut: '-' },
        { label: 'Fit to Screen', action: 'view:fit', shortcut: 'Ctrl+0' },
        { type: 'separator' },
        { label: 'Symmetry: Horizontal', action: 'view:symmetry-h' },
        { label: 'Symmetry: Vertical', action: 'view:symmetry-v' },
        { type: 'separator' },
        { label: 'Tiled Mode', action: 'view:tiled-mode' },
      ],
      'Layer': [
        { label: 'Add Layer', action: 'layer:add' },
        { label: 'Duplicate Layer', action: 'layer:duplicate' },
        { label: 'Remove Layer', action: 'layer:remove' },
        { type: 'separator' },
        { label: 'Merge Down', action: 'layer:merge-down' },
        { label: 'Flatten', action: 'layer:flatten' },
      ],
      'Frame': [
        { label: 'Add Frame', action: 'frame:add', shortcut: 'Alt+N' },
        { label: 'Duplicate Frame', action: 'frame:duplicate' },
        { label: 'Remove Frame', action: 'frame:remove' },
        { type: 'separator' },
        { label: 'Previous Frame', action: 'frame:prev', shortcut: '←' },
        { label: 'Next Frame', action: 'frame:next', shortcut: '→' },
        { type: 'separator' },
        { label: 'Play / Pause', action: 'frame:play', shortcut: 'Enter' },
      ],
      'Help': [
        { label: 'Keyboard Shortcuts...', action: 'help:shortcuts', shortcut: 'F1' },
        { label: 'Edit Shortcuts...', action: 'help:edit-shortcuts' },
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
    title.innerHTML = '<span style="color:#bf4e30">Pixel</span><span style="color:#9ada47">Chomper</span> <span style="color:#dddddd">Editor</span>';
    title.style.fontFamily = 'var(--font-heading)';
    title.style.fontSize   = '13px';
    title.style.cursor     = 'default';
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

    // Gallery link — right-aligned, prominent
    const galleryLink = document.createElement('a');
    galleryLink.href      = 'gallery.html';
    galleryLink.className = 'menu-item menu-gallery-link';
    galleryLink.textContent = '✦ Gallery';
    galleryLink.style.cssText =
      'margin-left:auto; color:var(--accent); font-weight:700; ' +
      'letter-spacing:.03em; opacity:.95;';
    galleryLink.addEventListener('mouseenter', () => galleryLink.style.opacity = '1');
    galleryLink.addEventListener('mouseleave', () => galleryLink.style.opacity = '.95');
    this.container.appendChild(galleryLink);

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
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.state.events.emit('file:save');
      }
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        this.state.events.emit('file:open');
      }
    });
  }
}
