import { Tool } from './Tool.js';
import { floodFill } from '../canvas/PixelUtils.js';

export class FillTool extends Tool {
  constructor() {
    super('fill', 'Fill', '◉');
  }

  onPointerDown(pos, event, state) {
    const cel = state.activeCel;
    if (!cel) return;
    if (pos.x < 0 || pos.x >= state.sprite.width || pos.y < 0 || pos.y >= state.sprite.height) return;
    const color = event.button === 2 ? state.bgColor : state.fgColor;
    state.pushRecentColor(color);
    const pts = floodFill(cel, pos.x, pos.y, state.fillTolerance, state.fillContiguous);
    const pixels = pts.map(p => ({ x: p.x, y: p.y, color }));
    state.commitPixels(pixels);
  }

  onPointerMove() {}
  onPointerUp() {}
}
