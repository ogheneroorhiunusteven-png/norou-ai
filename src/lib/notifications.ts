import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { AppState, DayIndex } from "./types";
import { activitiesForDay } from "./logic";
import { minutesOf } from "./date";
import { quoteForDate } from "./quotes";

/** Android notification channel with sound + a distinct vibration pattern.
 *  iOS notifications play the system default sound automatically when a
 *  `sound` is specified; Android requires a channel to carry that config. */
const CHANNEL_ID = "level-up-reminders";

async function ensureChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Nova AI Reminders",
      description: "Schedule alerts, quests, and daily motivation",
      importance: 5, // MAX — heads-up + sound + vibration
      sound: "default",
      vibration: true,
      visibility: 1,
    });
  } catch {
    /* ignore — channel may already exist */
  }
}

/**
 * Notification layer.
 *
 * On native (iOS/Android) this schedules REAL local notifications with the OS,
 * which fire even when the app is closed. On web it falls back to the browser
 * Notification API, which only works while a tab is open.
 *
 * Everything here is safe to call on either platform.
 */

export const isNative = () => Capacitor.isNativePlatform();

/** Stable numeric IDs — the OS requires ints, and reusing IDs replaces. */
const ID_RANGE = {
  activityStart: 10_000, // + (day * 100 + index)
  activityUpcoming: 20_000,
  morningPlan: 30_000,
  eveningWrapUp: 40_000,
  calendarEvent: 50_000, // + index into today+13-day event list
} as const;

/** Ask the OS (or browser) for permission. Returns true if granted. */
export async function requestPermission(): Promise<boolean> {
  if (isNative()) {
    const res = await LocalNotifications.requestPermissions();
    return res.display === "granted";
  }
  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      return (await Notification.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return false;
}

export async function hasPermission(): Promise<boolean> {
  if (isNative()) {
    const res = await LocalNotifications.checkPermissions();
    return res.display === "granted";
  }
  if (typeof window !== "undefined" && "Notification" in window) {
    return Notification.permission === "granted";
  }
  return false;
}

/** Fire a notification right now (used for completion feedback / level ups). */
export async function notifyNow(title: string, body: string): Promise<void> {
  if (isNative()) {
    await ensureChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 1_000_000) + 900_000,
          title,
          body,
          sound: "default",
          channelId: CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 500) },
        },
      ],
    });
    return;
  }
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body });
    } catch {
      /* ignore */
    }
  }
}

/** Remove every notification this app has scheduled. */
export async function cancelAll(): Promise<void> {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch {
    /* ignore */
  }
}

/**
 * Rebuild the full schedule of native notifications from current app state.
 *
 * Uses weekly-repeating schedules (`on: { weekday, hour, minute }`) so a single
 * scheduled notification recurs every week without the app needing to run.
 * Capacitor weekday is 1-indexed starting Sunday, matching our DayIndex + 1.
 *
 * Call this whenever activities or notification settings change.
 */
export async function rescheduleAll(state: AppState): Promise<void> {
  if (!isNative()) return;

  await cancelAll();
  await ensureChannel();

  const n = state.notifications;
  if (!n.enabled) return;
  if (!(await hasPermission())) return;

  type Pending = Parameters<typeof LocalNotifications.schedule>[0]["notifications"][number];
  const queue: Pending[] = [];

  for (let day = 0 as DayIndex; day < 7; day = (day + 1) as DayIndex) {
    const activities = activitiesForDay(state, day);
    const weekday = day + 1; // Capacitor weekday: 1 = Sunday

    activities.forEach((a, index) => {
      const startMins = minutesOf(a.start);

      // "Scheduled activity starts"
      if (n.scheduledStarts) {
        queue.push({
          id: ID_RANGE.activityStart + day * 100 + index,
          title: `${a.emoji} ${a.title}`,
          body: a.xp > 0 ? `Starting now · +${a.xp} XP` : "Starting now",
          sound: "default",
          channelId: CHANNEL_ID,
          schedule: {
            on: { weekday, hour: Math.floor(startMins / 60), minute: startMins % 60 },
            allowWhileIdle: true,
          },
        });
      }

      // "Upcoming activities" — 10 minute heads-up
      if (n.upcomingActivities) {
        const warn = startMins - 10;
        if (warn >= 0) {
          queue.push({
            id: ID_RANGE.activityUpcoming + day * 100 + index,
            title: `Coming up: ${a.title}`,
            body: `Starts in 10 minutes (${a.start})`,
            sound: "default",
            channelId: CHANNEL_ID,
            schedule: {
              on: { weekday, hour: Math.floor(warn / 60), minute: warn % 60 },
              allowWhileIdle: true,
            },
          });
        }
      }
    });

    // "Evening wrap-up" — 9:00pm reflection nudge
    if (n.eveningWrapUp) {
      queue.push({
        id: ID_RANGE.eveningWrapUp + day,
        title: "Evening wrap-up",
        body: "How did today go? Check off what you finished and close the day out.",
        sound: "default",
        channelId: CHANNEL_ID,
        schedule: { on: { weekday, hour: 21, minute: 0 }, allowWhileIdle: true },
      });
    }
  }

  // "Wake-up quote" — a genuinely different quote each morning, plus that
  // day's activity summary. Scheduling this as ONE weekly-repeating
  // notification can't vary its text by date, so instead we schedule 14
  // separate one-off notifications (today through +13 days), each with
  // that specific calendar day's quote already baked in. This window gets
  // refreshed every time rescheduleAll runs (settings change, or app
  // foreground — see NotificationRunner), so as long as the app is opened
  // at least once every ~2 weeks the quotes never run out or repeat stale.
  if (n.morningPlan) {
    const DAY_MS = 86_400_000;
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today.getTime() + i * DAY_MS);
      const dow = date.getDay() as DayIndex;
      const acts = activitiesForDay(state, dow);
      const xpAvailable = acts.reduce((sum, a) => sum + a.xp, 0);
      const summary = acts.length
        ? `${acts.length} activities · ${xpAvailable} XP available today.`
        : "Nothing scheduled today. A good day to add one small win.";

      const fireAt = new Date(date);
      fireAt.setHours(7, 0, 0, 0);
      if (fireAt.getTime() < Date.now()) continue; // don't schedule times already passed today

      queue.push({
        id: ID_RANGE.morningPlan + i,
        title: "Wake-up quote of the day",
        body: `"${quoteForDate(date)}" — ${summary}`,
        sound: "default",
        channelId: CHANNEL_ID,
        schedule: { at: fireAt, allowWhileIdle: true },
      });
    }
  }

  // Calendar event reminders — gated by the master enabled+permission check
  // above like everything else, but NOT by the granular category toggles
  // (scheduledStarts, morningPlan, etc.) since each event has its own
  // explicit "Remind me" checkbox rather than belonging to a category
  // someone would want to globally mute.
  for (const evt of state.calendarEvents) {
    if (!evt.reminder || !evt.time) continue;
    const [hh, mm] = evt.time.split(":").map(Number);
    const fireAt = new Date(evt.date + "T00:00:00");
    fireAt.setHours(hh, mm, 0, 0);
    if (fireAt.getTime() < Date.now()) continue; // don't schedule past events

    // Stable numeric id derived from the event's own id so re-syncing
    // doesn't create duplicates or orphan a stale one.
    let hash = 0;
    for (let c = 0; c < evt.id.length; c++) hash = (hash * 31 + evt.id.charCodeAt(c)) >>> 0;

    queue.push({
      id: ID_RANGE.calendarEvent + (hash % 9999),
      title: `📅 ${evt.title}`,
      body: evt.notes ? evt.notes : `Starting at ${evt.time}`,
      sound: "default",
      channelId: CHANNEL_ID,
      schedule: { at: fireAt, allowWhileIdle: true },
    });
  }

  if (!queue.length) return;

  try {
    // iOS caps pending notifications at 64. Keep the earliest ones.
    await LocalNotifications.schedule({ notifications: queue.slice(0, 64) });
  } catch (err) {
    console.warn("Failed to schedule notifications", err);
  }
}
