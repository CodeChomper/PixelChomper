/**
 * Snapshot-based undo/redo history.
 * Each entry: { layerIndex, frameIndex, imageData, selectionMask }
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
   * Capture the current state of a cel before a modification.
   * Clears the redo stack (new action invalidates redo history).
   */
  push(layerIndex, frameIndex, imageData, selectionMask) {
    this._undoStack.push({
      layerIndex,
      frameIndex,
      imageData,
      selectionMask: selectionMask ? selectionMask.slice() : null,
    });
    if (this._undoStack.length > this._maxDepth) this._undoStack.shift();
    this._redoStack = [];
  }

  /**
   * Undo: pop last snapshot, push current state onto redo stack.
   * @returns {{ layerIndex, frameIndex, imageData, selectionMask }|null}
   */
  undo(currentLayerIndex, currentFrameIndex, currentImageData, currentSelectionMask) {
    if (!this._undoStack.length) return null;
    const snapshot = this._undoStack.pop();
    this._redoStack.push({
      layerIndex: currentLayerIndex,
      frameIndex: currentFrameIndex,
      imageData: currentImageData,
      selectionMask: currentSelectionMask ? currentSelectionMask.slice() : null,
    });
    return snapshot;
  }

  /**
   * Redo: pop from redo stack, push current state onto undo stack.
   * @returns {{ layerIndex, frameIndex, imageData, selectionMask }|null}
   */
  redo(currentLayerIndex, currentFrameIndex, currentImageData, currentSelectionMask) {
    if (!this._redoStack.length) return null;
    const snapshot = this._redoStack.pop();
    this._undoStack.push({
      layerIndex: currentLayerIndex,
      frameIndex: currentFrameIndex,
      imageData: currentImageData,
      selectionMask: currentSelectionMask ? currentSelectionMask.slice() : null,
    });
    return snapshot;
  }

  canUndo() { return this._undoStack.length > 0; }
  canRedo() { return this._redoStack.length > 0; }

  clear() {
    this._undoStack = [];
    this._redoStack = [];
  }
}
