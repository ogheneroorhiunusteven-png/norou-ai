import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Haptic feedback. No-ops silently on web, where the API doesn't exist.
 */

const native = () => Capacitor.isNativePlatform();

/** Light tap — completing a habit or activity. */
export async function tapFeedback(): Promise<void> {
  if (!native()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* ignore */
  }
}

/** Celebratory buzz — level ups, achievements. */
export async function successFeedback(): Promise<void> {
  if (!native()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* ignore */
  }
}
