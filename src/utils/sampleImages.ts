/**
 * Built-in retro sample images generated directly to 640x480 ImageData.
 */

export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  generate: () => ImageData;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'sunset-grid',
    name: 'Synthwave Sunset & Mountain',
    description: 'Smooth sky gradient, wireframe mountain grid, and glowing retro sun',
    generate: () => generateSunsetGrid(),
  },
  {
    id: 'space-nebula',
    name: 'Cosmic Nebula & Planet',
    description: 'Deep cosmic color transitions, starfield, and ringed planet',
    generate: () => generateCosmicNebula(),
  },
  {
    id: 'retro-pc',
    name: 'Vintage IBM PC & DOS Box',
    description: 'Classic 1980s personal computer, 5.25" floppy disk, and manual',
    generate: () => generateRetroHardware(),
  },
  {
    id: 'color-calibration',
    name: 'VGA Color Calibration Chart',
    description: 'RGB/CMYK gradient ramps, resolution test wedges, and geometry circles',
    generate: () => generateCalibrationChart(),
  },
];

function createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function generateSunsetGrid(): ImageData {
  const { canvas, ctx } = createCanvas();

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 300);
  skyGrad.addColorStop(0, '#0a0026');
  skyGrad.addColorStop(0.3, '#2a0845');
  skyGrad.addColorStop(0.6, '#64146e');
  skyGrad.addColorStop(0.85, '#e03e52');
  skyGrad.addColorStop(1, '#ffaa40');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 640, 300);

  // Stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) {
    const sx = (Math.sin(i * 997) * 0.5 + 0.5) * 640;
    const sy = (Math.cos(i * 613) * 0.5 + 0.5) * 200;
    const sSize = (i % 3 === 0) ? 2 : 1;
    ctx.fillRect(sx, sy, sSize, sSize);
  }

  // Giant glowing sun with horizontal blind stripes
  const sunX = 320;
  const sunY = 220;
  const sunR = 85;

  const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sunGrad.addColorStop(0, '#ffff55');
  sunGrad.addColorStop(0.5, '#ff5500');
  sunGrad.addColorStop(1, '#aa0055');

  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fillStyle = sunGrad;
  ctx.fill();

  // Cut horizontal stripes out of bottom half of sun
  ctx.fillStyle = '#1c0730';
  for (let sy = sunY - 5; sy < sunY + sunR; sy += 10) {
    const stripeH = Math.min(6, (sy - (sunY - 10)) * 0.15 + 1.5);
    ctx.fillRect(sunX - sunR - 10, sy, (sunR + 10) * 2, stripeH);
  }
  ctx.restore();

  // Distant polygon mountain silhouette
  ctx.fillStyle = '#180424';
  ctx.beginPath();
  ctx.moveTo(0, 300);
  const mountainPoints = [
    [0, 290], [60, 240], [120, 270], [180, 210], [240, 260],
    [320, 250], [400, 200], [480, 250], [540, 220], [600, 265], [640, 280]
  ];
  for (const pt of mountainPoints) {
    ctx.lineTo(pt[0], pt[1]);
  }
  ctx.lineTo(640, 300);
  ctx.closePath();
  ctx.fill();

  // Perspective 3D wireframe ground
  ctx.fillStyle = '#060112';
  ctx.fillRect(0, 300, 640, 180);

  // Ground grid lines radiating from horizon center
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1.2;
  const vanishingX = 320;
  const vanishingY = 300;

  for (let x = -400; x <= 1040; x += 60) {
    ctx.beginPath();
    ctx.moveTo(vanishingX, vanishingY);
    ctx.lineTo(x, 480);
    ctx.stroke();
  }

  // Horizontal perspective lines
  ctx.strokeStyle = '#ff00aa';
  for (let d = 1; d <= 12; d++) {
    const y = vanishingY + Math.pow(d / 12, 1.8) * 180;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(640, y);
    ctx.stroke();
  }

  // Vintage Badge / Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Fira Code", monospace';
  ctx.fillText('MS-DOS 640x480 VGA', 35, 45);
  ctx.fillStyle = '#00ffff';
  ctx.font = '14px "Fira Code", monospace';
  ctx.fillText('MODE 12h • 16 COLORS • 4 BITPLANES', 35, 70);

  return ctx.getImageData(0, 0, 640, 480);
}

function generateCosmicNebula(): ImageData {
  const { canvas, ctx } = createCanvas();

  // Dark deep space
  ctx.fillStyle = '#02020a';
  ctx.fillRect(0, 0, 640, 480);

  // Starfield
  for (let i = 0; i < 350; i++) {
    const sx = Math.floor(Math.abs(Math.sin(i * 743.1)) * 640);
    const sy = Math.floor(Math.abs(Math.cos(i * 317.9)) * 480);
    const brightness = Math.floor(100 + (i % 5) * 35);
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${Math.min(255, brightness + 40)})`;
    const sz = i % 25 === 0 ? 3 : i % 8 === 0 ? 2 : 1;
    ctx.fillRect(sx, sy, sz, sz);
  }

  // Nebula clouds with radial gradients
  const drawNebulaCloud = (cx: number, cy: number, r: number, color1: string, color2: string) => {
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    grad.addColorStop(0, color1);
    grad.addColorStop(0.5, color2);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  };

  drawNebulaCloud(220, 200, 240, 'rgba(180, 20, 160, 0.55)', 'rgba(30, 10, 100, 0.25)');
  drawNebulaCloud(420, 280, 200, 'rgba(0, 150, 220, 0.45)', 'rgba(0, 50, 120, 0.2)');
  drawNebulaCloud(300, 360, 180, 'rgba(230, 90, 30, 0.35)', 'rgba(120, 20, 40, 0.15)');

  // Ringed gas giant planet
  const px = 460;
  const py = 160;
  const pr = 65;

  const planetGrad = ctx.createRadialGradient(px - 25, py - 25, 5, px, py, pr);
  planetGrad.addColorStop(0, '#fde68a');
  planetGrad.addColorStop(0.4, '#d97706');
  planetGrad.addColorStop(0.7, '#78350f');
  planetGrad.addColorStop(1, '#1e1b4b');

  // Back half of rings
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-0.35);
  ctx.strokeStyle = 'rgba(210, 180, 140, 0.4)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.ellipse(0, 0, 140, 32, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Planet body
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fillStyle = planetGrad;
  ctx.fill();

  // Front half of rings
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-0.35);
  ctx.strokeStyle = 'rgba(245, 215, 175, 0.8)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.ellipse(0, 0, 140, 32, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  // Distant space exploration ship
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(140, 320);
  ctx.lineTo(190, 335);
  ctx.lineTo(140, 350);
  ctx.lineTo(155, 335);
  ctx.closePath();
  ctx.fill();

  // Engine plasma trail
  const engineGrad = ctx.createLinearGradient(135, 335, 60, 335);
  engineGrad.addColorStop(0, '#00ffff');
  engineGrad.addColorStop(0.5, '#0055ff');
  engineGrad.addColorStop(1, 'rgba(0,0,255,0)');
  ctx.fillStyle = engineGrad;
  ctx.fillRect(60, 332, 80, 6);

  ctx.fillStyle = '#55ffff';
  ctx.font = '16px "Fira Code", monospace';
  ctx.fillText('DEEP SPACE TELEMETRY - ORBIT 0x12', 30, 440);

  return ctx.getImageData(0, 0, 640, 480);
}

function generateRetroHardware(): ImageData {
  const { canvas, ctx } = createCanvas();

  // Warm retro desktop office background
  const wallGrad = ctx.createLinearGradient(0, 0, 0, 480);
  wallGrad.addColorStop(0, '#3a3d40');
  wallGrad.addColorStop(0.7, '#242729');
  wallGrad.addColorStop(1, '#181a1b');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, 640, 480);

  // Wood veneer desk
  const deskGrad = ctx.createLinearGradient(0, 340, 0, 480);
  deskGrad.addColorStop(0, '#543d2b');
  deskGrad.addColorStop(0.5, '#3b291a');
  deskGrad.addColorStop(1, '#21150c');
  ctx.fillStyle = deskGrad;
  ctx.fillRect(0, 340, 640, 140);

  // Desk highlight line
  ctx.fillStyle = '#7a5a3f';
  ctx.fillRect(0, 340, 640, 3);

  // Vintage beige computer monitor body
  const monX = 140;
  const monY = 70;
  const monW = 360;
  const monH = 260;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(monX + 15, monY + monH - 10, monW, 30);

  // Bezel outer
  ctx.fillStyle = '#c8baa1';
  ctx.fillRect(monX, monY, monW, monH);

  // Bezel 3D bevels
  ctx.fillStyle = '#ded4be';
  ctx.fillRect(monX, monY, monW, 8);
  ctx.fillRect(monX, monY, 8, monH);
  ctx.fillStyle = '#948873';
  ctx.fillRect(monX, monY + monH - 8, monW, 8);
  ctx.fillRect(monX + monW - 8, monY, 8, monH);

  // Inner CRT screen recess
  const crtX = monX + 35;
  const crtY = monY + 30;
  const crtW = monW - 70;
  const crtH = monH - 75;

  ctx.fillStyle = '#1c1b18';
  ctx.fillRect(crtX - 4, crtY - 4, crtW + 8, crtH + 8);

  // CRT Phosphor screen (active DOS prompt)
  ctx.fillStyle = '#061a06';
  ctx.fillRect(crtX, crtY, crtW, crtH);

  // Authentic glowing DOS green text on monitor
  ctx.fillStyle = '#33ff33';
  ctx.font = '13px "VT323", "Fira Code", monospace';
  ctx.fillText('Starting MS-DOS 6.22...', crtX + 16, crtY + 28);
  ctx.fillText('HIMEM is testing extended memory...done.', crtX + 16, crtY + 46);
  ctx.fillText('C:\\> QBASIC /RUN LOADER.BAS', crtX + 16, crtY + 75);
  ctx.fillText('Loading 640x480 EGA/VGA bitplanes...', crtX + 16, crtY + 95);
  ctx.fillText('[OK] Plane 0 (Blue) -> &HA000', crtX + 16, crtY + 115);
  ctx.fillText('[OK] Plane 1 (Green) -> &HA000', crtX + 16, crtY + 130);
  ctx.fillText('[OK] Plane 2 (Red) -> &HA000', crtX + 16, crtY + 145);
  ctx.fillText('[OK] Plane 3 (Intensity) -> &HA000', crtX + 16, crtY + 160);

  // Monitor power LED
  ctx.fillStyle = '#00ff00';
  ctx.beginPath();
  ctx.arc(monX + monW - 35, monY + monH - 22, 4, 0, Math.PI * 2);
  ctx.fill();

  // 5.25" Floppy Disk on desk
  const fX = 490;
  const fY = 360;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(fX, fY, 110, 105);
  // Floppy label
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(fX + 15, fY + 10, 80, 35);
  ctx.fillStyle = '#cc0000';
  ctx.fillRect(fX + 15, fY + 10, 80, 6);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 9px monospace';
  ctx.fillText('QUICKBASIC 4.5', fX + 18, fY + 28);
  ctx.fillText('DISK 1 OF 3', fX + 18, fY + 39);
  // Read/write head window
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.ellipse(fX + 55, fY + 75, 12, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, 640, 480);
}

function generateCalibrationChart(): ImageData {
  const { canvas, ctx } = createCanvas();

  // Neutral background
  ctx.fillStyle = '#222222';
  ctx.fillRect(0, 0, 640, 480);

  // Outer border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 620, 460);

  // 16 Standard EGA Color Bar Ramp
  const barW = 600 / 16;
  const egaHexes = [
    '#000000', '#0000AA', '#00AA00', '#00AAAA',
    '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
    '#555555', '#5555FF', '#55FF55', '#55FFFF',
    '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
  ];

  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = egaHexes[i];
    ctx.fillRect(20 + i * barW, 25, barW, 55);
    ctx.fillStyle = (i === 0 || i === 1 || i === 4 || i === 8) ? '#ffffff' : '#000000';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`${i}`, 25 + i * barW, 58);
  }

  // Smooth Grayscale Ramp (tests error diffusion smoothly!)
  const grayGrad = ctx.createLinearGradient(20, 0, 620, 0);
  grayGrad.addColorStop(0, '#000000');
  grayGrad.addColorStop(1, '#ffffff');
  ctx.fillStyle = grayGrad;
  ctx.fillRect(20, 95, 600, 40);

  // Smooth RGB/CMYK Ramps
  const spectrumGrad = ctx.createLinearGradient(20, 0, 620, 0);
  spectrumGrad.addColorStop(0, '#ff0000');
  spectrumGrad.addColorStop(0.17, '#ffff00');
  spectrumGrad.addColorStop(0.33, '#00ff00');
  spectrumGrad.addColorStop(0.5, '#00ffff');
  spectrumGrad.addColorStop(0.67, '#0000ff');
  spectrumGrad.addColorStop(0.83, '#ff00ff');
  spectrumGrad.addColorStop(1, '#ff0000');
  ctx.fillStyle = spectrumGrad;
  ctx.fillRect(20, 145, 600, 40);

  // Concentric Resolution Circles
  const cx = 180;
  const cy = 300;
  for (let r = 10; r <= 85; r += 8) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = (r % 16 === 0) ? '#ff5555' : '#55ffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Frequency line wedges (Moire / dither test)
  const wx = 440;
  const wy = 300;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + Math.cos(a) * 90, wy + Math.sin(a) * 90);
    ctx.stroke();
  }

  // Center target
  ctx.fillStyle = '#ffff55';
  ctx.beginPath();
  ctx.arc(wx, wy, 8, 0, Math.PI * 2);
  ctx.fill();

  // Test label
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px "Fira Code", monospace';
  ctx.fillText('EGA/VGA MODE 12h CALIBRATION (640x480)', 160, 430);
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '12px "Fira Code", monospace';
  ctx.fillText('Aspect Ratio 4:3 • 4 Bitplanes • 80 Bytes/Line', 185, 450);

  return ctx.getImageData(0, 0, 640, 480);
}
