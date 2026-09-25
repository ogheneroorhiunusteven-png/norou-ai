// Level system: predictable XP requirement between levels.
// Each level requires a base amount that grows linearly.
// XP needed to go from level n to n+1 = BASE + (n-1) * STEP

const BASE = 100;
const STEP = 50;

export function xpForLevel(level: number): number {
  // XP required to advance FROM `level` to `level + 1`
  return BASE + (level - 1) * STEP;
}

// Total cumulative XP required to REACH a given level (level 1 = 0 xp)
export function totalXpToReachLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpForLevel(l);
  }
  return total;
}

export interface LevelInfo {
  level: number;
  currentLevelFloor: number; // total xp at start of current level
  nextLevelXp: number; // total xp needed to reach next level
  xpIntoLevel: number;
  xpForThisLevel: number;
  xpRemaining: number;
  progress: number; // 0-1
}

export function levelInfo(lifetimeXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(lifetimeXp || 0));
  let level = 1;
  let floor = 0;
  // advance while we can afford the next level
  // guard against infinite loops
  while (level < 1000) {
    const need = xpForLevel(level);
    if (xp >= floor + need) {
      floor += need;
      level += 1;
    } else {
      break;
    }
  }
  const xpForThisLevel = xpForLevel(level);
  const xpIntoLevel = xp - floor;
  const xpRemaining = xpForThisLevel - xpIntoLevel;
  return {
    level,
    currentLevelFloor: floor,
    nextLevelXp: floor + xpForThisLevel,
    xpIntoLevel,
    xpForThisLevel,
    xpRemaining,
    progress: xpForThisLevel > 0 ? xpIntoLevel / xpForThisLevel : 0,
  };
}
