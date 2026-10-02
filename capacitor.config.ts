import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  // Shared Android/iOS bundle ID used by this Nova AI build.
  appId: "com.norouai.app",
  appName: "Nova AI",
  // Next.js static export lands in ./out
  webDir: "out",
  ios: {
    // Matches the app's dark theme so there's no white flash on launch
    backgroundColor: "#000000",
    contentInset: "always",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#8b5cf6",
    },
    Keyboard: {
      // Critical: tells iOS/Android to NOT resize the webview when the
      // keyboard opens. Without this, the OS shrinks the whole webview
      // viewport as the keyboard animates in, and because the app's
      // layout is height:100%-based (fixed body, for safe-area
      // handling), that resize fights with our layout mid-animation —
      // producing a visible jump/glitch. With resize "none", the
      // keyboard simply overlays on top and we handle keeping the
      // focused field visible ourselves (see useKeyboardInset.ts).
      resize: KeyboardResize.None,
      resizeOnFullScreen: false,
    },
  },
};

export default config;
