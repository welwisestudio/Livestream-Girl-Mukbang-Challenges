# Текущий контекст проекта

Обновлено: 2026-10-04. Версия/коммит основы: `44742fdfa37fa58e4eba5292b3db573b4383eddc` (`main`, совпадает с `origin/main` до документирования CP0).

- Цель текущего этапа: CP0 — зафиксировать концепцию, Core Loop, подтверждённые механики, структуру экранов, карту референсов и открытые продуктовые решения; проверить GitHub и Higgsfield.
- Что уже принято человеком: вертикальная 2D casual-игра о девушке livestream/mukbang creator; Core Loop «хаб → уровень → многостадийная готовка → livestream/mukbang → монеты/прогресс → открытия/траты → повтор»; перечисленные cooking-действия; standard level coin unlocks; Supermarket, Part-Time Job, Customization, Decor, 7-day Daily Reward; optional rewarded ads; Premium Levels с архитектурой coin/rewarded unlock; YouTube SDK в конце; графика только Nano Banana 2.
- Что реализовано, но ещё не принято: игрового кода и графики нет. Созданы только подготовительные документы CP0.
- Текущая задача: получить решения по вопросам, влияющим на первый эталонный уровень и объём первой версии.
- Действующие ограничения: не писать игру и не генерировать графику до согласования; не придумывать отсутствующие механики; не переносить баннеры из референсов; не добавлять forced interstitials, IAP, subscriptions или currency packs; не менять Core Loop без согласования.
- Важные файлы: `project/PROJECT-BRIEF.md`, `project/DECISIONS.md`, `reference/input/`, `AGENTS.md`, `instructions/01-workflow.md`, `instructions/02-architecture.md`, `platform/SDK-CONTRACT.md`.
- Как запустить: игра ещё не создана; запуска и production-preview нет.
- Последние реально выполненные проверки: прочитаны обязательные документы; `origin` указывает на заданный GitHub URL; сетевой `origin/HEAD`, локальный `HEAD` и `origin/main` совпали на `44742fd`; Higgsfield MCP авторизован, доступна 1 workspace и 112 инструментов; каталог возвращает `nano_banana_2`; инструмент `remove_background` доступен; визуально проверены 38 JPG и `GameplayVideo.mp4`; видео проверено по сетке 0.5 секунды, сохранены 13 key frames.
- Известные дефекты / блокеры: видео подтверждает feeding interaction, но не показывает cooking, reward/progression, in-game success/failure или полный Core Loop; не определены первый законченный рецепт, scoring/завершение mukbang, победа/поражение, target duration, точный объём первой версии и содержание Premium Levels. Финальные числа экономики намеренно отложены.
- Следующий конкретный шаг: геймдизайнер отвечает на блокирующие вопросы и утверждает обновлённый CP0; затем AI создаёт `project/STYLE-GUIDE.md` и спецификацию одного эталонного уровня без перехода к массовому контенту.

## Актуальная монетизация и экономика

- Основная валюта: coins.
- Standard Levels: unlock за конфигурируемую цену в coins.
- Rewarded: только добровольные Free Coins, completion bonus, selected progression bonus и Premium unlock progress.
- Premium Levels: distinct locked/unlocked state; архитектура поддерживает повышенную coin price и `N` подтверждённых rewarded completions.
- Normal progression обязана работать без рекламы.
- Запрещено без нового решения: forced interstitials, banners, IAP, real-money packs, subscriptions.
- Реальный рекламный SDK подключается в конце; разработка использует отдельный mock/dev-adapter, который не доказывает работу production SDK.

## Проверка подключений CP0

### GitHub

- Remote: `origin = https://github.com/welwisestudio/Livestream-Girl-Mukbang-Challenges.git`
- Ветка: `main`, отслеживает `origin/main`.
- Сетевая проверка GitHub: успешна 2026-10-04.
- Проверенный remote HEAD: `44742fdfa37fa58e4eba5292b3db573b4383eddc`.

### Higgsfield MCP

- Подключение и текущая OAuth-авторизация: работают; повторный OAuth не потребовался.
- Доступных инструментов: 112.
- Модель: `nano_banana_2` / Nano Banana 2, Google, image generation, text-to-image и image-to-image, 1k/2k/4k.
- Background Remover: инструмент `remove_background` доступен; принимает подтверждённый `media_id`/готовый generation job ID и `media_type: image|video`.
- Генерации и обработка медиа не запускались; кредиты не тратились.
- Free-trial unlimited сейчас не spendable; это не означает недоступность самой модели за кредиты.

## Референсы

- 38 JPG в `reference/input/`.
- Видео: `GameplayVideo.mp4`, 27.633 секунды, 1920×1080, 30 FPS.
- Все JPG и видео просмотрены по содержимому, не только по именам.
- Извлечено 13 кадров: `reference/derived/gameplay-video/`; labels и границы интерпретации — в `KEYFRAMES.md`.
- Подтверждено видео: direct tap товара; автоматический itemized checkout; direct transition выбранных packaged foods на mukbang table; feeding portions к рту с вилкой, ложкой, трубочкой и палочками.
- Исправлено: scanning gesture игрока не подтверждён; `PLAY NOW` end card не является игровым failure/result state.
- Карта файлов и границы выводов записаны в `project/PROJECT-BRIEF.md`.
