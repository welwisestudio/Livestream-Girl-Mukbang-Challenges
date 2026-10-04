export const CAMPAIGN_ORDER = ['orange-jelly-01'];

export const LEVELS = {
  'orange-jelly-01': {
    id: 'orange-jelly-01',
    number: 1,
    title: 'Orange Jelly Live',
    recipe: 'orange-jelly',
    rewardCoins: 200,
    unlocksLevel: 2,
    servings: 3,
    reference: {
      source: 'reference/input/Video2.mp4',
      preStream: '00:00:38',
      cooking: '00:00:49–00:01:20',
      mukbang: '00:01:24–00:01:42',
      result: '00:01:44–00:01:50',
    },
    steps: [
      { id: 'choose-mold', mechanic: 'tap-choice', instruction: 'Pick the orange mold' },
      { id: 'pour-mix', mechanic: 'drag-drop', instruction: 'Pour' },
      { id: 'stir', mechanic: 'circular-stir', instruction: 'Stir' },
      { id: 'unmold', mechanic: 'directional-drag', instruction: 'Lift up' },
      { id: 'add-berries', mechanic: 'drag-drop', instruction: 'Add berries' },
      { id: 'add-glaze', mechanic: 'drag-drop', instruction: 'Add glaze' },
    ],
  },
};

export function getLevel(id) {
  const level = LEVELS[id];
  if (!level) throw new Error(`Unknown level: ${id}`);
  return level;
}
