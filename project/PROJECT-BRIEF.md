# Короткий бриф проекта

Обновлено: 2026-10-04. Статус: CP3 candidate — реализована первая полная playable-версия из пяти стандартных уровней; ожидается review геймдизайнера.

Статусы в документе:

- **CONFIRMED** — прямо задано геймдизайнером или однозначно видно в референсе.
- **INFERRED** — наиболее вероятный вывод из референсов, но не принято как правило игры.
- **OPEN QUESTION** — требуется решение геймдизайнера.
- **SUGGESTION** — отдельная рекомендация AI, не являющаяся решением.

## Подтверждённая концепция

**CONFIRMED.** Вертикальная 2D casual web-игра о девушке-стримере и авторе mukbang-контента. Игрок готовит блюда через короткую последовательность простых touch/drag-мини-игр, использует готовую еду в основном livestream/mukbang-геймплее, получает монеты и прогресс, открывает новую еду и возвращается в домашний хаб. Мета-слой включает магазин продуктов, подработку, кастомизацию персонажа, декор, ежедневные награды, optional rewarded ads и отдельную систему Premium Levels.

Рабочее название: не задано.

### Подтверждённый объём первой полной версии

**CONFIRMED.** В текущей кампании ровно пять standard cooking levels, порядок фиксирован:

1. Jelly (`orange-jelly-01`)
2. Ramen (`ramen-02`)
3. Pizza (`pizza-03`)
4. Sushi (`sushi-04`)
5. Bubble Tea (`bubble-tea-05`)

Level 6, будущие placeholder-уровни и активные Premium cooking levels не создаются. Premium-архитектура может оставаться подготовленной, но не влияет на эти пять уровней. Основной scope этой версии: Loading, reference-led Lobby, пять cooking flows, livestream/mukbang, coins, последовательные unlocks, basic rewards, Viewer Request infrastructure и responsive UI. Part-Time, Supermarket gameplay, customization, decor, Daily Reward, real ads и YouTube SDK отложены.

**INFERRED / IMPLEMENTATION DETAIL.** Безопасные временные цены unlock и rewards централизованы и гарантируют отсутствие экономического тупика; это не финальный баланс и может быть изменено на этапе balance review.

## Подтверждённый Core Loop

1. Игрок начинает в домашнем хабе.
2. Выбирает или запускает приготовление блюда.
3. Проходит последовательность простых touch/drag-этапов готовки.
4. Получает готовое блюдо.
5. Использует его в основном livestream/mukbang-геймплее.
6. Получает монеты и прогресс.
7. Открывает новую еду и другой контент.
8. Тратит монеты на стандартные уровни, еду/рецепты, продукты, внешность, декор и другие подтверждённые системы прогрессии.
9. Возвращается в цикл с новым контентом.

Порядок выше задан геймдизайнером и не должен меняться без согласования. `Video2.mp4` подтверждает эту последовательность в референсном приложении, но его конкретные числа и баланс не становятся решениями проекта автоматически.

### Уточнение Core Loop по двум видео

- **CONFIRMED:** короткий `GameplayVideo.mp4` показывает partial loop `Supermarket shelf selection → automatic itemized checkout → packaged-food mukbang feeding`.
- **CONFIRMED:** длинный `Video2.mp4` показывает полный основной reference-loop `Hub / Start Live → pre-stream comments / viewer request → многостадийная готовка → Perfect → три порции cooked-food mukbang → level-up/unlock при достижении порога → base reward или добровольный ad-multiplier → Hub`.
- **CONFIRMED:** `Video2.mp4` также повторяет side loop `Hub → Supermarket → direct item selection → automatic bill/payment → Live: Eating at supermarket → per-item coins → End Livestream reward → Hub`.
- **CORRECTED:** прежний вывод «видео не доказывает полный Core Loop» относился только к `GameplayVideo.mp4` и закрыт вторым видео.
- **OPEN QUESTION:** переносить ли supermarket loop как отдельную side activity в нашу игру. Утверждённый основной loop не меняется.

## Подтверждённые механики

### Приготовление рецептов

- Рецепт состоит из нескольких стадий с видимым индикатором прогресса.
- Простые действия мышью/touch: работа с сырыми ингредиентами, перетаскивание, смешивание, добавление соусов, помещение еды в соус или масло, готовка на сковороде, перенос готовой еды на тарелку и подтверждение завершённого шага.
- Действие должно читаться визуально без длинного текста.
- Допустимые подсказки: рука, стрелка, подсветка или очевидная анимация движения.
- Курица служит примером первого рецепта, но точная последовательность и правила ещё не утверждены.
- **CONFIRMED по `Video2.mp4`:** jelly-рецепты используют шесть видимых шагов: выбор основы/варианта, добавление ингредиента, круговое смешивание до заполнения шкалы, формование/переворот, декор и подтверждение. Доступные варианты расширяются с уровнем; недоступные помечены замком/уровнем.
- **CONFIRMED по `Video2.mp4`:** optional `Make Ice-cream` event допускает `Play` или `Skip this time` и использует короткую selection-based assembly: посуда → шарики → topping/fruit → `Perfect`.
- **NOT SHOWN:** cooking failure, штраф за неверный ингредиент, ограничение времени или пережаривание.

### Livestream / mukbang

- Готовое блюдо используется после приготовления в основной livestream/mukbang-фазе.
- Фаза связана с получением монет и прогресса.
- **CONFIRMED по `GameplayVideo.mp4`:** в референсном приложении игрок двигает порции еды к открытому рту персонажа. Для разных продуктов визуально используются прямое перемещение, вилка, ложка, трубочка и палочки; персонаж показывает открытый рот и короткую реакцию после еды.
- **CONFIRMED по видео как референсный side flow:** выбранные в Supermarket packaged foods после checkout появляются на mukbang-столе. Это не заменяет утверждённую цепочку нашей игры `cooking → mukbang` без отдельного решения.
- **CONFIRMED по `Video2.mp4`:** cooked-food livestream начинается с трёх одинаковых сервировок; игрок по одной подаёт их к рту, а после опустошения стола появляется completion/level-up flow. Комментарии прокручиваются автоматически, поле чата видно, но ввод игроком не показан.
- **CONFIRMED для supermarket side flow:** купленные товары можно есть в свободно наблюдаемом порядке; во время еды начисляются отдельные coin payouts, после опустошения стола показывается `End Livestream` с базовой наградой и ad-badged multiplier.
- **INFERRED:** характерные эмоции персонажа после отдельных продуктов являются presentation feedback, а не fail state: сессия после них продолжается.
- **OPEN QUESTION:** должны ли эти reference rules стать правилами нашей основной mukbang-фазы; влияние комментариев/зрителей, ошибки и fail conditions всё ещё не заданы.

### Открытие контента

- Прогресс открывает новые виды еды.
- Для открытия может использоваться отдельный reward/unlock-экран.
- Порог, порядок и условия открытий пока не заданы.
- **CONFIRMED по `Video2.mp4`:** level-up происходит после завершённой cooked-food mukbang-сессии и показывает три новых предмета; в записи видны переходы на уровни 2, 3 и 4.

### Supermarket

- Продукты покупаются за монеты и выбираются прямо с полок.
- Корзина имеет ограниченную вместимость.
- Показывается общая стоимость.
- После выбора товары проходят отдельный экран сканирования.
- Магазин может иметь несколько категорий или страниц.
- **CONFIRMED по `GameplayVideo.mp4`:** товар выбирается прямым tap по карточке/упаковке на полке; после выбора видео показывает itemized checkout, где названия, количество `x1`, цены и total появляются последовательно.
- **CORRECTED:** в видео не видно отдельного жеста игрока для сканирования. Пять выбранных product types проходят через checkout автоматически примерно за 4 секунды; поэтому scanning нельзя фиксировать как самостоятельную мини-игру.
- **CONFIRMED по `Video2.mp4`:** checkout разрешён до заполнения отображаемого лимита (`4/5`), стоимость списывается при оплате, затем те же товары немедленно переходят на supermarket livestream table.
- **REFERENCE CONFLICT:** `Video2.mp4` стабильно показывает denominator `/5`, но screenshot `8/5` этому противоречит; обязательный hard cap проекта всё ещё не утверждён.

### Part-time Job

- Отдельная мини-игра для заработка монет.
- Клиент приходит с заказом; игрок выбирает правильный товар из нескольких вариантов.
- Некоторые задания требуют сопоставления с силуэтом/формой.
- Правильный и неправильный ответы получают разные понятные состояния.
- Завершение смены награждает монетами.
- Есть обычные и VIP-клиенты. Механика дополнительной VIP-награды не определена и не должна быть придумана без согласования.
- **CONFIRMED по `Video2.mp4`:** в drink-stand варианте смена состоит из 8 клиентов. Клиент показывает целевой стакан, игрок выбирает соответствующие цвет/добавку из трёх bins, готовый стакан обновляется, успешная выдача увеличивает счётчик и приводит следующего клиента.
- **CONFIRMED:** после `8/8` показывается `Well done` и coin reward; рекламный badge предлагает увеличенную выплату. Это отдельный вариант от screenshot-based shop-item matching.
- **NOT SHOWN:** явный неверный выбор, проигрыш смены, таймер/терпение и VIP-клиент.

### Customization

- Отдельный экран изменения персонажа.
- Причёски и другие элементы внешности покупаются за монеты.
- Есть несколько категорий кастомизации.
- **CONFIRMED по `SkinChanging.jpg`:** активна категория причёсок; карточки имеют цену и selected-обводку; видна строка из шести category tabs.
- **INFERRED:** иконки остальных tabs похожи на верхнюю одежду, аксессуар/головной предмет, нижнюю одежду, ещё одну clothing/legwear-категорию и animal/face-категорию. Их точная семантика по одному кадру не определяется, поэтому обязательными пока считаются только заданные пользователем hairstyles, clothing, accessories и другие cosmetics.

### Decor

- Игрок покупает и заменяет элементы комнаты/мебели.
- Разные предметы стоят монеты.

### Daily Reward

- Цепочка наград на 7 дней.
- Награды включают монеты и косметические предметы.
- **CONFIRMED по `Video2.mp4`:** claim первого дня немедленно увеличивает баланс; reference grid показывает coins на днях 1–6 и cosmetic на дне 7. Конкретные значения не утверждают баланс проекта.

### Level Progression

**CONFIRMED.**

- Игра имеет систему уровней и открытия контента.
- Стандартные уровни открываются за soft currency.
- Цены открытия конфигурируются централизованно и могут расти на поздних уровнях.
- Прогресс открывает еду, рецепты, уровни и другой контент.
- Новая еда может показываться отдельным экраном `Unlock new food`.
- **CONFIRMED по `Video2.mp4`:** профильный level повышается после livestream completion; level-up modal показывает вновь доступные cooking items, после чего игрок подтверждает переход.
- Финальное число уровней, рецептов и баланс цен пока не определены.

### Soft Currency

**CONFIRMED.** Монеты — основная soft currency.

- Источники: завершение уровней, cooking/mukbang, Part-Time Job, Daily Reward, progression/special rewards и добровольные rewarded ads.
- Траты: стандартные уровни, food/recipe progression, кастомизация, причёски, одежда, косметика, декор, мебель, supermarket/progression content и выбранный premium-контент.
- Игра должна оставаться проходимой без просмотра рекламы.
- Все цены, награды и множители позже хранятся в централизованной конфигурации; финальные значения сейчас не выбираются.
- Конфигурация должна покрывать: normal/premium level unlock prices, gameplay rewards, rewarded-ad coin rewards, reward multipliers, cosmetic/hairstyle/clothing/decor prices, progression rewards, supermarket prices и другие будущие economy values.
- **CONFIRMED по `Video2.mp4`:** reference balance visibly changes after base livestream claim, Daily Login claim, Part-Time Job, supermarket purchase and per-item supermarket mukbang rewards. Это подтверждает источники/траты, но не разрешает копировать суммы.

### Optional Rewarded Ads

**CONFIRMED.**

- Реклама запускается только осознанным действием игрока.
- До запуска UI показывает точную награду и позволяет отказаться.
- Награда выдаётся только после подтверждённого успешного результата SDK.
- Cancelled, failed, skipped и unavailable не выдают награду.
- Подтверждённые сценарии: Free Coins; бонус/множитель после завершения уровня; отдельные progression bonuses; прогресс открытия выбранных Premium Levels.
- Во время разработки используется отдельный явно включённый mock/dev-адаптер с тем же внутренним интерфейсом; gameplay и экономика не обращаются к рекламному провайдеру напрямую.
- Forced interstitials, автоматическая реклама после уровней и баннеры не входят в концепт.
- **CONFIRMED как reference placement:** completion и `End Livestream` показывают отдельную base claim и ad-badged moving multiplier (`×2…×5`); Part-Time result также показывает ad-badged increased reward. Точные множители и placement не считаются принятыми.

### Premium Levels

**CONFIRMED.**

- Premium Levels — отдельные или явно отмеченные специальные уровни с отличимыми locked/unlocked-состояниями и особой визуальной подачей.
- Они должны предлагать более необычный или насыщенный рецепт, геймплей, награду или презентацию, но конкретное содержание ещё не выбрано.
- Архитектура поддерживает способы доступа через повышенную цену в soft currency и через заданное число успешно завершённых rewarded ads.
- Прогресс рекламного открытия отображается как `0/N → … → N/N`; значение `N` конфигурируется и сейчас не фиксируется.
- Дополнительные способы доступа могут быть добавлены позже.
- Реальные деньги, подписки, currency packs и IAP сейчас не добавляются.
- **REFERENCE GAP:** ни 38 JPG, ни оба видео не показывают однозначно подписанный Premium Level selection/locked/unlocked-экран; его visual state задаётся требованиями пользователя, а не копируется из референса.

### Home / Hub

Подтверждены точки входа: Start, Super Market, Decor, Skin, Daily Reward, Part-Time Job, Canteen, Shipping и Mail. `Video2.mp4` подтверждает Home как фактическую точку возврата после основных и side activities. Функции Shipping и Mail, а также точная роль Canteen ещё не заданы.

## Структура экранов и переходов

```text
Boot / Loading
└─ Home / Hub
   ├─ Profile (редактирование имени, rank, Sound/Music/Vibrate, language)
   ├─ Settings (отдельный screenshot-вариант; точный состав для нашей игры не утверждён)
   ├─ Free Coins → раскрытие награды → добровольный rewarded → результат
   ├─ Daily Reward → награда → Hub
   ├─ Skin / Customization → покупка/экипировка → Hub
   ├─ Decor → покупка/замена → Hub
   ├─ Super Market
   │  ├─ категории/полки → прямой tap товара → корзина
   │  ├─ itemized checkout/scanning animation → total → результат покупки
   │  └─ [REFERENCE CONFIRMED / PROJECT OPEN] packaged-food livestream → per-item coins → End Livestream → Hub
   ├─ Part-Time Job
   │  └─ screenshot item-match или video drink-match → progress → итог смены → Hub
   ├─ Canteen (точная роль требует решения)
   ├─ Shipping (не определено)
   ├─ Mail (не определено)
   └─ Start / Level Progression
      ├─ Standard Level: locked за coins / unlocked
      ├─ Premium Level: special locked / coin unlock / rewarded progress / unlocked
      └─ выбор/старт рецепта
         → последовательность стадий готовки
         → готовое блюдо
         → livestream/mukbang
         → обычная награда
         → необязательный rewarded bonus
         → возможный unlock
         → Hub
```

Последовательность внутри ветки Start следует заданному Core Loop. `Video2.mp4` уточняет порядок: `Start Live → comments/viewer request → cooking → Perfect → mukbang → level-up/completion reward → Hub`.

## Текущие потоки по референсам

### Cooking flow

**CONFIRMED по совокупности запроса и изображений:** уровень разбит на короткие стадии; сверху отображается прогресс; игрок получает крупный центральный объект, визуальную подсказку жеста/цели и иногда зелёную кнопку подтверждения.

**CONFIRMED по `Video2.mp4`:** полный jelly flow занимает около 30 секунд, использует шесть отметок прогресса и сочетает item selection, tap/confirm, drag/pour, круговое смешивание со шкалой, unmold и garnish. После него следует `Perfect`, затем три servings в livestream. Ice-cream event короче и состоит преимущественно из последовательного выбора компонентов.

Наблюдаемая chicken-цепочка: сырая курица/выбор части (`DoingChiken`) → добавление/смешивание приправы жестом (`MixChiken`) → выбор и наливание соуса (`SousForChiken`) → перенос курицы в соус (`PutChikenInSouse`) → перенос покрытых кусочков в масло (`ChikenInButton`) → жарка (`ChikenInCooking`) → перенос готовой еды на тарелку (`PutChikenInPlate`) → completed/result (`FoodCooked`).

**INFERRED:** `PlateToPutFood`, `PlateWithFood`, `CookingFood`, `AddFood` и `DoingFood` вероятнее показывают соседний ramen/hotpot-рецепт или дополнительные стадии, а не обязательно единую chicken-цепочку. Это нельзя склеивать в один рецепт без решения геймдизайнера.

### Supermarket flow

**CONFIRMED по скриншотам и видео:** `Tap To Open` → открытие полок → прямые taps по товарам с видимыми coin prices → быстрые переходы между группами полок → scanner/cashier screen → последовательное появление строк `item ×1 + price` → рост total → прямой переход к столу с теми же купленными продуктами.

**CORRECTED:** отдельный player scanning gesture не подтверждён; в обоих видео checkout идёт автоматически. `Video2.mp4` показывает checkout при `4/5`, поэтому заполнение корзины не обязательно. Числа `0/5` и `8/5` в screenshots всё ещё конфликтуют, поэтому hard cap проекта не фиксируется.

**OPEN QUESTION:** нужно ли нашей игре перенести подтверждённый reference side loop `Supermarket → packaged-food livestream → End Livestream reward → Hub`, либо покупки должны пополнять cooking-инвентарь и возвращать игрока в Hub.

### Part-Time Job flow

**CONFIRMED — screenshot variant:** tutorial/start → клиент появляется один → визуальный заказ/силуэты над ним → три товара → выбор → correct/error state → счётчик `0/6…6/6` → receipt с normal/VIP income.

**CONFIRMED — `Video2.mp4` variant:** `Go to Part-time` → `Go` → один клиент с изображением целевого напитка → выбор из трёх ingredient/topping bins → обновление стакана → клиент уходит → счётчик `0/8…8/8` → `Well done` → reward → Hub. Одна смена в записи занимает примерно 54 секунды.

**CORRECTED:** screenshot item/silhouette matching и video drink assembly — две разные reference implementations; их нельзя описывать как одну доказанную последовательность. Выбор варианта для проекта остаётся за геймдизайнером.

**NOT SHOWN в Video2:** incorrect choice, fail state, timer/patience bar и VIP. Screenshot-вариант подтверждает их визуальное наличие, но не правила.

## Текущее визуальное направление

- **CONFIRMED:** будущий UI, пропорции, presentation и interaction language основываются прежде всего на `reference/input/`; generic mobile UI вместо этого направления запрещён.
- **INFERRED:** pastel/kawaii/chibi-подача; крупная голова персонажа и компактное тело; центральные крупные food-объекты; мягкие mint/pink/cream-фоны; толстые цветные контуры; округлые glossy-кнопки; оранжевые/зелёные CTA; крупные иконки и минимум текста; реакции/комментарии как плавающий livestream-фидбек.
- **OPEN QUESTION:** ни один экран ещё не принят как точный эталон для копирования композиции, а точные персонажи, логотипы, бренды и рекламные элементы исходного приложения не переносятся.

## GameplayVideo: область подтверждения и тайминг

**CONFIRMED:** видео длится `00:00:27.633`, имеет 1920×1080 и 30 FPS. Это короткий горизонтально смонтированный promotional/gameplay fragment, а не запись полного Core Loop.

- `00:00–00:06.5`: открытие Supermarket и выбор пяти типов packaged food. Монтаж показывает примерно одно действие/переход каждые 0.5–1.5 секунды.
- `00:06.5–00:10.8`: автоматизированный itemized checkout; total увеличивается до 1000. Эти числа принадлежат референсу и не задают наш баланс.
- `00:11.5–00:25.5`: mukbang table; игрок последовательно подаёт chips, cake-like bite, green dessert, peach drink и noodles. Между демонстрируемыми bites проходит примерно 1.5–3 секунды.
- `00:25.5–00:27.633`: переход к рекламной `PLAY NOW` end card.

**NOT SHOWN:** cooking sequence, Home/Hub, level selection, victory/failure, reward claim, coin earning, unlock/progression, comments/reactions, Premium Levels и rewarded ads.

**INFERRED:** свободный выбор следующего продукта и несколько portions на item выглядят возможными, но edited montage этого не доказывает. Показанный темп не используется как target timing игры.

## Video2: совместная область подтверждения и тайминг

**CONFIRMED:** `Video2.mp4` длится `00:14:09.880`, имеет 640×360 и 25 FPS. Это непрерывная вертикальная screen recording reference-сессии, а не рекламная нарезка. Она расширяет, а не заменяет, `GameplayVideo.mp4` и screenshots.

- `00:00–00:35`: Hub и Profile. Игрок меняет имя; Sound/Music/Vibrate toggles и language selector видимы, локализация UI меняется сразу.
- `00:38–01:50`: первый полный main loop: pre-stream comments → `Make Jelly` → six-step cooking → viewer request → `Perfect` → три servings → Level 2/unlocks → Complete reward → Hub.
- `01:52–01:55`: Day 1 Daily Login claim увеличивает balance.
- `02:50–05:10`: ещё два jelly cooking/mukbang прохода; Level 3 и новые items. Это подтверждает повторяемость цикла и level-gated variants.
- `05:12–06:12`: Part-Time drink stand, 8 customers, `Well done`, reward и возврат в Hub.
- `06:18–07:53`: Supermarket → cart `4/5` → automatic bill/payment → `Live: Eating at supermarket` → per-item coins → Hub.
- `07:58–08:53`: вторая Part-Time shift без повторного tutorial prompt.
- `09:00–10:43`: второй supermarket/live cycle с большим чеком → `End Livestream` base/ad-multiplier reward → Hub.
- `10:45–11:48`: black-jelly cooking → `Perfect` → три servings → completion reward.
- `11:50–12:45`: optional `Make Ice-cream` (`Play` / `Skip this time`) → short assembly → `Perfect` → три servings → Level 4/unlocks.
- `12:50–14:09.780`: purple-jelly variant → mukbang → transition back to Hub.

**CONFIRMED success states:** `Perfect` after cooking, empty-table completion, `Level up`, `Complete`/`End Livestream`, `Well done` after job. **NOT SHOWN:** failed cooking, failed livestream, failed job selection, game-over or retry.

**CONFIRMED timing envelope in this reference:** a jelly cooking segment is roughly 25–35 seconds; its three-serving mukbang roughly 20–25 seconds; Part-Time shift roughly 54 seconds; Supermarket selection/checkout roughly 30–35 seconds; supermarket mukbang roughly 55–60 seconds. Эти значения описывают запись, но не задают target pacing проекта.

**NOT SHOWN:** Customization transaction, Decor interaction, Premium Level UI/access, explicit rewarded-ad playback, Canteen, Shipping or Mail.

## Карта референсов

| Файлы | Что видно | К какой части относится | Что не переносится автоматически |
|---|---|---|---|
| `LoadingScreen.jpg` | Вертикальная загрузка с логотипом и прогресс-баром | Boot / Loading | Название, логотип и конкретная композиция |
| `LobbyScreen.jpg`, `Start.jpg` | Домашний хаб, персонаж, баланс, кнопки систем | Home / Hub | Конкретные числа, уровни, рекламные элементы и точное расположение |
| `Settings.jpg`, `Profile.jpg` | Модальные окна настроек и профиля | Settings / Profile | Restore purchase, реклама и точный набор полей |
| `WhenGameStarting.jpg` | Pre-stream-состояние, комментарии/реакции и Start | Старт livestream | Момент появления этого экрана и влияние комментариев |
| `DoingChiken.jpg`, `MixChiken.jpg` | Сырая курица, выбор/подтверждение и жест смешивания | Подготовка ингредиента | Точные цели, таймер и критерий завершения |
| `SousForChiken.jpg`, `PutChikenInSouse.jpg` | Выбор/покупка соуса и перенос курицы в соус | Соус и drag | Цена, ассортимент, обязательность покупки внутри рецепта |
| `ChikenInButton.jpg`, `ChikenInCooking.jpg` | Перенос в масло и состояние жарки | Готовка | Тайминг, риск пережарки и управление нагревом |
| `PlateToPutFood.jpg`, `PutChikenInPlate.jpg`, `PlateWithFood.jpg` | Выбор основы/лапши и перенос готовой еды на тарелку | Сборка и plating | Платная ли основа, свободный выбор или заданный рецепт |
| `CookingFood.jpg`, `AddFood.jpg`, `DoingFood.jpg` | Добавление нескольких компонентов и параллельные тарелки/кастрюля | Другие рецепты и сборка блюда | Какие рецепты входят в первые пять уровней |
| `FoodCooked.jpg` | Экран Completed с готовым блюдом | Завершение рецепта | Наличие отдельного Next и его маршрут |
| `Eating.jpg`, `EatingFood.jpg` | Персонаж ест перед камерой, реакции и комментарии | Livestream / mukbang | Управление едой, оценка, длительность и влияние аудитории |
| `ClaimMoney.jpg` | Итог стрима, базовая и множительная награда | Результат и подтверждённый optional rewarded bonus | Точный множитель и финальная композиция |
| `UnlockFood.jpg` | Прогресс и отдельный экран открытия еды | Unlock | Порог `3/50`, конкретная еда и частота открытия |
| `MakeDrink.jpg`, `MakingDrink.jpg` | Выбор напитка и наливание | Возможная дополнительная стадия рецепта | Входит ли напиток в первый контент, цены и правила |
| `Canteen.jpg`, `FoodCanteen.jpg` | Обучение смешиванию двух продуктов и лоток | Canteen / food-combination | Является ли это обязательной мета-системой и как выдаётся результат |
| `Shop.jpg`, `ShopV2.jpg`, `Shopping.jpg` | Категории полок, цены, корзина, total | Supermarket | Вместимость `5`, ассортимент и цены |
| `ShopScanning.jpg` | Отдельная лента/сканирование выбранных покупок | Supermarket scanning | Точный жест и условие успешной оплаты |
| `Job.jpg`, `ProcessOfWork.jpg` | Туториал, силуэты/заказ, три варианта товара, прогресс смены | Part-Time Job | Длина смены `6`, таймер и набор товаров |
| `IfWorkIsWell.jpg`, `IfWorkIsNotCorrect.jpg` | Итог смены и реакция на ошибку | Job success/error | Размер награды, штраф и VIP-правила |
| `SkinChanging.jpg` | Категории внешности, карточки и цены | Customization | Категории первого релиза, цены и состав каталога |
| `Decorations.jpg` | Комната, слоты декора и каталог | Decor | Слоты, цены и начальный каталог |
| `DailyRewards.jpg` | 7-дневная сетка монет и косметики | Daily Reward | Конкретные награды, календарные правила и сброс серии |
| `GameplayVideo.mp4` | Tap-to-select товары, itemized checkout и feeding interactions с пятью типами еды | Supermarket → reference mukbang side flow | Полный Core Loop, cooking, reward/progression и in-game failure не показаны; `PLAY NOW` — promo end card |
| `Video2.mp4` | Full cooking/mukbang loop, progression, rewards, Daily Login, drink Part-Time, repeated Supermarket live flow and profile/localization behavior | Main loop + side activities + UI flow | Fail states, Premium, customization/decor interaction and final balance are not shown |

Все 38 JPG, `GameplayVideo.mp4` и `Video2.mp4` просмотрены совместно. Сохранены 13 key frames первого видео в `reference/derived/gameplay-video/` и 28 кадров второго в `reference/derived/video2/`, оба набора имеют manifest. Рекламные баннеры не являются частью принятой монетизации. Video/reward-кнопки служат референсом для optional bonus, но их точные числа и оформление не копируются автоматически.

## OPEN QUESTIONS: решения, которых недостаточно в референсах

1. Рабочее название игры и имя/образ главной героини; является ли жёлтый питомец частью концепции.
2. Точные пять первых рецептов/уровней и полный порядок стадий каждого.
3. Для cooked-food livestream референс подтверждает три servings и завершение после пустого стола; нужно решить, переносить ли это правило в нашу игру и как обрабатывать ошибки/fail.
4. Влияют ли комментарии, реакции, число зрителей или качество блюда на награду, либо это только визуальный фидбек.
5. Условия победы и поражения, допустимые ошибки, таймеры и возможность переиграть стадию.
6. Желаемый темп и длительность рецепта, отдельной стадии, mukbang-фазы и полной сессии; reference timings зафиксированы, но не утверждены как targets.
7. Нужны ли выбор блюда/рецепта и инвентарь до старта или игрок сразу получает следующий рецепт.
8. Оба видео подтверждают reference-side flow `Supermarket → packaged-food livestream → per-item coins → End Livestream`; нужно решить, переносится ли он в нашу игру или покупки работают как cooking-инвентарь.
9. Hard cap корзины, категории, начальный ассортимент и цены. Checkout возможен при `4/5` и идёт автоматически; отдельный scanning gesture больше не является открытым вопросом.
10. Какой Part-Time вариант принять: screenshot item/silhouette matching (`6` клиентов) или video drink assembly (`8` клиентов); также нужны правила ошибки/fail, таймер и VIP.
11. Роль Canteen: смешивание уже открытой еды, источник новых рецептов или отдельная необязательная мини-игра.
12. Назначение Shipping и Mail и входят ли они в первую версию.
13. Категории и стартовый объём Skin/Customization; правила покупки, владения и экипировки.
14. Слоты и стартовый каталог Decor; влияет ли декор только визуально или на прогрессию.
15. Точные правила 7-day reward: календарные дни или последовательные входы, часовой пояс, пропуск/сброс и наш состав наград. Reference day 1 claim и типы наград подтверждены, но значения не приняты.
16. Порядок открытия еды, уровней и рецептов; стартовый баланс, темп накопления и все финальные цены/награды.
17. Нужна ли отдельная механика приготовления напитков в первых уровнях; не смешивать её автоматически с drink-assembly Part-Time из Video2.
18. Язык первой версии и требования к локализации.
19. Звуковое направление, музыка, SFX/ASMR и необходимость вибрации; текущий анализ зафиксировал визуальный поток видео, но не задаёт audio direction.
20. Какие конкретные уровни являются Premium, чем их контент отличается от standard и где они показываются в progression UI.
21. Точные значения Free Coins, completion multiplier, rewarded progression bonus и число реклам для Premium unlock; они намеренно отложены до балансировки.
22. Поведение Premium unlock при нескольких способах доступа: достаточно любого одного способа или требуется комбинированный прогресс; текущий текст наиболее естественно читается как альтернативные способы, но это следует подтвердить перед реализацией.
23. Какие визуальные элементы референса разрешено использовать только как вдохновение; точные персонажи, логотип, тексты и чужие бренды не считаются разрешёнными для копирования.
24. Объём первой версии после одного эталонного уровня: какие мета-системы должны реально работать к первому релизу.

## SUGGESTIONS — не принятые решения

1. Сделать chicken-рецепт первым эталонным уровнем, потому что он лучше всего покрыт последовательными референсами.
2. Для первого vertical slice реализовать только обычную награду и один mock rewarded-сценарий completion bonus; Free Coins и Premium rewarded progress добавить после приёмки core gameplay.
3. Считать coin unlock и rewarded-progress альтернативными способами доступа к Premium Level, чтобы игра оставалась проходимой без рекламы.
4. Отложить Canteen, Shipping и Mail до определения их функций, оставив их вне первого рабочего уровня.
5. Для первого эталонного mukbang использовать подтверждённую структуру из трёх servings и empty-table completion, но утвердить её отдельно вместе с условиями ошибки.
6. Если Part-Time входит в первую версию, выбрать один из двух reference-вариантов; drink assembly лучше согласуется с общей food-preparation fantasy, но это ещё не решение.

## Технические и платформенные условия

- Phaser 3 + JavaScript ES Modules + Vite; реальные версии и lockfile фиксируются при создании игры.
- Мышь/touch, вертикальный responsive UI.
- Механики отделяются от конфигураций уровней; уровни получают постоянные строковые ID, порядок хранится отдельно.
- Прогресс, награды и состояние имеют один источник истины.
- Сначала сменный внутренний platform contract и явный dev-адаптер.
- Настоящий YouTube SDK, cloud-only save и проверки площадки интегрируются в самом конце отдельным адаптером.
- Вся будущая генерация графики — только Nano Banana 2 через Higgsfield MCP.
- Прозрачность спрайтов создаётся отдельной операцией Higgsfield Background Remover; генерацией или локальным chroma key она не подменяется.
- Игра во время выполнения использует только локальные подготовленные ассеты и не обращается к Higgsfield.
- Монетизация: soft currency, optional rewarded ads и Premium Levels. Forced interstitials, баннеры, реальные деньги, подписки и currency packs исключены до отдельного решения.

## Репозиторий и источники

- GitHub: `https://github.com/welwisestudio/Livestream-Girl-Mukbang-Challenges`
- Референсы: `reference/input/`
- Видеофайлы: `reference/input/GameplayVideo.mp4` (27.633 секунды, 1920×1080, 30 FPS) и `reference/input/Video2.mp4` (849.880 секунды, 640×360, 25 FPS).
- Отобранные кадры и manifests: `reference/derived/gameplay-video/` и `reference/derived/video2/`.
- Исторические материалы `case-study/` и `platform/source/` не являются активными требованиями.
