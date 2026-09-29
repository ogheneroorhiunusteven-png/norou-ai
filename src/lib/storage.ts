import type { AppState } from "./types";
import { buildSeedActivities, buildSeedWorkouts, buildAchievements } from "./seed";

export const STORAGE_KEY = "levelup:v1";
export const CURRENT_VERSION = 2;

export function defaultState(): AppState {
  return {
    version: CURRENT_VERSION,
    seeded: false,
    profile: { name: "Player" },
    xp: 0,
    activities: [],
    completions: {},
    meals: {},
    budget: { monthlyIncome: 0, needsPct: 50, wantsPct: 30, savingsPct: 20, currency: "GBP" },
    budgetExpenses: {},
    unexpectedIncomeByMonth: {},
    goals: [],
    tasks: [],
    calendarEvents: [],
    memories: [],
    notes: [],
    alarms: [],
    workouts: [],
    healthGoals: { restingHeartRate: 62, waterGoal: 8, caloriesGoal: 2200 },
    nutritionGoals: { calories: 2200, protein: 150, carbs: 250, fat: 70 },
    healthByDate: {},
    notifications: {
      enabled: false,
      scheduledStarts: true,
      completionFeedback: true,
      morningPlan: true,
      upcomingActivities: false,
      eveningWrapUp: true,
    },
    achievements: [],
    analytics: {},
    streak: { current: 0, longest: 0, lastCompletedDate: null, completedDates: [] },
    questBonus: {},
    weekStartKey: null,
    lastActiveDate: null,
  };
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function obj<T extends object>(v: unknown): T {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as T) : ({} as T);
}

// Merge loaded (possibly corrupted) state with defaults safely.
export function sanitize(raw: unknown): AppState {
  const d = defaultState();
  if (!raw || typeof raw !== "object") {
    return seedIfNeeded(d);
  }
  const r = raw as Record<string, unknown>;
  const rProfile = rec(r.profile);
  const rHealthGoals = rec(r.healthGoals);
  const rNutrition = rec(r.nutritionGoals);
  const rBudget = rec(r.budget);
  const rNotif = rec(r.notifications);
  const rStreak = rec(r.streak);

  const state: AppState = {
    version: CURRENT_VERSION,
    seeded: bool(r.seeded, false),
    profile: { name: str(rProfile.name, d.profile.name) },
    xp: Math.max(0, num(r.xp, 0)),
    activities: (arr(r.activities).filter(isValidActivity) as unknown) as AppState["activities"],
    completions: sanitizeCompletions(r.completions),
    meals: sanitizeMeals(r.meals),
    budget: {
      monthlyIncome: Math.max(0, num(rBudget.monthlyIncome, d.budget.monthlyIncome)),
      needsPct: Math.max(0, num(rBudget.needsPct, d.budget.needsPct)),
      wantsPct: Math.max(0, num(rBudget.wantsPct, d.budget.wantsPct)),
      savingsPct: Math.max(0, num(rBudget.savingsPct, d.budget.savingsPct)),
      currency: str(rBudget.currency, d.budget.currency),
    },
    budgetExpenses: sanitizeBudgetExpenses(r.budgetExpenses),
    unexpectedIncomeByMonth: Object.fromEntries(Object.entries(rec(r.unexpectedIncomeByMonth)).map(([key, value]) => [key, Math.max(0, num(value, 0))])),
    goals: (arr(r.goals).filter((g) => g && typeof g === "object") as unknown) as AppState["goals"],
    tasks: (arr(r.tasks)
      .filter((t) => t && typeof t === "object")
      .map((t) => {
        const rt = rec(t);
        return {
          id: str(rt.id, "") || `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: str(rt.title, ""),
          dueDate: rt.dueDate ? str(rt.dueDate, "") || undefined : undefined,
          completed: bool(rt.completed, false),
          createdAt: num(rt.createdAt, Date.now()),
          // Fields added later — old saved data won't have these, default safely.
          priority: (["low", "medium", "high"].includes(rt.priority as string) ? rt.priority : "medium") as AppState["tasks"][number]["priority"],
          category: rt.category ? str(rt.category, "") || undefined : undefined,
          tags: Array.isArray(rt.tags) ? (rt.tags.filter((x) => typeof x === "string") as string[]) : [],
          recurrence: (["none", "daily", "weekly", "monthly"].includes(rt.recurrence as string) ? rt.recurrence : "none") as AppState["tasks"][number]["recurrence"],
        };
      })) as AppState["tasks"],
    calendarEvents: (arr(r.calendarEvents)
      .filter((e) => e && typeof e === "object")
      .map((e) => {
        const re = rec(e);
        return {
          id: str(re.id, "") || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          title: str(re.title, ""),
          date: str(re.date, ""),
          time: re.time ? str(re.time, "") || undefined : undefined,
          endTime: re.endTime ? str(re.endTime, "") || undefined : undefined,
          notes: re.notes ? str(re.notes, "") || undefined : undefined,
          reminder: bool(re.reminder, false),
          createdAt: num(re.createdAt, Date.now()),
        };
      })
      .filter((e) => e.date)) as AppState["calendarEvents"],
    memories: (arr(r.memories)
      .filter((m) => m && typeof m === "object")
      .map((m) => {
        const rm = rec(m);
        return {
          id: str(rm.id, "") || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          text: str(rm.text, ""),
          createdAt: num(rm.createdAt, Date.now()),
          source: (rm.source === "ai" ? "ai" : "user") as "user" | "ai",
        };
      })
      .filter((m) => m.text)) as AppState["memories"],
    notes: (arr(r.notes).filter((n) => n && typeof n === "object") as unknown) as AppState["notes"],
    alarms: (arr(r.alarms).filter((al) => al && typeof al === "object") as unknown) as AppState["alarms"],
    workouts: (arr(r.workouts).filter((w) => w && typeof w === "object") as unknown) as AppState["workouts"],
    healthGoals: {
      restingHeartRate: num(rHealthGoals.restingHeartRate, d.healthGoals.restingHeartRate),
      waterGoal: num(rHealthGoals.waterGoal, d.healthGoals.waterGoal),
      caloriesGoal: num(rHealthGoals.caloriesGoal, d.healthGoals.caloriesGoal),
    },
    nutritionGoals: {
      calories: num(rNutrition.calories, d.nutritionGoals.calories),
      protein: num(rNutrition.protein, d.nutritionGoals.protein),
      carbs: num(rNutrition.carbs, d.nutritionGoals.carbs),
      fat: num(rNutrition.fat, d.nutritionGoals.fat),
    },
    healthByDate: (() => {
      const raw = rec(r.healthByDate);
      const out: AppState["healthByDate"] = {};
      for (const [key, v] of Object.entries(raw)) {
        const rv = rec(v);
        out[key] = {
          water: num(rv.water, 0),
          caloriesBurned: num(rv.caloriesBurned, 0),
          mood: (typeof rv.mood === "number" ? rv.mood : null) as AppState["healthByDate"][string]["mood"],
          // Added after initial release — old saved days won't have this.
          steps: num(rv.steps, 0),
        };
      }
      return out;
    })(),
    notifications: {
      enabled: bool(rNotif.enabled, d.notifications.enabled),
      scheduledStarts: bool(rNotif.scheduledStarts, d.notifications.scheduledStarts),
      completionFeedback: bool(rNotif.completionFeedback, d.notifications.completionFeedback),
      morningPlan: bool(rNotif.morningPlan, d.notifications.morningPlan),
      upcomingActivities: bool(rNotif.upcomingActivities, d.notifications.upcomingActivities),
      eveningWrapUp: bool(rNotif.eveningWrapUp, d.notifications.eveningWrapUp),
    },
    achievements: (arr(r.achievements).filter((a) => a && typeof a === "object") as unknown) as AppState["achievements"],
    analytics: obj(r.analytics),
    streak: {
      current: Math.max(0, num(rStreak.current, 0)),
      longest: Math.max(0, num(rStreak.longest, 0)),
      lastCompletedDate: str(rStreak.lastCompletedDate, "") || null,
      completedDates: arr<string>(rStreak.completedDates).filter((x) => typeof x === "string"),
    },
    questBonus: obj(r.questBonus),
    weekStartKey: str(r.weekStartKey, "") || null,
    lastActiveDate: str(r.lastActiveDate, "") || null,
  };

  return seedIfNeeded(state);
}

function isValidActivity(a: unknown): boolean {
  if (!a || typeof a !== "object") return false;
  const x = a as Record<string, unknown>;
  return typeof x.id === "string" && typeof x.title === "string" && Array.isArray(x.days);
}

function sanitizeCompletions(v: unknown): AppState["completions"] {
  if (!v || typeof v !== "object") return {};
  const out: AppState["completions"] = {};
  for (const [k, day] of Object.entries(v as Record<string, unknown>)) {
    if (day && typeof day === "object") {
      const inner: Record<string, boolean> = {};
      for (const [aid, done] of Object.entries(day as Record<string, unknown>)) {
        if (done === true) inner[aid] = true;
      }
      out[k] = inner;
    }
  }
  return out;
}

function sanitizeMeals(v: unknown): AppState["meals"] {
  if (!v || typeof v !== "object") return {};
  const out: AppState["meals"] = {};
  for (const [k, list] of Object.entries(v as Record<string, unknown>)) {
    if (Array.isArray(list)) {
      out[k] = list.filter((m) => m && typeof m === "object");
    }
  }
  return out;
}

function sanitizeBudgetExpenses(v: unknown): AppState["budgetExpenses"] {
  if (!v || typeof v !== "object") return {};
  const out: AppState["budgetExpenses"] = {};
  for (const [month, list] of Object.entries(v as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    out[month] = list.filter((x) => x && typeof x === "object").map((x) => {
      const r = x as Record<string, unknown>;
      return {
        id: str(r.id, "") || `expense_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date: str(r.date, month + "-01"),
        label: str(r.label, "Expense"),
        amount: Math.max(0, num(r.amount, 0)),
        category: (["needs", "wants", "savings"].includes(r.category as string) ? r.category : "needs") as AppState["budgetExpenses"][string][number]["category"],
      };
    });
  }
  return out;
}

function seedIfNeeded(state: AppState): AppState {
  if (!state.seeded) {
    state.activities = buildSeedActivities();
    state.workouts = buildSeedWorkouts();
    state.achievements = buildAchievements();
    state.seeded = true;
  }
  // Ensure achievements list always contains all defined achievements (merge new ones)
  const defs = buildAchievements();
  const existing = new Map(state.achievements.map((a) => [a.id, a]));
  state.achievements = defs.map((def) => existing.get(def.id) ?? def);
  return state;
}

export function loadState(): AppState {
  if (typeof window === "undefined") return seedIfNeeded(defaultState());
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return sanitize(null);
    const parsed = JSON.parse(raw);
    return sanitize(parsed);
  } catch {
    return sanitize(null);
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / serialization errors
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
