/**
 * Export the sprite as an animated GIF download.
 *
 * Encoding: self-contained GIF89a + LZW encoder, zero dependencies.
 * Up to 256 colors; transparent pixels (alpha < 128) map to a reserved
 * palette slot and are flagged via the Graphic Control Extension.
 *
 * Animation: disposal method 2 ("restore to background") is used so every
 * frame is drawn onto a clean transparent canvas rather than accumulating
 * on top of the previous frame. The Netscape 2.0 extension makes it loop
 * forever. Each frame's delay comes from the per-frame duration setting
 * (the FPS control in the Timeline panel sets this value).
 */
export class ExportGIF {
  static download(sprite, filename = 'sprite.gif') {
    if (!sprite || !sprite.frames.length) return;
    const { width: w, height: h } = sprite;

    const frames = sprite.frames.map((frame, fi) => ({
      pixels:   _compositeFrame(sprite, fi, w, h), // Uint8ClampedArray RGBA
      duration: frame.duration,                     // milliseconds
    }));

    _triggerDownload(_encodeGIF(frames, w, h), filename);
  }
}

// ─── Frame compositing ────────────────────────────────────────────────────────

/**
 * Composite all visible layers for one frame into a flat RGBA array.
 * Uses getComposited() (same path as ExportPNG) then copies to a
 * willReadFrequently canvas so getImageData() is always CPU-safe.
 */
function _compositeFrame(sprite, fi, w, h) {
  const src = sprite.getComposited(fi);

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);

  return ctx.getImageData(0, 0, w, h).data;
}

// ─── GIF89a encoder ──────────────────────────────────────────────────────────

function _encodeGIF(frames, w, h) {
  // ── Step 1: build shared palette ──────────────────────────────────────────
  //
  // Scan all frames to find unique opaque RGB colors (up to 256).
  // If any pixel is transparent (alpha < 128) we reserve palette slot 0 for
  // the transparency sentinel so that transpIdx is always 0, matching the
  // Logical Screen Descriptor's background-color-index field.

  const colorMap = new Map(); // RGB integer → palette index
  const palette  = [];        // flat [R,G,B, R,G,B, ...] with length = entries*3
  let   transpIdx = -1;

  // Pass 1 – detect transparency
  let hasTransparency = false;
  scan: for (const { pixels } of frames) {
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 128) { hasTransparency = true; break scan; }
    }
  }

  if (hasTransparency) {
    transpIdx = 0;
    palette.push(0, 0, 0);   // black sentinel; never actually rendered
    colorMap.set('t', 0);
  }

  // Pass 2 – collect unique opaque colors
  for (const { pixels } of frames) {
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) continue;
      const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
      if (!colorMap.has(key) && palette.length / 3 < 256) {
        colorMap.set(key, palette.length / 3);
        palette.push(pixels[i], pixels[i + 1], pixels[i + 2]);
      }
    }
  }

  // Pad palette to next power of 2 (GIF requires 2^N entries), minimum 4
  const numColors = Math.max(1, palette.length / 3);
  let tableSize = 4;
  while (tableSize < numColors) tableSize <<= 1;
  while (palette.length < tableSize * 3) palette.push(0, 0, 0);

  // colorDepth = log2(tableSize); minimum 2 (GIF LZW minimum code size floor)
  const colorDepth = Math.max(2, 31 - Math.clz32(tableSize));
  const tableField = colorDepth - 1; // GCT size field encodes as 2^(field+1)

  // ── Step 2: assemble GIF byte stream ──────────────────────────────────────

  const out = [];

  // Header
  out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // "GIF89a"

  // Logical Screen Descriptor (7 bytes)
  _u16(out, w);
  _u16(out, h);
  out.push(
    0x80 | (7 << 4) | tableField, // GCT present; color res = 8 bits; GCT size
    0,                              // background color index = 0 (transparent)
    0,                              // pixel aspect ratio (square pixels)
  );

  // Global Color Table
  for (let i = 0; i < tableSize * 3; i++) out.push(palette[i] || 0);

  // Netscape Application Extension — infinite looping (multi-frame only)
  if (frames.length > 1) {
    out.push(
      0x21, 0xFF, 0x0B,                                                   // App ext header, block size = 11
      0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30, // "NETSCAPE2.0"
      0x03, 0x01, 0x00, 0x00,                                             // sub-block: loop count = 0 (∞)
      0x00,                                                                // block terminator
    );
  }

  // ── Step 3: per-frame blocks ───────────────────────────────────────────────

  for (const { pixels, duration } of frames) {
    // Map each pixel to its palette index
    const indexed = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      if (pixels[o + 3] < 128) {
        indexed[i] = transpIdx >= 0 ? transpIdx : 0;
      } else {
        const key = (pixels[o] << 16) | (pixels[o + 1] << 8) | pixels[o + 2];
        const idx = colorMap.get(key);
        indexed[i] = idx !== undefined
          ? idx
          : _nearestColor(pixels[o], pixels[o + 1], pixels[o + 2], palette);
      }
    }

    // Graphic Control Extension (8 bytes)
    //   delay   : frame duration converted from ms → centiseconds
    //   disposal: 2 = "restore to background" — clears frame before the next
    //             one is drawn, so frames don't accumulate on each other.
    const delay      = Math.max(1, Math.round(duration / 10));
    const disposal   = frames.length > 1 ? 2 : 0;
    const gcePacked  = (disposal << 2) | (transpIdx >= 0 ? 0x01 : 0x00);
    out.push(
      0x21, 0xF9, 0x04,                        // GCE introducer + label + block size
      gcePacked,
      delay & 0xFF, (delay >> 8) & 0xFF,
      transpIdx >= 0 ? transpIdx : 0,           // transparent color index
      0x00,                                     // block terminator
    );

    // Image Descriptor (10 bytes)
    out.push(0x2C);
    _u16(out, 0); _u16(out, 0); // left = 0, top = 0
    _u16(out, w); _u16(out, h);
    out.push(0x00);              // no Local Color Table, not interlaced

    // LZW image data
    const minCodeSize = colorDepth;
    out.push(minCodeSize);
    const lzw = _lzwEncode(indexed, minCodeSize);
    for (let off = 0; off < lzw.length;) {
      const blockLen = Math.min(255, lzw.length - off);
      out.push(blockLen);
      for (let k = 0; k < blockLen; k++) out.push(lzw[off++]);
    }
    out.push(0x00); // image data block terminator
  }

  // Trailer
  out.push(0x3B);

  return new Blob([new Uint8Array(out)], { type: 'image/gif' });
}

// ─── LZW encoder (GIF variant — little-endian variable-width bit packing) ────
//
// GIF uses a variant of LZW where:
//   • The code table starts with 2^minCodeSize literal codes (one per palette
//     index), plus clearCode (= 2^minCodeSize) and eoiCode (= clearCode + 1).
//   • Code width starts at minCodeSize + 1 and grows as the table fills.
//   • A clear code is emitted at the start and whenever the table reaches 4096.
//   • Codes are packed LSB-first into bytes.
//
// KEY: codeSize increments when nextCode > (1 << codeSize), NOT >=.
// The GIF decoder is always 1 table entry behind the encoder, so it increments
// one emit later. Using > (rather than >=) keeps encoder and decoder in sync.

function _lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eoiCode   = clearCode + 1;

  const out = [];
  let bitBuf = 0, bitLen = 0;
  let codeSize = minCodeSize + 1;

  const emit = (code) => {
    bitBuf |= code << bitLen;
    bitLen += codeSize;
    while (bitLen >= 8) { out.push(bitBuf & 0xFF); bitBuf >>>= 8; bitLen -= 8; }
  };

  let table    = new Map();
  let nextCode = eoiCode + 1;

  const resetTable = () => {
    table    = new Map();
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  };

  if (indices.length === 0) {
    emit(clearCode); emit(eoiCode);
    if (bitLen > 0) out.push(bitBuf & 0xFF);
    return out;
  }

  emit(clearCode);
  let prefix = indices[0];

  for (let i = 1; i < indices.length; i++) {
    const suffix = indices[i];
    const key    = (prefix << 8) | suffix;
    const code   = table.get(key);

    if (code !== undefined) {
      prefix = code; // extend string
      continue;
    }

    emit(prefix);

    if (nextCode <= 4095) {
      table.set(key, nextCode++);
      if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
    } else {
      emit(clearCode);
      resetTable();
    }

    prefix = suffix;
  }

  emit(prefix);
  emit(eoiCode);
  if (bitLen > 0) out.push(bitBuf & 0xFF);
  return out;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Download a Blob by creating a temporary <a> element and clicking it. */
function _triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Euclidean nearest-color fallback for pixels whose exact RGB is not in colorMap. */
function _nearestColor(r, g, b, palette) {
  let best = 0, bestDist = Infinity;
  for (let i = 0; i < palette.length / 3; i++) {
    const dr = r - palette[i * 3], dg = g - palette[i * 3 + 1], db = b - palette[i * 3 + 2];
    const d  = dr * dr + dg * dg + db * db;
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

/** Write a 16-bit little-endian integer into an output array. */
function _u16(out, v) { out.push(v & 0xFF, (v >> 8) & 0xFF); }
