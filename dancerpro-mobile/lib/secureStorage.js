// Minimal web-safe secure storage for Expo web builds.
// On native, expo-secure-store should be preferred; this module keeps web from breaking.

function isWeb() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export async function secureSet(key, value) {
  try {
    if (!isWeb()) return;
    const v = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, v);
  } catch {}
}

export async function secureGet(key) {
  try {
    if (!isWeb()) return null;
    const raw = window.localStorage.getItem(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

export async function secureDelete(key) {
  try {
    if (!isWeb()) return;
    window.localStorage.removeItem(key);
  } catch {}
}

export default { secureSet, secureGet, secureDelete };