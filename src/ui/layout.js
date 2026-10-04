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

// Lobby-only stack. The names mirror the approved reference and keep the Home scene
// independent from the more granular cooking-scene depth values above.
export const LOBBY_DEPTH = Object.freeze({
  background: -50,
  environment: -40,
  character: -30,
  decoration: -20,
  features: 40,
  hud: 60,
  feedback: 90,
  popup: 110,
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

// Reference-led Home composition. Regions are recomputed for every viewport rather than
// scaling a fixed 9:16 canvas. Secondary controls compress before the character, HUD and
// primary action do.
export function computeLobbyRegions(frame) {
  const compact = frame.h < 700 || frame.h / frame.w < 1.55;
  const outer = Math.round(clamp(frame.w * 0.025, 9, 18));
  const hudTop = frame.top + Math.round(clamp(frame.h * 0.014, 8, 16));
  const hudHeight = Math.round(clamp((compact ? 64 : 72) * frame.ui, 62, 82));
  const navHeight = Math.round(clamp((compact ? 94 : 112) * frame.ui, 92, 128));
  const nav = {
    x: frame.left,
    y: frame.bottom - navHeight,
    w: frame.w,
    h: navHeight,
  };
  const tableTop = Math.round(frame.top + frame.h * (compact ? 0.49 : 0.53));
  const table = {
    x: frame.left,
    y: tableTop,
    w: frame.w,
    h: nav.y - tableTop,
  };
  const sideWidth = Math.round(clamp(frame.colW * 0.205, 70, 92));
  const sideTop = hudTop + hudHeight + Math.round(clamp(frame.h * 0.035, 18, 32));
  const sideBottom = tableTop - Math.round(clamp(frame.h * 0.018, 10, 18));
  const sideInset = outer;
  const centerGutter = Math.round(clamp(frame.colW * 0.018, 7, 12));

  return {
    hud: { x: frame.left + outer, y: hudTop, w: frame.w - outer * 2, h: hudHeight },
    leftFeatures: { x: frame.colLeft + sideInset, y: sideTop, w: sideWidth, h: sideBottom - sideTop },
    rightFeatures: { x: frame.colRight - sideInset - sideWidth, y: sideTop, w: sideWidth, h: sideBottom - sideTop },
    character: {
      x: frame.colLeft + sideInset + sideWidth + centerGutter,
      y: hudTop + hudHeight + 4,
      w: frame.colW - (sideInset + sideWidth + centerGutter) * 2,
      h: tableTop - (hudTop + hudHeight + 4),
    },
    table,
    nav,
    compact,
  };
}

// Fit an image of native size (w×h) into a box without changing its aspect ratio.
export function fitScale(nativeW, nativeH, boxW, boxH) {
  return Math.min(boxW / nativeW, boxH / nativeH);
}
