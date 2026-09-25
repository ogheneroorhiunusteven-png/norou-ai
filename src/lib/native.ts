import { Capacitor } from "@capacitor/core";

/**
 * One-time native setup. Safe to call on web — every branch is guarded.
 */
export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // App is dark, so we want light (white) status bar text.
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#000000" });
    }
  } catch {
    /* ignore */
  }
}
