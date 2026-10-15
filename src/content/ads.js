// Interstitial policy: the single place that decides whether an interstitial may be requested.
// Scenes only announce natural breaks (`services.ads.interstitialBreak(placement)`).
//
// Enabled at the natural post-level break. Eligibility is still controlled here: session
// grace, spacing between completed requests, recent rewarded ads, host pause and ad busy state.
export const INTERSTITIAL_POLICY = Object.freeze({
  enabled: true,
  // Natural breaks that may carry an interstitial (announced by scenes; never mid-interaction).
  placements: Object.freeze(['level-break']),
  // No interstitial in the first minutes of a session (YouTube already shows pre-rolls).
  sessionGraceMs: 3 * 60 * 1000,
  // At least this long after the last completed interstitial request.
  minIntervalMs: 4 * 60 * 1000,
  // Never right after a rewarded ad (the player just watched one by choice).
  afterRewardedMs: 90 * 1000,
});
