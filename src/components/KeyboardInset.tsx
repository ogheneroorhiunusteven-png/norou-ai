"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * With Keyboard.resize set to "none" (see capacitor.config.ts), iOS/Android
 * stop resizing the webview when the on-screen keyboard opens — the
 * keyboard just overlays on top instead. That fixes the layout jump/glitch
 * that used to happen mid-keyboard-animation (the webview resizing while
 * our height:100% fixed-body layout was still settling).
 *
 * The tradeoff: nothing now automatically keeps a focused input clear of
 * the keyboard. This component tracks the live keyboard height and writes
 * it to `--keyboard-inset` on the document root, so any scrollable
 * container (.app-scroll, the Modal's content area) can add that as
 * bottom padding via `padding-bottom: var(--keyboard-inset, 0px)` and the
 * user can still scroll the field they're editing into view.
 */
export function KeyboardInset() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    const syncVisualViewport = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--visual-keyboard-inset", `${keyboard}px`);
    };
    syncVisualViewport();
    window.visualViewport?.addEventListener("resize", syncVisualViewport);
    window.visualViewport?.addEventListener("scroll", syncVisualViewport);

    (async () => {
      try {
        const { Keyboard } = await import("@capacitor/keyboard");
        const showListener = await Keyboard.addListener("keyboardWillShow", (info) => {
          document.documentElement.style.setProperty("--keyboard-inset", `${info.keyboardHeight}px`);
        });
        const hideListener = await Keyboard.addListener("keyboardWillHide", () => {
          document.documentElement.style.setProperty("--keyboard-inset", "0px");
        });
        if (cancelled) {
          showListener.remove();
          hideListener.remove();
          return;
        }
        cleanup = () => {
          showListener.remove();
          hideListener.remove();
          window.visualViewport?.removeEventListener("resize", syncVisualViewport);
          window.visualViewport?.removeEventListener("scroll", syncVisualViewport);
        };
      } catch {
        /* Keyboard plugin unavailable (e.g. web) — no-op, --keyboard-inset stays unset/0. */
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      window.visualViewport?.removeEventListener("resize", syncVisualViewport);
      window.visualViewport?.removeEventListener("scroll", syncVisualViewport);
    };
  }, []);

  return null;
}
