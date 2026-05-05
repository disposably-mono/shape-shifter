// ─────────────────────────────────────────────
// Web Audio synthesis engine — full port from prototype
// ─────────────────────────────────────────────

let actx: AudioContext | null = null;

function getACtx(): AudioContext {
  if (!actx) actx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

function playTone(
  freq: number,
  type: OscillatorType = 'sine',
  dur = 0.12,
  vol = 0.18,
  detune = 0
): void {
  try {
    const a = getACtx();
    const o = a.createOscillator();
    const g = a.createGain();
    o.connect(g);
    g.connect(a.destination);
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.start(a.currentTime);
    o.stop(a.currentTime + dur);
  } catch (_) { /* silently fail if audio unavailable */ }
}

export function sfxMove():    void { playTone(440, 'sine', 0.09, 0.12); playTone(660, 'sine', 0.06, 0.08, 5); }
export function sfxElim():    void {
  playTone(880,  'square', 0.07, 0.14);
  setTimeout(() => playTone(1320, 'sine',   0.10, 0.12), 40);
  setTimeout(() => playTone(1760, 'sine',   0.08, 0.09), 80);
}
export function sfxComboReset(): void {
  playTone(180, 'sawtooth', 0.22, 0.20);
  setTimeout(() => playTone(120, 'sawtooth', 0.18, 0.15), 80);
}
export function sfxDanger():  void { playTone(320, 'sawtooth', 0.06, 0.08); }
export function sfxWin():     void {
  [880, 1100, 1320, 1760].forEach((f, i) =>
    setTimeout(() => playTone(f, 'sine', 0.20, 0.15), i * 80)
  );
}
export function sfxComboMilestone(combo: number): void {
  if (combo % 5 === 0) playTone(1100, 'sine', 0.15, 0.20);
}
export function sfxShift():   void {
  playTone(220, 'square', 0.15, 0.30);
  setTimeout(() => playTone(440, 'square', 0.10, 0.20), 120);
}
export function sfxTick():    void {
  playTone(400, 'sine', 0.05, 0.10);
  setTimeout(() => playTone(900, 'sine', 0.05, 0.10), 120);
}
export function sfxWaveUp():  void {
  [660, 880, 1100].forEach((f, i) =>
    setTimeout(() => playTone(f, 'sine', 0.12, 0.12), i * 60)
  );
}