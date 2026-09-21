/**
 * EGA/VGA 16-color 4-bit Planar Graphics Definitions
 */

export interface EgaColor {
  index: number;
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
  // EGA 6-bit RGB (rgbrgb) / VGA RGBI bitmask
  // Bit 0 = Blue, Bit 1 = Green, Bit 2 = Red, Bit 3 = Intensity
  irgb: number;
}

export type DitherAlgorithm =
  | 'floyd-steinberg'
  | 'floyd-steinberg-serpentine'
  | 'atkinson'
  | 'bayer-4x4'
  | 'bayer-8x8'
  | 'bayer-16x16'
  | 'burkes'
  | 'sierra-3'
  | 'sierra-lite'
  | 'jarvis-judice-ninke'
  | 'stucki'
  | 'none';

export type AspectMode = 'fit' | 'crop' | 'stretch';

export type ColorDistanceMethod = 'perceptual' | 'euclidean';

export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  saturation: number; // 0 to 200 (100 = default)
  gamma: number;      // 0.5 to 2.5 (1.0 = default)
  sharpen: number;    // 0 to 100
  ditherStrength: number; // 0 to 100
}

export interface PlanarData {
  width: number;
  height: number;
  bytesPerLine: number;
  bytesPerPlane: number;
  // 4 bitplanes:
  // Plane 0: Bit 0 (Blue)
  // Plane 1: Bit 1 (Green)
  // Plane 2: Bit 2 (Red)
  // Plane 3: Bit 3 (Intensity)
  plane0: Uint8Array;
  plane1: Uint8Array;
  plane2: Uint8Array;
  plane3: Uint8Array;
  // Color index per pixel (0..15)
  colorIndices: Uint8Array;
  // RGBA output image for canvas display
  rgbaData: Uint8ClampedArray;
  // Palette statistics
  colorCounts: number[];
  // RLE compressed total size
  rleSize: number;
  rleBytes: Uint8Array;
  isComCompatible: boolean; // <= 64KB for standalone .COM
}
