import type { Activity, AppState, DayIndex } from "./types";
import { dateKey, dayIndexOf, weekStartKey, minutesOf } from "./date";
import { levelInfo } from "./xp";

export function activitiesForDay(state: AppState, day: DayIndex): Activity[] {
  return state.activities
    .filter((a) => a.days.includes(day))
    .sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
}

export function isCompleted(state: AppState, key: string, activityId: string): boolean {
  return !!state.completions[key]?.[activityId];
}

export interface DayProgress {
  total: number;
  completed: number;
  xpActivities: Activity[]; // xp-bearing activities for today (quests)
}

// "meaningful" = xp-bearing activities
export function dayProgress(state: AppState, date: Date = new Date()): DayProgress {
  const key = dateKey(date);
  const day = dayIndexOf(date);
  const acts = activitiesForDay(state, day);
  const completed = acts.filter((a) => isCompleted(state, key, a.id)).length;
  const xpActivities = acts.filter((a) => a.xp > 0);
  return { total: acts.length, completed, xpActivities };
}

export function meaningfulProgress(state: AppState, date: Date = new Date()) {
  const key = dateKey(date);
  const day = dayIndexOf(date);
  const acts = activitiesForDay(state, day).filter((a) => a.xp > 0);
  const completed = acts.filter((a) => isCompleted(state, key, a.id)).length;
  const pct = acts.length > 0 ? Math.round((completed / acts.length) * 100) : 0;
  return { total: acts.length, completed, pct };
}

// Count completed activities of a category in the current week
export function weeklyCategoryCount(state: AppState, category: string): number {
  const wk = weekStartKey();
  const start = new Date(wk + "T00:00:00");
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKey(d);
    const day = dayIndexOf(d);
    const acts = activitiesForDay(state, day).filter((a) => a.category === category);
    for (const a of acts) {
      if (isCompleted(state, key, a.id)) count++;
    }
  }
  return count;
}

// Lifetime count of completed activities of a category (across all completions)
export function lifetimeCategoryCount(state: AppState, category: string): number {
  const idToCategory = new Map(state.activities.map((a) => [a.id, a.category]));
  let count = 0;
  for (const day of Object.values(state.completions)) {
    for (const [aid, done] of Object.entries(day)) {
      if (done && idToCategory.get(aid) === category) count++;
    }
  }
  return count;
}

export function totalCompletedActivities(state: AppState): number {
  let count = 0;
  for (const day of Object.values(state.completions)) {
    count += Object.values(day).filter(Boolean).length;
  }
  return count;
}

export function completedTasksToday(state: AppState): number {
  // tasks don't have a per-day model; count tasks completed
  return state.tasks.filter((t) => t.completed).length;
}

// Apply achievement unlocks based on current state. Mutates achievements in place (returns new list).
export function evaluateAchievements(state: AppState): { changed: boolean; newlyUnlocked: string[] } {
  const now = Date.now();
  const newlyUnlocked: string[] = [];
  const unlock = (id: string, condition: boolean) => {
    const ach = state.achievements.find((a) => a.id === id);
    if (ach && !ach.unlockedAt && condition) {
      ach.unlockedAt = now;
      newlyUnlocked.push(ach.title);
    }
  };

  const totalActs = totalCompletedActivities(state);
  const anyTaskDone = state.tasks.some((t) => t.completed);
  unlock("first-step", totalActs >= 1 || anyTaskDone);

  const todayKey = dateKey();
  const todayCompleted = Object.values(state.completions[todayKey] ?? {}).filter(Boolean).length;
  unlock("on-fire", todayCompleted >= 5);

  unlock("scholar", lifetimeCategoryCount(state, "study") >= 10);
  unlock("researcher", lifetimeCategoryCount(state, "research") >= 10);
  unlock("built-different", lifetimeCategoryCount(state, "gym") >= 10);
  unlock(
    "builder",
    lifetimeCategoryCount(state, "project") + lifetimeCategoryCount(state, "coursework") >= 10,
  );

  const li = levelInfo(state.xp);
  unlock("level-10", li.level >= 10);

  unlock("consistency", state.streak.longest >= 7 || state.streak.current >= 7);

  return { changed: newlyUnlocked.length > 0, newlyUnlocked };
}

// Update streak based on today's meaningful completion.
export function updateStreak(state: AppState) {
  const key = dateKey();
  const mp = meaningfulProgress(state);
  const isMeaningfulDone = mp.total > 0 && mp.completed >= Math.ceil(mp.total * 0.6);

  const already = state.streak.completedDates.includes(key);

  if (isMeaningfulDone && !already) {
    state.streak.completedDates.push(key);
    // compute current streak: consecutive days ending today
    const set = new Set(state.streak.completedDates);
    let cur = 0;
    const d = new Date();
    for (;;) {
      const k = dateKey(d);
      if (set.has(k)) {
        cur++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    state.streak.current = cur;
    state.streak.lastCompletedDate = key;
    if (cur > state.streak.longest) state.streak.longest = cur;
  } else if (!isMeaningfulDone && already) {
    // unchecked below threshold - remove today's mark and recompute
    state.streak.completedDates = state.streak.completedDates.filter((k) => k !== key);
    const set = new Set(state.streak.completedDates);
    let cur = 0;
    const d = new Date();
    // if today is no longer complete, current streak resets from yesterday backwards only if yesterday continuous... simplest: recompute ending yesterday
    d.setDate(d.getDate() - 1);
    for (;;) {
      const k = dateKey(d);
      if (set.has(k)) {
        cur++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    state.streak.current = cur;
  } else if (isMeaningfulDone) {
    // recompute current streak (keeps it fresh)
    const set = new Set(state.streak.completedDates);
    let cur = 0;
    const d = new Date();
    for (;;) {
      const k = dateKey(d);
      if (set.has(k)) {
        cur++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    state.streak.current = cur;
  }
}

export function updateAnalytics(state: AppState) {
  const key = dateKey();
  const dp = dayProgress(state);
  const mp = meaningfulProgress(state);
  state.analytics[key] = {
    completedActivities: dp.completed,
    completedTasks: completedTasksToday(state),
    completionPct: mp.pct,
  };
}

// Handle daily & weekly resets. Returns mutated state.
export function handleResets(state: AppState): AppState {
  const today = dateKey();
  const wk = weekStartKey();

  // First set week key if missing
  if (!state.weekStartKey) state.weekStartKey = wk;

  // Weekly reset: nothing to "reset" since weekly challenges are derived from completions
  // (they naturally scope by current week). We just track the week key.
  if (state.weekStartKey !== wk) {
    state.weekStartKey = wk;
  }

  // Daily: completions/water/mood are stored per-date so they auto-reset.
  // We simply mark lastActiveDate.
  if (state.lastActiveDate !== today) {
    state.lastActiveDate = today;
  }
  return state;
}

export const DAILY_QUEST_BONUS = 50;
