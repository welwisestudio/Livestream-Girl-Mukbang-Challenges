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

// Resolves once the loading screen has been painted (two animation frames), so the platform
// can be told about the first frame while it is really on screen.
export function loaderPainted() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'undefined') { resolve(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

// Resolves when the loader is gone (faded out and removed) and the game is interactive.
export function hideLoader() {
  const el = root();
  if (!el) return Promise.resolve();
  setLoadProgress(1);
  el.classList.add('done');
  return new Promise((resolve) => setTimeout(() => { el.remove(); resolve(); }, 420));
}

// Between screens, if the next screen's art is still downloading (slow connection right after
// start): the loading-screen label over the faded screen, until the art is there.
export function showWaiting(visible) {
  let el = document.getElementById('screen-waiting');
  if (!visible) { el?.remove(); return; }
  if (el) return;
  el = document.createElement('div');
  el.id = 'screen-waiting';
  el.setAttribute('role', 'status');
  el.textContent = 'Loading…';
  document.body.appendChild(el);
}

export function showLoadError() {
  root()?.classList.add('failed');
}

const SAVE_MESSAGES = {
  'future-version': 'Your progress was saved by a newer version of the game. Please update or reload to continue.',
  corrupt: 'Your saved progress could not be read. Nothing has been changed. Please try again.',
};

// Cloud save could not be read: the game does not start (and writes nothing) until a retry
// succeeds. Resolves when the player taps Retry.
export function showSaveError(error) {
  const el = root();
  if (!el) return new Promise(() => {});
  el.classList.add('save-failed');
  let box = document.getElementById('loader-save-error');
  if (!box) {
    box = document.createElement('div');
    box.id = 'loader-save-error';
    box.className = 'save-error';
    box.innerHTML = '<p class="save-error-text"></p><button type="button" class="save-error-retry">Retry</button>';
    el.appendChild(box);
  }
  box.querySelector('.save-error-text').textContent = SAVE_MESSAGES[error?.kind]
    ?? 'Couldn’t load your progress. Check your connection and try again.';
  const button = box.querySelector('.save-error-retry');
  button.disabled = false;
  return new Promise((resolve) => {
    button.addEventListener('click', () => {
      button.disabled = true;
      el.classList.remove('save-failed');
      resolve();
    }, { once: true });
  });
}
