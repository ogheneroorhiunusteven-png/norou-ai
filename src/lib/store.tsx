"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import type {
  AppState,
  Activity,
  Meal,
  Goal,
  Task,
  CalendarEvent,
  MemoryFact,
  Note,
  Alarm,
  WorkoutPlan,
  MoodValue,
  HealthDay,
  NotificationSettings,
  DayIndex,
} from "./types";
import { loadState, saveState, clearState, defaultState } from "./storage";
import { dateKey, advanceDate } from "./date";
import { levelInfo } from "./xp";
import { tapFeedback, successFeedback } from "./haptics";
import { notifyNow } from "./notifications";
import {
  evaluateAchievements,
  updateStreak,
  updateAnalytics,
  handleResets,
  isCompleted as isCompletedFn,
  DAILY_QUEST_BONUS,
  dayProgress,
} from "./logic";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface LevelUpEvent {
  newLevel: number;
  totalXp: number;
}

interface StoreContext {
  state: AppState;
  ready: boolean;
  levelUpEvent: LevelUpEvent | null;
  clearLevelUpEvent: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
  // profile
  setName: (name: string) => void;
  // activities
  toggleActivity: (activityId: string, date?: Date) => void;
  addActivity: (a: Omit<Activity, "id">) => void;
  updateActivity: (a: Activity) => void;
  deleteActivity: (id: string) => void;
  // health
  getHealthDay: (key?: string) => HealthDay;
  setWater: (cups: number, key?: string) => void;
  setCaloriesBurned: (kcal: number, key?: string) => void;
  setSteps: (steps: number, key?: string) => void;
  setMood: (mood: MoodValue, key?: string) => void;
  setRestingHeartRate: (bpm: number) => void;
  setWaterGoal: (g: number) => void;
  setCaloriesGoal: (g: number) => void;
  // nutrition
  getMeals: (key?: string) => Meal[];
  addMeal: (m: Omit<Meal, "id">, key?: string) => void;
  updateMeal: (m: Meal, key?: string) => void;
  deleteMeal: (id: string, key?: string) => void;
  // goals
  addGoal: (g: Omit<Goal, "id" | "createdAt">) => void;
  updateGoal: (g: Goal) => void;
  deleteGoal: (id: string) => void;
  // tasks
  addTask: (t: Omit<Task, "id" | "createdAt">) => void;
  addCalendarEvent: (e: Omit<CalendarEvent, "id" | "createdAt">) => void;
  addMemory: (text: string, source?: "user" | "ai") => void;
  deleteMemory: (id: string) => void;
  clearMemories: () => void;
  updateCalendarEvent: (e: CalendarEvent) => void;
  deleteCalendarEvent: (id: string) => void;
  toggleTask: (id: string) => void;
  updateTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  // notes
  addNote: (title: string, body: string) => void;
  updateNote: (n: Note) => void;
  deleteNote: (id: string) => void;
  // alarms
  addAlarm: (a: Omit<Alarm, "id">) => void;
  toggleAlarm: (id: string) => void;
  updateAlarm: (a: Alarm) => void;
  deleteAlarm: (id: string) => void;
  // workouts
  addWorkout: (w: Omit<WorkoutPlan, "id">) => void;
  updateWorkout: (w: WorkoutPlan) => void;
  deleteWorkout: (id: string) => void;
  // notifications
  updateNotifications: (n: Partial<NotificationSettings>) => void;
  // data
  clearAll: () => void;
  // helpers
  isCompleted: (activityId: string, date?: Date) => boolean;
}

const Ctx = createContext<StoreContext | null>(null);

export function useStore(): StoreContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}

const emptyHealthDay: HealthDay = { water: 0, caloriesBurned: 0, mood: null, steps: 0 };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => defaultState());
  const [ready, setReady] = useState(false);
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount
  useEffect(() => {
    const loaded = handleResets(loadState());
    setState(loaded);
    saveState(loaded);
    setReady(true);
  }, []);

  // Persist on every change once ready
  useEffect(() => {
    if (ready) saveState(state);
  }, [state, ready]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const clearLevelUpEvent = useCallback(() => setLevelUpEvent(null), []);

  // Central mutation helper that runs derived recalcs.
  const mutate = useCallback(
    (fn: (draft: AppState) => void, opts?: { recalc?: boolean; notifyLevel?: boolean }) => {
      setState((prev) => {
        const draft: AppState = structuredClone(prev);
        const beforeLevel = levelInfo(draft.xp).level;
        fn(draft);
        if (opts?.recalc) {
          updateStreak(draft);
          updateAnalytics(draft);
          const res = evaluateAchievements(draft);
          if (res.newlyUnlocked.length > 0) {
            showToast(`🏆 Achievement: ${res.newlyUnlocked[0]}`);
          }
        }
        if (opts?.notifyLevel) {
          const afterLevel = levelInfo(draft.xp).level;
          if (afterLevel > beforeLevel) {
            // schedule level up event after state commit
            setTimeout(() => setLevelUpEvent({ newLevel: afterLevel, totalXp: draft.xp }), 60);
            void successFeedback();
            if (draft.notifications.enabled && draft.notifications.completionFeedback) {
              void notifyNow("⚡ Level Up!", `You reached Level ${afterLevel}. Keep the streak alive.`);
            }
          }
        }
        return draft;
      });
    },
    [showToast],
  );

  // ---- Actions ----
  const setName = useCallback((name: string) => {
    mutate((d) => {
      d.profile.name = name.trim() || "Player";
    });
  }, [mutate]);

  const toggleActivity = useCallback(
    (activityId: string, date: Date = new Date()) => {
      mutate(
        (d) => {
          const key = dateKey(date);
          const act = d.activities.find((a) => a.id === activityId);
          if (!act) return;
          if (!d.completions[key]) d.completions[key] = {};
          const currently = !!d.completions[key][activityId];
          if (currently) {
            // uncheck: remove completion and revoke XP (only if xp>0)
            delete d.completions[key][activityId];
            if (act.xp > 0) d.xp = Math.max(0, d.xp - act.xp);
            // revoke quest bonus if it was awarded and now quests incomplete
            revokeQuestBonusIfNeeded(d, key);
          } else {
            d.completions[key][activityId] = true;
            if (act.xp > 0) d.xp += act.xp;
            if (act.xp > 0) awardQuestBonusIfComplete(d, key);
            void tapFeedback();
          }
        },
        { recalc: true, notifyLevel: true },
      );
    },
    [mutate],
  );

  const addActivity = useCallback((a: Omit<Activity, "id">) => {
    mutate((d) => {
      d.activities.push({ ...a, id: uid() });
    });
  }, [mutate]);

  const updateActivity = useCallback((a: Activity) => {
    mutate((d) => {
      const i = d.activities.findIndex((x) => x.id === a.id);
      if (i >= 0) d.activities[i] = a;
    });
  }, [mutate]);

  const deleteActivity = useCallback((id: string) => {
    mutate((d) => {
      d.activities = d.activities.filter((a) => a.id !== id);
      // remove any completions referencing it
      for (const key of Object.keys(d.completions)) {
        if (d.completions[key][id]) delete d.completions[key][id];
      }
    });
  }, [mutate]);

  // Health
  const getHealthDay = useCallback(
    (key: string = dateKey()): HealthDay => state.healthByDate[key] ?? emptyHealthDay,
    [state.healthByDate],
  );

  const ensureHealthDay = (d: AppState, key: string): HealthDay => {
    if (!d.healthByDate[key]) d.healthByDate[key] = { water: 0, caloriesBurned: 0, mood: null, steps: 0 };
    return d.healthByDate[key];
  };

  const setWater = useCallback((cups: number, key: string = dateKey()) => {
    mutate((d) => {
      const hd = ensureHealthDay(d, key);
      hd.water = Math.max(0, Math.min(d.healthGoals.waterGoal, Math.round(cups)));
    });
  }, [mutate]);

  const setCaloriesBurned = useCallback((kcal: number, key: string = dateKey()) => {
    mutate((d) => {
      const hd = ensureHealthDay(d, key);
      hd.caloriesBurned = Math.max(0, Math.round(kcal));
    });
  }, [mutate]);

  const setSteps = useCallback((steps: number, key: string = dateKey()) => {
    mutate((d) => {
      const hd = ensureHealthDay(d, key);
      hd.steps = Math.max(0, Math.round(steps));
    });
  }, [mutate]);

  const setMood = useCallback((mood: MoodValue, key: string = dateKey()) => {
    mutate((d) => {
      const hd = ensureHealthDay(d, key);
      hd.mood = mood;
    });
  }, [mutate]);

  const setRestingHeartRate = useCallback((bpm: number) => {
    mutate((d) => {
      d.healthGoals.restingHeartRate = Math.max(0, Math.round(bpm));
    });
  }, [mutate]);

  const setWaterGoal = useCallback((g: number) => {
    mutate((d) => {
      d.healthGoals.waterGoal = Math.max(1, Math.round(g));
    });
  }, [mutate]);

  const setCaloriesGoal = useCallback((g: number) => {
    mutate((d) => {
      d.healthGoals.caloriesGoal = Math.max(1, Math.round(g));
    });
  }, [mutate]);

  // Nutrition
  const getMeals = useCallback(
    (key: string = dateKey()): Meal[] => state.meals[key] ?? [],
    [state.meals],
  );

  const addMeal = useCallback((m: Omit<Meal, "id">, key: string = dateKey()) => {
    mutate((d) => {
      if (!d.meals[key]) d.meals[key] = [];
      d.meals[key].push({ ...m, id: uid() });
    });
  }, [mutate]);

  const updateMeal = useCallback((m: Meal, key: string = dateKey()) => {
    mutate((d) => {
      const list = d.meals[key];
      if (!list) return;
      const i = list.findIndex((x) => x.id === m.id);
      if (i >= 0) list[i] = m;
    });
  }, [mutate]);

  const deleteMeal = useCallback((id: string, key: string = dateKey()) => {
    mutate((d) => {
      if (d.meals[key]) d.meals[key] = d.meals[key].filter((x) => x.id !== id);
    });
  }, [mutate]);

  // Goals
  const addGoal = useCallback((g: Omit<Goal, "id" | "createdAt">) => {
    mutate((d) => {
      d.goals.unshift({ ...g, id: uid(), createdAt: Date.now() });
    });
  }, [mutate]);

  const updateGoal = useCallback((g: Goal) => {
    mutate((d) => {
      const i = d.goals.findIndex((x) => x.id === g.id);
      if (i >= 0) d.goals[i] = g;
    });
  }, [mutate]);

  const deleteGoal = useCallback((id: string) => {
    mutate((d) => {
      d.goals = d.goals.filter((x) => x.id !== id);
    });
  }, [mutate]);

  // Tasks
  const addTask = useCallback((t: Omit<Task, "id" | "createdAt">) => {
    mutate((d) => {
      d.tasks.unshift({ ...t, id: uid(), createdAt: Date.now() });
    });
  }, [mutate]);

  const toggleTask = useCallback((id: string) => {
    mutate(
      (d) => {
        const t = d.tasks.find((x) => x.id === id);
        if (!t) return;
        // Recurring tasks: completing one rolls the due date forward and
        // resets it to active, rather than leaving it checked off forever.
        if (!t.completed && t.recurrence !== "none" && t.dueDate) {
          t.dueDate = advanceDate(t.dueDate, t.recurrence);
          t.completed = false;
        } else {
          t.completed = !t.completed;
        }
      },
      { recalc: true },
    );
  }, [mutate]);

  const updateTask = useCallback((t: Task) => {
    mutate((d) => {
      const i = d.tasks.findIndex((x) => x.id === t.id);
      if (i >= 0) d.tasks[i] = t;
    });
  }, [mutate]);

  const addCalendarEvent = useCallback((e: Omit<CalendarEvent, "id" | "createdAt">) => {
    mutate((d) => {
      d.calendarEvents.push({ ...e, id: uid(), createdAt: Date.now() });
    });
  }, [mutate]);

  const updateCalendarEvent = useCallback((e: CalendarEvent) => {
    mutate((d) => {
      const i = d.calendarEvents.findIndex((x) => x.id === e.id);
      if (i >= 0) d.calendarEvents[i] = e;
    });
  }, [mutate]);

  const deleteCalendarEvent = useCallback((id: string) => {
    mutate((d) => {
      d.calendarEvents = d.calendarEvents.filter((x) => x.id !== id);
    });
  }, [mutate]);

  const addMemory = useCallback((text: string, source: "user" | "ai" = "user") => {
    const trimmed = text.trim();
    if (!trimmed) return;
    mutate((d) => {
      // Avoid piling up near-duplicate facts from repeated chats.
      if (d.memories.some((m) => m.text.toLowerCase() === trimmed.toLowerCase())) return;
      d.memories.push({ id: uid(), text: trimmed, createdAt: Date.now(), source });
    });
  }, [mutate]);

  const deleteMemory = useCallback((id: string) => {
    mutate((d) => {
      d.memories = d.memories.filter((m) => m.id !== id);
    });
  }, [mutate]);

  const clearMemories = useCallback(() => {
    mutate((d) => {
      d.memories = [];
    });
  }, [mutate]);

  const deleteTask = useCallback((id: string) => {
    mutate((d) => {
      d.tasks = d.tasks.filter((x) => x.id !== id);
    });
  }, [mutate]);

  // Notes
  const addNote = useCallback((title: string, body: string) => {
    mutate((d) => {
      const now = Date.now();
      d.notes.unshift({ id: uid(), title: title || "Untitled", body, createdAt: now, updatedAt: now });
    });
  }, [mutate]);

  const updateNote = useCallback((n: Note) => {
    mutate((d) => {
      const i = d.notes.findIndex((x) => x.id === n.id);
      if (i >= 0) d.notes[i] = { ...n, updatedAt: Date.now() };
    });
  }, [mutate]);

  const deleteNote = useCallback((id: string) => {
    mutate((d) => {
      d.notes = d.notes.filter((x) => x.id !== id);
    });
  }, [mutate]);

  // Alarms
  const addAlarm = useCallback((a: Omit<Alarm, "id">) => {
    mutate((d) => {
      d.alarms.push({ ...a, id: uid() });
      d.alarms.sort((x, y) => x.time.localeCompare(y.time));
    });
  }, [mutate]);

  const toggleAlarm = useCallback((id: string) => {
    mutate((d) => {
      const a = d.alarms.find((x) => x.id === id);
      if (a) a.enabled = !a.enabled;
    });
  }, [mutate]);

  const updateAlarm = useCallback((a: Alarm) => {
    mutate((d) => {
      const i = d.alarms.findIndex((x) => x.id === a.id);
      if (i >= 0) d.alarms[i] = a;
      d.alarms.sort((x, y) => x.time.localeCompare(y.time));
    });
  }, [mutate]);

  const deleteAlarm = useCallback((id: string) => {
    mutate((d) => {
      d.alarms = d.alarms.filter((x) => x.id !== id);
    });
  }, [mutate]);

  // Workouts
  const addWorkout = useCallback((w: Omit<WorkoutPlan, "id">) => {
    mutate((d) => {
      d.workouts.push({ ...w, id: uid() });
    });
  }, [mutate]);

  const updateWorkout = useCallback((w: WorkoutPlan) => {
    mutate((d) => {
      const i = d.workouts.findIndex((x) => x.id === w.id);
      if (i >= 0) d.workouts[i] = w;
    });
  }, [mutate]);

  const deleteWorkout = useCallback((id: string) => {
    mutate((d) => {
      d.workouts = d.workouts.filter((x) => x.id !== id);
    });
  }, [mutate]);

  // Notifications
  const updateNotifications = useCallback((n: Partial<NotificationSettings>) => {
    mutate((d) => {
      d.notifications = { ...d.notifications, ...n };
    });
  }, [mutate]);

  // Data
  const clearAll = useCallback(() => {
    clearState();
    const fresh = handleResets(loadState());
    setState(fresh);
    saveState(fresh);
    showToast("All data cleared");
  }, [showToast]);

  const isCompleted = useCallback(
    (activityId: string, date: Date = new Date()) => isCompletedFn(state, dateKey(date), activityId),
    [state],
  );

  const value: StoreContext = {
    state,
    ready,
    levelUpEvent,
    clearLevelUpEvent,
    toast,
    showToast,
    setName,
    toggleActivity,
    addActivity,
    updateActivity,
    deleteActivity,
    getHealthDay,
    setWater,
    setCaloriesBurned,
    setSteps,
    setMood,
    setRestingHeartRate,
    setWaterGoal,
    setCaloriesGoal,
    getMeals,
    addMeal,
    updateMeal,
    deleteMeal,
    addGoal,
    updateGoal,
    deleteGoal,
    addTask,
    addCalendarEvent,
    addMemory,
    deleteMemory,
    clearMemories,
    updateCalendarEvent,
    deleteCalendarEvent,
    toggleTask,
    updateTask,
    deleteTask,
    addNote,
    updateNote,
    deleteNote,
    addAlarm,
    toggleAlarm,
    updateAlarm,
    deleteAlarm,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    updateNotifications,
    clearAll,
    isCompleted,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ---- Quest bonus helpers (module scope) ----
function awardQuestBonusIfComplete(d: AppState, key: string) {
  const day = new Date(key + "T00:00:00");
  const dp = dayProgress(d, day);
  const quests = dp.xpActivities;
  if (quests.length === 0) return;
  const allDone = quests.every((q) => d.completions[key]?.[q.id]);
  if (allDone && !d.questBonus[key]) {
    d.xp += DAILY_QUEST_BONUS;
    d.questBonus[key] = true;
  }
}

function revokeQuestBonusIfNeeded(d: AppState, key: string) {
  if (!d.questBonus[key]) return;
  const day = new Date(key + "T00:00:00");
  const dp = dayProgress(d, day);
  const quests = dp.xpActivities;
  const allDone = quests.length > 0 && quests.every((q) => d.completions[key]?.[q.id]);
  if (!allDone) {
    d.xp = Math.max(0, d.xp - DAILY_QUEST_BONUS);
    delete d.questBonus[key];
  }
}
