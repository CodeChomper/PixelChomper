# PixelChomper

A web-based pixel art and animation editor inspired by [Aseprite](https://www.aseprite.org/), built entirely with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools, no dependencies.

## What is PixelChomper?

PixelChomper is a fully-featured pixel art tool that runs in your browser. It aims to bring the core workflow of desktop pixel art editors to the web: drawing, layers, color palettes, animation timelines, and sprite sheet export — all without installing anything.

## Features

- **Drawing tools** — Pencil, eraser, line, rectangle, ellipse, fill, eyedropper, spray, and more with configurable brush size and shape
- **Color management** — Foreground/background colors, HSV color picker, preset palettes (PICO-8, Endesga-32, etc.), and shading ink mode
- **Layers** — Multiple layers with opacity, blend modes, visibility toggles, and drag-and-drop reordering
- **Animation** — Frame-based timeline, onion skinning, playback with loop/ping-pong modes, and frame tags
- **Export** — PNG, animated GIF, and sprite sheets with JSON metadata
- **Project files** — Save and load your full project state including all layers, frames, and palette data

## Current Build Live
### [PixelChomper](https://codechomper.github.io/PixelChomper/)

## Getting Started

PixelChomper uses ES modules, so it needs to be served over HTTP:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

## Tech Stack

- **HTML5 Canvas** for all rendering and pixel manipulation
- **CSS Grid** for the panel-based editor layout
- **ES Modules** for clean, dependency-free code organization
- Zero external dependencies — everything runs from a single directory

## License

MIT
