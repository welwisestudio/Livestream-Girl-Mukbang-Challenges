# Livestream Girl: Mukbang Challenges

Level 1 (`orange-jelly-01`) по flow из `Video2.mp4`, адаптивный под любое соотношение сторон. Стек: Phaser `3.90.0`, JavaScript ES Modules, Vite `8.3.2`.

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
npx playwright install chromium   # или задайте PLAYWRIGHT_EXECUTABLE_PATH
npm run test:e2e
```

## Архитектура

- `src/app/` — bootstrap, адаптивный viewport (canvas = контейнер × DPR), loading screen.
- `src/ui/` — правила layout (зоны, min/max), HUD, кнопки, карточки, панели, персонаж, фон.
- `src/content/` — конфиг уровня, тайминги, палитра, манифест ассетов.
- `src/levels/cookingSteps.js` — виды шагов готовки (choice, pour, stir, unmold, topping).
- `src/mechanics/` — жесты (tap-choice, drag-drop, stir, directional drag, feed).
- `src/scenes/` — Boot, Home, Level, Result.
- `src/services/`, `src/platform/` — сохранения, награды, аудио-состояние, dev-адаптер платформы.
- `art-source/` — мастер-файлы графики; `npm run assets` собирает WebP в `public/assets/`.
- `tests/` — unit и Playwright E2E (реальный ввод, 5 viewport-проектов). Если браузер Playwright не установлен: `PLAYWRIGHT_EXECUTABLE_PATH=<путь к chrome.exe> npx playwright test`.
- `scripts/qa-capture.mjs` — скриншоты каждой стадии на заданных размерах (dev-сервер или `npm run build:qa`).

YouTube SDK и реклама намеренно не подключены. Статус: `project/STATUS.md`, уровень: `project/LEVEL-01.md`, проверка: `project/VALIDATION.md`, ассеты: `project/ASSET-MANIFEST.md`.
