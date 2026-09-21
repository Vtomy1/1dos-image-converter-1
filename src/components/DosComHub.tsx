import React, { useState } from 'react';
import { PlanarData } from '../types/dos';
import {
  generateDosComBinary,
  generateDosExeBinary,
  generateAsmSource,
  generateCHeader,
} from '../utils/comGenerator';
import {
  Download,
  Copy,
  Check,
  Terminal,
  FileCode,
  Binary,
  Cpu,
  Layers,
  AlertCircle,
  Code2,
} from 'lucide-react';

interface DosComHubProps {
  planar: PlanarData | null;
}

type ComTab = 'com' | 'asm' | 'cheader' | 'hex';

export const DosComHub: React.FC<DosComHubProps> = ({ planar }) => {
  const [activeTab, setActiveTab] = useState<ComTab>('com');
  const [copied, setCopied] = useState<string | null>(null);

  const asmSource = planar ? generateAsmSource(planar) : '';
  const cHeader = planar ? generateCHeader(planar) : '';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadBinary = (filename: string, data: Uint8Array) => {
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadText = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCom = () => {
    if (!planar) return;
    const comBytes = generateDosComBinary(planar);
    downloadBinary('IMAGE.COM', comBytes);
  };

  const handleDownloadExe = () => {
    if (!planar) return;
    const exeBytes = generateDosExeBinary(planar);
    downloadBinary('IMAGE.EXE', exeBytes);
  };

  // Extract first 48 bytes for disassembler display
  const getHeaderHexDump = () => {
    if (!planar) return [];
    const comBytes = generateDosComBinary(planar);
    const dump: { offset: string; hex: string; asm: string }[] = [
      { offset: '0100', hex: 'B8 12 00', asm: 'MOV AX, 0012h       ; Set VGA Mode 12h (640x480 16-color)' },
      { offset: '0103', hex: 'CD 10',    asm: 'INT 10h             ; Video BIOS interrupt' },
      { offset: '0105', hex: 'B8 00 A0', asm: 'MOV AX, 0A000h      ; Video Display Segment' },
      { offset: '0108', hex: '8E C0',    asm: 'MOV ES, AX          ; ES = 0A000h' },
      {
        offset: '010A',
        hex: `BE ${(comBytes[9] || 0).toString(16).padStart(2, '0').toUpperCase()} ${(comBytes[10] || 0).toString(16).padStart(2, '0').toUpperCase()}`,
        asm: 'MOV SI, offset data ; SI points to embedded RLE image stream',
      },
      { offset: '010D', hex: '31 ED',    asm: 'XOR BP, BP          ; Plane index = 0 (0..3)' },
      { offset: '010F', hex: 'BA C4 03', asm: 'MOV DX, 03C4h      ; Sequencer Address Port' },
      { offset: '0112', hex: 'B0 02',    asm: 'MOV AL, 02h         ; Index 2: Map Mask Register' },
      { offset: '0114', hex: 'EE',       asm: 'OUT DX, AL          ; Select Map Mask' },
      { offset: '0115', hex: '42',       asm: 'INC DX              ; Port 03C5h: Sequencer Data Port' },
      { offset: '0116', hex: 'B0 01',    asm: 'MOV AL, 01h         ; AL = 1' },
      { offset: '0118', hex: '89 E9',    asm: 'MOV CX, BP          ; CX = plane' },
      { offset: '011A', hex: 'D2 E0',    asm: 'SHL AL, CL          ; Plane bitmask = 1 << plane' },
      { offset: '011C', hex: 'EE',       asm: 'OUT DX, AL          ; Enable active bitplane only' },
      { offset: '011D', hex: 'AD',       asm: 'LODSW               ; AX = compressed plane length' },
      { offset: '011E', hex: '31 FF',    asm: 'XOR DI, DI          ; ES:DI = A000:0000 (plane start)' },
      { offset: '0120', hex: 'AC',       asm: 'LODSB               ; Read RLE tag byte' },
      { offset: '0121', hex: 'A8 80',    asm: 'TEST AL, 80h        ; Check repeat vs literal run' },
      { offset: '0123', hex: '75 0A',    asm: 'JNZ run_sequence    ; If bit 7 set, repeat run' },
      { offset: '0125', hex: '88 C1',    asm: 'MOV CL, AL          ; Literal count' },
      { offset: '0127', hex: '31 ED',    asm: 'XOR CH, CH          ; CX = count' },
      { offset: '0129', hex: '41',       asm: 'INC CX              ; CX = count + 1' },
      { offset: '012A', hex: 'F3 A4',    asm: 'REP MOVSB           ; Copy CX literal bytes to VRAM' },
      { offset: '012C', hex: 'EB 0D',    asm: 'JMP check_plane_done' },
      { offset: '012E', hex: '24 7F',    asm: 'AND AL, 7Fh         ; Repeat count mask' },
      { offset: '0130', hex: '04 02',    asm: 'ADD AL, 02h         ; Count + 2' },
      { offset: '0132', hex: '88 C1',    asm: 'MOV CL, AL' },
      { offset: '0134', hex: '31 ED',    asm: 'XOR CH, CH' },
      { offset: '0136', hex: 'AC',       asm: 'LODSB               ; Byte to repeat' },
      { offset: '0137', hex: 'F3 AA',    asm: 'REP STOSB           ; Fill ES:DI with AL CX times' },
      { offset: '0139', hex: '81 FF 00 96', asm: 'CMP DI, 9600h     ; Finished 38,400 bytes?' },
      { offset: '013D', hex: '72 DD',    asm: 'JB decomp_loop      ; Loop until plane filled' },
      { offset: '013F', hex: '45',       asm: 'INC BP              ; Next plane' },
      { offset: '0140', hex: '83 FD 04', asm: 'CMP BP, 04h         ; Finished 4 planes?' },
      { offset: '0143', hex: '72 CA',    asm: 'JB plane_loop' },
      { offset: '0145', hex: '30 E4',    asm: 'XOR AH, AH          ; INT 16h AH=00h (Wait keypress)' },
      { offset: '0147', hex: 'CD 16',    asm: 'INT 16h             ; Keyboard BIOS' },
      { offset: '0149', hex: 'B8 03 00', asm: 'MOV AX, 0003h       ; Restore 80x25 text mode' },
      { offset: '014C', hex: 'CD 10',    asm: 'INT 10h' },
      { offset: '014E', hex: 'B8 00 4C', asm: 'MOV AX, 4C00h       ; DOS exit terminate program' },
      { offset: '0151', hex: 'CD 21',    asm: 'INT 21h             ; DOS interrupt' },
    ];
    return dump;
  };

  const isComValid = planar?.isComCompatible ?? false;
  const comSize = planar ? planar.rleSize + 70 : 0;

  return (
    <div id="dos-com-hub" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur shadow-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold">
              x86 MS-DOS Executable
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              MS-DOS .COM Header &amp; Executable Center
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Real Mode 16-bit binary generation, x86 assembly, and standalone DOSBox/PC executables
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="download-dos-com-btn"
            onClick={handleDownloadCom}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Download standalone MS-DOS .COM executable"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download IMAGE.COM ({comSize.toLocaleString()} B)</span>
          </button>

          <button
            id="download-dos-exe-btn"
            onClick={handleDownloadExe}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
            title="Download MS-DOS MZ format .EXE executable"
          >
            <Binary className="w-3.5 h-3.5 text-amber-400" />
            <span>Download IMAGE.EXE</span>
          </button>
        </div>
      </div>

      {/* COM Size status banner */}
      <div className="my-3.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 font-mono">
            .COM Binary Size: <strong className="text-amber-400">{comSize.toLocaleString()}</strong> / 65,280 bytes
          </span>
          {isComValid ? (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
              Valid Standalone .COM
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Use .EXE or adjust contrast/dither
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Original Uncompressed Planar: 153,600 bytes • RLE Ratio:{' '}
          {planar ? ((planar.rleSize / 153600) * 100).toFixed(1) : 0}%
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-4 overflow-x-auto pb-1">
        <button
          id="com-tab-hex"
          onClick={() => setActiveTab('hex')}
          className={`px-3.5 py-2 text-xs font-mono font-semibold rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'hex'
              ? 'bg-amber-600/20 text-amber-400 border-b-2 border-amber-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Binary className="w-3.5 h-3.5" />
          <span>.COM Machine Code Disassembly (ORG 100h)</span>
        </button>

        <button
          id="com-tab-asm"
          onClick={() => setActiveTab('asm')}
          className={`px-3.5 py-2 text-xs font-mono font-semibold rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'asm'
              ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>IMAGE.ASM (NASM / TASM Source)</span>
        </button>

        <button
          id="com-tab-cheader"
          onClick={() => setActiveTab('cheader')}
          className={`px-3.5 py-2 text-xs font-mono font-semibold rounded-t-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'cheader'
              ? 'bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>IMAGE.H (Turbo C / Borland C++)</span>
        </button>
      </div>

      {/* Tab: Hex / Disassembly */}
      {activeTab === 'hex' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Real-mode x86 instruction header written directly into the MS-DOS .COM executable
            </span>
            <span className="font-mono text-amber-400 text-[11px]">
              Base IP: 0100h • 8086/286/386+ Compatible
            </span>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-3 font-mono text-xs max-h-[360px] overflow-y-auto">
            <div className="grid grid-cols-12 pb-2 mb-2 border-b border-slate-800 font-bold text-slate-400 text-[11px]">
              <span className="col-span-2">Offset</span>
              <span className="col-span-3">Machine Code</span>
              <span className="col-span-7">Disassembly &amp; Function</span>
            </div>
            <div className="space-y-1">
              {getHeaderHexDump().map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 hover:bg-slate-900/80 py-0.5 px-1 rounded transition-colors text-[11px]"
                >
                  <span className="col-span-2 text-slate-500 font-bold">
                    0x{row.offset}
                  </span>
                  <span className="col-span-3 text-amber-400 font-medium tracking-wider">
                    {row.hex}
                  </span>
                  <span className="col-span-7 text-emerald-300">
                    {row.asm}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Assembly Source */}
      {activeTab === 'asm' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Complete NASM / TASM source code ready to compile directly into .COM
            </span>
            <div className="flex items-center gap-2">
              <button
                id="copy-asm-source-btn"
                onClick={() => copyToClipboard(asmSource, 'asm')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1 transition-colors"
              >
                {copied === 'asm' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied === 'asm' ? 'Copied!' : 'Copy ASM'}</span>
              </button>
              <button
                id="download-asm-file-btn"
                onClick={() => downloadText('IMAGE.ASM', asmSource)}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download IMAGE.ASM</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 max-h-[360px] overflow-y-auto">
            <pre className="whitespace-pre leading-relaxed text-slate-200">
              {asmSource}
            </pre>
          </div>
        </div>
      )}

      {/* Tab: C Header */}
      {activeTab === 'cheader' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              C/C++ header for Turbo C / Borland C++ / Open Watcom with direct hardware port I/O
            </span>
            <div className="flex items-center gap-2">
              <button
                id="copy-c-header-btn"
                onClick={() => copyToClipboard(cHeader, 'cheader')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1 transition-colors"
              >
                {copied === 'cheader' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied === 'cheader' ? 'Copied!' : 'Copy Header'}</span>
              </button>
              <button
                id="download-c-header-btn"
                onClick={() => downloadText('IMAGE.H', cHeader)}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download IMAGE.H</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 max-h-[360px] overflow-y-auto">
            <pre className="whitespace-pre leading-relaxed text-slate-200">
              {cHeader}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
