import { BACKEND_URL } from './config';

/**
 * Build endpoint URL based on environment (Netlify Functions vs server API)
 * @param {string} path Path like 'sync/import', 'auth/login'
 * @returns {string} Full URL
 */
export function buildApiEndpoint(path) {
  const clean = (path || '').replace(/^\/+/, '');
  if (BACKEND_URL.includes('/.netlify/functions')) {
    // Netlify Functions: functions are flat under the functions base
    return `${BACKEND_URL}/${clean.replace(/^api\//, '')}`;
  }
  // Server API
  return `${BACKEND_URL}/api/${clean.replace(/^api\//, '')}`;
}

/**
 * Fetch with timeout using AbortController
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} timeoutMs
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Retrieve auth token from appropriate storage for current platform
 * @returns {Promise<string|null>}
 */
export async function getAuthToken() {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    // Native environment secure storage
    const { secureGet } = require('./secureStorage');
    return await secureGet('authToken');
  } catch {
    return null;
  }
}

export default { buildApiEndpoint, fetchWithTimeout, getAuthToken };