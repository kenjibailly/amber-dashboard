function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 3600) {
    const mins = Math.floor(s / 60);
    return `${mins} ${mins === 1 ? "minute" : "minutes"}`;
  }
  if (s < 86400) {
    const hrs = Math.floor(s / 3600);
    return `${hrs} ${hrs === 1 ? "hour" : "hours"}`;
  }
  const days = Math.floor(s / 86400);
  return `${days} ${days === 1 ? "day" : "days"}`;
}
