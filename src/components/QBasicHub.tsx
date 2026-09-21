import React, { useState } from 'react';
import { PlanarData } from '../types/dos';
import {
  generateQBasicLoaderCode,
  generateQBasicSaverCode,
  generateQBasicUnifiedLoaderCode,
  createBsaveFile,
} from '../utils/qbasicGenerator';
import {
  Download,
  Copy,
  Check,
  Code2,
  FileCode,
  HardDrive,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface QBasicHubProps {
  planar: PlanarData | null;
}

type QBasicTab = 'loader' | 'saver' | 'unified' | 'architecture';

export const QBasicHub: React.FC<QBasicHubProps> = ({ planar }) => {
  const [activeTab, setActiveTab] = useState<QBasicTab>('loader');
  const [copied, setCopied] = useState<string | null>(null);

  const loaderCode = generateQBasicLoaderCode('IMAGE');
  const saverCode = generateQBasicSaverCode('SAVED');
  const unifiedCode = generateQBasicUnifiedLoaderCode('IMAGE.BIN');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBinaryFile = (filename: string, data: Uint8Array) => {
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download individual plane BSV file
  const downloadPlaneBsv = (planeIndex: number) => {
    if (!planar) return;
    const planeData =
      planeIndex === 0
        ? planar.plane0
        : planeIndex === 1
        ? planar.plane1
        : planeIndex === 2
        ? planar.plane2
        : planar.plane3;

    const bsaveFile = createBsaveFile(planeData, 0xa000, 0x0000);
    downloadBinaryFile(`PLANE${planeIndex}.BSV`, bsaveFile);
  };

  // Download all 4 planes plus the loader in sequence
  const downloadAllBsvFiles = () => {
    if (!planar) return;
    downloadPlaneBsv(0);
    setTimeout(() => downloadPlaneBsv(1), 200);
    setTimeout(() => downloadPlaneBsv(2), 400);
    setTimeout(() => downloadPlaneBsv(3), 600);
    setTimeout(() => downloadTextFile('LOADER.BAS', loaderCode), 800);
  };

  // Download raw 153.6KB binary file (all 4 planes concatenated)
  const downloadUnifiedBinary = () => {
    if (!planar) return;
    const combined = new Uint8Array(153600);
    combined.set(planar.plane0, 0);
    combined.set(planar.plane1, 38400);
    combined.set(planar.plane2, 76800);
    combined.set(planar.plane3, 115200);
    downloadBinaryFile('IMAGE.BIN', combined);
  };

  return (
    <div id="qbasic-bsave-hub" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur shadow-xl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono font-semibold">
              QuickBASIC 4.5 / QBasic 1.1
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              EGA/VGA 4-Plane BSAVE Saver & Loader Center
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Hardware planar registers, 7-byte BSAVE format (&HFD), and production QBasic code samples
          </p>
        </div>

        {/* Action Downloads for QBasic files */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="download-all-bsv-btn"
            onClick={downloadAllBsvFiles}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Download PLANE0.BSV through PLANE3.BSV and LOADER.BAS"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All 4 Planes + Loader</span>
          </button>
        </div>
      </div>

      {/* Plane BSAVE Quick Download Buttons Bar */}
      <div className="my-4 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            Direct .BSV File Downloads (38,407 bytes each with &HFD header):
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            Target VRAM: &HA000:0000
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            id="download-plane-0-bsv"
            onClick={() => downloadPlaneBsv(0)}
            className="px-3 py-2 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/60 text-blue-300 text-xs font-mono flex items-center justify-between group transition-all"
          >
            <div className="flex flex-col text-left">
              <span className="font-bold">PLANE0.BSV</span>
              <span className="text-[10px] text-blue-400/80">Bit 0: Blue</span>
            </div>
            <Download className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
          </button>

          <button
            id="download-plane-1-bsv"
            onClick={() => downloadPlaneBsv(1)}
            className="px-3 py-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-xs font-mono flex items-center justify-between group transition-all"
          >
            <div className="flex flex-col text-left">
              <span className="font-bold">PLANE1.BSV</span>
              <span className="text-[10px] text-emerald-400/80">Bit 1: Green</span>
            </div>
            <Download className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </button>

          <button
            id="download-plane-2-bsv"
            onClick={() => downloadPlaneBsv(2)}
            className="px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-mono flex items-center justify-between group transition-all"
          >
            <div className="flex flex-col text-left">
              <span className="font-bold">PLANE2.BSV</span>
              <span className="text-[10px] text-red-400/80">Bit 2: Red</span>
            </div>
            <Download className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
          </button>

          <button
            id="download-plane-3-bsv"
            onClick={() => downloadPlaneBsv(3)}
            className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-600/60 text-slate-200 text-xs font-mono flex items-center justify-between group transition-all"
          >
            <div className="flex flex-col text-left">
              <span className="font-bold">PLANE3.BSV</span>
              <span className="text-[10px] text-slate-400">Bit 3: Intensity</span>
            </div>
            <Download className="w-3.5 h-3.5 text-slate-300 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-4 overflow-x-auto pb-1">
        <button
          id="qbasic-tab-loader"
          onClick={() => setActiveTab('loader')}
          className={`px-3.5 py-2 text-xs font-mono font-semibold rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'loader'
              ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>LOADER.BAS (4-Plane BLOAD)</span>
        </button>

        <button
          id="qbasic-tab-saver"
          onClick={() => setActiveTab('saver')}
          className={`px-3.5 py-2 text-xs font-mono font-semibold rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'saver'
              ? 'bg-amber-600/20 text-amber-400 border-b-2 border-amber-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>SAVER.BAS (4-Plane BSAVE)</span>
        </button>

        <button
          id="qbasic-tab-unified"
          onClick={() => setActiveTab('unified')}
          className={`px-3.5 py-2 text-xs font-mono font-semibold rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'unified'
              ? 'bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>UNIFIED.BAS (1-File Binary)</span>
        </button>

        <button
          id="qbasic-tab-architecture"
          onClick={() => setActiveTab('architecture')}
          className={`px-3.5 py-2 text-xs font-mono font-semibold rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'architecture'
              ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>EGA/VGA Port Architecture Reference</span>
        </button>
      </div>

      {/* Tab 1: Loader Code */}
      {activeTab === 'loader' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Loads 4 separate plane files into SCREEN 12 (&HA000) using Sequencer Map Mask (&H3C4 / &H3C5)
            </span>
            <div className="flex items-center gap-2">
              <button
                id="copy-loader-code-btn"
                onClick={() => copyToClipboard(loaderCode, 'loader')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1 transition-colors"
              >
                {copied === 'loader' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied === 'loader' ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <button
                id="download-loader-bas-btn"
                onClick={() => downloadTextFile('LOADER.BAS', loaderCode)}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download LOADER.BAS</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#000084] p-4 text-white font-mono text-xs shadow-inner max-h-[380px] overflow-y-auto">
            <div className="text-amber-300 font-bold mb-2 pb-1 border-b border-blue-400/30 flex justify-between">
              <span>QuickBASIC 4.5 Editor - [LOADER.BAS]</span>
              <span>Shift+F5=Run</span>
            </div>
            <pre className="whitespace-pre text-slate-100 leading-relaxed">
              {loaderCode}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 2: Saver Code */}
      {activeTab === 'saver' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Dumps the active SCREEN 12 video display buffer into 4 bitplane .BSV files using Graphics Controller (&H3CE / &H3CF)
            </span>
            <div className="flex items-center gap-2">
              <button
                id="copy-saver-code-btn"
                onClick={() => copyToClipboard(saverCode, 'saver')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1 transition-colors"
              >
                {copied === 'saver' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied === 'saver' ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <button
                id="download-saver-bas-btn"
                onClick={() => downloadTextFile('SAVER.BAS', saverCode)}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-mono font-semibold flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download SAVER.BAS</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#000084] p-4 text-white font-mono text-xs shadow-inner max-h-[380px] overflow-y-auto">
            <div className="text-amber-300 font-bold mb-2 pb-1 border-b border-blue-400/30 flex justify-between">
              <span>QuickBASIC 4.5 Editor - [SAVER.BAS]</span>
              <span>Shift+F5=Run</span>
            </div>
            <pre className="whitespace-pre text-slate-100 leading-relaxed">
              {saverCode}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 3: Unified Single-File Loader */}
      {activeTab === 'unified' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Loads all 4 planes from a single 153,600-byte binary file (IMAGE.BIN)
            </span>
            <div className="flex items-center gap-2">
              <button
                id="download-image-bin-btn"
                onClick={downloadUnifiedBinary}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download IMAGE.BIN (153.6 KB)</span>
              </button>
              <button
                id="download-unified-bas-btn"
                onClick={() => downloadTextFile('UNIFIED.BAS', unifiedCode)}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download UNIFIED.BAS</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#000084] p-4 text-white font-mono text-xs shadow-inner max-h-[380px] overflow-y-auto">
            <div className="text-amber-300 font-bold mb-2 pb-1 border-b border-blue-400/30 flex justify-between">
              <span>QuickBASIC 4.5 Editor - [UNIFIED.BAS]</span>
              <span>Shift+F5=Run</span>
            </div>
            <pre className="whitespace-pre text-slate-100 leading-relaxed">
              {unifiedCode}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 4: Architecture Reference */}
      {activeTab === 'architecture' && (
        <div className="space-y-4 text-xs font-mono text-slate-300 bg-slate-950/80 p-5 rounded-xl border border-slate-800">
          <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            EGA/VGA 4-Bit 640x480 Planar Memory Architecture
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
            <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-emerald-400">
                1. WRITING (BLOAD / Sequencer Mask)
              </span>
              <p className="text-slate-400 font-sans text-xs">
                To write to a specific bitplane, you configure the{' '}
                <strong className="text-slate-200">Sequencer Map Mask Register</strong>.
                Writing a byte to A000:xxxx broadcasts bits into only the planes enabled by the mask!
              </p>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80 space-y-1">
                <div>Port &H3C4 = 2 (Address register: Map Mask)</div>
                <div>Port &H3C5 = 2 ^ Plane% (Data register: plane bitmask)</div>
                <div className="text-slate-500 text-[11px]">
                  Plane 0 (Blue): 1 | Plane 1 (Green): 2 | Plane 2 (Red): 4 | Plane 3 (Intensity): 8
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-amber-400">
                2. READING (BSAVE / Graphics Controller)
              </span>
              <p className="text-slate-400 font-sans text-xs">
                To read from a specific bitplane, you configure the{' '}
                <strong className="text-slate-200">Graphics Controller Read Map Select</strong>.
                Reading from A000:xxxx returns bytes from only the chosen plane!
              </p>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80 space-y-1">
                <div>Port &H3CE = 4 (Address register: Read Map Select)</div>
                <div>Port &H3CF = Plane% (Data register: plane index 0..3)</div>
                <div className="text-slate-500 text-[11px]">
                  Plane 0: 0 | Plane 1: 1 | Plane 2: 2 | Plane 3: 3
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 space-y-2">
            <span className="font-bold text-blue-400">
              3. QuickBASIC BSAVE Header Format (7 Bytes):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-amber-400 font-bold">&HFD (253)</div>
                <div className="text-[10px] text-slate-500">Byte 0: Magic Signature</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-amber-400 font-bold">&H00, &HA0</div>
                <div className="text-[10px] text-slate-500">Bytes 1-2: Segment (&HA000)</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-amber-400 font-bold">&H00, &H00</div>
                <div className="text-[10px] text-slate-500">Bytes 3-4: Offset (0)</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-amber-400 font-bold">&H00, &H96</div>
                <div className="text-[10px] text-slate-500">Bytes 5-6: Length (38,400)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
