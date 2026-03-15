import { rgbToHsv, hsvToRgb, rgbToHex, hexToRgb, clamp01 } from '../core/ColorUtils.js';

const SIZE = 180;       // wheel and SV square canvas size
const ALPHA_H = 14;     // alpha slider height
const OUTER_R = SIZE / 2 - 2;
const INNER_R = OUTER_R * 0.55;

/**
 * HSV color picker widget.
 * Renders: hue wheel, SV square, alpha slider, hex input, RGBA inputs.
 * @param {HTMLElement} container - mounts into this element
 * @param {{r,g,b,a}} initialColor
 * @param {function({r,g,b,a}):void} onChange - called on every change
 */
export class ColorPicker {
  constructor(container, initialColor, onChange) {
    this._onChange = onChange;
    this._wheelBg = null; // cached static wheel imageData

    const { h, s, v } = rgbToHsv(initialColor.r, initialColor.g, initialColor.b);
    this._h = h;
    this._s = s;
    this._v = v;
    this._a = initialColor.a ?? 255;

    this._build(container);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Push a new color in without firing onChange. */
  setColor(color) {
    const { h, s, v } = rgbToHsv(color.r, color.g, color.b);
    // Preserve hue when dragging towards achromatic
    if (s > 0.01) this._h = h;
    this._s = s;
    this._v = v;
    this._a = color.a ?? 255;
    this._redrawAll();
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _notify() {
    const { r, g, b } = hsvToRgb(this._h, this._s, this._v);
    this._onChange({ r, g, b, a: this._a });
  }

  _setHsva(h, s, v, a) {
    if (s > 0.01) this._h = ((h % 360) + 360) % 360;
    this._s = clamp01(s);
    this._v = clamp01(v);
    this._a = Math.max(0, Math.min(255, Math.round(a)));
    this._redrawAll();
    this._notify();
  }

  _redrawAll() {
    this._drawWheel();
    this._drawSquare();
    this._drawAlpha();
    this._updateTextInputs();
  }

  // ── Build DOM ──────────────────────────────────────────────────────────────

  _build(container) {
    const root = document.createElement('div');
    root.className = 'color-picker';

    // Wheel
    this._wheelCanvas = this._makeCanvas(SIZE, SIZE);
    root.appendChild(this._wheelCanvas);

    // SV Square
    this._sqCanvas = this._makeCanvas(SIZE, SIZE);
    root.appendChild(this._sqCanvas);

    // Alpha slider
    this._alphaCanvas = this._makeCanvas(SIZE, ALPHA_H);
    root.appendChild(this._alphaCanvas);

    // Hex row
    const hexRow = document.createElement('div');
    hexRow.className = 'color-picker-hex-row';
    const hashSpan = document.createElement('span');
    hashSpan.textContent = '#';
    this._hexInput = document.createElement('input');
    this._hexInput.type = 'text';
    this._hexInput.maxLength = 6;
    this._hexInput.className = 'color-picker-hex';
    this._hexInput.spellcheck = false;
    this._hexInput.addEventListener('change', () => {
      const rgb = hexToRgb('#' + this._hexInput.value);
      if (!rgb) return;
      const { h, s, v } = rgbToHsv(rgb.r, rgb.g, rgb.b);
      this._setHsva(h, s, v, this._a);
    });
    hexRow.appendChild(hashSpan);
    hexRow.appendChild(this._hexInput);
    root.appendChild(hexRow);

    // RGBA inputs
    const rgbaRow = document.createElement('div');
    rgbaRow.className = 'color-picker-rgba-row';
    this._rgbaInputs = {};
    for (const ch of ['r', 'g', 'b', 'a']) {
      const wrap = document.createElement('div');
      wrap.className = 'color-picker-channel';
      const lbl = document.createElement('span');
      lbl.textContent = ch.toUpperCase();
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.min = 0;
      inp.max = 255;
      inp.className = 'color-picker-channel-input';
      inp.addEventListener('change', () => {
        const r = Math.max(0, Math.min(255, parseInt(this._rgbaInputs.r.value) || 0));
        const g = Math.max(0, Math.min(255, parseInt(this._rgbaInputs.g.value) || 0));
        const b = Math.max(0, Math.min(255, parseInt(this._rgbaInputs.b.value) || 0));
        const a = Math.max(0, Math.min(255, parseInt(this._rgbaInputs.a.value) || 0));
        const hsv = rgbToHsv(r, g, b);
        this._setHsva(hsv.h, hsv.s, hsv.v, a);
      });
      wrap.appendChild(lbl);
      wrap.appendChild(inp);
      rgbaRow.appendChild(wrap);
      this._rgbaInputs[ch] = inp;
    }
    root.appendChild(rgbaRow);

    container.appendChild(root);

    this._attachWheelEvents();
    this._attachSquareEvents();
    this._attachAlphaEvents();
    this._redrawAll();
  }

  _makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.style.display = 'block';
    c.style.cursor = 'crosshair';
    return c;
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  _drawWheel() {
    const ctx = this._wheelCanvas.getContext('2d');
    const cx = SIZE / 2, cy = SIZE / 2;

    // Build static hue ring once
    if (!this._wheelBg) {
      const imageData = ctx.createImageData(SIZE, SIZE);
      const data = imageData.data;
      for (let py = 0; py < SIZE; py++) {
        for (let px = 0; px < SIZE; px++) {
          const dx = px - cx, dy = py - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const i = (py * SIZE + px) * 4;
          if (dist < INNER_R || dist > OUTER_R) {
            data[i + 3] = 0;
            continue;
          }
          const hue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
          const { r, g, b } = hsvToRgb(hue, 1, 1);
          data[i]     = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      this._wheelBg = ctx.getImageData(0, 0, SIZE, SIZE);
    } else {
      ctx.putImageData(this._wheelBg, 0, 0);
    }

    // Hue cursor
    const angle = this._h * Math.PI / 180;
    const cursorR = (OUTER_R + INNER_R) / 2;
    const cursorX = cx + Math.cos(angle) * cursorR;
    const cursorY = cy + Math.sin(angle) * cursorR;
    this._drawCursor(ctx, cursorX, cursorY);
  }

  _drawSquare() {
    const ctx = this._sqCanvas.getContext('2d');
    const W = SIZE, H = SIZE;
    const { r, g, b } = hsvToRgb(this._h, 1, 1);

    // White → hue color (horizontal)
    const grad1 = ctx.createLinearGradient(0, 0, W, 0);
    grad1.addColorStop(0, '#ffffff');
    grad1.addColorStop(1, `rgb(${r},${g},${b})`);
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, W, H);

    // Transparent → black (vertical overlay)
    const grad2 = ctx.createLinearGradient(0, 0, 0, H);
    grad2.addColorStop(0, 'rgba(0,0,0,0)');
    grad2.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, W, H);

    // SV cursor
    const cx = this._s * W;
    const cy = (1 - this._v) * H;
    this._drawCursor(ctx, cx, cy);
  }

  _drawAlpha() {
    const ctx = this._alphaCanvas.getContext('2d');
    const W = SIZE, H = ALPHA_H;
    const CELL = 4;

    // Checkerboard
    for (let y = 0; y < H; y += CELL) {
      for (let x = 0; x < W; x += CELL) {
        const light = (Math.floor(x / CELL) + Math.floor(y / CELL)) % 2 === 0;
        ctx.fillStyle = light ? '#444460' : '#38384e';
        ctx.fillRect(x, y, CELL, CELL);
      }
    }

    // Color gradient
    const { r, g, b } = hsvToRgb(this._h, this._s, this._v);
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},1)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Cursor line
    const cx = (this._a / 255) * W;
    ctx.fillStyle = 'white';
    ctx.fillRect(cx - 1, 0, 3, H);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 1, 0, 3, H);
  }

  _drawCursor(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _updateTextInputs() {
    const { r, g, b } = hsvToRgb(this._h, this._s, this._v);
    this._hexInput.value = rgbToHex(r, g, b).slice(1).toUpperCase();
    this._rgbaInputs.r.value = r;
    this._rgbaInputs.g.value = g;
    this._rgbaInputs.b.value = b;
    this._rgbaInputs.a.value = this._a;
  }

  // ── Event wiring ───────────────────────────────────────────────────────────

  _attachWheelEvents() {
    const cx = SIZE / 2, cy = SIZE / 2;
    const pick = (e) => {
      const rect = this._wheelCanvas.getBoundingClientRect();
      const dx = e.clientX - rect.left - cx;
      const dy = e.clientY - rect.top - cy;
      const hue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
      this._setHsva(hue, this._s, this._v, this._a);
    };
    this._attachDrag(this._wheelCanvas, pick);
  }

  _attachSquareEvents() {
    const pick = (e) => {
      const rect = this._sqCanvas.getBoundingClientRect();
      const s = clamp01((e.clientX - rect.left) / SIZE);
      const v = clamp01(1 - (e.clientY - rect.top) / SIZE);
      this._setHsva(this._h, s, v, this._a);
    };
    this._attachDrag(this._sqCanvas, pick);
  }

  _attachAlphaEvents() {
    const pick = (e) => {
      const rect = this._alphaCanvas.getBoundingClientRect();
      const a = Math.round(clamp01((e.clientX - rect.left) / SIZE) * 255);
      this._setHsva(this._h, this._s, this._v, a);
    };
    this._attachDrag(this._alphaCanvas, pick);
  }

  _attachDrag(canvas, pickFn) {
    let dragging = false;
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragging = true;
      pickFn(e);
    });
    window.addEventListener('mousemove', (e) => { if (dragging) pickFn(e); });
    window.addEventListener('mouseup', () => { dragging = false; });
  }
}
