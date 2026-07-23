export function getMysteryMailCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

export function getMysteryMailUrgency(milliseconds: number) {
  const remaining = Math.max(0, milliseconds);
  return {
    limitedWindow: remaining <= 30 * 86400000,
    closingSoon: remaining <= 7 * 86400000,
    critical: remaining <= 48 * 3600000,
    expired: milliseconds <= 0,
  };
}
