/**
 * Palette data model — an ordered array of {r,g,b,a} colors.
 */
export class Palette {
  constructor(name = 'Custom', colors = []) {
    this.name = name;
    this.colors = colors.map(c => ({ r: c.r, g: c.g, b: c.b, a: c.a ?? 255 }));
  }

  /**
   * Create from a fetched JSON object.
   * JSON shape: { "name": "...", "colors": ["#rrggbb", ...] }
   * Colors may also be {r,g,b,a} objects.
   */
  static fromJSON(json) {
    const name = json.name ?? 'Unnamed';
    const colors = (json.colors ?? []).map(c => {
      if (typeof c === 'string') {
        return {
          r: parseInt(c.substr(1, 2), 16),
          g: parseInt(c.substr(3, 2), 16),
          b: parseInt(c.substr(5, 2), 16),
          a: 255,
        };
      }
      return { r: c.r ?? 0, g: c.g ?? 0, b: c.b ?? 0, a: c.a ?? 255 };
    });
    return new Palette(name, colors);
  }

  toJSON() {
    return {
      name: this.name,
      colors: this.colors.map(c =>
        '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('')
      ),
    };
  }

  addColor(color) {
    this.colors.push({ r: color.r, g: color.g, b: color.b, a: color.a ?? 255 });
  }

  removeColor(index) {
    if (index >= 0 && index < this.colors.length) {
      this.colors.splice(index, 1);
    }
  }
}
