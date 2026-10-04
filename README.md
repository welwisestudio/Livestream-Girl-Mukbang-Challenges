# Livestream Girl: Mukbang Challenges

Portrait-first 2D casual web game with exactly five standard levels:

1. Jelly
2. Ramen
3. Pizza
4. Sushi
5. Bubble Tea

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
- `src/services/`, `src/platform/` — versioned save, atomic rewards/unlocks and dev platform adapter.
- `art-source/` — Nano Banana 2 masters and Higgsfield Background Remover cutouts.
- `public/assets/` — optimized local WebP runtime assets; rebuild with `npm run assets`.
- `qa/campaign/` — visual QA frames for all five recipes, mukbang scenes and results.
- `tests/` — unit rules plus real mouse/touch Playwright progression and layout tests.

No runtime request is made to Higgsfield. YouTube SDK, real ads, audio and full hub side activities are intentionally not connected in this checkpoint. Current status: `project/STATUS.md`; validation: `project/VALIDATION.md`; asset provenance: `project/ASSET-MANIFEST.md`.
