// Responsive layout rules shared by every screen. All values are CSS pixels.
//
// The screen is recomposed from zones (HUD → header → stage → work area → actions) instead of
// scaling one fixed 390×844 picture. Two separate scale factors with hard min/max limits keep
// chrome readable (`ui`) and art prominent (`art`) without ever stretching an image.

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const FONT = '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';

export const DEPTH = Object.freeze({
  room: -50,
  character: -10,
  counter: -5,
  table: 0,
  food: 10,
  tools: 20,
  feed: 30,
  hud: 60,
  header: 62,
  actions: 70,
  hint: 90,
  overlay: 100,
  modal: 110,
  banner: 120,
});

export function computeFrame(vp) {
  const { width: W, height: H } = vp;
  const safe = vp.safe ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const left = safe.left;
  const right = W - safe.right;
  const top = safe.top;
  const bottom = H - safe.bottom;
  const w = right - left;
  const h = bottom - top;
  const cx = left + w / 2;

  // Gameplay column: the full width on phones, a centred column on wide containers so the
  // composition keeps its portrait hierarchy while the environment fills the extra width.
  const colW = Math.min(w, clamp(h * 0.72, 360, 600));
  const ui = clamp(Math.min(w / 390, h / 760), 0.94, 1.3);
  const art = clamp(Math.min(colW / 390, h / 820), 0.78, 1.5);
  const pad = Math.round(clamp(w * 0.04, 12, 28));

  // HUD may spread wider than the column on large screens but not to absurd corners.
  const hudSpan = Math.min(w - pad * 2, Math.max(colW - pad * 2, Math.min(w - pad * 2, 820)));
  const hudHeight = Math.round(clamp(60 * ui, 58, 76));
  const hudTop = top + Math.round(clamp(h * 0.014, 8, 18));

  return {
    W, H, left, right, top, bottom, w, h, cx,
    colW, colLeft: cx - colW / 2, colRight: cx + colW / 2,
    ui, art, pad,
    hud: { left: cx - hudSpan / 2, right: cx + hudSpan / 2, top: hudTop, height: hudHeight, bottom: hudTop + hudHeight },
    portraitTall: h / w > 1.9,
    short: h < 640,
  };
}

// Primary-action band at the bottom. Always fully on screen and above the safe-area inset.
export function actionBand(frame, height) {
  const margin = Math.round(clamp(frame.h * 0.035, 16, 36));
  const centerY = frame.bottom - margin - height / 2;
  return { centerY, top: centerY - height / 2, margin };
}

// Fit an image of native size (w×h) into a box without changing its aspect ratio.
export function fitScale(nativeW, nativeH, boxW, boxH) {
  return Math.min(boxW / nativeW, boxH / nativeH);
}
