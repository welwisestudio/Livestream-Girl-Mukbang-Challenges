# Livestream Girl: Mukbang Challenges

Технический vertical slice первой 2D web-игры: один законченный Level 1 по orange-jelly flow из `Video2.mp4`. Стек зафиксирован: Phaser `3.90.0`, JavaScript ES Modules, Vite `8.3.2`.

## Запуск

```bash
npm install
npm run dev
```

Откройте `http://127.0.0.1:5173/`. Debug overlay доступен только в dev-режиме по `http://127.0.0.1:5173/?debug=1`.

Production build и локальная проверка:

```bash
npm test
npm run build
npm run preview
```

Preview: `http://127.0.0.1:4173/`.

Browser E2E после установки Chromium для Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

## Архитектура

- `src/content/` — конфигурация Level 1 и timing values.
- `src/mechanics/` — переиспользуемые tap/drag/stir/directional-drag mechanics.
- `src/scenes/` — Home, Level, Result screen flow.
- `src/services/` — единая точка save/reward/audio state.
- `src/platform/` — внутренний contract и отдельный dev adapter.
- `src/ui/` — временный code-native UI/art технического checkpoint.
- `tests/` — unit/data и настоящие mouse/touch E2E сценарии.

Реальный YouTube SDK, rewarded ads и cloud save намеренно не подключены. Dev-save использует localStorage только внутри dev adapter. Runtime не обращается к Higgsfield; новые raster assets на этом этапе не создавались.

Текущий статус и ограничения: `project/STATUS.md`. Спецификация уровня: `project/LEVEL-01.md`. Фактическая проверка: `project/VALIDATION.md`.
