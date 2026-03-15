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
| 2 | NOT STARTED | Drawing tools expansion (line, rect, ellipse, fill, selections, move, pixel-perfect) |
| 3 | NOT STARTED | Color system (HSV wheel, palette presets, shading ink, FG/BG swap) |
| 4 | NOT STARTED | Layers (multi-layer, opacity, blend modes, drag reorder) |
| 5 | NOT STARTED | File I/O & undo/redo (PNG/GIF export, project save/load, history) |
| 6 | NOT STARTED | Animation & timeline (frames, onion skinning, playback, frame tags) |
| 7 | NOT STARTED | Advanced features (symmetry, tiled mode, canvas resize, custom brushes) |

See `PLAN.md` for full implementation details per stage.

## Key Files
- `index.html` — entry point
- `src/app.js` — bootstrap, wires all modules together
- `src/core/EventBus.js` — pub/sub event system
- `src/core/State.js` — central application state
- `src/canvas/CanvasRenderer.js` — composites layers onto display canvas
- `src/canvas/CanvasInput.js` — pointer/keyboard event handling
- `src/tools/Tool.js` — base tool class
