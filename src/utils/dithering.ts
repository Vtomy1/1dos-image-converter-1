import {
  DitherAlgorithm,
  ImageAdjustments,
  PlanarData,
  ColorDistanceMethod,
} from '../types/dos';
import { EGA_PALETTE, findNearestColorIndex } from './palette';

// Standard Bayer Matrices
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
];

const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

// Helper to clamp byte 0..255
function clamp(val: number): number {
  return val < 0 ? 0 : val > 255 ? 255 : val;
}

/**
 * Apply image adjustments (Brightness, Contrast, Saturation, Gamma, Sharpen)
 */
export function applyAdjustments(
  srcRgba: Uint8ClampedArray,
  width: number,
  height: number,
  adjustments: ImageAdjustments
): Float32Array {
  const pixelCount = width * height;
  const out = new Float32Array(pixelCount * 3); // R, G, B in float

  const brightness = adjustments.brightness; // -100..100
  const contrastFactor =
    adjustments.contrast >= 0
      ? 1 + (adjustments.contrast / 100) * 2
      : 1 / (1 + (-adjustments.contrast / 100) * 2);
  const saturationFactor = adjustments.saturation / 100;
  const invGamma = 1 / Math.max(0.1, adjustments.gamma);

  // First pass: tone adjustments
  for (let i = 0; i < pixelCount; i++) {
    const srcIdx = i * 4;
    let r = srcRgba[srcIdx];
    let g = srcRgba[srcIdx + 1];
    let b = srcRgba[srcIdx + 2];

    // 1. Brightness
    if (brightness !== 0) {
      r += brightness * 1.5;
      g += brightness * 1.5;
      b += brightness * 1.5;
    }

    // 2. Contrast around midpoint 128
    if (contrastFactor !== 1) {
      r = (r - 128) * contrastFactor + 128;
      g = (g - 128) * contrastFactor + 128;
      b = (b - 128) * contrastFactor + 128;
    }

    // 3. Saturation
    if (saturationFactor !== 1) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturationFactor;
      g = gray + (g - gray) * saturationFactor;
      b = gray + (b - gray) * saturationFactor;
    }

    // 4. Gamma
    if (invGamma !== 1) {
      r = 255 * Math.pow(Math.max(0, r) / 255, invGamma);
      g = 255 * Math.pow(Math.max(0, g) / 255, invGamma);
      b = 255 * Math.pow(Math.max(0, b) / 255, invGamma);
    }

    const destIdx = i * 3;
    out[destIdx] = clamp(r);
    out[destIdx + 1] = clamp(g);
    out[destIdx + 2] = clamp(b);
  }

  // Optional sharpen filter (Laplacian kernel)
  if (adjustments.sharpen > 0) {
    const strength = (adjustments.sharpen / 100) * 0.8;
    const copy = new Float32Array(out);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = (y * width + x) * 3;
        const topIdx = ((y - 1) * width + x) * 3;
        const bottomIdx = ((y + 1) * width + x) * 3;
        const leftIdx = (y * width + (x - 1)) * 3;
        const rightIdx = (y * width + (x + 1)) * 3;

        for (let c = 0; c < 3; c++) {
          const centerVal = copy[centerIdx + c];
          const laplacian =
            4 * centerVal -
            (copy[topIdx + c] +
              copy[bottomIdx + c] +
              copy[leftIdx + c] +
              copy[rightIdx + c]);
          out[centerIdx + c] = clamp(centerVal + laplacian * strength);
        }
      }
    }
  }

  return out;
}

/**
 * Quantizes and dithers image to 4-bit EGA/VGA 640x480 Planar structure
 */
export function ditherImageToPlanar(
  srcRgba: Uint8ClampedArray,
  width: number = 640,
  height: number = 480,
  algorithm: DitherAlgorithm = 'floyd-steinberg',
  adjustments: ImageAdjustments = {
    brightness: 0,
    contrast: 15,
    saturation: 110,
    gamma: 1.0,
    sharpen: 20,
    ditherStrength: 85,
  },
  colorMethod: ColorDistanceMethod = 'perceptual'
): PlanarData {
  const pixelCount = width * height;
  const bytesPerLine = width / 8; // 80 bytes for 640 width
  const bytesPerPlane = bytesPerLine * height; // 38,400 bytes for 480 height

  // Pre-allocated planes
  const plane0 = new Uint8Array(bytesPerPlane); // Blue (bit 0)
  const plane1 = new Uint8Array(bytesPerPlane); // Green (bit 1)
  const plane2 = new Uint8Array(bytesPerPlane); // Red (bit 2)
  const plane3 = new Uint8Array(bytesPerPlane); // Intensity (bit 3)

  const colorIndices = new Uint8Array(pixelCount);
  const rgbaData = new Uint8ClampedArray(pixelCount * 4);
  const colorCounts = new Array(16).fill(0);

  // Apply tone and contrast adjustments
  const rgbWorking = applyAdjustments(srcRgba, width, height, adjustments);

  // Dither strength modifier (0.0 to 1.0)
  const strength = Math.max(0, Math.min(100, adjustments.ditherStrength)) / 100;

  // Dithering execution
  if (algorithm === 'none' || strength === 0) {
    // Nearest color quantization (no dithering)
    for (let i = 0; i < pixelCount; i++) {
      const idx3 = i * 3;
      const r = rgbWorking[idx3];
      const g = rgbWorking[idx3 + 1];
      const b = rgbWorking[idx3 + 2];
      const colorIdx = findNearestColorIndex(r, g, b, colorMethod);
      colorIndices[i] = colorIdx;
    }
  } else if (algorithm.startsWith('bayer')) {
    // Ordered Dithering (Bayer Matrix)
    const is8x8 = algorithm === 'bayer-8x8';
    const is16x16 = algorithm === 'bayer-16x16';
    const matrixSize = is16x16 ? 16 : is8x8 ? 8 : 4;
    const maxVal = matrixSize * matrixSize;
    const spread = 48 * strength;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const idx3 = i * 3;

        let threshold = 0;
        if (is8x8) {
          threshold = (BAYER_8X8[y % 8][x % 8] / maxVal - 0.5) * spread;
        } else if (is16x16) {
          // 16x16 recursive formula from 8x8
          const b8 = BAYER_8X8[(y % 8)][(x % 8)];
          const quadX = Math.floor((x % 16) / 8);
          const quadY = Math.floor((y % 16) / 8);
          const qVal = BAYER_4X4[quadY][quadX];
          threshold = ((4 * b8 + (qVal % 4)) / 256 - 0.5) * spread;
        } else {
          threshold = (BAYER_4X4[y % 4][x % 4] / maxVal - 0.5) * spread;
        }

        const r = clamp(rgbWorking[idx3] + threshold);
        const g = clamp(rgbWorking[idx3 + 1] + threshold);
        const b = clamp(rgbWorking[idx3 + 2] + threshold);

        const colorIdx = findNearestColorIndex(r, g, b, colorMethod);
        colorIndices[i] = colorIdx;
      }
    }
  } else {
    // Error Diffusion Algorithms
    const isSerpentine = algorithm === 'floyd-steinberg-serpentine';

    // Diffusion helper
    const diffuse = (
      px: number,
      py: number,
      er: number,
      eg: number,
      eb: number,
      weight: number
    ) => {
      if (px < 0 || px >= width || py < 0 || py >= height) return;
      const targetIdx = (py * width + px) * 3;
      rgbWorking[targetIdx] += er * weight;
      rgbWorking[targetIdx + 1] += eg * weight;
      rgbWorking[targetIdx + 2] += eb * weight;
    };

    for (let y = 0; y < height; y++) {
      const reverse = isSerpentine && y % 2 === 1;
      const startX = reverse ? width - 1 : 0;
      const endX = reverse ? -1 : width;
      const stepX = reverse ? -1 : 1;

      for (let x = startX; x !== endX; x += stepX) {
        const i = y * width + x;
        const idx3 = i * 3;

        const currentR = clamp(rgbWorking[idx3]);
        const currentG = clamp(rgbWorking[idx3 + 1]);
        const currentB = clamp(rgbWorking[idx3 + 2]);

        const colorIdx = findNearestColorIndex(currentR, currentG, currentB, colorMethod);
        colorIndices[i] = colorIdx;

        const chosenColor = EGA_PALETTE[colorIdx];
        const errR = (currentR - chosenColor.r) * strength;
        const errG = (currentG - chosenColor.g) * strength;
        const errB = (currentB - chosenColor.b) * strength;

        const dir = stepX;

        if (algorithm === 'floyd-steinberg' || algorithm === 'floyd-steinberg-serpentine') {
          diffuse(x + dir, y, errR, errG, errB, 7 / 16);
          diffuse(x - dir, y + 1, errR, errG, errB, 3 / 16);
          diffuse(x, y + 1, errR, errG, errB, 5 / 16);
          diffuse(x + dir, y + 1, errR, errG, errB, 1 / 16);
        } else if (algorithm === 'atkinson') {
          // Atkinson distributes 1/8 to 6 neighbors (retains 2/8, preserving crisp highlights)
          const w = 1 / 8;
          diffuse(x + dir, y, errR, errG, errB, w);
          diffuse(x + 2 * dir, y, errR, errG, errB, w);
          diffuse(x - dir, y + 1, errR, errG, errB, w);
          diffuse(x, y + 1, errR, errG, errB, w);
          diffuse(x + dir, y + 1, errR, errG, errB, w);
          diffuse(x, y + 2, errR, errG, errB, w);
        } else if (algorithm === 'burkes') {
          const w32 = 1 / 32;
          diffuse(x + dir, y, errR, errG, errB, 8 * w32);
          diffuse(x + 2 * dir, y, errR, errG, errB, 4 * w32);
          diffuse(x - 2 * dir, y + 1, errR, errG, errB, 2 * w32);
          diffuse(x - dir, y + 1, errR, errG, errB, 4 * w32);
          diffuse(x, y + 1, errR, errG, errB, 8 * w32);
          diffuse(x + dir, y + 1, errR, errG, errB, 4 * w32);
          diffuse(x + 2 * dir, y + 1, errR, errG, errB, 2 * w32);
        } else if (algorithm === 'sierra-3') {
          const w32 = 1 / 32;
          diffuse(x + dir, y, errR, errG, errB, 5 * w32);
          diffuse(x + 2 * dir, y, errR, errG, errB, 3 * w32);
          diffuse(x - 2 * dir, y + 1, errR, errG, errB, 2 * w32);
          diffuse(x - dir, y + 1, errR, errG, errB, 4 * w32);
          diffuse(x, y + 1, errR, errG, errB, 5 * w32);
          diffuse(x + dir, y + 1, errR, errG, errB, 4 * w32);
          diffuse(x + 2 * dir, y + 1, errR, errG, errB, 2 * w32);
          diffuse(x - dir, y + 2, errR, errG, errB, 2 * w32);
          diffuse(x, y + 2, errR, errG, errB, 3 * w32);
          diffuse(x + dir, y + 2, errR, errG, errB, 2 * w32);
        } else if (algorithm === 'sierra-lite') {
          const w4 = 1 / 4;
          diffuse(x + dir, y, errR, errG, errB, 2 * w4);
          diffuse(x - dir, y + 1, errR, errG, errB, 1 * w4);
          diffuse(x, y + 1, errR, errG, errB, 1 * w4);
        } else if (algorithm === 'jarvis-judice-ninke') {
          const w48 = 1 / 48;
          diffuse(x + dir, y, errR, errG, errB, 7 * w48);
          diffuse(x + 2 * dir, y, errR, errG, errB, 5 * w48);
          diffuse(x - 2 * dir, y + 1, errR, errG, errB, 3 * w48);
          diffuse(x - dir, y + 1, errR, errG, errB, 5 * w48);
          diffuse(x, y + 1, errR, errG, errB, 7 * w48);
          diffuse(x + dir, y + 1, errR, errG, errB, 5 * w48);
          diffuse(x + 2 * dir, y + 1, errR, errG, errB, 3 * w48);
          diffuse(x - 2 * dir, y + 2, errR, errG, errB, 1 * w48);
          diffuse(x - dir, y + 2, errR, errG, errB, 3 * w48);
          diffuse(x, y + 2, errR, errG, errB, 5 * w48);
          diffuse(x + dir, y + 2, errR, errG, errB, 3 * w48);
          diffuse(x + 2 * dir, y + 2, errR, errG, errB, 1 * w48);
        } else if (algorithm === 'stucki') {
          const w42 = 1 / 42;
          diffuse(x + dir, y, errR, errG, errB, 8 * w42);
          diffuse(x + 2 * dir, y, errR, errG, errB, 4 * w42);
          diffuse(x - 2 * dir, y + 1, errR, errG, errB, 2 * w42);
          diffuse(x - dir, y + 1, errR, errG, errB, 4 * w42);
          diffuse(x, y + 1, errR, errG, errB, 8 * w42);
          diffuse(x + dir, y + 1, errR, errG, errB, 4 * w42);
          diffuse(x + 2 * dir, y + 1, errR, errG, errB, 2 * w42);
          diffuse(x - 2 * dir, y + 2, errR, errG, errB, 1 * w42);
          diffuse(x - dir, y + 2, errR, errG, errB, 2 * w42);
          diffuse(x, y + 2, errR, errG, errB, 4 * w42);
          diffuse(x + dir, y + 2, errR, errG, errB, 2 * w42);
          diffuse(x + 2 * dir, y + 2, errR, errG, errB, 1 * w42);
        }
      }
    }
  }

  // Populate 4 bitplanes, RGBA buffer, and palette statistics
  for (let y = 0; y < height; y++) {
    const lineOffset = y * bytesPerLine;
    for (let x = 0; x < width; x++) {
      const pixelIdx = y * width + x;
      const colorIdx = colorIndices[pixelIdx];
      colorCounts[colorIdx]++;

      const chosenColor = EGA_PALETTE[colorIdx];
      const rgbaIdx = pixelIdx * 4;
      rgbaData[rgbaIdx] = chosenColor.r;
      rgbaData[rgbaIdx + 1] = chosenColor.g;
      rgbaData[rgbaIdx + 2] = chosenColor.b;
      rgbaData[rgbaIdx + 3] = 255;

      // EGA/VGA Bitplane packing
      // 8 pixels per byte, MSB (bit 7) is left-most pixel
      const byteOffset = lineOffset + (x >> 3);
      const bitMask = 1 << (7 - (x & 7));

      // Bit 0: Blue (Plane 0)
      if (colorIdx & 1) plane0[byteOffset] |= bitMask;
      // Bit 1: Green (Plane 1)
      if (colorIdx & 2) plane1[byteOffset] |= bitMask;
      // Bit 2: Red (Plane 2)
      if (colorIdx & 4) plane2[byteOffset] |= bitMask;
      // Bit 3: Intensity (Plane 3)
      if (colorIdx & 8) plane3[byteOffset] |= bitMask;
    }
  }

  // Calculate RLE compression for the 4 planes
  const { rleBytes, totalRleSize } = compressPlanesRle(
    [plane0, plane1, plane2, plane3],
    bytesPerPlane
  );

  return {
    width,
    height,
    bytesPerLine,
    bytesPerPlane,
    plane0,
    plane1,
    plane2,
    plane3,
    colorIndices,
    rgbaData,
    colorCounts,
    rleSize: totalRleSize,
    rleBytes,
    isComCompatible: totalRleSize + 256 <= 65200, // .COM max ~64KB
  };
}

/**
 * Standard PackBits / Byte-Run RLE compression for retro planar graphics.
 * Compresses each plane to fit inside MS-DOS .COM limits.
 *
 * Format:
 * Tag byte:
 *   If tag >= 128: repeat next byte (tag - 128 + 2) times (up to 129 bytes)
 *   If tag < 128: next (tag + 1) bytes are literal (up to 128 bytes)
 */
export function compressPlaneRle(plane: Uint8Array): Uint8Array {
  const result: number[] = [];
  const len = plane.length;
  let i = 0;

  while (i < len) {
    // Check for run of identical bytes
    let runLen = 1;
    while (
      i + runLen < len &&
      plane[i + runLen] === plane[i] &&
      runLen < 129
    ) {
      runLen++;
    }

    if (runLen >= 3) {
      // Repeat sequence: tag = 128 + (runLen - 2)
      result.push(128 + (runLen - 2));
      result.push(plane[i]);
      i += runLen;
    } else {
      // Literal sequence: gather until run or max 128
      let litStart = i;
      let litLen = 0;

      while (i < len && litLen < 128) {
        // Look ahead for run of 3+
        if (
          i + 2 < len &&
          plane[i] === plane[i + 1] &&
          plane[i] === plane[i + 2]
        ) {
          break;
        }
        litLen++;
        i++;
      }

      result.push(litLen - 1);
      for (let k = 0; k < litLen; k++) {
        result.push(plane[litStart + k]);
      }
    }
  }

  return new Uint8Array(result);
}

/**
 * Compresses all 4 planes with plane length headers
 */
export function compressPlanesRle(
  planes: Uint8Array[],
  bytesPerPlane: number
): { rleBytes: Uint8Array; totalRleSize: number } {
  const compressedPlanes = planes.map((p) => compressPlaneRle(p));
  // 4 planes * 2 bytes length header + compressed bytes
  let totalSize = 8;
  compressedPlanes.forEach((cp) => (totalSize += cp.length));

  const out = new Uint8Array(totalSize);
  let offset = 0;

  for (let p = 0; p < 4; p++) {
    const cp = compressedPlanes[p];
    // 2-byte little endian plane length
    out[offset++] = cp.length & 0xff;
    out[offset++] = (cp.length >> 8) & 0xff;
    out.set(cp, offset);
    offset += cp.length;
  }

  return { rleBytes: out, totalRleSize: totalSize };
}
