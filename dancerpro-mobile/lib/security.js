import CryptoJS from 'crypto-js';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { secureGet, secureSet, secureRemove } from './secureStorage';

// Prefer build-time env var; fallback derives a device-bound key for web
const ENV_KEY = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_ENCRYPTION_KEY : undefined;

function deriveFallbackKey() {
  try {
    const base = typeof navigator !== 'undefined' ? navigator.userAgent : 'native-device';
    return CryptoJS.SHA256(`${base}:dancerpro-salt`).toString();
  } catch {
    return 'dancerpro-default-fallback-key';
  }
}

export const SECURITY_CONFIG = {
  ENCRYPTION_KEY: ENV_KEY || deriveFallbackKey(),
};

// Storage keys
const KEY_BIOMETRIC_ENABLED = 'security:biometricEnabled';
const KEY_PIN_HASH = 'security:pinHash';
const KEY_LAST_UNLOCK = 'security:lastUnlock';
const KEY_QUICK_EXIT_ENABLED = 'security:quickExitEnabled';
const KEY_DISGUISE_SCREEN = 'security:disguiseScreen';
const KEY_TRIGGER_METHOD = 'security:triggerMethod';

function hashPin(pin) {
  try {
    return CryptoJS.SHA256(`pin:${pin}:dancerpro`).toString();
  } catch {
    return pin;
  }
}

export async function initializeSecurity() {
  const biometricAvailable = await LocalAuthentication.isEnrolledAsync().catch(() => false);
  const biometricEnabled = (await secureGet(KEY_BIOMETRIC_ENABLED)) === 'true';
  const pinHash = await secureGet(KEY_PIN_HASH);
  const pinEnabled = !!pinHash;
  return { biometricAvailable: Platform.OS !== 'web' && biometricAvailable, biometricEnabled, pinEnabled };
}

export async function getSecurityState() {
  return initializeSecurity();
}

export async function enableBiometric() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware) return { success: false, error: 'Biometric hardware not available' };
    if (!isEnrolled) return { success: false, error: 'No biometrics enrolled on device' };
    await secureSet(KEY_BIOMETRIC_ENABLED, 'true');
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Failed to enable biometrics' };
  }
}

export async function disableBiometric() {
  await secureSet(KEY_BIOMETRIC_ENABLED, 'false');
  return { success: true };
}

export async function setPIN(pin) {
  if (!pin || pin.length !== 4) return { success: false, error: 'PIN must be 4 digits' };
  try {
    const h = hashPin(pin);
    await secureSet(KEY_PIN_HASH, h);
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Failed to set PIN' };
  }
}

export async function removePIN() {
  await secureRemove(KEY_PIN_HASH);
  return { success: true };
}

export async function authenticateWithBiometrics(options = {}) {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Biometrics not supported on web' };
  }
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: options.promptMessage || 'Authenticate',
      fallbackLabel: options.fallbackLabel || 'Enter PIN',
      cancelLabel: options.cancelLabel || 'Cancel',
      disableDeviceFallback: false,
    });
    if (result.success) {
      await secureSet(KEY_LAST_UNLOCK, String(Date.now()));
      return { success: true };
    }
    return { success: false, error: result.error || 'biometric_failed', message: result.warning || 'Authentication failed' };
  } catch (e) {
    return { success: false, error: 'biometric_error', message: 'Authentication error' };
  }
}

export async function authenticateWithPIN(pin) {
  try {
    const stored = await secureGet(KEY_PIN_HASH);
    if (!stored) return { success: false, error: 'no_pin_set' };
    const matches = stored === hashPin(pin);
    if (matches) {
      await secureSet(KEY_LAST_UNLOCK, String(Date.now()));
      return { success: true };
    }
    return { success: false, error: 'invalid_pin', message: 'Invalid PIN' };
  } catch (e) {
    return { success: false, error: 'pin_error', message: 'PIN check failed' };
  }
}

// Session validity: allow access if already authenticated and recently unlocked
export async function checkSessionValidity() {
  try {
    const token = await secureGet('authToken');
    const lastUnlock = parseInt((await secureGet(KEY_LAST_UNLOCK)) || '0', 10);
    // If no token, no session
    if (!token) return false;
    // If unlocked within last 24 hours, consider valid
    const dayMs = 24 * 60 * 60 * 1000;
    return Date.now() - lastUnlock < dayMs;
  } catch {
    return false;
  }
}

// Quick Exit utilities
export async function enableQuickExit() {
  await secureSet(KEY_QUICK_EXIT_ENABLED, 'true');
}

export async function getQuickExitSettings() {
  const enabled = (await secureGet(KEY_QUICK_EXIT_ENABLED)) === 'true';
  const disguiseScreen = (await secureGet(KEY_DISGUISE_SCREEN)) || 'calculator';
  const triggerMethod = (await secureGet(KEY_TRIGGER_METHOD)) || 'shake';
  return { enabled, disguiseScreen, triggerMethod };
}

export async function triggerQuickExit() {
  try {
    // Clear sensitive session data
    await secureRemove('authToken');
    await secureRemove('userData');
    await secureRemove('refreshToken');
    await secureSet(KEY_LAST_UNLOCK, '0');
    return { success: true };
  } catch (e) {
    return { success: false, error: 'quick_exit_failed' };
  }
}