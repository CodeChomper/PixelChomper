/**
 * Preferences — reads/writes to localStorage.
 * Provides defaults for grid color and checker size.
 */
const LS_KEY = 'pixelchomper:prefs';

const DEFAULTS = {
  gridColor: 'rgba(255,255,255,0.15)',
  checkerSize: 8,
};

export const Prefs = {
  _data: null,

  _load() {
    if (this._data) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      this._data = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
      this._data = { ...DEFAULTS };
    }
  },

  get(key) {
    this._load();
    return Object.prototype.hasOwnProperty.call(this._data, key)
      ? this._data[key]
      : DEFAULTS[key];
  },

  getAll() {
    this._load();
    return { ...this._data };
  },

  set(key, value) {
    this._load();
    this._data[key] = value;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this._data));
    } catch { /* ignore */ }
  },
};
