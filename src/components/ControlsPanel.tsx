import React, { useRef } from 'react';
import {
  DitherAlgorithm,
  ImageAdjustments,
  AspectMode,
  ColorDistanceMethod,
} from '../types/dos';
import { SAMPLE_PRESETS, SamplePreset } from '../utils/sampleImages';
import {
  Upload,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  RotateCcw,
  Maximize,
  Contrast,
  Sun,
  Eye,
  Download,
} from 'lucide-react';

interface ControlsPanelProps {
  algorithm: DitherAlgorithm;
  onChangeAlgorithm: (algo: DitherAlgorithm) => void;
  adjustments: ImageAdjustments;
  onChangeAdjustments: (adj: ImageAdjustments) => void;
  aspectMode: AspectMode;
  onChangeAspectMode: (mode: AspectMode) => void;
  colorMethod: ColorDistanceMethod;
  onChangeColorMethod: (method: ColorDistanceMethod) => void;
  onSelectSample: (preset: SamplePreset) => void;
  onUploadImage: (file: File) => void;
  onDownloadPng: () => void;
}

const ALGORITHMS: { id: DitherAlgorithm; label: string; desc: string }[] = [
  {
    id: 'floyd-steinberg',
    label: 'Floyd-Steinberg',
    desc: 'Classic 4-pixel error diffusion (7/16, 3/16, 5/16, 1/16)',
  },
  {
    id: 'floyd-steinberg-serpentine',
    label: 'Floyd-Steinberg (Serpentine)',
    desc: 'Alternates scanline directions to eliminate worm artifacts',
  },
  {
    id: 'atkinson',
    label: 'Atkinson',
    desc: 'Macintosh/HyperCard style. Preserves highlights and sharp edges',
  },
  {
    id: 'bayer-8x8',
    label: 'Bayer 8x8 (Ordered)',
    desc: 'Classic retro PC ordered cross-hatch matrix dithering',
  },
  {
    id: 'bayer-4x4',
    label: 'Bayer 4x4 (Ordered)',
    desc: 'Coarser, stylized 4x4 matrix ordered dithering',
  },
  {
    id: 'bayer-16x16',
    label: 'Bayer 16x16 (Fine)',
    desc: 'Ultra-fine 16x16 ordered matrix for smooth photographic gradients',
  },
  {
    id: 'burkes',
    label: 'Burkes',
    desc: '7-neighbor error diffusion with smooth tonal gradients',
  },
  {
    id: 'sierra-3',
    label: 'Sierra-3',
    desc: '3-row retro error diffusion with gentle transitions',
  },
  {
    id: 'sierra-lite',
    label: 'Sierra Lite',
    desc: 'Fast 3-pixel lightweight error diffusion',
  },
  {
    id: 'jarvis-judice-ninke',
    label: 'Jarvis, Judice & Ninke',
    desc: '12-neighbor large kernel for rich, smooth gradients',
  },
  {
    id: 'stucki',
    label: 'Stucki',
    desc: 'Clean 12-neighbor diffusion preserving contrast',
  },
  {
    id: 'none',
    label: 'Nearest Match (No Dithering)',
    desc: 'Direct color quantization / posterize to 16 EGA colors',
  },
];

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  algorithm,
  onChangeAlgorithm,
  adjustments,
  onChangeAdjustments,
  aspectMode,
  onChangeAspectMode,
  colorMethod,
  onChangeColorMethod,
  onSelectSample,
  onUploadImage,
  onDownloadPng,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSliderChange = (key: keyof ImageAdjustments, value: number) => {
    onChangeAdjustments({
      ...adjustments,
      [key]: value,
    });
  };

  const handleResetAdjustments = () => {
    onChangeAdjustments({
      brightness: 0,
      contrast: 15,
      saturation: 110,
      gamma: 1.0,
      sharpen: 20,
      ditherStrength: 85,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadImage(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadImage(e.dataTransfer.files[0]);
    }
  };

  return (
    <div id="controls-panel" className="space-y-4">
      {/* 1. Image Source & Upload Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 backdrop-blur shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            Image Source (640x480 Target)
          </span>
          <button
            id="download-png-btn"
            onClick={onDownloadPng}
            className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors"
            title="Download rendered 640x480 16-color PNG"
          >
            <Download className="w-3 h-3" />
            Save PNG
          </button>
        </div>

        {/* Drag & Drop Box */}
        <div
          id="image-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-amber-500/80 bg-slate-950/60 hover:bg-slate-950/90 p-3 rounded-xl cursor-pointer text-center transition-all group"
        >
          <input
            ref={fileInputRef}
            id="file-upload-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-2 text-slate-300 text-xs group-hover:text-amber-300 transition-colors">
            <Upload className="w-4 h-4 text-amber-400" />
            <span className="font-medium">Upload Image or Drag &amp; Drop</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Supports PNG, JPEG, WEBP, GIF, SVG • Auto-scaled to 640x480
          </p>
        </div>

        {/* Sample Presets */}
        <div className="mt-3">
          <div className="text-[11px] text-slate-400 font-medium mb-1.5">
            Or test with retro presets:
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                id={`sample-preset-${preset.id}`}
                onClick={() => onSelectSample(preset)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left text-xs transition-all flex flex-col"
              >
                <span className="font-semibold text-slate-200 truncate">
                  {preset.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio Scaling Mode */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Aspect Scaling:</span>
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 font-mono text-[11px]">
            <button
              id="aspect-mode-fit"
              onClick={() => onChangeAspectMode('fit')}
              className={`px-2 py-0.5 rounded ${
                aspectMode === 'fit'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Fit with black letterbox borders"
            >
              Fit
            </button>
            <button
              id="aspect-mode-crop"
              onClick={() => onChangeAspectMode('crop')}
              className={`px-2 py-0.5 rounded ${
                aspectMode === 'crop'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Crop to fill 640x480"
            >
              Crop
            </button>
            <button
              id="aspect-mode-stretch"
              onClick={() => onChangeAspectMode('stretch')}
              className={`px-2 py-0.5 rounded ${
                aspectMode === 'stretch'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Stretch to exact 640x480"
            >
              Stretch
            </button>
          </div>
        </div>
      </div>

      {/* 2. Dithering Algorithm Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 backdrop-blur shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Dithering Algorithm
          </span>
          <span className="text-[11px] font-mono text-amber-400">
            {ALGORITHMS.find((a) => a.id === algorithm)?.label}
          </span>
        </div>

        <select
          id="select-dither-algorithm"
          value={algorithm}
          onChange={(e) => onChangeAlgorithm(e.target.value as DitherAlgorithm)}
          className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 font-medium cursor-pointer"
        >
          {ALGORITHMS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>

        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
          {ALGORITHMS.find((a) => a.id === algorithm)?.desc}
        </p>

        {/* Dither Diffusion Strength Slider */}
        <div className="mt-3.5 pt-3 border-t border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Diffusion Strength:</span>
            <span className="font-mono text-amber-400">{adjustments.ditherStrength}%</span>
          </div>
          <input
            id="dither-strength-slider"
            type="range"
            min="0"
            max="100"
            value={adjustments.ditherStrength}
            onChange={(e) => handleSliderChange('ditherStrength', Number(e.target.value))}
            className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Color Distance Metric */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-slate-400">Color Distance:</span>
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 font-mono text-[11px]">
            <button
              id="color-method-perceptual"
              onClick={() => onChangeColorMethod('perceptual')}
              className={`px-2 py-0.5 rounded ${
                colorMethod === 'perceptual'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Perceptual human vision weighted redmean distance"
            >
              Perceptual
            </button>
            <button
              id="color-method-euclidean"
              onClick={() => onChangeColorMethod('euclidean')}
              className={`px-2 py-0.5 rounded ${
                colorMethod === 'euclidean'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Standard RGB Euclidean distance"
            >
              Euclidean
            </button>
          </div>
        </div>
      </div>

      {/* 3. Image Preprocessing & Adjustments */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 backdrop-blur shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Image Preprocessing
          </span>
          <button
            id="reset-adjustments-btn"
            onClick={handleResetAdjustments}
            className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
            title="Reset to default retro presets"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Contrast */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300">Contrast</span>
              <span className="font-mono text-amber-400">
                {adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}
              </span>
            </div>
            <input
              id="slider-contrast"
              type="range"
              min="-50"
              max="60"
              value={adjustments.contrast}
              onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Brightness */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300">Brightness</span>
              <span className="font-mono text-amber-400">
                {adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}
              </span>
            </div>
            <input
              id="slider-brightness"
              type="range"
              min="-60"
              max="60"
              value={adjustments.brightness}
              onChange={(e) => handleSliderChange('brightness', Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300">Saturation</span>
              <span className="font-mono text-amber-400">{adjustments.saturation}%</span>
            </div>
            <input
              id="slider-saturation"
              type="range"
              min="0"
              max="200"
              value={adjustments.saturation}
              onChange={(e) => handleSliderChange('saturation', Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Gamma */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300">Gamma Curve</span>
              <span className="font-mono text-amber-400">{adjustments.gamma.toFixed(2)}</span>
            </div>
            <input
              id="slider-gamma"
              type="range"
              min="0.5"
              max="2.2"
              step="0.05"
              value={adjustments.gamma}
              onChange={(e) => handleSliderChange('gamma', Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Sharpen */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-300">Edge Sharpening</span>
              <span className="font-mono text-amber-400">{adjustments.sharpen}%</span>
            </div>
            <input
              id="slider-sharpen"
              type="range"
              min="0"
              max="100"
              value={adjustments.sharpen}
              onChange={(e) => handleSliderChange('sharpen', Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
