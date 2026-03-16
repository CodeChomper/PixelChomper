/**
 * Snapshot-based undo/redo history.
 * Each entry: { layerIndex, imageData, selectionMask }
 *
 * Push a snapshot BEFORE a modification. Undo restores the snapshot
 * and saves the current state to the redo stack.
 */
export class History {
  constructor(maxDepth = 50) {
    this._maxDepth = maxDepth;
    this._undoStack = [];
    this._redoStack = [];
  }

  /**
   * Capture the current state of a layer before a modification.
   * Clears the redo stack (new action invalidates redo history).
   * @param {number} layerIndex
   * @param {ImageData} imageData - clone of the layer's pixels before change
   * @param {Uint8Array|null} selectionMask
   */
  push(layerIndex, imageData, selectionMask) {
    this._undoStack.push({
      layerIndex,
      imageData,
      selectionMask: selectionMask ? selectionMask.slice() : null,
    });
    if (this._undoStack.length > this._maxDepth) this._undoStack.shift();
    this._redoStack = [];
  }

  /**
   * Undo: pop last snapshot, push current state onto redo stack.
   * @param {number} currentLayerIndex
   * @param {ImageData} currentImageData
   * @param {Uint8Array|null} currentSelectionMask
   * @returns {{ layerIndex, imageData, selectionMask }|null}
   */
  undo(currentLayerIndex, currentImageData, currentSelectionMask) {
    if (!this._undoStack.length) return null;
    const snapshot = this._undoStack.pop();
    this._redoStack.push({
      layerIndex: currentLayerIndex,
      imageData: currentImageData,
      selectionMask: currentSelectionMask ? currentSelectionMask.slice() : null,
    });
    return snapshot;
  }

  /**
   * Redo: pop from redo stack, push current state onto undo stack.
   */
  redo(currentLayerIndex, currentImageData, currentSelectionMask) {
    if (!this._redoStack.length) return null;
    const snapshot = this._redoStack.pop();
    this._undoStack.push({
      layerIndex: currentLayerIndex,
      imageData: currentImageData,
      selectionMask: currentSelectionMask ? currentSelectionMask.slice() : null,
    });
    return snapshot;
  }

  canUndo() { return this._undoStack.length > 0; }
  canRedo() { return this._redoStack.length > 0; }

  /** Clear all history (e.g. when a new sprite is loaded). */
  clear() {
    this._undoStack = [];
    this._redoStack = [];
  }
}
