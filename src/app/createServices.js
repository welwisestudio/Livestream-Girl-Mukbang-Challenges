import { RewardService } from '../services/RewardService.js';
import { AudioService } from '../services/AudioService.js';
import { AdService } from '../services/AdService.js';
import { AppearanceService } from '../services/AppearanceService.js';
import { PlaytimeService, startPlaytimeClock } from '../services/PlaytimeService.js';
import { StoreService } from '../services/StoreService.js';
import { FoodOrderService } from '../services/FoodOrderService.js';
import { CanteenService } from '../services/CanteenService.js';
import { PlatformLifecycle } from './PlatformLifecycle.js';
import { AssetStreamer } from './AssetStreamer.js';

// Builds the game services on top of an initialised platform adapter. The save must already
// be loaded (see main.js): nothing here can write before a successful load.
export function createServices({ platform, platformState, save }) {
  const audio = new AudioService(save);
  const ads = new AdService({ platform, audio, capabilities: platformState.capabilities });
  // Reward services ask the ad gate (one ad at a time, audio paused); they grant only on `earned`.
  const rewards = new RewardService(save, ads, audio);
  const appearance = new AppearanceService(save);
  const playtime = new PlaytimeService(save, ads, audio);
  const lifecycle = new PlatformLifecycle({ platform, audio, save, playtime });
  startPlaytimeClock(playtime, lifecycle, () => ads.busy || Boolean(rewards.adInFlight) || playtime.adInFlight);
  // Deferred art: streams after gameReady, pauses with the host, screens wait for their own art.
  const assets = new AssetStreamer({ lifecycle, save });
  const orders = new FoodOrderService(save);
  const store = new StoreService(save, orders);
  const canteen = new CanteenService(save, orders);
  return { platform, save, rewards, ads, appearance, playtime, orders, store, canteen, audio, lifecycle, assets, platformState };
}

