# Style and layout rules (Level 1 is the template)

Status: the visual direction of the CP1 Level 1 is **approved** by the game designer (2026-10-04). Polish keeps that direction.

## Visual direction (approved)

- Cute pastel kawaii sticker art: warm brown outlines, soft cel shading, glossy highlights.
- The streamer in the orange cat-ear hoodie; pale-blue striped room; cream counter.
- UI is a pink/cream palette with round pills and cards, orange "candy" primary buttons, a green confirm and a lavender viewer card.
- Logos, characters and brands of the reference app are not copied.

## Responsive layout

- **No fixed canvas.** The canvas fills the container at device pixel ratio (max DPR 2). Every screen is recomposed in CSS pixels by `layout(frame)`, which runs on resize, rotation and safe-area changes.
- **Zones:** top HUD (safe area) → header/progress → stage (character / work object) → bottom action band (safe area).
  - Wide containers use a centered gameplay column (`colW` ≤ 600 px) while the room fills the extra width.
- **Two scale factors with limits:**
  - `ui` (0.94–1.3) for chrome;
  - `art` (0.78–1.5) for art.
  - Each element also has its own pixel minimum and maximum.
- **Room:** cover-scaled with one uniform factor so the counter rim lands on the zone's table line, then cropped. More width or height reveals more room. A front copy of the counter hides the bottom of her bust.
- **Images keep their aspect ratio.** Size is chosen by width or height, never both independently. The test checks scaleX/scaleY distortion is under 2 %.

## Size rules (CSS px)

| Element | Rule |
|---|---|
| HUD band | 58–76 high; avatar = band height; name 17–22; level badge 14–17; coins 19–25 |
| Header pill (LIVE / LIVE KITCHEN) | font 20–28, height ≈ 2.15 × font |
| Primary button | height 60–80, font 24–33, width = text + generous padding (min 220–260) |
| Choice card | 84–140 wide, 1.12 aspect ratio, caption 14–18 |
| Confirm ✓ | 66–90 visual, touch target +24 |
| Comments | font 14–18, at most 2–3 visible |
| Touch targets | ≥ 44 px (test-enforced), most ≥ 60 |
| Minimum text | 12 px (test-enforced); body text ≥ 14 |

## Interaction feedback

- Correct: pop, wobble or sparkle, then the next step.
- Wrong or locked: the card shakes; a dropped object springs back to its place.
- Hints: an animated hand shows the real gesture (tap, drag, circle, lift). They never change progress and hide on the first touch.
