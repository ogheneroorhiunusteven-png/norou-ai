"use client";

import { useEffect, useRef } from "react";
import { App as CapApp } from "@capacitor/app";
import { useStore } from "@/lib/store";
import { activitiesForDay } from "@/lib/logic";
import { dayIndexOf, minutesOf, nowMinutes } from "@/lib/date";
import { isNative, rescheduleAll, hasPermission } from "@/lib/notifications";

/**
 * Two different strategies depending on platform:
 *
 * NATIVE (iOS/Android): notifications are handed to the OS ahead of time as
 * weekly-repeating schedules, so they fire even when the app is closed. We
 * just re-sync them whenever the schedule or settings change.
 *
 * WEB: browsers can't reliably deliver scheduled notifications when the tab
 * is closed, so we poll while the app is open and fire in the moment.
 */
export function NotificationRunner() {
  const { state } = useStore();
  const firedRef = useRef<Set<string>>(new Set());

  // Signatures keep the native re-sync from firing on unrelated state
  // changes (XP gains, meals logged, etc.) — only schedule/settings matter.
  const activitiesSignature = JSON.stringify(
    state.activities.map((a) => [a.id, a.start, a.title, a.emoji, a.xp, a.days])
  );
  const notifSignature = JSON.stringify(state.notifications);
  const calendarSignature = JSON.stringify(
    state.calendarEvents.map((e) => [e.id, e.date, e.time, e.reminder, e.title])
  );

  useEffect(() => {
    if (!isNative()) return;
    void rescheduleAll(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activitiesSignature, notifSignature, calendarSignature]);

  // Re-sync on every app foreground too — this is what keeps the rolling
  // 14-day window of daily-quote notifications sliding forward. Without
  // this, quotes would run out ~2 weeks after the last settings change.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!isNative()) return;
    const sub = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void rescheduleAll(stateRef.current);
    });
    return () => {
      void sub.then((s) => s.remove());
    };
  }, []);

  // Web-only in-the-moment polling fallback.
  useEffect(() => {
    if (isNative()) return;

    const check = async () => {
      const s = state;
      if (!s.notifications.enabled || !s.notifications.scheduledStarts) return;
      if (!(await hasPermission())) return;

      const now = new Date();
      const cur = nowMinutes(now);
      const day = dayIndexOf(now);
      const acts = activitiesForDay(s, day);
      const dateStr = now.toDateString();

      for (const a of acts) {
        if (cur === minutesOf(a.start)) {
          const key = `${dateStr}:${a.id}`;
          if (!firedRef.current.has(key)) {
            firedRef.current.add(key);
            try {
              new Notification(`🔔 Time for: ${a.title}`, {
                body: `${a.emoji} ${a.start}–${a.end}`,
              });
            } catch {
              /* ignore */
            }
          }
        }
      }
    };

    void check();
    const t = setInterval(() => void check(), 20_000);
    return () => clearInterval(t);
  }, [state]);

  return null;
}
