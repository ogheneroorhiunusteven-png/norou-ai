import type { Activity, ActivityCategory, DayIndex, WorkoutPlan, Achievement } from "./types";

// Days: 0 Sun, 1 Mon, 2 Tue, 3 Wed, 4 Thu, 5 Fri, 6 Sat
const MON: DayIndex = 1;
const TUE: DayIndex = 2;
const WED: DayIndex = 3;
const THU: DayIndex = 4;
const FRI: DayIndex = 5;
const SAT: DayIndex = 6;
const SUN: DayIndex = 0;

let counter = 0;
function make(
  day: DayIndex,
  emoji: string,
  title: string,
  start: string,
  end: string,
  xp: number,
  category: ActivityCategory,
): Activity {
  counter += 1;
  return {
    id: `seed-${day}-${counter}`,
    title,
    emoji,
    start,
    end,
    xp,
    days: [day],
    category,
  };
}

export function buildSeedActivities(): Activity[] {
  counter = 0;
  const a: Activity[] = [];

  // MONDAY
  a.push(make(MON, "☀️", "Wake up + water + get ready", "07:00", "07:30", 10, "wake"));
  a.push(make(MON, "🍳", "Breakfast", "07:30", "08:00", 10, "meal"));
  a.push(make(MON, "🚌", "Leave / get to college", "08:00", "09:00", 0, "other"));
  a.push(make(MON, "🏫", "College", "09:00", "16:30", 100, "college"));
  a.push(make(MON, "🚿", "Get home + shower", "17:00", "17:30", 0, "other"));
  a.push(make(MON, "🍽️", "Dinner", "17:30", "18:00", 0, "meal"));
  a.push(make(MON, "📚", "Study / college work", "18:00", "19:00", 50, "study"));
  a.push(make(MON, "🎮", "Gaming / free time", "19:00", "22:00", 0, "free"));
  a.push(make(MON, "🌙", "Get ready for bed", "22:00", "22:30", 25, "prep"));
  a.push(make(MON, "🛌", "Sleep", "22:30", "23:00", 0, "free"));

  // TUESDAY
  a.push(make(TUE, "☀️", "Wake up + water", "07:00", "07:30", 10, "wake"));
  a.push(make(TUE, "🍳", "Breakfast", "07:30", "08:00", 10, "meal"));
  a.push(make(TUE, "📚", "Study / coursework", "08:00", "09:30", 75, "coursework"));
  a.push(make(TUE, "☕", "Break", "09:30", "10:00", 0, "free"));
  a.push(make(TUE, "🏋️", "Gym — Chest + Shoulders + Triceps", "10:00", "11:15", 100, "gym"));
  a.push(make(TUE, "🚿", "Shower", "11:15", "11:45", 0, "other"));
  a.push(make(TUE, "🍽️", "Lunch", "11:45", "12:30", 0, "meal"));
  a.push(make(TUE, "🚌", "Get ready / leave", "12:30", "13:15", 25, "prep"));
  a.push(make(TUE, "🏫", "College", "13:15", "16:30", 100, "college"));
  a.push(make(TUE, "🏠", "Home + relax", "17:00", "17:30", 0, "free"));
  a.push(make(TUE, "🍽️", "Dinner", "17:30", "18:00", 0, "meal"));
  a.push(make(TUE, "🎮", "Gaming", "18:00", "20:30", 0, "free"));
  a.push(make(TUE, "📚", "Quick study / review", "20:30", "21:15", 50, "study"));
  a.push(make(TUE, "🎮", "Relax", "21:15", "22:30", 0, "free"));
  a.push(make(TUE, "🛌", "Sleep", "22:30", "23:00", 0, "free"));

  // WEDNESDAY
  a.push(make(WED, "☀️", "Wake up", "07:30", "08:00", 10, "wake"));
  a.push(make(WED, "🍳", "Breakfast", "08:00", "09:00", 10, "meal"));
  a.push(make(WED, "🏋️", "Gym — Back + Biceps", "09:00", "10:15", 100, "gym"));
  a.push(make(WED, "🚿", "Shower", "10:15", "10:45", 0, "other"));
  a.push(make(WED, "🥪", "Snack + relax", "10:45", "11:15", 0, "free"));
  a.push(make(WED, "📚", "Study / coursework", "11:15", "12:45", 75, "coursework"));
  a.push(make(WED, "🍽️", "Lunch + break", "12:45", "13:45", 0, "meal"));
  a.push(make(WED, "🔎", "Research", "13:45", "15:15", 50, "research"));
  a.push(make(WED, "🎮", "Gaming", "15:15", "17:30", 0, "free"));
  a.push(make(WED, "🍽️", "Dinner + break", "17:30", "18:30", 0, "meal"));
  a.push(make(WED, "🎮", "Gaming / friends", "18:30", "21:30", 0, "free"));
  a.push(make(WED, "🌙", "Relax + prepare for tomorrow", "21:30", "22:30", 25, "prep"));
  a.push(make(WED, "🛌", "Sleep", "22:30", "23:00", 0, "free"));

  // THURSDAY
  a.push(make(THU, "☀️", "Wake up", "07:00", "07:30", 10, "wake"));
  a.push(make(THU, "🍳", "Breakfast", "07:30", "08:00", 10, "meal"));
  a.push(make(THU, "🚌", "Get ready / leave", "08:00", "09:00", 25, "prep"));
  a.push(make(THU, "🏫", "College", "09:00", "16:30", 100, "college"));
  a.push(make(THU, "🚿", "Home + shower", "17:00", "17:30", 0, "other"));
  a.push(make(THU, "🍽️", "Dinner", "17:30", "18:00", 0, "meal"));
  a.push(make(THU, "📚", "Study / coursework", "18:00", "19:00", 75, "coursework"));
  a.push(make(THU, "🎮", "Gaming", "19:00", "22:00", 0, "free"));
  a.push(make(THU, "🌙", "Night routine", "22:00", "22:30", 25, "prep"));
  a.push(make(THU, "🛌", "Sleep", "22:30", "23:00", 0, "free"));

  // FRIDAY
  a.push(make(FRI, "☀️", "Wake up", "07:30", "08:00", 10, "wake"));
  a.push(make(FRI, "🍳", "Breakfast", "08:00", "08:15", 10, "meal"));
  a.push(make(FRI, "🚌", "Get ready / travel to school", "08:15", "08:45", 0, "other"));
  a.push(make(FRI, "🏫", "School", "09:00", "12:15", 100, "college"));
  a.push(make(FRI, "🚌", "Travel home", "12:15", "14:00", 0, "other"));
  a.push(make(FRI, "🍽️", "Lunch", "14:00", "14:30", 0, "meal"));
  a.push(make(FRI, "🏋️", "Gym — Legs + Abs", "14:30", "15:45", 100, "gym"));
  a.push(make(FRI, "🚿", "Shower", "15:45", "16:15", 0, "other"));
  a.push(make(FRI, "🥪", "Snack + relax", "16:15", "17:00", 0, "free"));
  a.push(make(FRI, "📚", "Study / coursework", "17:00", "18:00", 75, "coursework"));
  a.push(make(FRI, "🍽️", "Dinner", "18:00", "19:00", 0, "meal"));
  a.push(make(FRI, "🎮", "Gaming night / free time", "19:00", "23:00", 0, "free"));
  a.push(make(FRI, "🌙", "Get ready for bed", "23:00", "23:30", 25, "prep"));
  a.push(make(FRI, "🛌", "Sleep", "23:30", "23:59", 0, "free"));

  // SATURDAY
  a.push(make(SAT, "☀️", "Wake up", "08:30", "09:00", 10, "wake"));
  a.push(make(SAT, "🍳", "Breakfast", "09:00", "10:00", 10, "meal"));
  a.push(make(SAT, "🏋️", "Gym — Upper Body", "10:00", "11:15", 100, "gym"));
  a.push(make(SAT, "🚿", "Shower", "11:15", "11:45", 0, "other"));
  a.push(make(SAT, "🍽️", "Lunch", "11:45", "12:30", 0, "meal"));
  a.push(make(SAT, "🔎", "Research / Personal projects", "12:30", "14:00", 75, "research"));
  a.push(make(SAT, "🎮", "Gaming / friends", "14:00", "18:00", 0, "free"));
  a.push(make(SAT, "🍽️", "Dinner", "18:00", "19:00", 0, "meal"));
  a.push(make(SAT, "🎮", "Gaming / free time", "19:00", "23:00", 0, "free"));
  a.push(make(SAT, "🛌", "Sleep", "23:30", "23:59", 0, "free"));

  // SUNDAY
  a.push(make(SUN, "☀️", "Wake up", "09:00", "09:30", 10, "wake"));
  a.push(make(SUN, "🍳", "Breakfast", "09:30", "10:00", 10, "meal"));
  a.push(make(SUN, "🙏", "Church / prayer / personal time", "10:00", "12:00", 50, "prayer"));
  a.push(make(SUN, "🍽️", "Lunch", "12:00", "13:00", 0, "meal"));
  a.push(make(SUN, "📚", "Light study + prepare for college", "13:00", "15:00", 50, "study"));
  a.push(make(SUN, "🎮", "Gaming / free time", "15:00", "18:00", 0, "free"));
  a.push(make(SUN, "🍽️", "Dinner", "18:00", "19:00", 0, "meal"));
  a.push(make(SUN, "🎒", "Prepare clothes / bag for Monday", "19:00", "20:00", 25, "prep"));
  a.push(make(SUN, "🌙", "Relax", "20:00", "22:00", 0, "free"));
  a.push(make(SUN, "🛌", "Sleep", "22:30", "23:00", 0, "free"));

  return a;
}

export function buildSeedWorkouts(): WorkoutPlan[] {
  return [
    {
      id: "w-1",
      name: "Chest + Shoulders + Triceps",
      exercises: [
        { id: "e1", name: "Bench Press", sets: "4", reps: "8-10" },
        { id: "e2", name: "Overhead Press", sets: "3", reps: "10" },
        { id: "e3", name: "Incline Dumbbell Press", sets: "3", reps: "10-12" },
        { id: "e4", name: "Lateral Raises", sets: "3", reps: "15" },
        { id: "e5", name: "Tricep Pushdown", sets: "3", reps: "12" },
      ],
    },
    {
      id: "w-2",
      name: "Back + Biceps",
      exercises: [
        { id: "e1", name: "Deadlift", sets: "4", reps: "6-8" },
        { id: "e2", name: "Pull Ups", sets: "3", reps: "8-10" },
        { id: "e3", name: "Barbell Row", sets: "3", reps: "10" },
        { id: "e4", name: "Barbell Curl", sets: "3", reps: "12" },
        { id: "e5", name: "Hammer Curl", sets: "3", reps: "12" },
      ],
    },
    {
      id: "w-3",
      name: "Legs + Abs",
      exercises: [
        { id: "e1", name: "Squat", sets: "4", reps: "8" },
        { id: "e2", name: "Romanian Deadlift", sets: "3", reps: "10" },
        { id: "e3", name: "Leg Press", sets: "3", reps: "12" },
        { id: "e4", name: "Calf Raises", sets: "4", reps: "15" },
        { id: "e5", name: "Hanging Leg Raises", sets: "3", reps: "15" },
      ],
    },
    {
      id: "w-4",
      name: "Upper Body",
      exercises: [
        { id: "e1", name: "Incline Bench Press", sets: "4", reps: "8-10" },
        { id: "e2", name: "Seated Row", sets: "3", reps: "10" },
        { id: "e3", name: "Shoulder Press", sets: "3", reps: "10" },
        { id: "e4", name: "Lat Pulldown", sets: "3", reps: "12" },
        { id: "e5", name: "Face Pulls", sets: "3", reps: "15" },
      ],
    },
  ];
}

export function buildAchievements(): Achievement[] {
  return [
    { id: "first-step", title: "First Step", emoji: "🏆", description: "Complete your first activity or task.", unlockedAt: null },
    { id: "on-fire", title: "On Fire", emoji: "🔥", description: "Complete 5 activities in one day.", unlockedAt: null },
    { id: "scholar", title: "Scholar", emoji: "📚", description: "Complete 10 study sessions.", unlockedAt: null },
    { id: "researcher", title: "Researcher", emoji: "🔎", description: "Complete 10 research sessions.", unlockedAt: null },
    { id: "built-different", title: "Built Different", emoji: "🏋️", description: "Complete 10 workouts.", unlockedAt: null },
    { id: "builder", title: "Builder", emoji: "💻", description: "Complete 10 personal project sessions.", unlockedAt: null },
    { id: "level-10", title: "Level 10", emoji: "⚡", description: "Reach Level 10.", unlockedAt: null },
    { id: "consistency", title: "Consistency", emoji: "👑", description: "Complete your daily schedule for 7 days.", unlockedAt: null },
  ];
}
