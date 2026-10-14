// The build profile picks the adapter (vite.config.js defines __PLATFORM__); the host name
// never does. The unused branch is removed from the bundle, so the YouTube release contains
// no mock ads or test storage, and the local build contains no YouTube SDK calls.
/* global __PLATFORM__ */
export async function createPlatform() {
  if (__PLATFORM__ === 'youtube') {
    const { YouTubePlatformAdapter } = await import('./youtube/YouTubePlatformAdapter.js');
    return new YouTubePlatformAdapter();
  }
  const { DevPlatformAdapter } = await import('./dev/DevPlatformAdapter.js');
  return new DevPlatformAdapter();
}
