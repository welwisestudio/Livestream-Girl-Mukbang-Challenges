// Level content is data. Mechanics live in src/mechanics, step presentation in src/levels/steps.
// IDs are permanent; CAMPAIGN_ORDER controls display order separately.
export const CAMPAIGN_ORDER = ['orange-jelly-01'];

export const LEVELS = {
  'orange-jelly-01': {
    id: 'orange-jelly-01',
    number: 1,
    title: 'Orange Jelly Live',
    recipe: 'orange-jelly',
    actionLabel: 'Make Jelly',
    rewardCoins: 200,
    unlocksLevel: 2,
    servings: 3,
    bitesPerServing: 3,
    request: { viewer: 'Sofia', avatar: 'viewer-bunny', dish: 'jelly-finished' },
    unlockPreview: ['bowl', 'berries', 'glaze'],
    reference: {
      source: 'reference/input/Video2.mp4',
      preStream: '00:00:36–00:00:45',
      cooking: '00:00:46–00:01:18',
      mukbang: '00:01:22–00:01:40',
      result: '00:01:42–00:01:50',
    },
    steps: [
      {
        id: 'choose-mold', kind: 'choice', instruction: 'Choose a mold',
        options: [
          { id: 'orange', texture: 'bowl', label: 'Orange', correct: true },
          { id: 'locked-2', locked: true, lockLabel: 'Lv. 2' },
          { id: 'locked-3', locked: true, lockLabel: 'Lv. 3' },
        ],
        result: 'bowl',
      },
      { id: 'pour-mix', kind: 'pour', instruction: 'Pour it in', tool: 'orange-mix', before: 'bowl', after: 'bowl-filled' },
      { id: 'stir', kind: 'stir', instruction: 'Stir it round', tool: 'whisk', base: 'bowl-filled', turns: 2 },
      { id: 'unmold', kind: 'unmold', instruction: 'Lift the mold', mold: 'bowl', reveal: 'jelly-plain' },
      {
        id: 'add-berries', kind: 'topping', instruction: 'Add a topping',
        base: 'jelly-plain', result: 'jelly-berries',
        options: [
          { id: 'berries', texture: 'berries', label: 'Berries', correct: true },
          { id: 'locked-2', locked: true, lockLabel: 'Lv. 2' },
          { id: 'locked-4', locked: true, lockLabel: 'Lv. 4' },
        ],
      },
      {
        id: 'add-glaze', kind: 'topping', instruction: 'Add the glaze',
        base: 'jelly-berries', result: 'jelly-finished', pour: true,
        options: [
          { id: 'glaze', texture: 'glaze', label: 'Glaze', correct: true },
          { id: 'locked-3', locked: true, lockLabel: 'Lv. 3' },
          { id: 'locked-5', locked: true, lockLabel: 'Lv. 5' },
        ],
      },
    ],
    comments: {
      preStream: [
        'Welcome everyone!', 'This is my new favorite comfort food!', 'Yummy yummy!!',
        'What should I try next?', 'Let’s start a food club!', 'I’ve been your fan for a long time!',
      ],
      mukbang: [
        'This is heaven on a plate!', 'The jelly looks so bouncy!', 'That’s a huge portion!',
        'I’m drooling!', 'New viewer here!', 'Keep going, you’re killing it!', 'So jiggly!!',
      ],
    },
  },
};

export function getLevel(id) {
  const level = LEVELS[id];
  if (!level) throw new Error(`Unknown level: ${id}`);
  return level;
}
