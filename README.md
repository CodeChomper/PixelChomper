# PixelChomper

A web-based pixel art and animation editor inspired by [Aseprite](https://www.aseprite.org/), built entirely with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, no dependencies.

## What is PixelChomper?

PixelChomper is a fully-featured pixel art tool that runs in your browser. It aims to bring the core workflow of desktop pixel art editors to the web: drawing, layers, color palettes, animation timelines, and sprite sheet export — all without installing anything.

## Features

### Drawing Tools
- **Pencil** — Pixel-perfect freehand drawing with configurable brush size and shape
- **Eraser** — Remove pixels with the same brush options as the pencil
- **Line** — Straight lines with Bresenham pixel-perfect rendering
- **Rectangle** — Filled or outlined rectangles
- **Ellipse** — Filled or outlined ellipses
- **Fill (Bucket)** — Flood fill with tolerance control
- **Eyedropper** — Sample any pixel color from the canvas
- **Spray** — Airbrush-style spray with configurable radius and density
- **Curve** — Bézier curve tool
- **Polygon** — Multi-point polygon drawing

### Selection & Transform
- **Rectangular Selection** — Select regions of the canvas
- **Lasso Selection** — Freehand selection tool
- **Magic Wand** — Contiguous color-based selection
- **Move** — Move the contents of the active layer or selection
- **Move Selection** — Reposition selections without moving pixels
- **Scale Selection** — Resize selected pixel regions

### Color System
- **HSV Color Picker** — Hue wheel + saturation/value square + alpha slider
- **Foreground / Background Colors** — Quick swap and reset
- **Preset Palettes** — PICO-8, Endesga-32, Game Boy, and more
- **Recent Colors** — Quick access to recently used colors
- **Shading Ink Mode** — Relative lightness/darkness painting over existing colors

### Layers
- Multiple layers with individual opacity and blend mode controls
- Visibility toggles and layer lock
- Drag-and-drop layer reordering
- Layer groups and linked cels
- Merge down and flatten all layers

### Animation
- Frame-based timeline with layer×frame cel grid
- Variable frame duration
- Onion skinning (configurable range and opacity)
- Playback with loop and ping-pong modes
- Frame tags for named animation regions

### Advanced Features
- **Symmetry** — Horizontal, vertical, or both-axis mirrored drawing
- **Tiled Mode** — Preview and draw seamlessly tiling sprites
- **Canvas Resize** — Resize the sprite canvas with anchor control
- **Custom Brushes** — Define and save reusable brush shapes
- **Contour Tool** — Trace the outline of drawn shapes
- **Replace Color** — Swap one color for another across the sprite
- **Shortcut Editor** — Fully rebindable keyboard shortcuts
- **Preferences** — Configurable editor settings
- **Context Menus** — Right-click menus throughout the UI
- **Panel Resizing** — Drag to resize editor panels
- **Touch Support** — Works on tablets and touch screens

### File I/O
- **Export** — PNG, animated GIF, and sprite sheets with JSON metadata
- **Project Save/Load** — Full project state including layers, frames, cels, and palette
- **Undo/Redo** — Full history with keyboard shortcuts

### Community Gallery
- **Share to Gallery** — Upload pixel art directly to the PixelChomper community gallery
- **Gallery Page** — Standalone `gallery.html` with lightbox preview and pagination
- **Rating System** — Thumbs up/down voting on community art
- **Sort Modes** — Browse by Newest, Hottest, or Undiscovered

## Current Build Live
## [PixelChomper](https://codechomper.github.io/PixelChomper/)

## Getting Started

PixelChomper uses ES modules, so it needs to be served over HTTP:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

## Tech Stack

- **HTML5 Canvas** — All rendering and pixel manipulation
- **CSS Grid** — Panel-based editor layout
- **ES Modules** — Clean, dependency-free code organization
- **PocketBase** — Backend for the community gallery and ratings
- Zero frontend dependencies — everything runs from a single directory

## License

MIT