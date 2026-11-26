/**
 * Pure TypeScript GIF89a animated GIF encoder with 6-6-6 + gray 256-color palette
 * and LZW variable-width compression. Zero external runtime dependencies.
 */

function buildWebSafe256Palette(): Uint8Array {
  const pal = new Uint8Array(256 * 3);
  let idx = 0;
  // 216 RGB cube (6 * 6 * 6)
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        pal[idx++] = Math.round((r * 255) / 5);
        pal[idx++] = Math.round((g * 255) / 5);
        pal[idx++] = Math.round((b * 255) / 5);
      }
    }
  }
  // 40 grayscale shades for smooth anti-aliased UI edges
  for (let k = 0; k < 40; k++) {
    const v = Math.round((k * 255) / 39);
    pal[idx++] = v;
    pal[idx++] = v;
    pal[idx++] = v;
  }
  return pal;
}

function quantizeRgbaToIndices(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    const a = rgba[p + 3];
    const r = a < 16 ? 15 : rgba[p];
    const g = a < 16 ? 20 : rgba[p + 1];
    const b = a < 16 ? 30 : rgba[p + 2];

    if (Math.abs(r - g) < 8 && Math.abs(g - b) < 8) {
      const avg = (r + g + b) / 3;
      const grayIdx = Math.min(39, Math.max(0, Math.round((avg * 39) / 255)));
      out[i] = 216 + grayIdx;
    } else {
      const ri = Math.round((r * 5) / 255);
      const gi = Math.round((g * 5) / 255);
      const bi = Math.round((b * 5) / 255);
      out[i] = ri * 36 + gi * 6 + bi;
    }
  }
  return out;
}

function lzwEncode(indices: Uint8Array, minCodeSize = 8): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;

  const bytes: number[] = [];
  let bitBuf = 0;
  let bitCount = 0;

  const emit = (code: number, size: number) => {
    bitBuf |= code << bitCount;
    bitCount += size;
    while (bitCount >= 8) {
      bytes.push(bitBuf & 0xff);
      bitBuf >>= 8;
      bitCount -= 8;
    }
  };

  let dict = new Map<string, number>();
  const resetDict = () => {
    dict = new Map<string, number>();
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  };

  emit(clearCode, codeSize);
  resetDict();

  if (indices.length === 0) {
    emit(eoiCode, codeSize);
    if (bitCount > 0) bytes.push(bitBuf & 0xff);
    return new Uint8Array(bytes);
  }

  let prefix = String(indices[0]);
  let prefixCode = indices[0];

  for (let i = 1; i < indices.length; i++) {
    const ch = indices[i];
    const key = `${prefix},${ch}`;
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = key;
      prefixCode = found;
    } else {
      emit(prefixCode, codeSize);
      if (nextCode < 4096) {
        dict.set(key, nextCode++);
        if (nextCode > 1 << codeSize && codeSize < 12) {
          codeSize++;
        }
      } else {
        emit(clearCode, codeSize);
        resetDict();
      }
      prefix = String(ch);
      prefixCode = ch;
    }
  }

  emit(prefixCode, codeSize);
  emit(eoiCode, codeSize);
  if (bitCount > 0) bytes.push(bitBuf & 0xff);
  return new Uint8Array(bytes);
}

export function encodeCanvasFramesToGif(
  frames: Array<{ imageData: ImageData; delayMs: number }>
): Blob {
  if (frames.length === 0) {
    throw new Error('No frames to encode');
  }
  const width = frames[0].imageData.width;
  const height = frames[0].imageData.height;
  const palette = buildWebSafe256Palette();

  const chunks: number[] = [];
  const pushStr = (s: string) => {
    for (let i = 0; i < s.length; i++) chunks.push(s.charCodeAt(i));
  };
  const pushU16 = (v: number) => {
    chunks.push(v & 0xff, (v >> 8) & 0xff);
  };

  // GIF89a Header
  pushStr('GIF89a');
  pushU16(width);
  pushU16(height);
  // Global color table flag (1), color res (7), sort (0), size (7 -> 256 colors)
  chunks.push(0xf7, 0x00, 0x00);
  for (let i = 0; i < palette.length; i++) chunks.push(palette[i]);

  // Netscape 2.0 loop forever block
  chunks.push(0x21, 0xff, 0x0b);
  pushStr('NETSCAPE2.0');
  chunks.push(0x03, 0x01, 0x00, 0x00, 0x00);

  for (const frame of frames) {
    const delayCs = Math.max(10, Math.round(frame.delayMs / 10));
    // Graphic Control Extension
    chunks.push(0x21, 0xf9, 0x04, 0x04);
    pushU16(delayCs);
    chunks.push(0x00, 0x00);

    // Image Descriptor
    chunks.push(0x2c);
    pushU16(0);
    pushU16(0);
    pushU16(width);
    pushU16(height);
    chunks.push(0x00);

    // Image Data (min LZW size = 8)
    chunks.push(0x08);
    const indices = quantizeRgbaToIndices(frame.imageData.data, width, height);
    const lzw = lzwEncode(indices, 8);
    for (let i = 0; i < lzw.length; i += 255) {
      const subLen = Math.min(255, lzw.length - i);
      chunks.push(subLen);
      for (let j = 0; j < subLen; j++) chunks.push(lzw[i + j]);
    }
    chunks.push(0x00);
  }

  chunks.push(0x3b);
  return new Blob([new Uint8Array(chunks)], { type: 'image/gif' });
}
