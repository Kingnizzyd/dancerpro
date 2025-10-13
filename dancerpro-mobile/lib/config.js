import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Prefer value from app.json extra; fallback to localhost for web/dev
const extra = Constants?.expoConfig?.extra ?? {};
const defaultLocal = 'http://localhost:3001';

// Allow runtime overrides for testers:
// 1) window.__BACKEND_URL__ (set via console or script injection)
// 2) URL query param ?backend=https://public-backend.example.com
function getRuntimeBackendUrl() {
  if (typeof window === 'undefined') return undefined;
  try {
    const viaWindow = window.__BACKEND_URL__;
    const params = new URLSearchParams(window.location.search || '');
    const viaParam = params.get('backend');
    const candidate = viaParam || viaWindow;
    if (candidate && /^https?:\/\//i.test(candidate)) return candidate;
    return undefined;
  } catch {
    return undefined;
  }
}

const runtimeUrl = getRuntimeBackendUrl();
// Build-time injected env var for web exports (e.g., Netlify builds)
// EXPO_PUBLIC_* are statically replaced into the bundle during export
const envBackendUrl = typeof process !== 'undefined'
  && process?.env?.EXPO_PUBLIC_BACKEND_URL
  ? process.env.EXPO_PUBLIC_BACKEND_URL
  : undefined;

export const BACKEND_URL = (() => {
  // Prefer build-time env (Netlify/CI) for consistent production behavior
  if (envBackendUrl) return envBackendUrl;
  // Allow testers to override at runtime when explicitly provided
  if (runtimeUrl) return runtimeUrl;
  // Fallback to app.json extra
  if (extra.backendUrl) return extra.backendUrl;
  // Always use localhost for development
  return defaultLocal;
})();

// Helpful log for testers to confirm active backend target
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.log('[Config] Using BACKEND_URL:', BACKEND_URL);
}

export default { BACKEND_URL };