// Runtime asset manifest. Paths are relative so the build works from any sub-folder host.
const L1 = [
  'room', 'character-happy', 'character-eating', 'character-chewing', 'mascot', 'avatar',
  'bowl', 'bowl-filled', 'orange-mix', 'whisk', 'jelly-plain', 'jelly-berries', 'jelly-finished',
  'plate-empty', 'piece-full', 'piece-bitten', 'piece-last', 'berries', 'glaze', 'check', 'coin',
  'hint-hand', 'padlock', 'viewer-bunny', 'viewer-bear', 'viewer-cat', 'viewer-chick',
];

const CAMPAIGN = [
  'pot-empty','noodles','broth','pot-noodles','seasoning','egg','ramen-toppings','ramen-finished','stove','ramen-boiling','ramen-chopsticks','ramen-bite','ramen-bite-small','ramen-empty','ramen-tray','ramen-check',
  'dough','pizza-sauce','dough-sauced','cheese','pizza-toppings','pizza-raw','oven','oven-baking','pizza-finished','pizza-cutter','pizza-slice','pizza-slice-bitten','pizza-empty','tomato','cheese-wedge','pizza-check',
  'sushi-mat','nori','rice','nori-rice','sushi-fillings','sushi-open','sushi-roll','sushi-knife','sushi-cut','sushi-finished','sushi-chopsticks','sushi-piece','sushi-piece-bitten','sushi-empty','soy-sauce','sushi-check',
  'tea-cup','pearls','cup-pearls','syrup','cup-syrup','milk-tea','cup-tea','ice','cup-ice','shaker','bubble-tea-finished','bubble-tea-full','bubble-tea-half','bubble-tea-empty','sealer','tea-check',
  'settings','part-time','canteen','store','skin','daily','supermarket','decor','lobby-plate','lobby-spoon','phone','mitts','sprout-mascot','thought-bubble','new-badge','level-lock',
];

export const IMAGE_ASSETS = [
  ...L1.map((key) => ({ key, url: `assets/level1/${key}.webp` })),
  ...CAMPAIGN.map((key) => ({ key, url: `assets/campaign/${key}.webp` })),
];

export const VIEWER_AVATARS = ['viewer-bunny', 'viewer-bear', 'viewer-cat', 'viewer-chick'];
