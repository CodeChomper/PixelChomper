/**
 * Export the current sprite as a GIF download.
 * Uses a self-contained GIF89a + LZW encoder — zero dependencies.
 * Supports up to 256 colors (sufficient for pixel art). Transparent pixels
 * (alpha < 128) are mapped to a transparent GIF color index.
 */
export class ExportGIF {
  static download(sprite, filename = 'sprite.gif') {
    if (!sprite) return;
    const composited = sprite.getComposited();
    const { width: w, height: h } = sprite;
    const ctx = composited.getContext('2d');
    const imageData = ctx.getImageData(0, 0, w, h);
    const blob = _encodeGIF(imageData.data, w, h);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ─── GIF89a encoder ──────────────────────────────────────────────────────────

function _encodeGIF(pixels, w, h) {
  // Build palette and indexed pixel array
  const colorMap = new Map(); // numeric key (r<<16|g<<8|b) → palette index
  const palette = [];         // flat [r,g,b, r,g,b, ...] array
  const indexed = new Uint8Array(w * h);
  let transpIdx = -1;

  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const r = pixels[o], g = pixels[o + 1], b = pixels[o + 2], a = pixels[o + 3];
    if (a < 128) {
      // Transparent pixel
      if (transpIdx === -1) {
        transpIdx = palette.length / 3;
        palette.push(0, 0, 0);
        colorMap.set('t', transpIdx);
      }
      indexed[i] = transpIdx;
    } else {
      const key = (r << 16) | (g << 8) | b;
      let idx = colorMap.get(key);
      if (idx === undefined) {
        if (palette.length / 3 >= 256) {
          // More than 256 colors — map to nearest
          idx = _nearestColor(r, g, b, palette);
        } else {
          idx = palette.length / 3;
          palette.push(r, g, b);
          colorMap.set(key, idx);
        }
      }
      indexed[i] = idx;
    }
  }

  // Pad palette to power of 2 (minimum 4 for LZW minCodeSize ≥ 2)
  const numColors = palette.length / 3 || 1;
  let tableSize = 4;
  while (tableSize < numColors) tableSize <<= 1;
  while (palette.length < tableSize * 3) palette.push(0, 0, 0);

  // colorDepth = log2(tableSize), minimum 2
  const colorDepth = Math.max(2, 31 - Math.clz32(tableSize));
  const tableField = colorDepth - 1; // bits 0-2 of Logical Screen Descriptor packed byte

  // ── Assemble GIF bytes ────────────────────────────────────────────────────
  const out = [];

  // Header
  out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // "GIF89a"

  // Logical Screen Descriptor
  _u16(out, w); _u16(out, h);
  // packed: GCT flag=1, color resolution=7 (8-bit), sort=0, GCT size=tableField
  out.push(0x80 | (7 << 4) | tableField, 0, 0);

  // Global Color Table
  for (let i = 0; i < tableSize * 3; i++) out.push(palette[i] || 0);

  // Graphic Control Extension — needed for transparency
  if (transpIdx !== -1) {
    out.push(
      0x21, 0xF9, 0x04, // extension introducer, GCE label, block size
      0x01,             // packed: disposal=0, transparent flag=1
      0x00, 0x00,       // delay (0 = no delay)
      transpIdx,        // transparent color index
      0x00,             // block terminator
    );
  }

  // Image Descriptor
  out.push(0x2C);
  _u16(out, 0); _u16(out, 0); // left, top
  _u16(out, w); _u16(out, h);
  out.push(0x00); // packed: no local color table, not interlaced

  // Image Data — LZW compressed
  const lzwMinCodeSize = colorDepth;
  out.push(lzwMinCodeSize);
  const lzwData = _lzwEncode(indexed, lzwMinCodeSize);
  for (let off = 0; off < lzwData.length;) {
    const blockLen = Math.min(255, lzwData.length - off);
    out.push(blockLen);
    for (let i = 0; i < blockLen; i++) out.push(lzwData[off++]);
  }
  out.push(0x00); // image data block terminator

  // GIF Trailer
  out.push(0x3B);

  return new Blob([new Uint8Array(out)], { type: 'image/gif' });
}

// ─── LZW encoder (GIF variant, little-endian bit packing) ────────────────────

function _lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eofCode   = clearCode + 1;

  let codeSize = minCodeSize + 1;
  let nextCode;
  let trie; // Map<currentCode, Map<pixelIndex, newCode>>

  const reset = () => {
    trie = new Map();
    codeSize = minCodeSize + 1;
    nextCode = eofCode + 1;
  };
  reset();

  const out = [];
  let bitBuf = 0, bitLen = 0;

  const emit = (code) => {
    bitBuf |= code << bitLen;
    bitLen += codeSize;
    while (bitLen >= 8) { out.push(bitBuf & 0xFF); bitBuf >>= 8; bitLen -= 8; }
  };

  if (indices.length === 0) {
    emit(clearCode);
    emit(eofCode);
    if (bitLen > 0) out.push(bitBuf & 0xFF);
    return out;
  }

  emit(clearCode);
  let buf = indices[0]; // current code (raw pixel index to start)

  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const sub = trie.get(buf);
    if (sub !== undefined) {
      const found = sub.get(k);
      if (found !== undefined) {
        buf = found;
        continue;
      }
    }

    // Can't extend — emit buf and record new sequence
    emit(buf);

    if (nextCode <= 4095) {
      let subMap = trie.get(buf);
      if (!subMap) { subMap = new Map(); trie.set(buf, subMap); }
      subMap.set(k, nextCode++);
      if (nextCode >= (1 << codeSize) && codeSize < 12) codeSize++;
    } else {
      // Code table full — emit clear and reset
      emit(clearCode);
      reset();
    }

    buf = k;
  }

  emit(buf);
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
