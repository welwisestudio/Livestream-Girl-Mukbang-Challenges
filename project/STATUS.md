# Текущий контекст проекта

Обновлено: 2026-10-04, CP1 / Step 2 — Technical Foundation.

## Итог этапа

- Создан один playable technical vertical slice: `orange-jelly-01` по exact Level 1 из `Video2.mp4` (`00:38–01:50`).
- Реализован поток Home → pre-stream request → 6 cooking interactions → `Perfect` → 3-serving mukbang → Level Up → base reward 200 → Home.
- Других уровней и мета-систем нет. Level 2 только отмечается открытым в прогрессе.
- Основной concept не менялся; новые graphics/audio assets не создавались.

## Техническая основа

- Phaser `3.90.0`, JavaScript ES Modules, Vite `8.3.2`; версии зафиксированы в `package-lock.json`.
- Design space `390×844`, Phaser `FIT` + `CENTER_BOTH`, touch и mouse через единый pointer flow.
- Level config отделён от mechanics; постоянный ID и campaign order находятся в `src/content/levels.js`.
- Tap choice, drag/drop, circular stir и directional drag изолированы в `src/mechanics/`.
- Save, rewards и audio-state разделены в `src/services/`; reward выдаётся через один idempotent receipt path.
- Platform contract отделён от dev adapter. Только dev adapter использует localStorage.
- Реальные YouTube SDK, cloud save, ad SDK и rewarded mock не подключены.
- Debug overlay/hook доступен только в dev при `?debug=1` и исключён из production build.

## Фактическая проверка

- `npm test`: **3/3 passed** — load-before-write, стартовые 1000 coins, атомарная награда 200, защита от duplicate receipt, Level 2 unlock, конфигурация 6 steps / 3 servings.
- `npm run build`: **passed**, 27 modules, основной JS `1,228.36 kB` (`328.33 kB gzip`); остаётся предупреждение Vite о chunk >500 kB.
- Production bundle: нет `__GAME_DEBUG__`, `debug-overlay`, `ytgame` и URL Higgsfield.
- Свежий build: `dist/index.html`, 2026-10-04 14:41 (Asia/Yekaterinburg).
- Production preview запущен и отвечает HTTP 200: `http://127.0.0.1:4173/`.

## Ограничение QA

- Browser E2E **не считается пройденным**: `npm run test:e2e` корректно обнаруживает 9 project/test combinations, но ни один тест не начинает сценарий, потому что executable Chromium отсутствует. Его загрузка дважды завершилась CDN timeout; Computer Use не предоставляет browser surface, системный Chrome/Edge не найден.
- Готовые сценарии `tests/e2e/level1.spec.js` покрывают реальный mouse pass, touch-compatible pass, неправильные inputs и layout `360×640`, `390×844`, `430×932`, но требуют доступного Chromium.
- Из-за этого визуальное соответствие и весь end-to-end pointer flow остаются обязательной ручной/браузерной проверкой checkpoint.

## Art и references

- Runtime использует временные оригинальные Phaser vector primitives, достаточные для различения объектов и hit zones; это не финальный visual sample.
- Новые raster assets не генерировались, Higgsfield credits не тратились, model/job IDs отсутствуют.
- Для любой будущей генерации остаётся обязательной только Higgsfield Nano Banana 2; прозрачность — отдельный Background Remover.
- Источники и границы Level 1 записаны в `project/LEVEL-01.md`; asset truth — в `project/ASSET-MANIFEST.md`.

## Что нужно для закрытия checkpoint

1. Открыть production preview и пройти Level 1 мышью/касанием.
2. Проверить неверный выбор/drag/stir/unmold/feeding: прогресс не должен двигаться, retry должен быть немедленным.
3. Проверить три portrait-размера и отсутствие обрезания HUD/кнопок.
4. После положительной проверки утвердить или отклонить технический Level 1. До решения не расширять контент и не переходить к арт-генерации.
