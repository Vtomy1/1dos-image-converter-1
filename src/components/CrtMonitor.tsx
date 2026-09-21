import React, { useRef, useEffect, useState } from 'react';
import { PlanarData } from '../types/dos';
import { EGA_PALETTE } from '../utils/palette';
import {
  Monitor,
  Maximize2,
  Minimize2,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  ZoomIn,
} from 'lucide-react';

interface CrtMonitorProps {
  planar: PlanarData | null;
  originalImage: ImageData | null;
  highlightColor: number | null;
  onOpenSimulator: () => void;
}

export type ViewPlane = 'composite' | 'plane0' | 'plane1' | 'plane2' | 'plane3';
export type CrtPhosphor = 'color' | 'green' | 'amber' | 'mono';

export const CrtMonitor: React.FC<CrtMonitorProps> = ({
  planar,
  originalImage,
  highlightColor,
  onOpenSimulator,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activePlane, setActivePlane] = useState<ViewPlane>('composite');
  const [enableScanlines, setEnableScanlines] = useState<boolean>(true);
  const [phosphor, setPhosphor] = useState<CrtPhosphor>('color');
  const [zoom, setZoom] = useState<'fit' | '1x' | '2x'>('fit');
  const [splitView, setSplitView] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0..100
  const [hoverPixel, setHoverPixel] = useState<{
    x: number;
    y: number;
    colorIdx: number;
  } | null>(null);

  // Render to canvas whenever planar data, view plane, phosphor, or highlight changes
  useEffect(() => {
    if (!planar || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 640;
    const height = 480;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    if (activePlane === 'composite') {
      // Full 16-color composite view
      const srcRgba = planar.rgbaData;
      const indices = planar.colorIndices;

      for (let i = 0; i < width * height; i++) {
        const idx4 = i * 4;
        const colorIdx = indices[i];

        if (highlightColor !== null && colorIdx !== highlightColor) {
          // Dim non-highlighted pixels
          data[idx4] = srcRgba[idx4] * 0.2;
          data[idx4 + 1] = srcRgba[idx4 + 1] * 0.2;
          data[idx4 + 2] = srcRgba[idx4 + 2] * 0.2;
          data[idx4 + 3] = 255;
        } else {
          let r = srcRgba[idx4];
          let g = srcRgba[idx4 + 1];
          let b = srcRgba[idx4 + 2];

          // Phosphor emulation
          if (phosphor === 'green') {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            r = 0;
            g = lum;
            b = 0;
          } else if (phosphor === 'amber') {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            r = Math.min(255, lum * 1.2);
            g = lum * 0.65;
            b = 0;
          } else if (phosphor === 'mono') {
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            r = lum;
            g = lum;
            b = lum;
          }

          data[idx4] = r;
          data[idx4 + 1] = g;
          data[idx4 + 2] = b;
          data[idx4 + 3] = 255;
        }
      }
    } else {
      // Single Bitplane view (1-bit mask)
      let targetPlane: Uint8Array;
      let tintR = 255,
        tintG = 255,
        tintB = 255;

      if (activePlane === 'plane0') {
        targetPlane = planar.plane0;
        tintR = 85;
        tintG = 85;
        tintB = 255; // Blue plane
      } else if (activePlane === 'plane1') {
        targetPlane = planar.plane1;
        tintR = 85;
        tintG = 255;
        tintB = 85; // Green plane
      } else if (activePlane === 'plane2') {
        targetPlane = planar.plane2;
        tintR = 255;
        tintG = 85;
        tintB = 85; // Red plane
      } else {
        targetPlane = planar.plane3;
        tintR = 255;
        tintG = 255;
        tintB = 255; // Intensity plane
      }

      for (let y = 0; y < height; y++) {
        const lineOffset = y * 80;
        for (let x = 0; x < width; x++) {
          const byteOffset = lineOffset + (x >> 3);
          const bitMask = 1 << (7 - (x & 7));
          const isSet = (targetPlane[byteOffset] & bitMask) !== 0;

          const idx4 = (y * width + x) * 4;
          if (isSet) {
            data[idx4] = tintR;
            data[idx4 + 1] = tintG;
            data[idx4 + 2] = tintB;
            data[idx4 + 3] = 255;
          } else {
            data[idx4] = 8;
            data[idx4 + 1] = 8;
            data[idx4 + 2] = 12;
            data[idx4 + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // If split view enabled and original image available, overlay the left side with original
    if (splitView && originalImage) {
      const splitPx = Math.floor((width * splitPos) / 100);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(originalImage, 0, 0);

      // Draw original on left side
      ctx.drawImage(
        tempCanvas,
        0,
        0,
        splitPx,
        height,
        0,
        0,
        splitPx,
        height
      );

      // Split divider line
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(splitPx - 1, 0, 2, height);
    }
  }, [planar, originalImage, activePlane, phosphor, highlightColor, splitView, splitPos]);

  // Handle canvas mouse move for pixel inspector
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!planar || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 640 / rect.width;
    const scaleY = 480 / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < 640 && y >= 0 && y < 480) {
      const idx = y * 640 + x;
      setHoverPixel({
        x,
        y,
        colorIdx: planar.colorIndices[idx],
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
  };

  const activeColor = hoverPixel ? EGA_PALETTE[hoverPixel.colorIdx] : null;

  return (
    <div id="crt-monitor-container" className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Monitor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs">
        {/* Plane Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <span className="px-2 py-1 text-slate-400 font-semibold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Plane:</span>
          </span>

          <button
            id="tab-plane-composite"
            onClick={() => setActivePlane('composite')}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
              activePlane === 'composite'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Composite (16-Color)
          </button>

          <button
            id="tab-plane-0"
            onClick={() => setActivePlane('plane0')}
            className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
              activePlane === 'plane0'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800'
            }`}
            title="Bit 0: Blue (Port &H3C5 = 1)"
          >
            P0: Blue
          </button>

          <button
            id="tab-plane-1"
            onClick={() => setActivePlane('plane1')}
            className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
              activePlane === 'plane1'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
            }`}
            title="Bit 1: Green (Port &H3C5 = 2)"
          >
            P1: Green
          </button>

          <button
            id="tab-plane-2"
            onClick={() => setActivePlane('plane2')}
            className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
              activePlane === 'plane2'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
            }`}
            title="Bit 2: Red (Port &H3C5 = 4)"
          >
            P2: Red
          </button>

          <button
            id="tab-plane-3"
            onClick={() => setActivePlane('plane3')}
            className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
              activePlane === 'plane3'
                ? 'bg-slate-200 text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Bit 3: Intensity (Port &H3C5 = 8)"
          >
            P3: Intensity
          </button>
        </div>

        {/* Display Controls (Scanlines, Phosphor, Split, Zoom) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Split View Toggle */}
          <button
            id="toggle-split-view-btn"
            onClick={() => setSplitView(!splitView)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all flex items-center gap-1.5 ${
              splitView
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Split comparison: Original 24-bit vs 4-bit EGA"
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden sm:inline">Split Compare</span>
          </button>

          {/* Scanlines Toggle */}
          <button
            id="toggle-scanlines-btn"
            onClick={() => setEnableScanlines(!enableScanlines)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
              enableScanlines
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle CRT scanline simulation"
          >
            Scanlines
          </button>

          {/* Phosphor Mode */}
          <select
            id="select-phosphor-mode"
            value={phosphor}
            onChange={(e) => setPhosphor(e.target.value as CrtPhosphor)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-md px-2 py-1 outline-none focus:border-amber-500"
            title="Select CRT phosphor simulation"
          >
            <option value="color">RGB Color</option>
            <option value="amber">Amber Phosphor</option>
            <option value="green">Green Phosphor</option>
            <option value="mono">Paper White</option>
          </select>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
            <button
              id="zoom-fit-btn"
              onClick={() => setZoom('fit')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                zoom === 'fit' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fit
            </button>
            <button
              id="zoom-1x-btn"
              onClick={() => setZoom('1x')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                zoom === '1x' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1x
            </button>
            <button
              id="zoom-2x-btn"
              onClick={() => setZoom('2x')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                zoom === '2x' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2x
            </button>
          </div>

          {/* Simulator Launch Button */}
          <button
            id="launch-dos-simulator-btn"
            onClick={onOpenSimulator}
            className="px-3 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Run simulated MS-DOS / QBasic execution"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Simulate DOS</span>
          </button>
        </div>
      </div>

      {/* Split Comparison Slider (when split mode active) */}
      {splitView && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-950 border-b border-slate-800/80 text-xs text-slate-400">
          <span className="font-mono text-[11px] text-amber-400">Original (24-bit RGB)</span>
          <input
            id="split-view-slider"
            type="range"
            min="5"
            max="95"
            value={splitPos}
            onChange={(e) => setSplitPos(Number(e.target.value))}
            className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-[11px] text-emerald-400">Dithered (4-bit Mode 12h)</span>
        </div>
      )}

      {/* CRT Screen Area with Authentic Bezel */}
      <div className="relative p-3 sm:p-6 bg-slate-950 flex items-center justify-center overflow-auto min-h-[380px]">
        {/* Retro Bezel Frame */}
        <div
          className={`relative rounded-xl overflow-hidden border-8 sm:border-12 border-slate-800/90 shadow-2xl bg-black ${
            phosphor === 'amber'
              ? 'crt-amber-glow'
              : 'crt-glow'
          }`}
          style={{
            maxWidth: zoom === '2x' ? '1280px' : zoom === '1x' ? '640px' : '100%',
            width: zoom === '2x' ? '1280px' : zoom === '1x' ? '640px' : '100%',
            aspectRatio: '4 / 3',
          }}
        >
          {/* Main 640x480 Canvas */}
          <canvas
            ref={canvasRef}
            id="crt-screen-canvas"
            width={640}
            height={480}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full h-full object-contain block image-rendering-pixelated cursor-crosshair"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* CRT Scanline Overlay */}
          {enableScanlines && (
            <div className="pointer-events-none absolute inset-0 crt-scanlines" />
          )}

          {/* Subtle curved screen reflection highlight */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/5" />
        </div>
      </div>

      {/* Bottom Status & Pixel Inspector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-950 border-t border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="font-semibold text-slate-200">VGA 640x480</span>
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="text-slate-400">Mode 12h (16 colors)</span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="text-slate-400">4 Planes (38,400 B/plane)</span>
        </div>

        {/* Pixel Hover Telemetry */}
        {hoverPixel && activeColor ? (
          <div className="flex items-center gap-2.5 bg-slate-900 px-3 py-1 rounded-md border border-slate-800">
            <div
              className="w-3.5 h-3.5 rounded-sm border border-white/20 shadow-sm"
              style={{ backgroundColor: activeColor.hex }}
            />
            <span className="text-slate-300 font-bold">
              X:{hoverPixel.x} Y:{hoverPixel.y}
            </span>
            <span className="text-amber-400">
              #{activeColor.index} {activeColor.name}
            </span>
            <span className="text-slate-500 hidden md:inline">
              VRAM Offset: &HA000:
              {(hoverPixel.y * 80 + (hoverPixel.x >> 3))
                .toString(16)
                .toUpperCase()
                .padStart(4, '0')}
              h (Bit {7 - (hoverPixel.x & 7)})
            </span>
          </div>
        ) : (
          <div className="text-slate-500 text-[11px] italic">
            Hover mouse over canvas to inspect pixel bitplanes and memory offsets
          </div>
        )}
      </div>
    </div>
  );
};
