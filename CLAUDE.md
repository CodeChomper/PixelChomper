# PixelChomper — Claude Code Context

## Project Overview
Web-based pixel art editor inspired by Aseprite. Built with vanilla HTML, CSS, and JavaScript (no frameworks, no npm, no build tools). Uses ES modules and HTML5 Canvas API.

## How to Run
```bash
cd PixelChomper && python3 -m http.server 8080
```
Then open `http://localhost:8080`

## Architecture
- **EventBus** pub/sub for decoupled communication between modules
- **State** is the single source of truth for app state
- **One offscreen canvas per cel** (layer x frame intersection) for compositing
- **Tools** are stateless processors that receive pointer events and modify pixel data
- **ES modules** loaded via `<script type="module">` — all imports use relative paths with `.js` extensions

## Stage Progress

| Stage | Status | Description |
|-------|--------|-------------|
| 1 | COMPLETE | Project foundation & basic drawing (pencil, eraser, zoom, pan, UI shell) |
| 2 | COMPLETE | Drawing tools expansion (line, rect, ellipse, fill, selections, move, pixel-perfect) |
| 2.1 | COMPLETE | Help dialog (keyboard shortcuts reference, F1 / Help menu) |
| 3 | COMPLETE | Color system (HSV wheel, palette presets, shading ink, recent colors) |
| 4 | COMPLETE | Layers (multi-layer, opacity, blend modes, drag reorder) |
| 5 | COMPLETE | File I/O & undo/redo (PNG/GIF export, project save/load, history) Animated GIF Export Not Working |
| 6 | COMPLETE | Animation & timeline (frames, onion skinning, playback, frame tags) |
| 7 | COMPLETE | Advanced features (symmetry, tiled mode, canvas resize, custom brushes, contour, replace color, layer groups, linked cels, shortcut editor, preferences, context menus, panel resizing, touch support) |
| 8 | COMPLETE | Virtual Gallery (PocketBase upload, Share to Gallery dialog, gallery.html standalone page, lightbox, pagination) |
| 9 | COMPLETE | Rating System (thumbs up/down via pc_ratings collection, sort by Newest/Hottest/Undiscovered, anonymous voter identity via localStorage) |

See `PLAN.md` for full implementation details per stage.

## Key Patterns
- Tools call `state.commitPixels(pixels)` to write pixels to the **active cel** — this filters by selection, respects layer lock, and emits `'sprite:modified'`
- `state.activeLayer` returns the current layer **metadata** (name, visible, opacity, blend mode); `state.activeCel` returns the pixel-data canvas for the active layer×frame intersection
- Sprite has `layers[]` (metadata), `frames[]`, and `cels[layerIndex][frameIndex]` (pixel data); CanvasRenderer composites `cels[li][activeFrameIndex]` for each visible layer
- `state.activeLayerIndex` and `state.activeFrameIndex` track the active cel
- `state.selection` is a `Uint8Array` bitmask (width×height), `null` = no selection
- `state.previewPixels` is a `[{x,y,color}]` array rendered as an overlay during shape dragging
- Tool keyboard shortcuts use `KEY_BINDINGS` in `src/core/Constants.js` (supports `shift+key` prefix)
- Menu dropdowns align to their triggering button via `.menu-wrapper { position: relative }` + `.menu-dropdown { left: 0; top: 100% }`

## Key Files
- `index.html` — entry point
- `src/app.js` — bootstrap, wires all modules together
- `src/core/EventBus.js` — pub/sub event system
- `src/core/State.js` — central application state; `commitPixels()` is the single write choke point
- `src/canvas/CanvasRenderer.js` — composites layers onto display canvas
- `src/canvas/CanvasInput.js` — pointer/keyboard event handling
- `src/canvas/PixelUtils.js` — Bresenham, ellipse, flood fill, polygon, bezier, pixel-perfect
- `src/tools/Tool.js` — base tool class
- `src/ui/MenuBar.js` — top menu bar with dropdowns
- `src/ui/HelpDialog.js` — read-only keyboard shortcuts reference modal (F1)
- `src/ui/ColorPicker.js` — HSV wheel + SV square + alpha slider canvas widget
- `src/core/ColorUtils.js` — pure color math: RGB↔HSV↔HSL, hex conversion
- `src/model/Palette.js` — palette data model, JSON load/save
- `src/model/Cel.js` — cel data: offscreen canvas + pixel ops (getPixel, setPixel, setPixels)
- `src/model/Frame.js` — frame data: index, duration (ms)
- `src/model/Layer.js` — layer metadata: name, visibility, opacity, blend mode, lock (no canvas)
- `src/model/Sprite.js` — sprite: `layers[]`, `frames[]`, `cels[layerIndex][frameIndex]`, add/remove/merge/flatten/composite
- `src/ui/Timeline.js` — bottom animation timeline: layer×frame grid, playback controls, onion skin toggle
- `src/ui/LayerPanel.js` — layer list with visibility, opacity, blend mode, reorder, add/remove
- `assets/palettes/` — pico-8.json, endesga-32.json, game-boy.json
- `src/tools/` — 14 tools: pencil, eraser, line, rect, ellipse, fill, eyedropper, spray, curve, polygon, select_rect, select_lasso, magic_wand, move
