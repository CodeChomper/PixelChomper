import { Tool } from './Tool.js';
import { magicWandSelect } from '../canvas/PixelUtils.js';

export class MagicWandTool extends Tool {
  constructor() {
    super('magic_wand', 'Magic Wand', '✦');
  }

  onPointerDown(pos, event, state) {
    const cel = state.activeCel;
    if (!cel) return;
    if (pos.x < 0 || pos.x >= state.sprite.width || pos.y < 0 || pos.y >= state.sprite.height) return;
    const mask = magicWandSelect(cel, pos.x, pos.y, state.fillTolerance, state.fillContiguous);
    state.setSelection(mask);
  }

  onPointerMove() {}
  onPointerUp() {}
}
