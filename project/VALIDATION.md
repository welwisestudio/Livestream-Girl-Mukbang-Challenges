# Проверка CP1 — Level 1 Technical Foundation

Обновлено: 2026-10-04.

## Выполнено

- `npm test`: 3/3 unit/data tests passed.
- Проверено load-before-write dev-save и стартовое состояние 1000 coins.
- Проверена атомарная выдача 200 coins, Level 2 unlock и защита от повторного receipt.
- Проверена конфигурация единственного уровня: 6 cooking steps, 3 servings, reward 200.
- `npm run build`: production build completed with Vite 8.3.2.
- В production bundle подтверждено отсутствие `__GAME_DEBUG__`, `debug-overlay`, `ytgame` и URL Higgsfield; реальный YouTube/ad SDK не подключён.
- Свежий production preview запущен на `http://127.0.0.1:4173/` и отвечает HTTP 200.
- В Playwright записаны реальные mouse/touch сценарии, неверные gestures и три portrait viewport (`360×640`, `390×844`, `430×932`).

## Ограничение проверки

- Playwright Chromium не установился: загрузка browser binary неоднократно завершилась timeout CDN.
- Computer Use не обнаружил доступных IAB/Edge/Chrome browser surfaces; системный Chrome/Edge по стандартным путям также не найден.
- `npm run test:e2e` доходит до запуска всех 9 project/test combinations, но каждый останавливается до выполнения сценария с точной причиной `Executable doesn't exist ... chromium_headless_shell.exe`.
- Поэтому browser E2E, визуальная проверка трёх размеров и фактический end-to-end pointer pass пока **не считаются пройденными**. Сценарии сохранены в `tests/e2e/level1.spec.js` и должны быть повторены после появления Chromium командой `npm run test:e2e`.

## Известные технические ограничения

- Phaser формирует крупный production chunk; Vite сообщает предупреждение о размере, но build успешен.
- Art и audio не финальные; это checkpoint технического поведения.
- Level 2 не реализован — только состояние unlock после Level 1.
