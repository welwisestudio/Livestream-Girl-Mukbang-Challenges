// Runtime asset manifest. Paths are relative so the build works from any sub-folder host.
const L1 = [
  'room', 'character-happy', 'character-eating', 'character-chewing', 'mascot', 'avatar',
  'bowl', 'bowl-filled', 'orange-mix', 'whisk', 'jelly-plain', 'jelly-berries', 'jelly-finished',
  'plate-empty', 'piece-full', 'piece-bitten', 'piece-last', 'berries', 'glaze', 'check', 'coin',
  'hint-hand', 'padlock', 'viewer-bunny', 'viewer-bear', 'viewer-cat', 'viewer-chick',
];

export const IMAGE_ASSETS = L1.map((key) => ({ key, url: `assets/level1/${key}.webp` }));

export const VIEWER_AVATARS = ['viewer-bunny', 'viewer-bear', 'viewer-cat', 'viewer-chick'];
