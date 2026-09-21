import React from 'react';
import { EGA_PALETTE } from '../utils/palette';

interface PaletteBarProps {
  colorCounts: number[];
  highlightColor: number | null;
  onSelectColor: (index: number | null) => void;
}

export const PaletteBar: React.FC<PaletteBarProps> = ({
  colorCounts,
  highlightColor,
  onSelectColor,
}) => {
  const totalPixels = 640 * 480;

  return (
    <div id="ega-palette-bar" className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            EGA/VGA Standard 16-Color Palette (Mode 12h)
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            4-Bit Planar
          </span>
        </div>
        {highlightColor !== null && (
          <button
            id="clear-color-highlight-btn"
            onClick={() => onSelectColor(null)}
            className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
          >
            Clear Highlight ({EGA_PALETTE[highlightColor].name})
          </button>
        )}
      </div>

      <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5">
        {EGA_PALETTE.map((c) => {
          const count = colorCounts[c.index] || 0;
          const pct = ((count / totalPixels) * 100).toFixed(1);
          const isSelected = highlightColor === c.index;
          const isLight = c.r * 0.299 + c.g * 0.587 + c.b * 0.114 > 130;

          // IRGB bit representation
          const irgbStr = [
            (c.irgb & 8) ? 'I' : '-',
            (c.irgb & 4) ? 'R' : '-',
            (c.irgb & 2) ? 'G' : '-',
            (c.irgb & 1) ? 'B' : '-',
          ].join('');

          return (
            <button
              key={c.index}
              id={`palette-color-${c.index}`}
              onClick={() => onSelectColor(isSelected ? null : c.index)}
              title={`${c.index}: ${c.name} (${c.hex})\nIRGB: ${irgbStr}\nPixels: ${count.toLocaleString()} (${pct}%)`}
              className={`group relative flex flex-col items-center p-1 rounded-md transition-all text-left ${
                isSelected
                  ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 scale-105'
                  : 'hover:bg-slate-800/80'
              }`}
            >
              <div
                className="w-full h-7 rounded border border-black/40 shadow-inner flex items-center justify-center font-mono text-[10px] font-bold"
                style={{
                  backgroundColor: c.hex,
                  color: isLight ? '#000000' : '#ffffff',
                }}
              >
                {c.index}
              </div>
              <div className="w-full mt-1 flex flex-col text-[10px] leading-tight text-center">
                <span className="font-mono text-slate-400 font-medium truncate">
                  {pct}%
                </span>
                <span className="font-mono text-[9px] text-slate-500 hidden sm:inline">
                  {irgbStr}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
