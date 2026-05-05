let beat = 0;
let el: HTMLElement | null = null;

export function initMetronome(): void {
  const existing = document.getElementById('metronome');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'metronome';
  container.innerHTML = `
    <div id="metro-pip" class="pip"></div>
    <div id="metro-bar">
      <div id="metro-fill"></div>
    </div>
  `;
  document.body.appendChild(container);
  el = container;
  beat = 0;
}

export function tickMetronome(): void {
  if (!el) return;
  beat = (beat + 1) % 2;

  const pip  = document.getElementById('metro-pip')!;
  const fill = document.getElementById('metro-fill')!;

  // Pip swings down on beat 0, up on beat 1
  pip.classList.remove('beat-0', 'beat-1');
  void pip.offsetWidth;
  pip.classList.add(beat === 0 ? 'beat-0' : 'beat-1');

  // Bar flashes
  fill.classList.remove('flash');
  void fill.offsetWidth;
  fill.classList.add('flash');
}

export function hideMetronome(): void {
  if (el) el.style.opacity = '0';
}

export function showMetronome(): void {
  if (el) el.style.opacity = '1';
}
