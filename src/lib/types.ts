// Central data model types for Norou AI

export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export type ActivityCategory =
  | "wake"
  | "meal"
  | "study"
  | "research"
  | "coursework"
  | "gym"
  | "college"
  | "project"
  | "prayer"
  | "prep"
  | "free"
  | "other";

export interface Activity {
  id: string;
  title: string;
  emoji: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM" (may equal start for instant events)
  xp: number;
  days: DayIndex[]; // days of week this activity recurs
  category: ActivityCategory;
  // Research-specific optional fields
  topic?: string;
  notes?: string;
  findings?: string;
}

// completions[dateKey][activityId] = true
export type Completions = Record<string, Record<string, boolean>>;

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// meals logged per date: mealsByDate[dateKey] = Meal[]
export type MealsByDate = Record<string, Meal[]>;

export interface Goal {
  id: string;
  title: string;
  targetDate?: string;
  completed: boolean;
  progress: number; // 0-100
  createdAt: number;
}

export type TaskPriority = "low" | "medium" | "high";
export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  createdAt: number;
  priority: TaskPriority;
  category?: string;
  tags: string[];
  recurrence: TaskRecurrence;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO "YYYY-MM-DD" — a specific date, not a recurring weekday
  time?: string; // "HH:MM", omitted for all-day events
  endTime?: string;
  notes?: string;
  reminder: boolean; // schedules a local notification at `time` if set
  createdAt: number;
}

export interface MemoryFact {
  id: string;
  text: string;
  createdAt: number;
  source: "user" | "ai"; // manually added vs. the assistant saved it during chat
}

export interface Alarm {
  id: string;
  time: string; // "HH:MM"
  label: string;
  enabled: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets?: string;
  reps?: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  exercises: Exercise[];
}

export type MoodValue = 0 | 1 | 2 | 3 | 4; // Rough..Great

export interface DailyHealth {
  water: number; // cups
  heartRate: number; // bpm resting (persistent, but stored per profile)
  caloriesBurned: number;
  mood: MoodValue | null;
}

// healthByDate[dateKey] = { water, caloriesBurned, mood }
export interface HealthDay {
  water: number;
  caloriesBurned: number;
  mood: MoodValue | null;
  steps: number;
}
export type HealthByDate = Record<string, HealthDay>;

export interface NotificationSettings {
  enabled: boolean;
  scheduledStarts: boolean;
  completionFeedback: boolean;
  morningPlan: boolean;
  upcomingActivities: boolean; // default OFF
  eveningWrapUp: boolean;
}

export interface HealthGoals {
  restingHeartRate: number;
  waterGoal: number;
  caloriesGoal: number;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}


export type BudgetCategory = "needs" | "wants" | "savings";

export interface BudgetExpense {
  id: string;
  date: string;
  label: string;
  amount: number;
  category: BudgetCategory;
}

export interface BudgetProfile {
  monthlyIncome: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  currency: string;
}

export type BudgetExpensesByMonth = Record<string, BudgetExpense[]>;

export interface Achievement {
  id: string;
  title: string;
  emoji: string;
  description: string;
  unlockedAt: number | null;
}

// analyticsHistory[dateKey] = { completedActivities, completedTasks, completionPct }
export interface AnalyticsDay {
  completedActivities: number;
  completedTasks: number;
  completionPct: number;
}
export type AnalyticsHistory = Record<string, AnalyticsDay>;

export interface StreakData {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
  // track which dates counted as "meaningful complete"
  completedDates: string[];
}

export interface QuestBonus {
  // dateKey -> true if daily quest bonus already awarded
  [dateKey: string]: boolean;
}

export interface AppState {
  version: number;
  seeded: boolean;
  profile: {
    name: string;
  };
  xp: number; // lifetime XP
  activities: Activity[];
  completions: Completions;
  meals: MealsByDate;
  budget: BudgetProfile;
  budgetExpenses: BudgetExpensesByMonth;
  goals: Goal[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  memories: MemoryFact[];
  notes: Note[];
  alarms: Alarm[];
  workouts: WorkoutPlan[];
  healthGoals: HealthGoals;
  nutritionGoals: NutritionGoals;
  healthByDate: HealthByDate;
  notifications: NotificationSettings;
  achievements: Achievement[];
  analytics: AnalyticsHistory;
  streak: StreakData;
  questBonus: QuestBonus;
  weekStartKey: string | null; // ISO date of current tracked week start (Sunday)
  lastActiveDate: string | null;
}
