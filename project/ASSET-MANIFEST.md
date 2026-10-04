# Asset Manifest — CP1

| Asset / группа | Тип | Источник | Статус | Примечание |
|---|---|---|---|---|
| Background / HUD / buttons | Phaser vector primitives | `src/ui/art.js` | временно | Code-native, без raster-файлов |
| Character placeholder | Phaser vector primitives | `src/ui/art.js` | временно | Оригинальная техническая иллюстрация |
| Bowls / pitcher / berries / jelly | Phaser vector primitives | `src/ui/art.js` | временно | Покрывает интерактивные hit areas Level 1 |
| Reference screenshots/videos | входные материалы | `reference/input/` | только reference | Не поставляются как runtime assets |
| Key frames | производные reference-материалы | `reference/derived/` | документация | Не поставляются как runtime assets |
| Generated raster art | Higgsfield Nano Banana 2 | — | не создано | Нет prompt, job ID и расходов |
| Transparent sprites | Higgsfield Background Remover | — | не требуется на CP1 | Не запускался |
| Audio | — | — | отсутствует | AudioService изолирован, Phaser audio отключён |

Фактическая модель для новых изображений остаётся строго `nano_banana_2`; подмена не разрешена. На CP1 новые изображения не создавались.

