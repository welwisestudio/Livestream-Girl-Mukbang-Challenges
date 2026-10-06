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
  'lobby-placemat','lobby-cutlery-tray','lobby-coins','lobby-start','lobby-chicken','lobby-wallpaper','lobby-tablecloth',
];

const CUSTOMIZATION = [
  'body-sweater','body-cat','body-pink',
  'custom-beret','custom-bonnet','custom-flower','custom-carrot',
  'custom-glasses-round','custom-glasses-heart','custom-card','custom-card-selected',
  'custom-icon-hair','custom-icon-outfit','custom-icon-hat','custom-icon-glasses','custom-icon-tablecloth',
  'custom-price-pill','custom-close',
  'custom-bg-hearts','custom-bg-bunnies','custom-bg-garden',
  'custom-table-lavender','custom-table-winter','custom-table-floral',
  ...['happy','eating','chewing'].flatMap((pose) =>
    ['silver','honey','plum'].flatMap((hair) =>
      ['peach','warm','deep'].map((skin) => `custom-head-${hair}-${skin}-${pose}`))),
];

const PLAYTIME = ['playtime-header', 'playtime-panel', 'playtime-tile', 'playtime-tile-selected', 'playtime-check'];
const PART_TIME = [
  'ptj-background', 'ptj-card', 'ptj-progress', 'ptj-timer', 'ptj-bubble', 'ptj-arrow',
  'ptj-corn-dog', 'ptj-snack', 'ptj-milk', 'ptj-donut', 'ptj-ice-cream', 'ptj-onigiri',
  'ptj-customer-1', 'ptj-customer-2', 'ptj-customer-3', 'ptj-customer-4', 'ptj-customer-5', 'ptj-customer-6',
];
const STORE = [
  'store-shelf-pink', 'store-shelf-matcha', 'store-scan',
  'store-cookie-jar', 'store-orez', 'store-green-tea', 'store-swirl-soda', 'store-strawberry-milk', 'store-potato-chips',
  'store-matcha-sticks', 'store-matcha-biscuits', 'store-matcha-latte', 'store-tokboki', 'store-matcha-cookies', 'store-matcha-wafer',
  'store-close', 'store-arrow', 'store-check', 'store-basket', 'store-price-tag', 'store-pill', 'store-cart', 'store-live', 'store-sign',
];
const CANTEEN = [
  'canteen-background', 'canteen-tray',
  'canteen-rice-pot', 'canteen-soup-bowl', 'canteen-veggie-bowl', 'canteen-jelly-tray', 'canteen-cookie-box', 'canteen-chicken-basket',
  'canteen-rice', 'canteen-soup', 'canteen-veggies', 'canteen-jelly', 'canteen-cookies', 'canteen-chicken', 'canteen-spoon', 'canteen-ladle',
];
const REWARD = ['reward-bar', 'reward-button', 'reward-pill', 'reward-pointer', 'reward-play'];

export const IMAGE_ASSETS = [
  ...L1.map((key) => ({ key, url: `assets/level1/${key}.webp` })),
  ...CAMPAIGN.map((key) => ({ key, url: `assets/campaign/${key}.webp` })),
  ...CUSTOMIZATION.map((key) => ({ key, url: `assets/customization/${key}.webp` })),
  ...REWARD.map((key) => ({ key, url: `assets/reward/${key}.webp` })),
  ...PLAYTIME.map((key) => ({ key, url: `assets/playtime/${key}.webp` })),
  ...CANTEEN.map((key) => ({ key, url: `assets/canteen/${key}.webp` })),
  ...STORE.map((key) => ({ key, url: `assets/store/${key}.webp` })),
  ...PART_TIME.map((key) => ({ key, url: `assets/part-time/${key}.webp` })),
];

export const VIEWER_AVATARS = ['viewer-bunny', 'viewer-bear', 'viewer-cat', 'viewer-chick'];
