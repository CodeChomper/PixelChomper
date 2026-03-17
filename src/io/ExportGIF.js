/**
 * Export the sprite as an animated GIF download.
 * Uses a self-contained GIF89a + LZW encoder — zero dependencies.
 * Supports up to 256 colors. Transparent pixels (alpha < 128) use the
 * GIF transparency extension.
 */
export class ExportGIF {
  static download(sprite, filename = 'sprite.gif') {
    if (!sprite) return;
    const frameCount = sprite.frames.length;
    if (frameCount === 1) {
      // Single frame — simpler path
      const composited = sprite.getComposited(0);
      const { width: w, height: h } = sprite;
      const ctx = composited.getContext('2d');
      const imageData = ctx.getImageData(0, 0, w, h);
      const blob = _encodeGIF([{ pixels: imageData.data, duration: sprite.frames[0].duration }], w, h);
      _triggerDownload(blob, filename);
    } else {
      // Multi-frame animated GIF
      const { width: w, height: h } = sprite;
      const frames = sprite.frames.map((frame, fi) => {
        const composited = sprite.getComposited(fi);
        const ctx = composited.getContext('2d');
        return { pixels: ctx.getImageData(0, 0, w, h).data, duration: frame.duration };
      });
      const blob = _encodeGIF(frames, w, h);
      _triggerDownload(blob, filename);
    }
  }
}

function _triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── GIF89a encoder ──────────────────────────────────────────────────────────

/**
 * Encode one or more frames as a GIF89a file.
 * @param {{pixels:Uint8ClampedArray, duration:number}[]} frames
 * @param {number} w
 * @param {number} h
 */
function _encodeGIF(frames, w, h) {
  // Build a shared palette from all frames (up to 256 colors).
  // Pre-scan for any transparent pixel so we can reserve palette slot 0 for
  // transparency FIRST. This guarantees transpIdx === 0, which matches the
  // LSD background-color-index (also 0), so disposal-method-2 restores to
  // transparent rather than to whatever opaque color happens to be at slot 0.
  const colorMap = new Map();
  const palette = [];
  let transpIdx = -1;

  let hasTransparency = false;
  outer: for (const { pixels } of frames) {
    for (let i = 0; i < w * h; i++) {
      if (pixels[i * 4 + 3] < 128) { hasTransparency = true; break outer; }
    }
  }
  if (hasTransparency) {
    transpIdx = 0;
    palette.push(0, 0, 0);
    colorMap.set('t', 0);
  }

  for (const { pixels } of frames) {
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const r = pixels[o], g = pixels[o + 1], b = pixels[o + 2], a = pixels[o + 3];
      if (a >= 128) {
        const key = (r << 16) | (g << 8) | b;
        if (!colorMap.has(key)) {
          if (palette.length / 3 < 256) {
            colorMap.set(key, palette.length / 3);
            palette.push(r, g, b);
          }
        }
      }
    }
  }

  // Pad palette to power of 2 (min 4)
  const numColors = palette.length / 3 || 1;
  let tableSize = 4;
  while (tableSize < numColors) tableSize <<= 1;
  while (palette.length < tableSize * 3) palette.push(0, 0, 0);

  const colorDepth = Math.max(2, 31 - Math.clz32(tableSize));
  const tableField = colorDepth - 1;

  const out = [];

  // GIF Header
  out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // "GIF89a"

  // Logical Screen Descriptor
  _u16(out, w); _u16(out, h);
  out.push(0x80 | (7 << 4) | tableField, 0, 0);

  // Global Color Table
  for (let i = 0; i < tableSize * 3; i++) out.push(palette[i] || 0);

  // Netscape Application Extension (for looping animation)
  if (frames.length > 1) {
    out.push(
      0x21, 0xFF, 0x0B,
      // "NETSCAPE2.0"
      0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30,
      0x03, 0x01, 0x00, 0x00, // loop count = 0 (infinite)
      0x00,
    );
  }

  for (const { pixels, duration } of frames) {
    // Build indexed pixel array for this frame
    const indexed = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const r = pixels[o], g = pixels[o + 1], b = pixels[o + 2], a = pixels[o + 3];
      if (a < 128) {
        indexed[i] = transpIdx !== -1 ? transpIdx : 0;
      } else {
        const key = (r << 16) | (g << 8) | b;
        let idx = colorMap.get(key);
        if (idx === undefined) idx = _nearestColor(r, g, b, palette);
        indexed[i] = idx;
      }
    }

    // Graphic Control Extension
    const delay = Math.round(duration / 10); // GIF delay is in centiseconds
    // Disposal method 2 (restore to background) for animated GIFs so transparent
    // pixels in each frame don't bleed through from the previous frame.
    const disposalMethod = frames.length > 1 ? 2 : 0;
    const packedField = (disposalMethod << 2) | (transpIdx !== -1 ? 0x01 : 0x00);
    out.push(
      0x21, 0xF9, 0x04,
      packedField,
      delay & 0xFF, (delay >> 8) & 0xFF,
      transpIdx !== -1 ? transpIdx : 0,
      0x00,
    );

    // Image Descriptor
    out.push(0x2C);
    _u16(out, 0); _u16(out, 0);
    _u16(out, w); _u16(out, h);
    out.push(0x00);

    // LZW Image Data
    const lzwMinCodeSize = colorDepth;
    out.push(lzwMinCodeSize);
    const lzwData = _lzwEncode(indexed, lzwMinCodeSize);
    for (let off = 0; off < lzwData.length;) {
      const blockLen = Math.min(255, lzwData.length - off);
      out.push(blockLen);
      for (let i = 0; i < blockLen; i++) out.push(lzwData[off++]);
    }
    out.push(0x00);
  }

  // GIF Trailer
  out.push(0x3B);

  return new Blob([new Uint8Array(out)], { type: 'image/gif' });
}

// ─── LZW encoder (GIF variant, little-endian bit packing) ────────────────────

function _lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eofCode = clearCode + 1;

  // Flat hash table: key encodes (prefixCode, suffixByte).
  // HASH_SIZE must be prime; 7919 handles ~4096 codes × 256 suffixes with low collision.
  const HASH_SIZE = 7919;
  const htKey   = new Int32Array(HASH_SIZE).fill(-1); // -1 = empty slot
  const htVal   = new Uint16Array(HASH_SIZE);

  let codeSize = minCodeSize + 1;
  let nextCode = eofCode + 1;

  const resetTable = () => {
    htKey.fill(-1);
    codeSize = minCodeSize + 1;
    nextCode = eofCode + 1;
  };

  const out = [];
  let bitBuf = 0, bitLen = 0;
  const emit = (code) => {
    bitBuf |= code << bitLen;
    bitLen += codeSize;
    while (bitLen >= 8) { out.push(bitBuf & 0xFF); bitBuf >>>= 8; bitLen -= 8; }
  };

  const htSearch = (key) => {
    let slot = key % HASH_SIZE;
    while (htKey[slot] !== -1 && htKey[slot] !== key) {
      slot = (slot + 1) % HASH_SIZE;
    }
    return slot;
  };

  if (indices.length === 0) {
    emit(clearCode); emit(eofCode);
    if (bitLen > 0) out.push(bitBuf & 0xFF);
    return out;
  }

  emit(clearCode);
  let prefix = indices[0];

  for (let i = 1; i < indices.length; i++) {
    const suffix = indices[i];
    const key    = (prefix << 8) | suffix;
    const slot   = htSearch(key);

    if (htKey[slot] === key) {
      // Found: extend the current sequence
      prefix = htVal[slot];
      continue;
    }

    // Not found: emit prefix, add new entry
    emit(prefix);
    if (nextCode <= 4095) {
      htKey[slot] = key;
      htVal[slot] = nextCode++;
      if (nextCode >= (1 << codeSize) && codeSize < 12) codeSize++;
    } else {
      emit(clearCode);
      resetTable();
    }
    prefix = suffix;
  }

  emit(prefix);
  emit(eofCode);
  if (bitLen > 0) out.push(bitBuf & 0xFF);
  return out;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function _nearestColor(r, g, b, palette) {
  let best = 0, bestDist = Infinity;
  const n = palette.length / 3;
  for (let i = 0; i < n; i++) {
    const dr = r - palette[i * 3], dg = g - palette[i * 3 + 1], db = b - palette[i * 3 + 2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

function _u16(out, v) { out.push(v & 0xFF, (v >> 8) & 0xFF); }
