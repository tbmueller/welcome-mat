import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.triptracker.app",
  appName: "Trip Tracker",
  // Points to the Next.js static export during development.
  // In CI, swap to the deployed URL so the native shell loads the live app.
  webDir: "out",
  server: {
    // Only your own domain is allowed — no wildcard navigation
    allowNavigation: [],
  },
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
