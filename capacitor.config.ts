import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Reverse-DNS bundle ID. CHANGE THIS to your own domain/name before
  // creating the App ID in your Apple Developer account.
  // Reverse-DNS bundle ID. Still a placeholder — change to your own
  // domain/name before creating the real App ID in Apple/Google's
  // developer consoles (it must be globally unique).
  appId: "com.norouai.app",
  appName: "Norou AI",
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
  },
};

export default config;
