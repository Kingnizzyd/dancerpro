const defaultBackend = "https://dancerpro-backend.onrender.com";

module.exports = ({ config }) => {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || defaultBackend;

  return {
    ...config,
    expo: {
      ...(config?.expo || {}),
      name: "DancerPro",
      slug: "dancerpro-mobile",
      version: "0.1.0",
      platforms: ["ios", "android", "web"],
      orientation: "portrait",
      ios: { bundleIdentifier: "com.dancerpro.app" },
      android: { package: "com.dancerpro.app", versionCode: 1 },
      extra: {
        ...(config?.expo?.extra || {}),
        backendUrl,
        eas: { projectId: "246ca3d5-166b-4a8d-98ee-a06a8ca82b1c" }
      },
      updates: { fallbackToCacheTimeout: 0 },
      assetBundlePatterns: ["**/*"],
      web: { bundler: "metro" },
      plugins: ["expo-secure-store"],
      owner: "kingnizzyd"
    }
  };
};