# Livestream Girl: Mukbang Challenges

Portrait-first 2D casual web game with a 50-level cooking campaign (Jelly, Ramen, Pizza, Sushi, Bubble Tea, … Matcha Bubble Tea).

Each level follows Viewer Request → short touch/drag cooking recipe → Perfect → three-serving livestream/mukbang → coins and progression. Stack: Phaser `3.90.0`, JavaScript ES Modules, Vite `8.3.2`.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`. The dev-only QA hook is available at `http://127.0.0.1:5173/?debug=1`.

```bash
npm test
npm run build
npm run preview
```

Production preview: `http://127.0.0.1:4173/`.

Browser E2E uses a real Chromium-family browser:

```bash
npx playwright install chromium
npm run test:e2e
```

If Playwright Chromium is unavailable, set `PLAYWRIGHT_EXECUTABLE_PATH` to a Chrome executable before running the suite.

## Architecture

- `src/app/` — bootstrap, real loading progress and responsive viewport/DPR handling.
- `src/content/levels.js` — fixed campaign order, recipe data, rewards and unlock prices.
- `src/levels/cookingSteps.js` — reusable choice, transfer, pour, mix/spread, directed roll/slice, tap-process and topping views.
- `src/mechanics/` — input primitives; invalid/repeated input cannot advance twice.
- `src/ui/` — shared safe layout regions, HUD, candy buttons, panels, character, hints and feedback.
- `src/scenes/` — Loading/Boot, reference-led Lobby, shared Level flow and Result.
- `src/services/`, `src/platform/` — versioned cloud-safe save, atomic rewards/unlocks, ad gate, and the replaceable platform adapters (dev + YouTube).
- `art-source/` — Nano Banana 2 masters and Higgsfield Background Remover cutouts.
- `public/assets/` — optimized local WebP runtime assets; rebuild with `npm run assets`.
- `qa/campaign/` — visual QA frames for all five recipes, mukbang scenes and results.
- `tests/` — unit rules plus real mouse/touch Playwright progression and layout tests.

No runtime request is made to Higgsfield. Audio (music + effects from the designer's files) is described in `project/AUDIO.md`. Current status: `project/STATUS.md`; validation: `project/VALIDATION.md`; asset provenance: `project/ASSET-MANIFEST.md`.

## Platforms

The platform adapter is chosen by build profile, never by host name:

- `npm run dev` / `npm run build` → local dev adapter (TEST MODE: local test storage, mock ads, simulated host pause/mute). Production preview: `http://127.0.0.1:4173/`.
- `npm run build:youtube` → `dist-youtube/`, the YouTube Playables release (JavaScript SDK, cloud save only, real ads, host lifecycle).
- `npm run package:youtube` → `release/livestream-girl-mukbang-youtube-test.zip` (verified: index at root, per-file SHA-256, no dev/test code).
- `npm run test:youtube` → builds both YouTube profiles and runs `tests/youtube` under the official Playables CSP with a fake `ytgame`.

Details (lifecycle, pause/mute, cloud save safety and migrations, rewarded and interstitial ads, high score status, real-YouTube test checklist): `project/YOUTUBE-INTEGRATION.md`.
