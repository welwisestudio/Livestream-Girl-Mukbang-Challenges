# Текущий контекст проекта

Обновлено: 2026-10-04. Версия/коммит основы: `44742fdfa37fa58e4eba5292b3db573b4383eddc` (`main`, совпадает с `origin/main` до документирования CP0).

- Цель текущего этапа: CP0 — зафиксировать концепцию, Core Loop, подтверждённые механики, структуру экранов, карту референсов и открытые продуктовые решения; проверить GitHub и Higgsfield.
- Что уже принято человеком: вертикальная 2D casual-игра о девушке livestream/mukbang creator; Core Loop «хаб → уровень → многостадийная готовка → livestream/mukbang → монеты/прогресс → открытия/траты → повтор»; перечисленные cooking-действия; standard level coin unlocks; Supermarket, Part-Time Job, Customization, Decor, 7-day Daily Reward; optional rewarded ads; Premium Levels с архитектурой coin/rewarded unlock; YouTube SDK в конце; графика только Nano Banana 2.
- Что реализовано, но ещё не принято: игрового кода и графики нет. Созданы только подготовительные документы CP0.
- Текущая задача: получить решения по вопросам, влияющим на первый эталонный уровень и объём первой версии.
- Действующие ограничения: не писать игру и не генерировать графику до согласования; не придумывать отсутствующие механики; не переносить баннеры из референсов; не добавлять forced interstitials, IAP, subscriptions или currency packs; не менять Core Loop без согласования.
- Важные файлы: `project/PROJECT-BRIEF.md`, `project/DECISIONS.md`, `reference/input/`, `AGENTS.md`, `instructions/01-workflow.md`, `instructions/02-architecture.md`, `platform/SDK-CONTRACT.md`.
- Как запустить: игра ещё не создана; запуска и production-preview нет.
- Последние реально выполненные проверки: прочитаны обязательные документы; `origin` указывает на заданный GitHub URL; сетевой `origin/HEAD`, локальный `HEAD` и `origin/main` совпали на `44742fd`; Higgsfield MCP авторизован, доступна 1 workspace и 112 инструментов; каталог возвращает `nano_banana_2`; инструмент `remove_background` доступен; совместно проверены 38 JPG, `GameplayVideo.mp4` и полный `Video2.mp4`; сохранены 13 + 28 key frames с manifests.
- Известные дефекты / блокеры: `Video2.mp4` подтверждает full reference Core Loop, three-serving cooked mukbang completion, success/reward/progression, supermarket side loop и drink Part-Time; при этом не показаны fail states, Premium Levels, Customization/Decor actions или точные правила комментариев/зрителей. Не утверждены первый законченный рецепт, перенос reference scoring/three servings, target duration, вариант Part-Time, роль Supermarket в нашей игре, точный объём первой версии и содержание Premium Levels. Финальные числа экономики намеренно отложены.
- Следующий конкретный шаг: геймдизайнер отвечает на блокирующие вопросы и утверждает обновлённый CP0; затем AI создаёт `project/STYLE-GUIDE.md` и спецификацию одного эталонного уровня без перехода к массовому контенту.

## Актуальная монетизация и экономика

- Основная валюта: coins.
- Standard Levels: unlock за конфигурируемую цену в coins.
- Rewarded: только добровольные Free Coins, completion bonus, selected progression bonus и Premium unlock progress.
- Premium Levels: distinct locked/unlocked state; архитектура поддерживает повышенную coin price и `N` подтверждённых rewarded completions.
- Normal progression обязана работать без рекламы.
- Запрещено без нового решения: forced interstitials, banners, IAP, real-money packs, subscriptions.
- Реальный рекламный SDK подключается в конце; разработка использует отдельный mock/dev-adapter, который не доказывает работу production SDK.
- `Video2.mp4` подтверждает reference UI для base claim и добровольного ad-badged multiplier после livestream, а также increased Part-Time reward; reference multipliers/amounts не являются утверждённым балансом.

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
- Видео: `GameplayVideo.mp4` (27.633 секунды, 1920×1080, 30 FPS) и `Video2.mp4` (849.880 секунды, 640×360, 25 FPS).
- Все 38 JPG и оба видео просмотрены по содержимому, не только по именам; Video2 проверен по полной сетке 5 секунд и более плотным выборкам вокруг переходов/результатов.
- Извлечено 13 кадров в `reference/derived/gameplay-video/` и 28 кадров в `reference/derived/video2/`; labels, timestamps и границы интерпретации записаны в `KEYFRAMES.md` каждого набора.
- Подтверждено совместно: full main loop; six-step jelly cooking; short ice-cream assembly; three-serving cooked mukbang; level-up/unlocks; base/ad-multiplier reward; 7-day login claim; 8-customer drink Part-Time; automatic supermarket bill; packaged-food livestream with per-item coins; return to Hub.
- Исправлено/уточнено: первый ролик был только partial loop, но Video2 закрывает этот пробел; scanning gesture не подтверждён; checkout возможен при `4/5`; screenshot item-match job и video drink job — разные reference variants; `PLAY NOW` end card не является игровым failure/result state.
- Не показано: cooking/mukbang/job failure, Premium UI, Customization purchase, Decor interaction, Canteen, Shipping и Mail.
- Карта файлов и границы выводов записаны в `project/PROJECT-BRIEF.md`.
