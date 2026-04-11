# PixelChomper — Web-Based Pixel Art Tool Implementation Plan

## Context

We're building **PixelChomper**, a web-based pixel art editor inspired by [Aseprite](https://www.aseprite.org/). The goal is a fully-featured pixel art and animation tool running entirely in the browser using vanilla HTML, CSS, and JavaScript — no frameworks, no npm, no build tools. The project is built in stages, each producing a working application.

---

## Project File Structure

```
PixelChomper/
├── index.html                  # Entry point, loads app shell
├── style.css                   # Global styles + CSS custom properties
├── .gitignore
├── assets/
│   └── palettes/               # JSON palette presets (e.g., aseprite-default.json)
├── src/
│   ├── app.js                  # App bootstrap, wires everything together
│   ├── core/
│   │   ├── EventBus.js         # Pub/sub event system for decoupled communication
│   │   ├── State.js            # Central application state (sprite, active tool, colors, etc.)
│   │   ├── History.js          # Undo/redo stack (snapshot-based)
│   │   └── Constants.js        # Shared enums, defaults, key mappings
│   ├── model/
│   │   ├── Sprite.js           # Sprite data: dimensions, layers, frames, cels
│   │   ├── Layer.js            # Layer: name, visibility, opacity, blend mode, image data
│   │   ├── Frame.js            # Frame: duration, index
│   │   ├── Cel.js              # Cel: links a layer+frame to pixel data (ImageData)
│   │   └── Palette.js          # Palette: array of colors + active index
│   ├── tools/
│   │   ├── Tool.js             # Base tool class (onPointerDown/Move/Up interface)
│   │   ├── PencilTool.js       # Freehand drawing with Bresenham line interpolation
│   │   ├── EraserTool.js       # Erase to transparent (or BG color on background layer)
│   │   ├── LineTool.js         # Line preview + commit
│   │   ├── RectTool.js         # Rectangle (filled/outline)
│   │   ├── EllipseTool.js      # Ellipse (filled/outline) using midpoint algorithm
│   │   ├── FillTool.js         # Flood fill (4-connected, tolerance)
│   │   ├── EyedropperTool.js   # Color picker from canvas
│   │   ├── SelectRectTool.js   # Rectangular marquee selection
│   │   ├── SelectLassoTool.js  # Freehand lasso selection
│   │   ├── MagicWandTool.js    # Color-based flood selection
│   │   ├── MoveTool.js         # Move selection or layer contents
│   │   ├── PanTool.js          # Hand/pan tool for scrolling viewport
│   │   ├── ZoomTool.js         # Click-to-zoom
│   │   ├── SprayTool.js        # Random spray within radius
│   │   ├── CurveTool.js        # Bezier curve (click control points)
│   │   └── PolygonTool.js      # Multi-click polygon
│   ├── canvas/
│   │   ├── CanvasRenderer.js   # Composites all layers → display canvas, handles zoom/pan
│   │   ├── CanvasInput.js      # Mouse/touch/keyboard event handling → tool dispatch
│   │   ├── Grid.js             # Pixel grid + custom grid overlay rendering
│   │   └── PixelUtils.js       # Bresenham line, ellipse, flood fill, pixel-perfect algorithms
│   ├── ui/
│   │   ├── MenuBar.js          # Top menu bar (File, Edit, View, Layer, Frame, Help)
│   │   ├── Toolbar.js          # Left-side vertical tool palette
│   │   ├── ToolOptions.js      # Context toolbar below menu (brush size, shape, mode)
│   │   ├── ColorPanel.js       # Right-side: FG/BG swatch, color picker, palette grid
│   │   ├── ColorPicker.js      # HSV wheel / sliders / hex input
│   │   ├── LayerPanel.js       # Layer list with visibility, opacity, reorder
│   │   ├── Timeline.js         # Bottom timeline (layers × frames grid)
│   │   ├── StatusBar.js        # Bottom bar: cursor pos, canvas size, zoom %, tool info
│   │   ├── Dialog.js           # Reusable modal dialog (new sprite, resize, export)
│   │   └── DragDrop.js         # Drag-and-drop utility for layer/frame reorder
│   └── io/
│       ├── ExportPNG.js        # Single frame → PNG via canvas.toBlob
│       ├── ExportGIF.js        # Animated GIF export
│       ├── ExportSpriteSheet.js# Sprite sheet PNG + JSON metadata
│       ├── ImportSpriteSheet.js# Import sprite sheet → frames
│       └── ProjectFile.js      # Save/load .pixelchomper JSON project files
```

---

## Stage 1: Project Foundation & Basic Drawing

**Goal**: Bootable app with canvas, pencil tool, eraser, and a working UI shell.

### Features
- `index.html` app shell with Aseprite-inspired dark theme layout (menu bar, toolbar, canvas area, status bar)
- `style.css` with CSS custom properties for the dark pixel-art theme
- `.gitignore` for common ignores
- **EventBus** — simple pub/sub (`on`, `off`, `emit`) for decoupled module communication
- **State** — holds active tool, FG/BG color, brush size, zoom, sprite reference
- **Sprite model** (single layer, single frame for now) — wraps an offscreen `<canvas>` + `ImageData`
- **CanvasRenderer** — displays the sprite canvas with zoom (nearest-neighbor via `imageSmoothingEnabled = false`), pan (translate), checkerboard transparency pattern
- **CanvasInput** — converts pointer events to canvas-space coordinates, dispatches to active tool
- **Tool base class** with `onPointerDown`, `onPointerMove`, `onPointerUp`, `onKeyDown` interface
- **PencilTool** — draw pixels with Bresenham line interpolation between mouse samples, configurable brush size (1-64px, square/circle)
- **EraserTool** — same as pencil but writes transparent (RGBA 0,0,0,0)
- **Toolbar** — vertical icon strip on the left; pencil + eraser selectable, keyboard shortcuts (B, E)
- **ToolOptions** — brush size slider + shape toggle displayed below menu bar
- **StatusBar** — shows cursor position (x,y), canvas dimensions, zoom level
- **Keyboard shortcuts**: B (pencil), E (eraser), Space+drag (pan), Ctrl+scroll (zoom), +/- (zoom)
- **New Sprite dialog** — on first load, prompt for canvas width, height, background color

### Files Created
- `index.html`, `style.css`, `.gitignore`
- `src/app.js`, `src/core/EventBus.js`, `src/core/State.js`, `src/core/Constants.js`
- `src/model/Sprite.js`
- `src/canvas/CanvasRenderer.js`, `src/canvas/CanvasInput.js`, `src/canvas/PixelUtils.js`
- `src/tools/Tool.js`, `src/tools/PencilTool.js`, `src/tools/EraserTool.js`
- `src/ui/Toolbar.js`, `src/ui/ToolOptions.js`, `src/ui/StatusBar.js`, `src/ui/MenuBar.js`, `src/ui/Dialog.js`

### Architecture Notes
- Use ES modules (`type="module"` on script tag). Serve via `python3 -m http.server` or VS Code Live Server.
- CanvasRenderer uses a main display `<canvas>` in the DOM. The sprite's pixel data lives in an offscreen canvas. Renderer draws: checkerboard → sprite (scaled) → grid → tool preview.
- All tools operate on the sprite's offscreen canvas context, then trigger a re-render.

### Verification
- Open in browser → new sprite dialog appears → set 32×32 → canvas renders with checkerboard
- Select pencil → draw pixels → they appear correctly at all zoom levels
- Switch to eraser → erase pixels → transparency shows through
- Pan with space+drag, zoom with scroll wheel
- Status bar updates cursor position in real-time

---

## Stage 2: Drawing Tools Expansion

**Goal**: Full shape and selection tool suite.

### Features
- **LineTool** (L) — click+drag to preview line, release to commit. Uses Bresenham.
- **RectTool** (U) — click+drag rectangle, toggle filled/outline in ToolOptions
- **EllipseTool** (Shift+U) — midpoint ellipse algorithm, filled/outline toggle
- **FillTool** (G) — 4-connected flood fill with configurable tolerance, contiguous toggle
- **EyedropperTool** (I) — click to sample color → set as FG. Alt+click anywhere as shortcut.
- **SprayTool** (Shift+B) — random pixels within brush radius at configurable density
- **CurveTool** (Shift+L) — cubic Bezier: click start, click end, click 2 control points
- **PolygonTool** (Shift+D) — click to add vertices, double-click/Enter to close and fill/stroke
- **SelectRectTool** (M) — rectangular marching-ants selection. Selection stored as a bitmask on State.
- **SelectLassoTool** (Q) — freehand lasso selection
- **MagicWandTool** (W) — flood-select by color similarity
- **MoveTool** (V) — move selection contents (or entire layer if no selection)
- **Selection operations**: Select All (Ctrl+A), Deselect (Ctrl+D), Invert Selection (Ctrl+Shift+I), Cut/Copy/Paste (Ctrl+X/C/V)
- **Pixel Perfect mode** toggle — removes L-shaped corners in freehand strokes
- **Grid overlay** — togglable pixel grid (View menu), custom grid spacing

### Files Created / Modified
- `src/tools/LineTool.js`, `src/tools/RectTool.js`, `src/tools/EllipseTool.js`
- `src/tools/FillTool.js`, `src/tools/EyedropperTool.js`, `src/tools/SprayTool.js`
- `src/tools/CurveTool.js`, `src/tools/PolygonTool.js`
- `src/tools/SelectRectTool.js`, `src/tools/SelectLassoTool.js`, `src/tools/MagicWandTool.js`
- `src/tools/MoveTool.js`, `src/tools/PanTool.js`, `src/tools/ZoomTool.js`
- `src/canvas/Grid.js`
- Modify: `src/canvas/PixelUtils.js` (add ellipse, flood fill, pixel-perfect algorithms)
- Modify: `src/ui/Toolbar.js` (add all tool icons), `src/ui/ToolOptions.js` (per-tool options)
- Modify: `src/core/State.js` (selection mask, clipboard)
- Modify: `src/canvas/CanvasRenderer.js` (render selection marching ants, tool preview overlays)

### Architecture Notes
- Shape tools use a preview overlay: while dragging, render the shape on a temporary overlay canvas without modifying sprite data. On release, commit to sprite.
- Selection stored as a `Uint8Array` bitmask matching sprite dimensions. Tools respect the selection mask when drawing (only modify selected pixels).
- Marching ants rendered as an animated dashed-line overlay on CanvasRenderer.

### Verification
- Each tool draws correctly at various zoom levels
- Line/rect/ellipse show live preview while dragging
- Fill tool respects contiguous setting and tolerance
- Selection tools create visible marching-ant borders
- Move tool moves selected pixels, leaving transparency behind
- Copy/paste works within the app
- Pixel perfect mode produces clean 1px strokes

---

## Stage 3: Color System

**Goal**: Full color management — palette, picker, FG/BG, shading.

### Features
- **FG/BG color swatches** — large clickable swatches, swap with X key
- **Color Picker** — HSV color wheel (rendered on a canvas), value/saturation square, RGBA sliders, hex input field
- **Palette panel** — grid of color swatches (default: 256-color palette). Click to set FG, right-click to set BG. Editable: double-click a swatch to open picker.
- **Preset palettes** — load from JSON files in `assets/palettes/` (e.g., `aseprite-default.json`, `pico-8.json`, `endesga-32.json`, `game-boy.json`)
- **Add/remove palette colors** — +/- buttons, drag to reorder
- **Color harmonies** — complementary, triadic, analogous highlight markers on the wheel
- **Recent colors** — auto-populated strip of recently used colors
- **Shading ink mode** — when enabled, pencil shifts existing pixel colors lighter (left-click) or darker (right-click) rather than replacing
- **Alpha channel** — opacity slider on the color picker, tools respect alpha

### Files Created / Modified
- `src/ui/ColorPanel.js` — FG/BG swatches, palette grid, recent colors, palette selector dropdown
- `src/ui/ColorPicker.js` — HSV wheel canvas, sliders, hex input, harmony indicators
- `src/model/Palette.js` — palette data structure, serialization, preset loading
- `assets/palettes/aseprite-default.json`, `assets/palettes/pico-8.json`, `assets/palettes/endesga-32.json`, `assets/palettes/game-boy.json`
- Modify: `src/core/State.js` (FG/BG color, active palette, shading mode)
- Modify: `src/tools/PencilTool.js` (support shading ink mode)
- Modify: `src/tools/EyedropperTool.js` (update FG/BG correctly)
- Modify: `style.css` (color panel layout)

### Architecture Notes
- Color wheel rendered via canvas: draw HSV wheel using `arc()` fills, saturation/value square as a gradient overlay. Picking converts click coordinates to HSV, then to RGBA.
- Palette stored in `Palette` model as an array of `{r, g, b, a}` objects. Serialized to/from JSON.
- Shading ink: on draw, reads existing pixel color, shifts lightness ±10% in HSL space, writes back.

### Verification
- Color picker wheel allows selecting any hue; SV square selects saturation/value
- Hex input updates swatch and vice versa
- Palette swatches respond to left-click (FG) and right-click (BG)
- X key swaps FG/BG
- Loading a preset palette replaces the grid
- Shading ink mode visibly lightens/darkens existing pixels
- Alpha slider makes semi-transparent drawing work

---

## Stage 4: Layers

**Goal**: Multi-layer support with compositing, opacity, blend modes.

### Features
- **Layer model** — each layer owns an offscreen `<canvas>` matching sprite dimensions
- **Layer panel (right side below palette)** — list of layers showing: name, visibility eye icon, lock icon, opacity slider, blend mode dropdown
- **Add/delete layer** — buttons at bottom of panel. New layers are transparent.
- **Background layer** — special opaque layer (white/colored), always at bottom. Cannot be transparent.
- **Layer reordering** — drag-and-drop in the layer panel
- **Layer visibility** — eye icon toggles; hidden layers don't composite
- **Layer opacity** — 0-100% slider, applied during compositing via `globalAlpha`
- **Blend modes** — Normal, Multiply, Screen, Overlay, Darken, Lighten (use Canvas `globalCompositeOperation`)
- **Active layer indicator** — highlighted in panel; all drawing tools operate on active layer
- **Merge down** — merge active layer into the one below
- **Flatten** — merge all visible layers into one
- **Duplicate layer**

### Files Created / Modified
- `src/model/Layer.js` — layer data: name, visible, locked, opacity, blendMode, offscreen canvas
- `src/model/Cel.js` — (simple for now) wraps layer+frame pixel data. In this stage, 1 frame only, so Cel ≈ Layer's canvas.
- `src/ui/LayerPanel.js` — layer list UI, drag-and-drop reorder, visibility/lock toggles, opacity slider, blend mode select
- `src/ui/DragDrop.js` — generic drag-and-drop reorder utility
- Modify: `src/model/Sprite.js` — now holds an array of Layers instead of a single canvas
- Modify: `src/canvas/CanvasRenderer.js` — composite layers bottom-to-top with opacity + blend modes
- Modify: `src/core/State.js` (activeLayerIndex)
- Modify: All tools — draw to `state.activeLayer.canvas.getContext('2d')` instead of sprite directly
- Modify: `src/tools/MoveTool.js` — can move layer contents
- Modify: `src/tools/EyedropperTool.js` — sample from composited result, not single layer

### Architecture Notes
- Each Layer has its own offscreen `<canvas>`. CanvasRenderer composites them onto the display canvas in order: clear display → for each visible layer (bottom to top): set `globalAlpha` to layer opacity, set `globalCompositeOperation` to blend mode, `drawImage(layer.canvas, 0, 0)`.
- Tools always draw on `state.sprite.layers[state.activeLayerIndex].canvas`.
- Eyedropper samples from the final composited output (the display canvas before UI overlays).

### Verification
- Can add multiple layers, draw on each independently
- Toggling visibility hides/shows layer content
- Opacity slider makes layer semi-transparent in composite
- Blend modes produce correct visual effects (e.g., Multiply darkens)
- Drag-reorder changes composite order visually
- Merge down combines two layers correctly
- Drawing respects active layer — other layers unaffected

---

## Stage 5: File I/O & Undo/Redo History

**Goal**: Save/load projects, export images, full undo/redo.

### Features
- **Undo/Redo** (Ctrl+Z / Ctrl+Shift+Z) — snapshot-based history. Before each tool stroke, snapshot affected layer's ImageData. Undo restores it. Configurable max history depth (default 50).
- **Export PNG** — current frame, all visible layers composited → PNG download via `canvas.toBlob()`
- **Export GIF** — animated GIF from all frames
- **Export Sprite Sheet** — all frames laid out in a grid → single PNG + JSON metadata file (frame positions, dimensions, tags)
- **Import Sprite Sheet** — load a PNG + specify frame dimensions → split into frames
- **Save Project** (.pixelchomper) — serialize full state to JSON: sprite dimensions, layers (pixel data as base64-encoded PNGs), frames, palette, tags. Download as `.pixelchomper` file.
- **Load Project** — file input, parse JSON, restore full state
- **Menu bar integration** — File menu: New, Open Project, Save Project, Export PNG, Export GIF, Export Sprite Sheet, Import Sprite Sheet. Edit menu: Undo, Redo.

### Files Created / Modified
- `src/core/History.js` — undo/redo stack. Methods: `pushSnapshot(layerIndex, imageData)`, `undo()`, `redo()`. Each entry stores `{layerIndex, imageData, selectionMask}`.
- `src/io/ExportPNG.js` — composite visible layers → PNG blob → download
- `src/io/ExportGIF.js` — iterate frames, composite each, encode as GIF.
- `src/io/ExportSpriteSheet.js` — arrange frames in grid, export PNG + JSON
- `src/io/ImportSpriteSheet.js` — load image, slice into frames by grid dimensions
- `src/io/ProjectFile.js` — serialize/deserialize project state. Layer pixel data stored as base64 data URLs from `canvas.toDataURL('image/png')`.
- Modify: `src/ui/MenuBar.js` — add File/Edit menu items with handlers
- Modify: `src/core/State.js` — integrate History
- Modify: All tools — call `history.pushSnapshot()` in `onPointerDown` before modifying pixels
- Modify: `src/ui/Dialog.js` — add export/import dialogs

### Architecture Notes
- History uses a simple snapshot approach: before a tool stroke begins, clone the affected layer's `ImageData` (via `getImageData`). On undo, `putImageData` restores it. This is memory-heavy but simple and reliable for small pixel-art canvases (64×64 @ 4 bytes/pixel = 16KB per snapshot).
- For GIF export, we need LZW compression.
- Project files are JSON with embedded base64 PNG data for each cel. Reasonable size for pixel art.

### Verification
- Draw something → Ctrl+Z undoes stroke → Ctrl+Shift+Z redoes it
- Undo works across layer switches
- File > Export PNG downloads a correct PNG of the composited canvas
- File > Save Project downloads a .pixelchomper file; File > Open Project restores it perfectly
- Export/import sprite sheet round-trips correctly

---

## Stage 6: Animation & Timeline

**Goal**: Full frame-based animation with timeline UI, onion skinning, playback.

### Features
- **Frame model** — sprite now has multiple frames. Each frame has a duration (ms) and a set of cels (one per layer).
- **Cel model** — intersection of layer × frame. Each cel has its own offscreen canvas. Cels can be "linked" (share pixel data with another cel for efficiency).
- **Timeline UI (bottom panel)** — collapsible panel. Grid layout: rows = layers, columns = frames. Each cell shows a thumbnail. Click to select active cel. Current frame and active layer highlighted.
- **Frame operations** — Add frame (Alt+N), delete frame, duplicate frame, reorder frames (drag columns). Context menu on frame header.
- **Layer operations in timeline** — same layer panel features, but shown as row headers in timeline
- **Playback controls** — Play/Pause button, loop mode (forward, reverse, ping-pong), FPS/speed slider. Preview plays in the canvas area.
- **Onion skinning** — toggle on/off. Shows previous N and next N frames as semi-transparent overlays (previous = red tint, next = blue tint). Configurable count and opacity.
- **Frame tags** — named colored ranges on the timeline (e.g., "idle", "walk", "attack"). Right-click frame header to create/edit tags.
- **Frame duration** — right-click a frame to set its duration in ms (default 100ms)
- **Navigation** — Left/Right arrow keys to move between frames, Home/End for first/last frame

### Files Created / Modified
- `src/model/Frame.js` — frame data: index, duration
- `src/model/Cel.js` — expanded: owns offscreen canvas, supports linked cels (shared canvas reference)
- Modify: `src/model/Sprite.js` — 2D array of cels [layer][frame], frame list, tag list
- Modify: `src/model/Layer.js` — layers now conceptual (name, visibility, etc.) — pixel data lives in Cels
- `src/ui/Timeline.js` — timeline grid UI: layer rows, frame columns, cel thumbnails, drag-and-drop, tag bars, playback controls, onion skin toggle
- Modify: `src/canvas/CanvasRenderer.js` — render active frame's cels; add onion skinning overlay
- Modify: `src/core/State.js` — activeFrameIndex, playback state, onion skin settings
- Modify: `src/core/History.js` — snapshots now reference cel (layer+frame pair)
- Modify: `src/io/ProjectFile.js` — serialize all frames and cels
- Modify: `src/io/ExportGIF.js` — iterate all frames with correct durations
- Modify: `src/io/ExportSpriteSheet.js` — include all frames
- Modify: `src/ui/MenuBar.js` — Frame menu items
- Modify: `src/ui/StatusBar.js` — show current frame number

### Architecture Notes
- The Sprite model becomes a 2D grid: `sprite.cels[layerIndex][frameIndex]`. Each cel owns an offscreen canvas.
- Rendering the current frame: iterate layers bottom-to-top, draw `sprite.cels[layerIdx][activeFrame].canvas` with layer opacity/blend.
- Playback: `setInterval` / `requestAnimationFrame` loop that advances the active frame based on each frame's duration. Updates canvas render each frame.
- Onion skinning: after rendering current frame, composite previous/next frames with reduced opacity and a color tint (multiply a red/blue overlay).
- Linked cels: two cels share the same canvas object. Editing one edits both. Useful for static background across frames.
- Timeline thumbnails: small canvas elements (e.g., 24×24) that redraw when a cel is modified.

### Verification
- Can add multiple frames, draw different content on each
- Timeline shows frames as columns, layers as rows
- Clicking a cel in timeline switches to it; canvas updates
- Play button animates through frames at correct speed
- Ping-pong and reverse loop modes work
- Onion skinning shows adjacent frames with colored tint
- Frame tags appear as colored bars above the timeline
- Export GIF produces correct animation with per-frame durations
- Project save/load preserves all frames and animation data

---

## Stage 7: Advanced Features & Polish

**Goal**: Power-user features, polish, and remaining Aseprite-inspired capabilities.

### Features
- **Symmetry tool** — horizontal and/or vertical axis. When drawing, automatically mirror strokes. Toggle from View menu. Axis shown as a dashed line.
- **Tiled mode** — canvas wraps: drawing near edges continues on opposite side. View shows 3×3 tiled preview.
- **Canvas resize / crop** — dialog to change canvas dimensions with anchor point (top-left, center, etc.). Crop to selection.
- **Custom brushes** — select a region → "define as brush". Use that pattern instead of square/circle.
- **Contour tool** (D) — draw outline of filled region
- **Replace color** — Eraser variant: replace FG color with BG color on the canvas
- **Linked cels UI** — visual indicator for linked cels in timeline, link/unlink commands
- **Keyboard shortcut customization** — modal showing all shortcuts, editable, saved to localStorage
- **Preferences** — grid color, checker size, theme tweaks, auto-save toggle, stored in localStorage
- **Right-click context menus** — on canvas, on layers, on timeline cels
- **Responsive layout** — panels resizable by dragging borders
- **Touch support** — basic touch drawing for tablets (pointer events already used, just ensure touch works)

### Files Created / Modified
- Modify: `src/canvas/CanvasRenderer.js` — symmetry axis rendering, tiled mode
- Modify: `src/canvas/CanvasInput.js` — symmetry mirroring dispatch, tiled coordinate wrapping
- Modify: `src/tools/PencilTool.js` (and other tools) — symmetry support
- Modify: `src/ui/Dialog.js` — resize canvas dialog, preferences dialog, shortcut editor
- Modify: `src/core/State.js` — preferences, key bindings
- Modify: `src/core/Constants.js` — default keybinding map
- New: `src/ui/ContextMenu.js` — reusable right-click context menu

### Verification
- Symmetry draws mirrored strokes correctly at all zoom levels
- Tiled mode wraps drawing and shows tiled preview
- Canvas resize preserves existing pixel data at correct anchor
- Custom brush paints with the defined pattern
- Preferences persist across browser sessions via localStorage

---

## Stage 8: Virtual Gallery

**Goal**: Let users share their pixel art (PNG or animated GIF) to a community gallery powered by PocketBase, browsable via a standalone `gallery.html` page.

### PocketBase Setup (manual — before coding)

Create a collection named `pc_gallery` in the PocketBase admin UI:

| Field | Type | Notes |
|-------|------|-------|
| `title` | text | required |
| `artist` | text | optional |
| `image` | file | required, single file |
| `width` | number | sprite width in pixels |
| `height` | number | sprite height in pixels |
| `frame_count` | number | number of frames |
| `format` | text | `'png'` or `'gif'` |

Set API rules: public `create`, public `list`/`view`. No auth required.

### Features
- **Share to Gallery** — File menu item opens a dialog (title + artist name), then uploads to PocketBase
- **Auto format** — single-frame sprites upload as PNG; multi-frame upload as animated GIF (reuses existing `ExportGIF` encoder)
- **Gallery page** (`gallery.html`) — standalone page: responsive CSS grid of pixel art cards, crisp `image-rendering: pixelated`, animated GIFs play automatically, lightbox on click, "Load more" pagination

### Files Created / Modified
- New: `src/core/Config.js` — `POCKETBASE_URL` and `GALLERY_COLLECTION` constants (user fills in URL)
- New: `src/io/ShareGallery.js` — upload logic using `fetch` + `FormData` to PocketBase REST API
- New: `gallery.html` — standalone gallery page with inline styles
- New: `src/gallery.js` — gallery page JS: fetches records, renders grid, handles lightbox
- Modify: `src/io/ExportGIF.js` — add `static toBlob(sprite)` method (refactored out of `download()`) so the GIF encoder can be reused without triggering a download
- Modify: `src/ui/MenuBar.js` — add `{ label: 'Share to Gallery...', action: 'file:share-gallery' }` to File menu
- Modify: `src/app.js` — wire `file:share-gallery` event; add `_shareToGallery()` method; import `ShareGallery`

### Share Flow
1. File → Share to Gallery...
2. Dialog: Title (required) + Artist name (optional) → Share
3. `ShareGallery.upload()` detects frame count → PNG blob or GIF blob
4. POST FormData to `{POCKETBASE_URL}/api/collections/gallery/records`
5. Success dialog; record visible in PocketBase admin

### Gallery Page
- Fetches `GET /api/collections/gallery/records?sort=-created&perPage=50`
- File URL pattern: `{POCKETBASE_URL}/api/files/{collectionId}/{recordId}/{filename}`
- Cards show: image, title, artist, `{w}×{h}px`, "GIF" badge for animated submissions
- Lightbox: full-screen overlay, image scaled up (pixelated)
- Dark theme matching PixelChomper's color scheme

### Verification
- Create PocketBase collection + set public API rules
- Set `POCKETBASE_URL` in `src/core/Config.js`
- `python3 -m http.server 8080` → draw → File → Share to Gallery → fill form → Share
- Verify record + image in PocketBase admin
- Open `gallery.html` → submission appears, pixelated rendering, lightbox works
- Test multi-frame sprite → animated GIF plays in gallery
- Test single-frame sprite → PNG served

---

## Key Architectural Decisions

1. **One offscreen canvas per cel** — each layer×frame intersection has its own canvas. This enables per-layer compositing with Canvas2D blend modes and opacity without pixel-level blending math.

2. **EventBus for decoupling** — UI components, tools, and renderers communicate via events (`tool:changed`, `color:fg-changed`, `layer:added`, `frame:changed`, `sprite:modified`, etc.) rather than direct references.

3. **State as single source of truth** — `State.js` holds all mutable app state. Components read from State and listen for change events to update.

4. **Tools are stateless processors** — tools receive pointer events and the current state, modify pixel data, and emit events. They don't hold persistent state beyond the current stroke.

5. **Rendering pipeline**: Clear display canvas → draw checkerboard → (onion skin previous frames) → composite current frame's layers bottom-to-top → (onion skin next frames) → draw selection marching ants → draw grid → draw symmetry axes → draw tool preview overlay.

6. **ES Modules without build** — each `.js` file is an ES module. `index.html` loads `src/app.js` with `type="module"`. All imports use relative paths with `.js` extensions.

---

## How to Serve / Test

Since ES modules require a server (no `file://` due to CORS), use:
```bash
cd PixelChomper && python3 -m http.server 8080
```
Then open `http://localhost:8080` in a browser. Each stage should be testable by refreshing the page and exercising the new features manually.