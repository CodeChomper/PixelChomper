import { Tool } from './Tool.js';

export class EyedropperTool extends Tool {
  constructor() {
    super('eyedropper', 'Eyedropper', '◎');
  }

  onPointerDown(pos, event, state) {
    if (!state.sprite) return;
    const color = state.sprite.getPixel(pos.x, pos.y);
    if (!color) return;
    if (event.button === 2) {
      state.setBGColor(color);
    } else {
      state.setFGColor(color);
    }
  }

  onPointerMove() {}
  onPointerUp() {}
}
