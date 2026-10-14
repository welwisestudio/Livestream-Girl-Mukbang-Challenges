// Interstitial policy: the single place that decides whether an interstitial may be requested.
// Scenes only announce natural breaks (`services.ads.interstitialBreak(placement)`).
//
// OFF by decision: the concept excludes forced interstitials / automatic ads after levels
// (project/DECISIONS.md 2026-10-04, re-confirmed 2026-10-14 for the YouTube integration:
// "support ready, switched off"). Turning it on is `enabled: true` plus a decision-log entry.
export const INTERSTITIAL_POLICY = Object.freeze({
  enabled: false,
  // Natural breaks that may carry an interstitial (announced by scenes; never mid-interaction).
  placements: Object.freeze(['level-break']),
  // No interstitial in the first minutes of a session (YouTube already shows pre-rolls).
  sessionGraceMs: 3 * 60 * 1000,
  // At least this long after the last completed interstitial request.
  minIntervalMs: 4 * 60 * 1000,
  // Never right after a rewarded ad (the player just watched one by choice).
  afterRewardedMs: 90 * 1000,
});
