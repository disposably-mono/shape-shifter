// src/ui/start-canvas.ts
// Start-screen shape-morphing canvas animation

let startPalette = ['#ef476f', '#06d6a0', '#118ab2', '#ffd166', '#ffffff'];
let orbitColors = ['#ef476f', '#ffd166', '#118ab2', '#06d6a0'];
let canvasShape      = 0;
let canvasColor      = 0;
let canvasMorphT     = 0;
let canvasBeat       = false;
let canvasAnimId     = 0;
let canvasLastTime   = 0;
let canvasRunning    = false;
const MORPH_DURATION = 1800;

export function initStartCanvas(): void {
  const canvas = document.getElementById('start-canvas') as HTMLCanvasElement;
  if (!canvas) return;
  refreshStartCanvasPalette();

  function resize() {
    const parent = canvas.parentElement!;
    canvas.width  = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  canvasLastTime = performance.now();
  canvasRunning = true;
  canvasAnimId = requestAnimationFrame(function draw(now: number) {
    if (!canvasRunning) return;

    const dt = now - canvasLastTime;
    canvasLastTime = now;

    canvasMorphT = (canvasMorphT + dt / MORPH_DURATION) % 1;
    if (canvasMorphT < dt / MORPH_DURATION) {
      canvasShape = (canvasShape + 1) % 5;
      canvasColor = (canvasColor + 1) % startPalette.length;
    }

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx  = canvas.width  / 2;
    const cy  = canvas.height / 2;
    const minSide = Math.min(canvas.width, canvas.height);
    const r   = minSide * 0.20;
    const col = startPalette[canvasColor];

    drawStartGrid(ctx, canvas.width, canvas.height, now);
    drawOrbitingThreats(ctx, cx, cy, minSide, now);

    const beatScale = canvasBeat ? 1.12 : 1.0;
    const scale     = beatScale + Math.sin(canvasMorphT * Math.PI * 2) * 0.04;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.shadowBlur  = 58;
    ctx.shadowColor = col;
    ctx.fillStyle   = col;
    ctx.globalAlpha = 0.16;
    drawShape(ctx, canvasShape, r * 1.65);
    ctx.fill();

    ctx.globalAlpha = 0.90;
    ctx.shadowBlur  = 28;
    drawShape(ctx, canvasShape, r);
    ctx.fill();

    ctx.globalAlpha = 0.22;
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#ffffff';
    drawShape(ctx, canvasShape, r * 0.35);
    ctx.fill();

    ctx.restore();

    if (canvasBeat) canvasBeat = false;
    canvasAnimId = requestAnimationFrame(draw);
  });
}

export function stopStartCanvas(): void {
  canvasRunning = false;
  cancelAnimationFrame(canvasAnimId);
}

export function pulseStartCanvas(): void {
  const startOv = document.getElementById('start-ov');
  if (startOv && startOv.style.display !== 'none') {
    canvasBeat = true;
  }
}

export function refreshStartCanvasPalette(): void {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;

  startPalette = [
    read('--bubblegum-pink', '#ef476f'),
    read('--emerald', '#06d6a0'),
    read('--ocean-blue', '#118ab2'),
    read('--golden-pollen', '#ffd166'),
    read('--white', '#ffffff'),
  ];
  orbitColors = [
    read('--bubblegum-pink', '#ef476f'),
    read('--golden-pollen', '#ffd166'),
    read('--ocean-blue', '#118ab2'),
    read('--emerald', '#06d6a0'),
  ];
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function drawStartGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
): void {
  const spacing = 52;
  const drift = (now / 55) % spacing;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(168,197,208,0.055)';
  for (let x = -spacing + drift; x < width + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = -spacing + drift; y < height + spacing; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(6,214,160,0.14)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 16]);
  ctx.lineDashOffset = -now / 38;
  ctx.beginPath();
  ctx.moveTo(width * 0.20, height * 0.62);
  ctx.lineTo(width * 0.42, height * 0.48);
  ctx.lineTo(width * 0.50, height * 0.50);
  ctx.lineTo(width * 0.66, height * 0.36);
  ctx.stroke();
  ctx.restore();
}

function drawOrbitingThreats(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  minSide: number,
  now: number,
): void {
  const orbit = minSide * 0.32;
  const t = now / 2600;

  ctx.save();
  ctx.strokeStyle = 'rgba(168,197,208,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, orbit, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const a = t + i * Math.PI / 2;
    const x = cx + Math.cos(a) * orbit;
    const y = cy + Math.sin(a) * orbit * 0.78;
    const color = orbitColors[i];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a * 0.6);
    ctx.shadowBlur = 16;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.72;
    drawShape(ctx, (i + 1) % 5, Math.max(9, minSide * 0.032));
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawShape(ctx: CanvasRenderingContext2D, shape: number, r: number): void {
  ctx.beginPath();
  if (shape === 0) {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  } else if (shape === 1) {
    const s = r * 0.85;
    ctx.roundRect(-s, -s, s * 2, s * 2, s * 0.18);
  } else if (shape === 2) {
    const h = r * 1.1;
    ctx.moveTo(0, -h);
    ctx.lineTo(h * 0.866, h * 0.5);
    ctx.lineTo(-h * 0.866, h * 0.5);
    ctx.closePath();
  } else if (shape === 3) {
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
  } else {
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}
