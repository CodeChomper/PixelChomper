import { Tool } from './Tool.js';

export class EyedropperTool extends Tool {
  constructor() {
    super('eyedropper', 'Eyedropper', '◎');
  }

  onPointerDown(pos, event, state) {
    if (!state.sprite) return;
    // Sample from the composited result (all visible layers merged)
    const composited = state.sprite.getComposited(state.activeFrameIndex);
    const ctx = composited.getContext('2d');
    if (pos.x < 0 || pos.y < 0 || pos.x >= composited.width || pos.y >= composited.height) return;
    const data = ctx.getImageData(pos.x, pos.y, 1, 1).data;
    const color = { r: data[0], g: data[1], b: data[2], a: data[3] };
    if (event.button === 2) {
      state.setBGColor(color);
    } else {
      state.setFGColor(color);
    }
  }

  onPointerMove() {}
  onPointerUp() {}
}
