import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.welcomemat",
  appName: "WelcomeMat",
  webDir: "public",
  server: {
    url: "https://welcome-mat.app",
    cleartext: false,
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
