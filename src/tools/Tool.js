/**
 * Base class for all drawing tools.
 * Subclasses override onPointerDown/Move/Up to implement behavior.
 */
export class Tool {
  constructor(id, label, icon) {
    this.id = id;
    this.label = label;
    this.icon = icon;  // Single character or short string for toolbar
  }

  /** Called when the user presses the pointer on the canvas. */
  onPointerDown(pos, event, state) {}

  /** Called when the user moves the pointer while drawing. */
  onPointerMove(pos, event, state) {}

  /** Called when the user releases the pointer. */
  onPointerUp(pos, event, state) {}

  /** Returns the CSS cursor for this tool. */
  getCursor() {
    return 'crosshair';
  }
}
