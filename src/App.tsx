import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DitherAlgorithm,
  ImageAdjustments,
  AspectMode,
  ColorDistanceMethod,
  PlanarData,
} from './types/dos';
import { ditherImageToPlanar } from './utils/dithering';
import { SAMPLE_PRESETS, SamplePreset } from './utils/sampleImages';
import { CrtMonitor } from './components/CrtMonitor';
import { PaletteBar } from './components/PaletteBar';
import { ControlsPanel } from './components/ControlsPanel';
import { QBasicHub } from './components/QBasicHub';
import { DosComHub } from './components/DosComHub';
import { DosSimulatorModal } from './components/DosSimulatorModal';
import {
  Terminal,
  Code2,
  HardDrive,
  Download,
  Play,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

export default function App() {
  // Image State
  const [sourceImageData, setSourceImageData] = useState<ImageData | null>(null);
  const [sourceImageRaw, setSourceImageRaw] = useState<HTMLImageElement | null>(null);

  // Dithering & Conversion Settings
  const [algorithm, setAlgorithm] = useState<DitherAlgorithm>('floyd-steinberg');
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 0,
    contrast: 15,
    saturation: 110,
    gamma: 1.0,
    sharpen: 20,
    ditherStrength: 85,
  });
  const [aspectMode, setAspectMode] = useState<AspectMode>('fit');
  const [colorMethod, setColorMethod] = useState<ColorDistanceMethod>('perceptual');

  // Interactive UI state
  const [highlightColor, setHighlightColor] = useState<number | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [activeExportTab, setActiveExportTab] = useState<'qbasic' | 'doscom'>('qbasic');

  // Load initial preset (Sunset Grid)
  useEffect(() => {
    const initialPreset = SAMPLE_PRESETS[0];
    const initialData = initialPreset.generate();
    setSourceImageData(initialData);
  }, []);

  // Process raw HTMLImageElement into 640x480 ImageData respecting aspectMode
  const processImageElement = useCallback(
    (img: HTMLImageElement, mode: AspectMode) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d')!;

      // Clear background to black (standard retro border)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 640, 480);

      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;

      if (mode === 'stretch') {
        ctx.drawImage(img, 0, 0, 640, 480);
      } else if (mode === 'fit') {
        const scale = Math.min(640 / srcW, 480 / srcH);
        const destW = srcW * scale;
        const destH = srcH * scale;
        const destX = (640 - destW) / 2;
        const destY = (480 - destH) / 2;
        ctx.drawImage(img, destX, destY, destW, destH);
      } else {
        // crop to fill
        const scale = Math.max(640 / srcW, 480 / srcH);
        const destW = srcW * scale;
        const destH = srcH * scale;
        const destX = (640 - destW) / 2;
        const destY = (480 - destH) / 2;
        ctx.drawImage(img, destX, destY, destW, destH);
      }

      const imgData = ctx.getImageData(0, 0, 640, 480);
      setSourceImageData(imgData);
    },
    []
  );

  // Handle image upload from file or paste
  const handleUploadFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setSourceImageRaw(img);
          processImageElement(img, aspectMode);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    },
    [aspectMode, processImageElement]
  );

  // Re-process when aspect mode changes with active raw image
  const handleChangeAspectMode = (mode: AspectMode) => {
    setAspectMode(mode);
    if (sourceImageRaw) {
      processImageElement(sourceImageRaw, mode);
    }
  };

  // Handle Preset Selection
  const handleSelectPreset = (preset: SamplePreset) => {
    setSourceImageRaw(null);
    const data = preset.generate();
    setSourceImageData(data);
  };

  // Global paste handler for quick Ctrl+V of images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          handleUploadFile(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleUploadFile]);

  // Compute 4-bit 640x480 Planar Data via high-speed dithering engine
  const planarData: PlanarData | null = useMemo(() => {
    if (!sourceImageData) return null;
    return ditherImageToPlanar(
      sourceImageData.data,
      640,
      480,
      algorithm,
      adjustments,
      colorMethod
    );
  }, [sourceImageData, algorithm, adjustments, colorMethod]);

  // Download rendered 640x480 PNG
  const handleDownloadPng = () => {
    if (!planarData) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(640, 480);
    imgData.data.set(planarData.rgbaData);
    ctx.putImageData(imgData, 0, 0);

    const link = document.createElement('a');
    link.download = 'RETRO_640X480.PNG';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div id="retrodos-app" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Application Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/90 backdrop-blur-md px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Brand & Mode Badges */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/10">
              <Terminal className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  RetroDOS 4-Bit Dithering Studio
                </h1>
                <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  VGA MODE 12h (640x480)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                4-Plane EGA/VGA Quantization • MS-DOS .COM Executables • QBasic BSAVE Loaders &amp; Savers
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              id="top-sim-btn"
              onClick={() => setIsSimulatorOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              title="Launch interactive MS-DOS / QBasic live simulator"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulate in DOS</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        {/* Main Grid: CRT Monitor on Left / Controls on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: CRT Display & Palette Bar (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-4">
            <CrtMonitor
              planar={planarData}
              originalImage={sourceImageData}
              highlightColor={highlightColor}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />

            {planarData && (
              <PaletteBar
                colorCounts={planarData.colorCounts}
                highlightColor={highlightColor}
                onSelectColor={setHighlightColor}
              />
            )}
          </div>

          {/* Right Column: Controls & Adjustments (4 cols on lg) */}
          <div className="lg:col-span-4">
            <ControlsPanel
              algorithm={algorithm}
              onChangeAlgorithm={setAlgorithm}
              adjustments={adjustments}
              onChangeAdjustments={setAdjustments}
              aspectMode={aspectMode}
              onChangeAspectMode={handleChangeAspectMode}
              colorMethod={colorMethod}
              onChangeColorMethod={setColorMethod}
              onSelectSample={handleSelectPreset}
              onUploadImage={handleUploadFile}
              onDownloadPng={handleDownloadPng}
            />
          </div>
        </div>

        {/* Export & Code Sample Section (Full Width) */}
        <div className="space-y-3 pt-2">
          {/* Segmented Switcher for QBasic vs MS-DOS COM */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Export &amp; Code Generation:
              </span>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  id="tab-btn-qbasic"
                  onClick={() => setActiveExportTab('qbasic')}
                  className={`px-3.5 py-1.5 rounded-lg font-mono font-semibold flex items-center gap-2 transition-all ${
                    activeExportTab === 'qbasic'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>QBasic BSAVE 4-Plane Center</span>
                </button>

                <button
                  id="tab-btn-doscom"
                  onClick={() => setActiveExportTab('doscom')}
                  className={`px-3.5 py-1.5 rounded-lg font-mono font-semibold flex items-center gap-2 transition-all ${
                    activeExportTab === 'doscom'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>MS-DOS .COM Executable Center</span>
                </button>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-500">
              <span>Resolution: 640x480</span>
              <span>•</span>
              <span>153,600 Bytes Planar</span>
            </div>
          </div>

          {/* Active Export Hub */}
          {activeExportTab === 'qbasic' ? (
            <QBasicHub planar={planarData} />
          ) : (
            <DosComHub planar={planarData} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-xs text-slate-500 text-center font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            RetroDOS 4-Bit 640x480 Dithering Studio • IBM PC EGA/VGA Mode 12h Standard
          </span>
          <span className="text-slate-600">
            Sequencer Map Mask (Port 3C4h/3C5h) &amp; Graphics Controller (Port 3CEh/3CFh)
          </span>
        </div>
      </footer>

      {/* Simulated DOS Execution Modal */}
      <DosSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        planar={planarData}
      />
    </div>
  );
}
