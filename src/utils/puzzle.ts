const DEFAULT_PUZZLE_START_DATE = "2026-01-01";

export function getPuzzleNumber(startDate: string = DEFAULT_PUZZLE_START_DATE, now: Date = new Date()) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

export function seededRandom(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967295;
  };
}

export function selectDailyItem<T>(items: T[], puzzleNumber: number) {
  if (items.length === 0) return null;
  const rand = seededRandom(puzzleNumber.toString());
  const index = Math.floor(rand() * items.length);
  return items[index];
}