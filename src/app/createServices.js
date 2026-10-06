import { DevPlatformAdapter } from '../platform/dev/DevPlatformAdapter.js';
import { SaveService } from '../services/SaveService.js';
import { RewardService } from '../services/RewardService.js';
import { AudioService } from '../services/AudioService.js';
import { AppearanceService } from '../services/AppearanceService.js';
import { PlaytimeService, startPlaytimeClock } from '../services/PlaytimeService.js';
import { StoreService } from '../services/StoreService.js';
import { FoodOrderService } from '../services/FoodOrderService.js';
import { CanteenService } from '../services/CanteenService.js';

export async function createServices() {
  const platform = new DevPlatformAdapter();
  const platformState = await platform.init();
  const save = new SaveService(platform);
  await save.load();
  const rewards = new RewardService(save, platform);
  const appearance = new AppearanceService(save);
  const playtime = new PlaytimeService(save, platform);
  startPlaytimeClock(playtime, platform, () => Boolean(rewards.adInFlight) || playtime.adInFlight);
  const orders = new FoodOrderService(save);
  const store = new StoreService(save, orders);
  const canteen = new CanteenService(save, orders);
  const audio = new AudioService();
  audio.setPlatformMuted(platformState.audioMuted);
  return { platform, save, rewards, appearance, playtime, orders, store, canteen, audio, platformState };
}
