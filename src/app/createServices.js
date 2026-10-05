import { DevPlatformAdapter } from '../platform/dev/DevPlatformAdapter.js';
import { SaveService } from '../services/SaveService.js';
import { RewardService } from '../services/RewardService.js';
import { AudioService } from '../services/AudioService.js';
import { AppearanceService } from '../services/AppearanceService.js';

export async function createServices() {
  const platform = new DevPlatformAdapter();
  const platformState = await platform.init();
  const save = new SaveService(platform);
  await save.load();
  const rewards = new RewardService(save);
  const appearance = new AppearanceService(save);
  const audio = new AudioService();
  audio.setPlatformMuted(platformState.audioMuted);
  return { platform, save, rewards, appearance, audio, platformState };
}
