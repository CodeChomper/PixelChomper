import { Tool } from './Tool.js';
import { clamp } from '../core/Constants.js';

export class SprayTool extends Tool {
  constructor() {
    super('spray', 'Spray', '⁕');
    this._intervalId = null;
    this._lastPos = null;
    this._lastEvent = null;
    this._lastState = null;
  }

  onPointerDown(pos, event, state) {
    this._lastPos = pos;
    this._lastEvent = event;
    this._lastState = state;
    this._spray(pos, event, state);
    this._intervalId = setInterval(() => {
      if (this._lastPos) this._spray(this._lastPos, this._lastEvent, this._lastState);
    }, 50);
  }

  onPointerMove(pos, event, state) {
    this._lastPos = pos;
    this._lastEvent = event;
    this._lastState = state;
  }

  onPointerUp(pos, event, state) {
    clearInterval(this._intervalId);
    this._intervalId = null;
    this._lastPos = null;
  }

  _spray(pos, event, state) {
    const color = event.button === 2 ? state.bgColor : state.fgColor;
    const radius = state.sprayRadius;
    const density = state.sprayDensity;
    const count = Math.ceil(radius * density / 50);
    const pixels = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const r = Math.random() * radius;
      const x = Math.round(pos.x + r * Math.cos(angle));
      const y = Math.round(pos.y + r * Math.sin(angle));
      if (x >= 0 && x < state.sprite.width && y >= 0 && y < state.sprite.height) {
        pixels.push({ x, y, color });
      }
    }
    state.commitPixels(pixels);
  }
}
