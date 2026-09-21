import React, { useState, useEffect, useRef } from 'react';
import { PlanarData } from '../types/dos';
import { X, Play, RefreshCw, Terminal, Code, FastForward } from 'lucide-react';
import { generateQBasicLoaderCode } from '../utils/qbasicGenerator';

interface DosSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  planar: PlanarData | null;
}

type SimTab = 'com' | 'qbasic';
type SimState = 'idle' | 'running' | 'graphics' | 'done';

export const DosSimulatorModal: React.FC<DosSimulatorModalProps> = ({
  isOpen,
  onClose,
  planar,
}) => {
  const [simTab, setSimTab] = useState<SimTab>('com');
  const [simState, setSimState] = useState<SimState>('idle');
  const [activeLoadedPlanes, setActiveLoadedPlanes] = useState<number>(0); // 0 to 4
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize terminal text
  useEffect(() => {
    if (isOpen) {
      resetSimulation();
    }
  }, [isOpen, simTab]);

  const resetSimulation = () => {
    setSimState('idle');
    setActiveLoadedPlanes(0);
    if (simTab === 'com') {
      setTerminalLogs([
        'Microsoft(R) MS-DOS(R) Version 6.22',
        '             (C)Copyright Microsoft Corp 1981-1994.',
        '',
        'C:\\PICTURES> DIR *.COM',
        ' Volume in drive C is RETRO_DISK',
        ' Volume Serial Number is 1234-5678',
        ' Directory of C:\\PICTURES',
        '',
        `IMAGE    COM        ${planar ? planar.rleSize + 70 : 38400}  09-20-26  12:00p`,
        '         1 file(s)       bytes',
        '         1 dir(s)   42,949,672 bytes free',
        '',
        'C:\\PICTURES> SHOW.COM',
      ]);
    } else {
      setTerminalLogs([
        'Microsoft QBasic Version 1.1',
        'Copyright (C) Microsoft Corporation, 1987-1992.',
        '',
        'C:\\BASIC> QBASIC /RUN LOADER.BAS',
      ]);
    }
  };

  // Run simulation sequence
  const startSimulation = async () => {
    if (!planar) return;
    setSimState('running');
    setActiveLoadedPlanes(0);

    // Step 1: Terminal startup output
    if (simTab === 'com') {
      setTerminalLogs((prev) => [
        ...prev,
        'Executing x86 Machine Code at CS:0100h...',
        'INT 10h, AH=00h, AL=12h -> VGA 640x480 16-Color Graphic Mode Initialized.',
        'VRAM Target Segment: 0A000h',
      ]);
    } else {
      setTerminalLogs((prev) => [
        ...prev,
        'Compiling LOADER.BAS...',
        'Setting SCREEN 12 (640x480 16-Color)...',
        'Configuring Sequencer Port &H3C4 / &H3C5 Map Mask...',
      ]);
    }

    await new Promise((r) => setTimeout(r, 600));

    // Switch to graphic mode
    setSimState('graphics');

    // Simulate planes loading sequentially (demonstrates the authentic 4-plane EGA/VGA architecture!)
    for (let p = 1; p <= 4; p++) {
      await new Promise((r) => setTimeout(r, 350));
      setActiveLoadedPlanes(p);
    }

    setSimState('done');
  };

  // Draw current planes onto canvas
  useEffect(() => {
    if (simState !== 'graphics' && simState !== 'done') return;
    if (!planar || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 640;
    const height = 480;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Based on activeLoadedPlanes (0..4), mask out planes not yet loaded
    // Plane 0 = Bit 0 (1), Plane 1 = Bit 1 (2), Plane 2 = Bit 2 (4), Plane 3 = Bit 3 (8)
    const allowedMask = (1 << activeLoadedPlanes) - 1;

    for (let i = 0; i < width * height; i++) {
      const idx4 = i * 4;
      const rawColorIdx = planar.colorIndices[i];
      // Only keep bits for planes that have been loaded so far
      const visibleColorIdx = rawColorIdx & allowedMask;
      const color = planar.rgbaData;

      if (visibleColorIdx === rawColorIdx && activeLoadedPlanes === 4) {
        data[idx4] = color[idx4];
        data[idx4 + 1] = color[idx4 + 1];
        data[idx4 + 2] = color[idx4 + 2];
        data[idx4 + 3] = 255;
      } else {
        // Synthesize partial EGA color from active planes
        let r = 0,
          g = 0,
          b = 0;
        if (visibleColorIdx & 1) b += 170;
        if (visibleColorIdx & 2) g += 170;
        if (visibleColorIdx & 4) r += 170;
        if (visibleColorIdx & 8) {
          r = r === 0 ? 85 : 255;
          g = g === 0 ? 85 : 255;
          b = b === 0 ? 85 : 255;
        }

        data[idx4] = r;
        data[idx4 + 1] = g;
        data[idx4 + 2] = b;
        data[idx4 + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [simState, activeLoadedPlanes, planar]);

  if (!isOpen) return null;

  return (
    <div
      id="dos-simulator-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
    >
      <div
        id="dos-simulator-modal-window"
        className="w-full max-w-4xl bg-slate-950 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="font-mono text-sm font-semibold text-slate-200">
              MS-DOS / QBasic 4.5 Execution Environment
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                id="sim-tab-com"
                onClick={() => {
                  setSimTab('com');
                }}
                className={`px-3 py-1 rounded-md font-mono flex items-center gap-1.5 transition-all ${
                  simTab === 'com'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                MS-DOS SHOW.COM
              </button>
              <button
                id="sim-tab-qbasic"
                onClick={() => {
                  setSimTab('qbasic');
                }}
                className={`px-3 py-1 rounded-md font-mono flex items-center gap-1.5 transition-all ${
                  simTab === 'qbasic'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                QBasic LOADER.BAS
              </button>
            </div>

            <button
              id="close-sim-modal-btn"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Screen Content Area */}
        <div className="flex-1 overflow-auto bg-black p-4 flex flex-col items-center justify-center min-h-[420px] relative">
          {simState === 'idle' || simState === 'running' ? (
            // Terminal / Prompt Mode
            <div className="w-full h-full max-w-2xl bg-black p-6 rounded font-vt323 text-lg leading-relaxed text-emerald-400 flex flex-col justify-start">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="tracking-wide">
                  {log}
                </div>
              ))}
              {simState === 'running' && (
                <div className="mt-2 text-amber-400 animate-pulse">
                  &gt; In progress: Switching to Video Mode 12h (640x480)...
                </div>
              )}
              {simState === 'idle' && (
                <div className="mt-4 flex items-center gap-2 text-slate-400">
                  <span className="w-2.5 h-5 bg-emerald-400 inline-block animate-pulse" />
                  <span className="text-sm font-sans text-slate-400">
                    Click &quot;Run in MS-DOS&quot; below to launch video execution
                  </span>
                </div>
              )}
            </div>
          ) : (
            // Graphic Mode Screen
            <div className="relative w-full max-w-2xl aspect-[4/3] bg-black border-4 border-slate-800 rounded-lg overflow-hidden shadow-2xl flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="w-full h-full object-contain block image-rendering-pixelated"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* CRT scanlines overlay */}
              <div className="pointer-events-none absolute inset-0 crt-scanlines opacity-50" />

              {/* Hardware bitplane telemetry badge */}
              <div className="absolute top-3 left-3 bg-black/80 border border-slate-700 px-3 py-1.5 rounded text-xs font-mono text-slate-300 backdrop-blur">
                <div className="text-amber-400 font-bold mb-0.5">
                  EGA/VGA SCREEN 12 (640x480 16-Color)
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span>Active Bitplanes:</span>
                  <span className={activeLoadedPlanes >= 1 ? 'text-blue-400 font-bold' : 'text-slate-600'}>
                    [P0: Blue]
                  </span>
                  <span className={activeLoadedPlanes >= 2 ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                    [P1: Green]
                  </span>
                  <span className={activeLoadedPlanes >= 3 ? 'text-red-400 font-bold' : 'text-slate-600'}>
                    [P2: Red]
                  </span>
                  <span className={activeLoadedPlanes >= 4 ? 'text-white font-bold' : 'text-slate-600'}>
                    [P3: Intensity]
                  </span>
                </div>
              </div>

              {simState === 'done' && (
                <div className="absolute bottom-4 bg-slate-900/90 border border-amber-500/50 text-amber-300 px-4 py-2 rounded-lg font-mono text-xs shadow-lg animate-bounce">
                  Press any key to return to DOS (or click Return below)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-t border-slate-800">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              {simTab === 'com'
                ? 'MS-DOS COM Header Executable Simulation'
                : 'QBasic 4.5 SCREEN 12 4-Plane BLOAD Simulation'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {simState === 'graphics' || simState === 'done' ? (
              <button
                id="sim-return-dos-btn"
                onClick={resetSimulation}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Return to Prompt (INT 10h Mode 03h)
              </button>
            ) : null}

            {simState === 'idle' ? (
              <button
                id="sim-run-btn"
                onClick={startSimulation}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run {simTab === 'com' ? 'SHOW.COM' : 'LOADER.BAS'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
