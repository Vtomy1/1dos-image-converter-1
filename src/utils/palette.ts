import { EgaColor, ColorDistanceMethod } from '../types/dos';

/**
 * Standard IBM PC EGA/VGA 16-color Default Palette (Mode 12h: 640x480 16-color)
 * Bitplanes correspond to IRGB:
 * Bit 0: Blue (Plane 0)
 * Bit 1: Green (Plane 1)
 * Bit 2: Red (Plane 2)
 * Bit 3: Intensity (Plane 3)
 */
export const EGA_PALETTE: readonly EgaColor[] = [
  { index: 0,  name: 'Black',         hex: '#000000', r: 0,   g: 0,   b: 0,   irgb: 0b0000 },
  { index: 1,  name: 'Blue',          hex: '#0000AA', r: 0,   g: 0,   b: 170, irgb: 0b0001 },
  { index: 2,  name: 'Green',         hex: '#00AA00', r: 0,   g: 170, b: 0,   irgb: 0b0010 },
  { index: 3,  name: 'Cyan',          hex: '#00AAAA', r: 0,   g: 170, b: 170, irgb: 0b0011 },
  { index: 4,  name: 'Red',           hex: '#AA0000', r: 170, g: 0,   b: 0,   irgb: 0b0100 },
  { index: 5,  name: 'Magenta',       hex: '#AA00AA', r: 170, g: 0,   b: 170, irgb: 0b0101 },
  { index: 6,  name: 'Brown',         hex: '#AA5500', r: 170, g: 85,  b: 0,   irgb: 0b0110 },
  { index: 7,  name: 'Light Gray',    hex: '#AAAAAA', r: 170, g: 170, b: 170, irgb: 0b0111 },
  { index: 8,  name: 'Dark Gray',     hex: '#555555', r: 85,  g: 85,  b: 85,  irgb: 0b1000 },
  { index: 9,  name: 'Light Blue',    hex: '#5555FF', r: 85,  g: 85,  b: 255, irgb: 0b1001 },
  { index: 10, name: 'Light Green',   hex: '#55FF55', r: 85,  g: 255, b: 85,  irgb: 0b1010 },
  { index: 11, name: 'Light Cyan',    hex: '#55FFFF', r: 85,  g: 255, b: 255, irgb: 0b1011 },
  { index: 12, name: 'Light Red',     hex: '#FF5555', r: 255, g: 85,  b: 85,  irgb: 0b1100 },
  { index: 13, name: 'Light Magenta', hex: '#FF55FF', r: 255, g: 85,  b: 255, irgb: 0b1101 },
  { index: 14, name: 'Yellow',        hex: '#FFFF55', r: 255, g: 255, b: 85,  irgb: 0b1110 },
  { index: 15, name: 'Bright White',  hex: '#FFFFFF', r: 255, g: 255, b: 255, irgb: 0b1111 },
];

/**
 * Calculates color distance between (r, g, b) and a target EGA color.
 * Uses either standard Euclidean distance or human visual perceptual weighted distance (Redmean).
 */
export function getColorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  method: ColorDistanceMethod = 'perceptual'
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;

  if (method === 'euclidean') {
    return dr * dr + dg * dg + db * db;
  }

  // Redmean color distance (accurate approximation of human eye sensitivity)
  const rmean = (r1 + r2) * 0.5;
  return (
    (2 + rmean / 256) * dr * dr +
    4.0 * dg * dg +
    (2 + (255 - rmean) / 256) * db * db
  );
}

/**
 * Finds closest EGA color index (0..15) for given RGB values.
 */
export function findNearestColorIndex(
  r: number,
  g: number,
  b: number,
  method: ColorDistanceMethod = 'perceptual'
): number {
  let bestDist = Infinity;
  let bestIdx = 0;

  for (let i = 0; i < 16; i++) {
    const c = EGA_PALETTE[i];
    const dist = getColorDistance(r, g, b, c.r, c.g, c.b, method);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}
