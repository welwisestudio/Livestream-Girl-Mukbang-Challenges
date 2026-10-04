export function createRunId(levelId, now = Date.now(), random = Math.random()) {
  return `${levelId}:${now.toString(36)}:${Math.floor(random * 1e9).toString(36)}`;
}
