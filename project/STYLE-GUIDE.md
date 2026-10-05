# Style and layout rules (five-level CP3 candidate)

Status: the visual direction of the CP1 Level 1 is **approved** by the game designer (2026-10-04). Polish keeps that direction.

The five-level implementation extends that accepted direction without changing it. `LobbyScreen.jpg` is the primary composition reference for Home; `Video2` 00:38–01:48 remains the primary cooking/livestream/result reference.

`SkinChanging.jpg` and the ten companion Skin references are the primary composition/art references for Character Customization: the Lobby HUD and preview remain visible above the table, followed by one compact category row, three comparable item cards and a clear cyan selected outline. The approved heroine identity is retained while outfit, accessory, background and table treatments follow the supplied references directly.

## Visual direction (approved)

- Cute pastel kawaii sticker art: warm brown outlines, soft cel shading, glossy highlights.
- The streamer in the orange cat-ear hoodie; pale-blue striped room; cream counter.
- UI is a pink/cream palette with round pills and cards, orange "candy" primary buttons, a green confirm and a lavender viewer card.
- Logos, characters and brands of the reference app are not copied.
- Home uses the reference hierarchy: top profile/currency, illustrated side features, dominant character and thought bubble, checkered table with real props, and a clearly dominant glossy Start CTA between Market and Decor.
- Ramen, Pizza, Sushi and Bubble Tea use the same outline weight, highlight direction, saturation and 3/4 tabletop perspective as Jelly. No code-drawn blob substitutes are used for food.

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

## Character Customization

- The screen uses seven compact generated pastel tabs and three generated cream item cards. Turquoise outline marks the current draft selection; generated green price pills, locks and coin values remain readable without covering the thumbnail.
- The preview is the primary visual object and updates immediately. Purchase/equip feedback is secondary and must not obscure the face.
- Outfit variants are full aligned happy/eating/chewing sprites generated as one reference-guided atlas; clothing is never positioned as a separate torso overlay. Hair/Skin also avoid runtime tint masks: each hairstyle × skin-tone × pose combination selects one aligned, transparent, fully illustrated head preserving warm-brown outlines, facial features, blush, shading and front/back hair order.
- Hair and Skin cards always show their generated head previews. A dedicated catalog-title row separates the category label from the item images; thumbnails must remain fully visible at every supported viewport.
- Hair/Skin card previews and both related tab portraits always use the current paired hairstyle × skin tone; no fixed default-tone thumbnail may disagree with the live character.
- Hair/Skin sprites are head-only: the lower silhouette ends at the jaw/chin or hair, with no neck, throat or skin-colored stump. The outfit's baked neck is removed too; below the head, only the selected outfit's own painted fabric may be visible.
- Hats and glasses are generated transparent layers with fixed normalized anchors shared by Lobby, HUD, cooking and mukbang. Hats must remain wholly inside the character canvas and render below glasses; eyewear must be front-open, level and centered on both eyes.
- Background and tablecloth are generated full-bleed surfaces; neither is flattened into the UI screenshot. Each tablecloth also declares a coordinated shelf/panel/stroke palette so the lower catalog chrome changes with the selected textile.

## Interaction feedback

- Correct: pop, wobble or sparkle, then the next step.
- Wrong or locked: the card shakes; a dropped object springs back to its place.
- Hints: an animated hand shows the real gesture (tap, drag, circle, lift). They never change progress and hide on the first touch.
