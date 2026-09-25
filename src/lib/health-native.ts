import { Capacitor } from "@capacitor/core";
import { Health } from "capacitor-health";

/**
 * Real device step count / calories via Apple Health (iOS) or Google Health
 * Connect (Android). Falls back to null on web or if unavailable/denied —
 * callers should keep the existing manual-entry Quick Stats cards as a
 * fallback for that case, not assume this always returns data.
 */

const PERMISSIONS = ["READ_STEPS", "READ_ACTIVE_CALORIES"] as const;

export async function isHealthAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await Health.isHealthAvailable();
    return res.available;
  } catch {
    return false;
  }
}

/** Request permission once. Returns true if the user is likely to have granted it.
 *  (iOS can't actually report grant/deny state — see plugin docs — so a true
 *  result there means "the request went through", not "definitely granted".) */
export async function requestHealthPermission(): Promise<boolean> {
  try {
    const res = await Health.requestHealthPermissions({ permissions: [...PERMISSIONS] });
    return Object.values(res.permissions[0] ?? {}).some(Boolean);
  } catch {
    return false;
  }
}

export interface TodayHealthStats {
  steps: number;
  activeCalories: number;
}

/** Steps + active calories for the current calendar day, or null if unavailable. */
export async function getTodayStats(): Promise<TodayHealthStats | null> {
  if (!(await isHealthAvailable())) return null;
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    const res = await Health.queryAggregated({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      dataType: "steps",
      bucket: "day",
    });
    const steps = res.aggregatedData.reduce((sum, d) => sum + (d.value ?? 0), 0);

    const calRes = await Health.queryAggregated({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      dataType: "active-calories",
      bucket: "day",
    });
    const activeCalories = calRes.aggregatedData.reduce((sum, d) => sum + (d.value ?? 0), 0);

    return { steps: Math.round(steps), activeCalories: Math.round(activeCalories) };
  } catch (err) {
    console.warn("Health query failed", err);
    return null;
  }
}
