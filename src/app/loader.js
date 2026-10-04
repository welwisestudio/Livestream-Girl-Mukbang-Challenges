// Bridges real loading progress into the HTML loading screen and fades it out once the
// first interactive screen exists. Progress: 0–10 % boot/services, 10–100 % asset loader.
const root = () => document.getElementById('loader');

export function setLoadProgress(fraction) {
  const value = Math.max(0, Math.min(1, fraction));
  const fill = document.getElementById('loader-fill');
  const label = document.getElementById('loader-label');
  const pct = Math.round(value * 100);
  if (fill) fill.style.width = `${Math.max(3, pct)}%`;
  if (label) label.textContent = `Loading… ${pct}%`;
}

export function hideLoader() {
  const el = root();
  if (!el) return;
  setLoadProgress(1);
  el.classList.add('done');
  setTimeout(() => el.remove(), 420);
}

export function showLoadError() {
  root()?.classList.add('failed');
}
